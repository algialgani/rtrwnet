"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

// Detail router: info status + tampilkan ulang script konfigurasi (utk PENDING)
export default function RouterDetailPage() {
  const { id } = useParams();
  const [router, setRouter] = useState<any>(null);
  const [err, setErr] = useState("");
  const [checking, setChecking] = useState(false);

  const load = async () => {
    const res = await fetch(`/api/routers/${id}`);
    const data = await res.json();
    if (!res.ok) return setErr(data.error);
    setRouter(data.router);
  };
  useEffect(() => { load(); }, [id]);

  async function check() {
    setChecking(true);
    await fetch(`/api/routers/${id}/check`, { method: "POST" });
    setChecking(false);
    load();
  }

  if (err) return <p className="text-red-400">{err}</p>;
  if (!router) return <p className="text-slate-400">Memuat…</p>;

  return (
    <div className="max-w-3xl">
      <Link href="/routers" className="text-sm text-cyan-400">← Daftar Router</Link>
      <div className="mt-3 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{router.name}</h1>
        <button onClick={check} disabled={checking} className="rounded bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950">
          {checking ? "Cek…" : "Cek Status"}
        </button>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
        {[
          ["Status", router.status],
          ["IP VPN", router.vpnIp ?? "—"],
          ["Uptime", router.uptime ?? "—"],
          ["CPU Load", router.cpuLoad != null ? `${router.cpuLoad}%` : "—"],
          ["RouterOS", router.rosVersion ?? "—"],
          ["Mode", router.useRest ? "REST v7" : "API 8728"],
        ].map(([k, v]) => (
          <div key={k as string} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs text-slate-400">{k}</p>
            <p className="mt-1 font-semibold">{v}</p>
          </div>
        ))}
      </div>
      {router.status === "PENDING" && router.configScript && (
        <div className="mt-8">
          <h2 className="font-semibold">Script konfigurasi (jalankan di terminal MikroTik):</h2>
          <pre className="mt-2 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 p-4 text-xs text-green-300">{router.configScript}</pre>
        </div>
      )}
      <div className="mt-8">
        <Link href={`/monitoring?router=${router.id}`} className="rounded border border-cyan-500 px-4 py-2 text-sm text-cyan-400">Buka Monitoring</Link>
      </div>
    </div>
  );
}
