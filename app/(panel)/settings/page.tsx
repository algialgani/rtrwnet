"use client";

import { useEffect, useState } from "react";

// Pengaturan: profil usaha, WhatsApp gateway, payment gateway, isolir, paket
export default function SettingsPage() {
  const [s, setS] = useState<any>(null);
  const [waKey, setWaKey] = useState("");
  const [pgKey, setPgKey] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/settings");
      const d = await res.json();
      if (res.ok) setS(d.settings);
    })();
  }, []);

  async function save(extra: Record<string, any> = {}) {
    setErr(""); setMsg("");
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessName: s.businessName, businessPhone: s.businessPhone, businessAddress: s.businessAddress,
        waProvider: s.waProvider || undefined, waEnabled: s.waEnabled, waApiKey: waKey || undefined,
        pgProvider: s.pgProvider || undefined, pgSandbox: s.pgSandbox, pgApiKey: pgKey || undefined,
        autoIsolate: s.autoIsolate, ...extra,
      }),
    });
    const d = await res.json();
    if (!res.ok) return setErr(d.error);
    setMsg("Pengaturan disimpan.");
    setWaKey(""); setPgKey("");
  }

  async function changePlan(plan: string) {
    await save({ plan });
  }

  if (!s) return <p className="text-slate-400">Memuat…</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold">Pengaturan</h1>
      {err && <p className="mt-4 rounded bg-red-950 p-2 text-sm text-red-400">{err}</p>}
      {msg && <p className="mt-4 rounded bg-green-950 p-2 text-sm text-green-400">{msg}</p>}

      <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="font-semibold">Profil Usaha</h2>
        <input placeholder="Nama usaha" value={s.businessName ?? ""} onChange={(e) => setS({ ...s, businessName: e.target.value })} className="mt-3 w-full rounded border border-slate-700 bg-slate-800 p-2.5" />
        <input placeholder="Telepon/WA usaha" value={s.businessPhone ?? ""} onChange={(e) => setS({ ...s, businessPhone: e.target.value })} className="mt-3 w-full rounded border border-slate-700 bg-slate-800 p-2.5" />
        <textarea placeholder="Alamat (untuk invoice PDF)" rows={2} value={s.businessAddress ?? ""} onChange={(e) => setS({ ...s, businessAddress: e.target.value })} className="mt-3 w-full rounded border border-slate-700 bg-slate-800 p-2.5" />
      </section>

      <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="font-semibold">WhatsApp Gateway</h2>
        <div className="mt-3 flex gap-3">
          <select value={s.waProvider ?? ""} onChange={(e) => setS({ ...s, waProvider: e.target.value })} className="rounded border border-slate-700 bg-slate-800 p-2.5">
            <option value="">Pilih provider…</option><option value="fonnte">Fonnte</option><option value="wablas">Wablas</option>
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!s.waEnabled} onChange={(e) => setS({ ...s, waEnabled: e.target.checked })} /> Aktif
          </label>
        </div>
        <input type="password" placeholder={s.waKeySet ? "API key sudah disimpan (isi untuk mengganti)" : "API key Fonnte/Wablas"} value={waKey} onChange={(e) => setWaKey(e.target.value)} className="mt-3 w-full rounded border border-slate-700 bg-slate-800 p-2.5" />
      </section>

      <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="font-semibold">Payment Gateway (sandbox)</h2>
        <div className="mt-3 flex gap-3">
          <select value={s.pgProvider ?? ""} onChange={(e) => setS({ ...s, pgProvider: e.target.value })} className="rounded border border-slate-700 bg-slate-800 p-2.5">
            <option value="">Pilih provider…</option><option value="midtrans">Midtrans</option><option value="xendit">Xendit</option>
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!s.pgSandbox} onChange={(e) => setS({ ...s, pgSandbox: e.target.checked })} /> Mode sandbox
          </label>
        </div>
        <input type="password" placeholder={s.pgKeySet ? "API key sudah disimpan (isi untuk mengganti)" : "API key Midtrans/Xendit"} value={pgKey} onChange={(e) => setPgKey(e.target.value)} className="mt-3 w-full rounded border border-slate-700 bg-slate-800 p-2.5" />
      </section>

      <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="font-semibold">Isolir Otomatis</h2>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!s.autoIsolate} onChange={(e) => setS({ ...s, autoIsolate: e.target.checked })} />
          Isolir (disable secret PPPoE) otomatis pelanggan yang lewat jatuh tempo
        </label>
      </section>

      <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="font-semibold">Paket Langganan</h2>
        <div className="mt-3 flex gap-2">
          {["FREE", "BASIC", "PRO"].map((p) => (
            <button key={p} onClick={() => changePlan(p)} className="flex-1 rounded border border-slate-700 py-2 text-sm hover:border-cyan-500 hover:text-cyan-400">
              {p} — {[["Rp0 / 1 router"], ["Rp25.000 / 2 router"], ["Rp50.000 / 5 router"]][["FREE", "BASIC", "PRO"].indexOf(p)]}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">Paket berlaku langsung — batas router di server berubah otomatis.</p>
      </section>

      <button onClick={() => save()} className="mt-6 w-full rounded bg-cyan-500 py-3 font-semibold text-slate-950">💾 Simpan Pengaturan</button>
    </div>
  );
}
