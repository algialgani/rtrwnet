"use client";

import { useEffect, useState } from "react";

// CRUD Profil / Paket Internet (Hotspot & PPPoE)
const EMPTY = { routerId: "", name: "", price: 0, downSpeed: "10M", upSpeed: "10M", durationValue: 30, durationUnit: "DAYS", type: "HOTSPOT" };

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [routers, setRouters] = useState<any[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = async () => {
    const [pr, rt] = await Promise.all([fetch("/api/profiles"), fetch("/api/routers")]);
    const pd = await pr.json(); const rd = await rt.json();
    if (!pr.ok) return setErr(pd.error);
    setProfiles(pd.profiles);
    setRouters(rd.routers ?? []);
  };
  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setMsg("");
    const url = editId ? `/api/profiles/${editId}` : "/api/profiles";
    const res = await fetch(url, {
      method: editId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, price: Number(form.price), durationValue: Number(form.durationValue) }),
    });
    const data = await res.json();
    if (!res.ok) return setErr(data.error);
    setMsg(editId ? "Profil diperbarui" : "Profil ditambahkan");
    setForm(EMPTY); setEditId("");
    load();
  }

  async function edit(p: any) {
    setEditId(p.id);
    setForm({
      routerId: p.routerId, name: p.name, price: p.price,
      downSpeed: p.downSpeed, upSpeed: p.upSpeed,
      durationValue: p.durationValue, durationUnit: p.durationUnit, type: p.type,
    });
  }

  async function del(id: string) {
    if (!confirm("Hapus profil ini?")) return;
    const res = await fetch(`/api/profiles/${id}`, { method: "DELETE" });
    if (!res.ok) return setErr((await res.json()).error);
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Profil / Paket Internet</h1>
      {err && <p className="mt-4 rounded bg-red-950 p-2 text-sm text-red-400">{err}</p>}
      {msg && <p className="mt-4 rounded bg-green-950 p-2 text-sm text-green-400">{msg}</p>}

      <form onSubmit={submit} className="mt-6 grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-4">
        <select required value={form.routerId} onChange={(e) => setForm({ ...form, routerId: e.target.value })} className="rounded border border-slate-700 bg-slate-800 p-2.5">
          <option value="">Pilih router…</option>
          {routers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <input required placeholder="Nama paket (mis. Paket 10M)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded border border-slate-700 bg-slate-800 p-2.5" />
        <input required type="number" min="0" placeholder="Harga (Rp)" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="rounded border border-slate-700 bg-slate-800 p-2.5" />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="rounded border border-slate-700 bg-slate-800 p-2.5">
          <option value="HOTSPOT">Hotspot</option><option value="PPPOE">PPPoE</option>
        </select>
        <input required placeholder="Download (10M)" value={form.downSpeed} onChange={(e) => setForm({ ...form, downSpeed: e.target.value })} className="rounded border border-slate-700 bg-slate-800 p-2.5" />
        <input required placeholder="Upload (10M)" value={form.upSpeed} onChange={(e) => setForm({ ...form, upSpeed: e.target.value })} className="rounded border border-slate-700 bg-slate-800 p-2.5" />
        <input required type="number" min="1" placeholder="Durasi" value={form.durationValue} onChange={(e) => setForm({ ...form, durationValue: Number(e.target.value) })} className="rounded border border-slate-700 bg-slate-800 p-2.5" />
        <div className="flex gap-2">
          <select value={form.durationUnit} onChange={(e) => setForm({ ...form, durationUnit: e.target.value })} className="w-full rounded border border-slate-700 bg-slate-800 p-2.5">
            <option value="HOURS">Jam</option><option value="DAYS">Hari</option><option value="MONTHS">Bulan</option>
          </select>
          <button className="whitespace-nowrap rounded bg-cyan-500 px-4 font-semibold text-slate-950">{editId ? "Simpan" : "+ Tambah"}</button>
          {editId && <button type="button" onClick={() => { setEditId(""); setForm(EMPTY); }} className="rounded border border-slate-700 px-3">Batal</button>}
        </div>
      </form>

      {profiles.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-slate-700 bg-slate-900 p-6 text-center text-slate-300">
          Belum ada profil. Buat profil dulu sebelum generate voucher atau menambah pelanggan PPPoE.
        </p>
      ) : (
        <table className="mt-6 w-full text-sm">
          <thead className="text-left text-slate-400"><tr><th className="py-2">Nama</th><th>Router</th><th>Tipe</th><th>Kecepatan</th><th>Harga</th><th>Durasi</th><th>Aksi</th></tr></thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.id} className="border-t border-slate-800">
                <td className="py-2">{p.name}</td>
                <td>{p.router?.name}</td>
                <td>{p.type}</td>
                <td>{p.downSpeed}/{p.upSpeed}</td>
                <td>Rp{p.price.toLocaleString("id-ID")}</td>
                <td>{p.durationValue} {p.durationUnit.toLowerCase()}</td>
                <td className="space-x-2">
                  <button onClick={() => edit(p)} className="rounded border border-slate-700 px-2 py-1">Edit</button>
                  <button onClick={() => del(p.id)} className="rounded border border-slate-700 px-2 py-1 hover:border-red-500 hover:text-red-400">Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
