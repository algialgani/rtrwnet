"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";

// Monitoring: polling tiap 5 detik selama halaman dibuka.
// Grafik traffic digambar dengan SVG sederhana (tanpa dependensi chart).
export default function MonitoringPage() {
  const params = useParams();
  const search = useSearchParams();
  const routerId = (params?.id as string) ?? search.get("router");
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    if (!routerId) return;
    try {
      const res = await fetch(`/api/monitoring/${routerId}`);
      const d = await res.json();
      if (!res.ok) return setErr(d.error);
      setData(d); setErr("");
    } catch { /* jaringan fluktuatif saat polling */ }
  }, [routerId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  if (err) return <p className="text-red-400">{err}</p>;
  if (!data) return <p className="text-slate-400">Memuat…</p>;

  const traffic = data.traffic.slice().reverse();
  const maxSpeed = Math.max(1, ...traffic.map((t: any) => Math.max(t.rxSpeed, t.txSpeed)));

  return (
    <div>
      <h1 className="text-2xl font-bold">Monitoring — {data.router.name}</h1>
      <p className="mt-1 text-sm text-slate-400">
        Status: <span className={data.router.status === "ONLINE" ? "text-green-400" : "text-red-400"}>{data.router.status}</span> · update tiap 5 detik
      </p>

      {/* Grafik traffic histori */}
      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="font-semibold">Traffic (histori tersimpan di database)</h2>
        {traffic.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            Belum ada histori traffic. Histori dikumpulkan otomatis oleh scheduler saat router online.
          </p>
        ) : (
          <svg viewBox="0 0 300 80" className="mt-3 h-40 w-full">
            {traffic.map((t: any, i: number) => {
              const x = (i / Math.max(1, traffic.length - 1)) * 300;
              const ry = 80 - (t.rxSpeed / maxSpeed) * 78;
              const ty = 80 - (t.txSpeed / maxSpeed) * 78;
              return (
                <g key={t.id}>
                  <circle cx={x} cy={ry} r="1.5" fill="#22d3ee" />
                  <circle cx={x} cy={ty} r="1.5" fill="#a78bfa" />
                </g>
              );
            })}
          </svg>
        )}
        <p className="mt-2 text-xs"><span className="text-cyan-400">●</span> Download <span className="text-violet-400 ml-2">●</span> Upload</p>
      </div>

      {/* Interface */}
      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="font-semibold">Interface</h2>
        {data.interfaces.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Router belum online — daftar interface muncul setelah router terdeteksi.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-slate-400"><tr><th className="py-1">Nama</th><th>Tipe</th><th>RX</th><th>TX</th><th>Status</th></tr></thead>
            <tbody>
              {data.interfaces.map((i: any, k: number) => (
                <tr key={k} className="border-t border-slate-800">
                  <td className="py-1.5">{i.name}</td>
                  <td>{i.type}</td>
                  <td>{Number(i["rx-byte"] ?? 0).toLocaleString()}</td>
                  <td>{Number(i["tx-byte"] ?? 0).toLocaleString()}</td>
                  <td>{i.running ? "🟢 running" : "⚪ —"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* DHCP leases + Log */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="font-semibold">DHCP Leases</h2>
          {data.leases.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Belum ada lease tersimpan.</p>
          ) : (
            <ul className="mt-3 space-y-1 text-sm">
              {data.leases.map((l: any) => (
                <li key={l.id}>{l.address} — {l.mac} {l.hostname ? `(${l.hostname})` : ""}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="font-semibold">Log Router</h2>
          {data.logs.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Belum ada log.</p>
          ) : (
            <ul className="mt-3 max-h-60 space-y-1 overflow-y-auto text-xs">
              {data.logs.map((l: any) => (
                <li key={l.id} className={l.level === "ERROR" ? "text-red-400" : l.level === "WARN" ? "text-amber-400" : "text-slate-300"}>
                  [{new Date(l.createdAt).toLocaleString("id-ID")}] {l.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
