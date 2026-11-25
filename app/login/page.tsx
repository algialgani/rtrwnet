"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Halaman login: POST /api/auth/login → session cookie httpOnly
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Login gagal");
    router.push(new URLSearchParams(window.location.search).get("next") ?? "/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-8">
        <h1 className="text-2xl font-bold">Login</h1>
        <p className="mt-1 text-sm text-slate-400">Masuk ke panel RT Net Panel</p>
        {error && <p className="mt-4 rounded bg-red-950 p-2 text-sm text-red-400">{error}</p>}
        <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="mt-4 w-full rounded border border-slate-700 bg-slate-800 p-2.5" />
        <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
          className="mt-3 w-full rounded border border-slate-700 bg-slate-800 p-2.5" />
        <button disabled={busy} className="mt-4 w-full rounded bg-cyan-500 py-2.5 font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50">
          {busy ? "Memproses…" : "Login"}
        </button>
        <div className="mt-4 flex justify-between text-sm">
          <a href="/forgot-password" className="text-cyan-400 hover:underline">Lupa password?</a>
          <a href="/register" className="text-cyan-400 hover:underline">Daftar</a>
        </div>
      </form>
    </main>
  );
}
