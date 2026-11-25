"use client";

import { useEffect, useState } from "react";

// CRUD Pelanggan PPPoE + daftar koneksi aktif dari router
const EMPTY = {
  routerId: "", profileId: "", username: "", password: "",
  customerName: "", customerPhone: "", customerAddress: "",
};
const STATUS_LABEL: Record<string, string> = { ACTIVE: "Aktif", SUSPENDED: "Ditahan", EXPIRED: "Hangus" };

export default function PppoePage() {
  const [users, setUsers] = useState<any[]>([]);
  const [routers, setRouters] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState("");
  const [activeRouter, setActiveRouter] = useState("");
  const [activeList, setActiveList] = useState<any[] | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = async () => {
    const [pp, rt, pr] = await Promise.all([
      fetch("/api/pppoe").then((r) => r.json()),
      fetch("/api/routers").then((r) => r.json()),
      fetch("/api/profiles").then((r) => r.json()),
    ]);
    if (!pp.ok) return setErr(pp.error);
    setUsers(pp.users);
    setRouters(rt.routers ?? []);
    setProfiles((pr.profiles ?? []).filter((p: any) => p.type === "PPPOE"));
  };
  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setMsg("");
    const url = editId ? `/api/pppoe/${editId}` : "/api/pppoe";
    const body = editId
      ? { username: form.username, password: form.password, profileId: form.profileId, status: "ACTIVE" }
      : form;
    const res = await fetch(url, {
      method: editId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return setErr(data.error);
    setMsg(data.syncError ?? (editId ? "Pelanggan diperbarui & disinkron ke router" : "Pelanggan ditambahkan & secret dibuat di MikroTik"));
    setForm(EMPTY); setEditId("");
    load();
  }

  async function suspend(u: any) {
    const status = u.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    const res = await fetch(`/api/pppoe/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) return setErr(data.error);
    setMsg(data.syncError ?? `Status diubah ke ${STATUS_LABEL[status]} & disinkron ke router`);
    load();
  }

  async function del(id: string) {
    if (!confirm("Hapus pelanggan (secret di MikroTik juga dihapus)?")) return;
    const res = await fetch(`/api/pppoe/${id}`, { method: "DELETE" });
    if (!res.ok) return setErr((await res.json()).error);
    load();
  }

  async function showActive() {
    if (!activeRouter) return;
    const res = await fetch(`/api/pppoe/active?routerId=${activeRouter}`);
    const data = await res.json();
    if (!res.ok) return setErr(data.error);
    setActiveList(data.active);
    if (!data.reachable) setErr("Router tidak terjangkau — tidak bisa membaca koneksi aktif.");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Pelanggan PPPoE ({users.length})</h1>
      {err && <p className="mt-4 rounded bg-red-950 p-2 text-sm text-red-400">{err}</p>}
      {msg && <p className="mt-4 rounded bg-green-950 p-2 text-sm text-green-400">{msg}</p>}

      <form onSubmit={submit} className="mt-6 grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-4">
        {!editId && (
          <>
            <select required value={form.routerId} onChange={(e) => setForm({ ...form, routerId: e.target.value })} className="rounded border border-slate-700 bg-slate-800 p-2.5">
              <option value="">Pilih router…</option>
              {routers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <input required placeholder="Nama pelanggan" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} className="rounded border border-slate-700 bg-slate-800 p-2.5" />
            <input required placeholder="No. WhatsApp (08…)" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} className="rounded border border-slate-700 bg-slate-800 p-2.5" />
            <input placeholder="Alamat" value={form.customerAddress} onChange={(e) => setForm({ ...form, customerAddress: e.target.value })} className="rounded border border-slate-700 bg-slate-800 p-2.5" />
          </>
        )}
        <input required placeholder="Username PPPoE" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="rounded border border-slate-700 bg-slate-800 p-2.5" />
        <input required placeholder="Password PPPoE" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="rounded border border-slate-700 bg-slate-800 p-2.5" />
        <select required value={form.profileId} onChange={(e) => setForm({ ...form, profileId: e.target.value })} className="rounded border border-slate-700 bg-slate-800 p-2.5">
          <option value="">Pilih profil PPPoE…</option>
          {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="flex gap-2">
          <button className="whitespace-nowrap rounded bg-cyan-500 px-4 font-semibold text-slate-950">{editId ? "Simpan" : "+ Tambah"}</button>
          {editId && <button type="button" onClick={() => { setEditId(""); setForm(EMPTY); }} className="rounded border border-slate-700 px-3">Batal</button>}
        </div>
      </form>

      {users.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-slate-700 bg-slate-900 p-6 text-center text-slate-300">
          Belum ada pelanggan PPPoE. Buat profil PPPoE dulu, lalu tambahkan pelanggan.
        </p>
      ) : (
        <table className="mt-6 w-full text-sm">
          <thead className="text-left text-slate-400"><tr><th className="py-2">Username</th><th>Pelanggan</th><th>Profil</th><th>Router</th><th>Status</th><th>Aksi</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-800">
                <td className="py-2 font-mono">{u.username}</td>
                <td>{u.customer?.name} <span className="text-slate-500">{u.customer?.phone}</span></td>
                <td>{u.profile.name}</td>
                <td>{u.router.name}</td>
                <td className={u.status === "ACTIVE" ? "text-green-400" : "text-amber-400"}>{STATUS_LABEL[u.status]}</td>
                <td className="space-x-2">
                  <button onClick={() => { setEditId(u.id); setForm({ ...EMPTY, username: u.username, profileId: u.profileId, routerId: u.routerId }); }} className="rounded border border-slate-700 px-2 py-1">Edit</button>
                  <button onClick={() => suspend(u)} className="rounded border border-slate-700 px-2 py-1">{u.status === "SUSPENDED" ? "Aktifkan" : "Isolir"}</button>
                  <button onClick={() => del(u.id)} className="rounded border border-slate-700 px-2 py-1 hover:border-red-500 hover:text-red-400">Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Koneksi aktif dari router */}
      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="font-semibold">Koneksi Aktif</h2>
        <div className="mt-3 flex gap-2">
          <select value={activeRouter} onChange={(e) => setActiveRouter(e.target.value)} className="rounded border border-slate-700 bg-slate-800 p-2 text-sm">
            <option value="">Pilih router…</option>
            {routers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <button onClick={showActive} className="rounded border border-cyan-500 px-3 text-sm text-cyan-400">Tampilkan</button>
        </div>
        {activeList && (
          activeList.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Tidak ada koneksi PPPoE aktif di router ini.</p>
          ) : (
            <ul className="mt-3 space-y-1 text-sm">
              {activeList.map((a: any, i: number) => (
                <li key={i}>{a.name} — IP {a.address ?? "—"} · sesi {a.uptime ?? "—"}</li>
              ))}
            </ul>
          )
        )}
      </div>
    </div>
  );
}
