"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Flow tambah router via OpenVPN:
// 1. isi nama + kredensial API  2. sistem generate script MikroTik
// 3. user jalankan script di terminal router  4. cek status → ONLINE
export default function NewRouterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", apiUser: "admin", apiPass: "", useRest: true });
  const [script, setScript] = useState("");
  const [routerId, setRouterId] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const res = await fetch("/api/routers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(data.error);
    setRouterId(data.routerId);
    setScript(data.script);
    setMsg("Script konfigurasi sudah dibuat. Jalankan script di terminal MikroTik, lalu klik Cek Status.");
  }

  async function check() {
    setChecking(true);
    const res = await fetch(`/api/routers/${routerId}/check`, { method: "POST" });
    const data = await res.json();
    setChecking(false);
    if (data.status === "ONLINE") { router.push("/routers"); router.refresh(); }
    else setMsg(data.message ?? `Status: ${data.status}`);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold">Tambah Router</h1>
      {err && <p className="mt-4 rounded bg-red-950 p-2 text-sm text-red-400">{err}</p>}
      {msg && <p className="mt-4 rounded bg-cyan-950 p-2 text-sm text-cyan-300">{msg}</p>}

      {!script ? (
        <form onSubmit={submit} className="mt-6 space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <input required placeholder="Nama router (mis. RT Utama)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded border border-slate-700 bg-slate-800 p-2.5" />
          <input required placeholder="User API MikroTik (mis. panel)" value={form.apiUser} onChange={(e) => setForm({ ...form, apiUser: e.target.value })}
            className="w-full rounded border border-slate-700 bg-slate-800 p-2.5" />
          <input required type="password" placeholder="Password user API MikroTik" value={form.apiPass} onChange={(e) => setForm({ ...form, apiPass: e.target.value })}
            className="w-full rounded border border-slate-700 bg-slate-800 p-2.5" />
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={form.useRest} onChange={(e) => setForm({ ...form, useRest: e.target.checked })} />
            Pakai REST API RouterOS v7 (uncheck untuk RouterOS v6 / API 8728)
          </label>
          <button disabled={busy} className="w-full rounded bg-cyan-500 py-2.5 font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50">
            {busy ? "Membuat…" : "Generate Script Konfigurasi"}
          </button>
        </form>
      ) : (
        <div className="mt-6">
          <h2 className="font-semibold">Langkah 2 — Jalankan di terminal MikroTik:</h2>
          <pre className="mt-2 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 p-4 text-xs text-green-300">{script}</pre>
          <button onClick={check} disabled={checking} className="mt-4 rounded bg-cyan-500 px-6 py-2.5 font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50">
            {checking ? "Mendeteksi…" : "Cek Status Router"}
          </button>
        </div>
      )}
    </div>
  );
}
