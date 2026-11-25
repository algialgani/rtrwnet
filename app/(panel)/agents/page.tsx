"use client";

import { useEffect, useState } from "react";

// CRUD agen: nama, komisi, saldo, akun login, laporan
const EMPTY = { name: "", phone: "", commissionPct: 0, agentEmail: "", agentPassword: "" };

export default function AgentsPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [topupFor, setTopupFor] = useState<any>(null);
  const [delta, setDelta] = useState(0);
  const [report, setReport] = useState<any>(null);

  const load = async () => {
    const res = await fetch("/api/agents");
    const data = await res.json();
    if (!res.ok) return setErr(data.error);
    setAgents(data.agents);
  };
  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setMsg("");
    const res = await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        commissionPct: Number(form.commissionPct),
        ...(form.agentEmail && form.agentPassword ? { agentEmail: form.agentEmail, agentPassword: form.agentPassword } : {}),
      }),
    });
    const data = await res.json();
    if (!res.ok) return setErr(data.error);
    setMsg(`Agen "${form.name}" ditambahkan${form.agentEmail ? " + akun login dibuat" : ""}`);
    setForm(EMPTY); load();
  }

  async function topup() {
    const res = await fetch(`/api/agents/${topupFor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ balanceDelta: Number(delta) }),
    });
    const data = await res.json();
    setTopupFor(null); setDelta(0);
    if (!res.ok) return setErr(data.error);
    setMsg(`Saldo sekarang Rp${data.balance.toLocaleString("id-ID")}`);
    load();
  }

  async function showReport(id: string) {
    const res = await fetch(`/api/agents/${id}/report`);
    const data = await res.json();
    if (!res.ok) return setErr(data.error);
    setReport(data);
  }

  async function del(id: string) {
    if (!confirm("Hapus agen ini?")) return;
    const res = await fetch(`/api/agents/${id}`, { method: "DELETE" });
    if (!res.ok) return setErr((await res.json()).error);
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Agen / Reseller ({agents.length})</h1>
      {err && <p className="mt-4 rounded bg-red-950 p-2 text-sm text-red-400">{err}</p>}
      {msg && <p className="mt-4 rounded bg-green-950 p-2 text-sm text-green-400">{msg}</p>}

      <form onSubmit={submit} className="mt-6 grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-3">
        <input required placeholder="Nama agen" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded border border-slate-700 bg-slate-800 p-2.5" />
        <input placeholder="No. WhatsApp" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded border border-slate-700 bg-slate-800 p-2.5" />
        <input type="number" min="0" max="100" placeholder="Komisi (%)" value={form.commissionPct} onChange={(e) => setForm({ ...form, commissionPct: Number(e.target.value) })} className="rounded border border-slate-700 bg-slate-800 p-2.5" />
        <input type="email" placeholder="Email agen (opsional — buat akun login)" value={form.agentEmail} onChange={(e) => setForm({ ...form, agentEmail: e.target.value })} className="rounded border border-slate-700 bg-slate-800 p-2.5" />
        <input type="password" minLength={8} placeholder="Password agen (min. 8)" value={form.agentPassword} onChange={(e) => setForm({ ...form, agentPassword: e.target.value })} className="rounded border border-slate-700 bg-slate-800 p-2.5" />
        <button className="rounded bg-cyan-500 py-2.5 font-semibold text-slate-950">+ Tambah Agen</button>
      </form>

      {agents.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-slate-700 bg-slate-900 p-6 text-center text-slate-300">
          Belum ada agen. Tambah agen, lalu generate voucher dengan alokasi ke agen tersebut.
        </p>
      ) : (
        <table className="mt-6 w-full text-sm">
          <thead className="text-left text-slate-400"><tr><th className="py-2">Nama</th><th>Kontak</th><th>Akun Login</th><th>Komisi</th><th>Saldo</th><th>Voucher</th><th>Aksi</th></tr></thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a.id} className="border-t border-slate-800">
                <td className="py-2">{a.name}</td>
                <td>{a.phone ?? "—"}</td>
                <td className="text-xs">{a.user?.email ?? "belum ada"}</td>
                <td>{a.commissionPct}%</td>
                <td className={a.balance >= 0 ? "text-green-400" : "text-red-400"}>Rp{a.balance.toLocaleString("id-ID")}</td>
                <td>{a._count.vouchers}</td>
                <td className="space-x-2">
                  <button onClick={() => { setTopupFor(a); setDelta(0); }} className="rounded border border-slate-700 px-2 py-1">Saldo</button>
                  <button onClick={() => showReport(a.id)} className="rounded border border-slate-700 px-2 py-1">Laporan</button>
                  <button onClick={() => del(a.id)} className="rounded border border-slate-700 px-2 py-1 hover:border-red-500 hover:text-red-400">Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* dialog saldo */}
      {topupFor && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70" onClick={() => setTopupFor(null)}>
          <div className="w-80 rounded-xl border border-slate-700 bg-slate-900 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold">Saldo — {topupFor.name}</h2>
            <p className="mt-1 text-sm text-slate-400">Sekarang: Rp{topupFor.balance.toLocaleString("id-ID")}</p>
            <input type="number" placeholder="+50000 / -30000" value={delta} onChange={(e) => setDelta(Number(e.target.value))} className="mt-3 w-full rounded border border-slate-700 bg-slate-800 p-2.5" />
            <div className="mt-4 flex gap-2">
              <button onClick={topup} className="flex-1 rounded bg-cyan-500 py-2 font-semibold text-slate-950">Simpan</button>
              <button onClick={() => setTopupFor(null)} className="rounded border border-slate-700 px-4">Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* dialog laporan */}
      {report && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70" onClick={() => setReport(null)}>
          <div className="max-h-[80vh] w-[32rem] overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold">Laporan — {report.agent.name}</h2>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded bg-slate-800 p-3"><p className="text-xs text-slate-400">Terjual</p><p className="font-bold">{report.soldCount}</p></div>
              <div className="rounded bg-slate-800 p-3"><p className="text-xs text-slate-400">Total</p><p className="font-bold">Rp{report.total.toLocaleString("id-ID")}</p></div>
              <div className="rounded bg-slate-800 p-3"><p className="text-xs text-slate-400">Komisi ({report.agent.commissionPct}%)</p><p className="font-bold text-cyan-400">Rp{report.commission.toLocaleString("id-ID")}</p></div>
            </div>
            <ul className="mt-4 max-h-48 space-y-1 overflow-y-auto text-xs">
              {report.sold.map((v: any) => (
                <li key={v.id} className="border-t border-slate-800 py-1">
                  <span className="font-mono">{v.code}</span> · {v.profile.name} · Rp{v.price.toLocaleString("id-ID")} · {v.buyerName ?? "Umum"} {v.soldAt && `· ${new Date(v.soldAt).toLocaleDateString("id-ID")}`}
                </li>
              ))}
            </ul>
            <button onClick={() => setReport(null)} className="mt-4 w-full rounded border border-slate-700 py-2">Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
}
