"use client";

import { useEffect, useState } from "react";

// Generate voucher massal: pilih router + profil hotspot, jumlah 1–500
export default function NewVoucherPage() {
  const [routers, setRouters] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [form, setForm] = useState({ routerId: "", profileId: "", quantity: 10, codeLength: 6, agentId: "" });
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const [rt, pr, ag] = await Promise.all([
        fetch("/api/routers").then((r) => r.json()),
        fetch("/api/profiles").then((r) => r.json()),
        fetch("/api/agents").then((r) => r.json()),
      ]);
      setRouters(rt.routers ?? []);
      setProfiles((pr.profiles ?? []).filter((p: any) => p.type === "HOTSPOT"));
      setAgents(ag.agents ?? []);
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const res = await fetch("/api/vouchers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, quantity: Number(form.quantity), codeLength: Number(form.codeLength) }),
    });
    const data = await res.json();
    if (!res.ok) return setErr(data.error);
    setResult(data);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold">Generate Voucher Hotspot</h1>
      {err && <p className="mt-4 rounded bg-red-950 p-2 text-sm text-red-400">{err}</p>}
      <form onSubmit={submit} className="mt-6 space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <select required value={form.routerId} onChange={(e) => setForm({ ...form, routerId: e.target.value })} className="w-full rounded border border-slate-700 bg-slate-800 p-2.5">
          <option value="">Pilih router…</option>
          {routers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select required value={form.profileId} onChange={(e) => setForm({ ...form, profileId: e.target.value })} className="w-full rounded border border-slate-700 bg-slate-800 p-2.5">
          <option value="">Pilih profil hotspot…</option>
          {profiles.map((p) => <option key={p.id} value={p.id}>{p.name} — Rp{p.price.toLocaleString("id-ID")}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <input required type="number" min="1" max="500" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} placeholder="Jumlah (1–500)" className="rounded border border-slate-700 bg-slate-800 p-2.5" />
          <input type="number" min="4" max="10" value={form.codeLength} onChange={(e) => setForm({ ...form, codeLength: Number(e.target.value) })} placeholder="Panjang kode" className="rounded border border-slate-700 bg-slate-800 p-2.5" />
        </div>
        <select value={form.agentId} onChange={(e) => setForm({ ...form, agentId: e.target.value })} className="w-full rounded border border-slate-700 bg-slate-800 p-2.5">
          <option value="">Tanpa alokasi agen (opsional)</option>
          {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <button className="w-full rounded bg-cyan-500 py-2.5 font-semibold text-slate-950">Generate</button>
      </form>

      {result && (
        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm">
          <p className="text-green-400">✓ {result.created} voucher dibuat di database.</p>
          <p className={result.syncedToRouter === result.created ? "text-green-400" : "text-amber-400"}>
            {result.syncedToRouter === result.created
              ? `✓ ${result.syncedToRouter} user hotspot dibuat di MikroTik.`
              : result.syncError ?? "Belum tersinkron ke router (akan diulang job sinkron)."}
          </p>
          <a href={`/vouchers/print?ids=${result.vouchers.map((v: any) => v.id).join(",")}`} target="_blank" className="mt-3 inline-block rounded bg-cyan-500 px-4 py-2 font-semibold text-slate-950">
            🖨️ Cetak Voucher
          </a>
        </div>
      )}
    </div>
  );
}
