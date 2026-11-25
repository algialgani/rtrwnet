"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Halaman register: POST /api/auth/register + kirim email verifikasi
export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", whatsapp: "" });
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setMsg("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Registrasi gagal");
    setMsg(data.message);
    setTimeout(() => router.push("/login"), 2500);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-8">
        <h1 className="text-2xl font-bold">Daftar</h1>
        <p className="mt-1 text-sm text-slate-400">Paket Free — 1 router, gratis selamanya</p>
        {error && <p className="mt-4 rounded bg-red-950 p-2 text-sm text-red-400">{error}</p>}
        {msg && <p className="mt-4 rounded bg-green-950 p-2 text-sm text-green-400">{msg}</p>}
        <input required placeholder="Nama usaha / nama Anda" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="mt-4 w-full rounded border border-slate-700 bg-slate-800 p-2.5" />
        <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="mt-3 w-full rounded border border-slate-700 bg-slate-800 p-2.5" />
        <input required type="password" minLength={8} placeholder="Password (min. 8 karakter)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="mt-3 w-full rounded border border-slate-700 bg-slate-800 p-2.5" />
        <input required placeholder="Nomor WhatsApp (08…)" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
          className="mt-3 w-full rounded border border-slate-700 bg-slate-800 p-2.5" />
        <button disabled={busy} className="mt-4 w-full rounded bg-cyan-500 py-2.5 font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50">
          {busy ? "Memproses…" : "Daftar"}
        </button>
        <p className="mt-4 text-sm text-slate-400">Sudah punya akun? <a href="/login" className="text-cyan-400 hover:underline">Login</a></p>
      </form>
    </main>
  );
}
