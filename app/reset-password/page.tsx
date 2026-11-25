"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Reset password via token dari email → POST /api/auth/reset-password
export default function ResetPasswordPage() {
  const router = useRouter();
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setMsg("");
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Gagal");
    setMsg(data.message);
    setTimeout(() => router.push("/login"), 1500);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-8">
        <h1 className="text-2xl font-bold">Reset Password</h1>
        {!token && <p className="mt-4 rounded bg-amber-950 p-2 text-sm text-amber-400">Token tidak ditemukan di tautan.</p>}
        {error && <p className="mt-4 rounded bg-red-950 p-2 text-sm text-red-400">{error}</p>}
        {msg && <p className="mt-4 rounded bg-green-950 p-2 text-sm text-green-400">{msg}</p>}
        <input required type="password" minLength={8} placeholder="Password baru (min. 8 karakter)" value={password} onChange={(e) => setPassword(e.target.value)}
          className="mt-4 w-full rounded border border-slate-700 bg-slate-800 p-2.5" />
        <button disabled={busy || !token} className="mt-4 w-full rounded bg-cyan-500 py-2.5 font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50">
          {busy ? "Menyimpan…" : "Simpan Password Baru"}
        </button>
      </form>
    </main>
  );
}
