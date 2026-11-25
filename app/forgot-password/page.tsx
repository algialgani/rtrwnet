"use client";

import { useState } from "react";

// Lupa password → POST /api/auth/forgot-password
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setMsg("");
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Gagal");
    setMsg(data.message);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-8">
        <h1 className="text-2xl font-bold">Lupa Password</h1>
        {error && <p className="mt-4 rounded bg-red-950 p-2 text-sm text-red-400">{error}</p>}
        {msg && <p className="mt-4 rounded bg-green-950 p-2 text-sm text-green-400">{msg}</p>}
        <input required type="email" placeholder="Email akun Anda" value={email} onChange={(e) => setEmail(e.target.value)}
          className="mt-4 w-full rounded border border-slate-700 bg-slate-800 p-2.5" />
        <button disabled={busy} className="mt-4 w-full rounded bg-cyan-500 py-2.5 font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50">
          {busy ? "Mengirim…" : "Kirim Tautan Reset"}
        </button>
        <p className="mt-4 text-sm"><a href="/login" className="text-cyan-400 hover:underline">Kembali ke login</a></p>
      </form>
    </main>
  );
}
