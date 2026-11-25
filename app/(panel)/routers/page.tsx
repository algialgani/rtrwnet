"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Daftar router milik user + tombol cek status manual
export default function RoutersPage() {
  const [routers, setRouters] = useState<any[]>([]);
  const [limit, setLimit] = useState(1);
  const [busyId, setBusyId] = useState("");
  const [err, setErr] = useState("");

  const load = async () => {
    const res = await fetch("/api/routers");
    const data = await res.json();
    if (!res.ok) return setErr(data.error);
    setRouters(data.routers);
    setLimit(data.maxRouters);
  };
  useEffect(() => { load(); }, []);

  async function check(id: string) {
    setBusyId(id); setErr("");
    const res = await fetch(`/api/routers/${id}/check`, { method: "POST" });
    const data = await res.json();
    setBusyId("");
    if (!res.ok) return setErr(data.error);
    if (data.message) alert(data.message);
    load();
  }

  async function del(id: string) {
    if (!confirm("Hapus router ini beserta data terkait?")) return;
    const res = await fetch(`/api/routers/${id}`, { method: "DELETE" });
    if (!res.ok) return setErr((await res.json()).error);
    load();
  }

  const canAdd = routers.length < limit;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Router ({routers.length}/{limit})</h1>
        {canAdd ? (
          <Link href="/routers/new" className="rounded bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950">+ Tambah Router</Link>
        ) : (
          <Link href="/settings" className="rounded border border-amber-500 px-4 py-2 text-sm text-amber-400">Upgrade paket utk menambah router</Link>
        )}
      </div>
      {err && <p className="mt-4 rounded bg-red-950 p-2 text-sm text-red-400">{err}</p>}

      {routers.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-slate-700 bg-slate-900 p-8 text-center">
          <p className="text-slate-300">Belum ada router. Tambahkan router pertama Anda dengan flow OpenVPN — tanpa perlu IP publik.</p>
        </div>
      ) : (
        <table className="mt-6 w-full text-sm">
          <thead className="text-left text-slate-400"><tr><th className="py-2">Nama</th><th>Status</th><th>IP VPN</th><th>Uptime</th><th>CPU</th><th>Aksi</th></tr></thead>
          <tbody>
            {routers.map((r) => (
              <tr key={r.id} className="border-t border-slate-800">
                <td className="py-2"><Link href={`/routers/${r.id}`} className="hover:text-cyan-400">{r.name}</Link></td>
                <td><span className={r.status === "ONLINE" ? "text-green-400" : r.status === "OFFLINE" ? "text-red-400" : "text-amber-400"}>● {r.status}</span></td>
                <td>{r.vpnIp ?? "—"}</td>
                <td>{r.uptime ?? "—"}</td>
                <td>{r.cpuLoad != null ? `${r.cpuLoad}%` : "—"}</td>
                <td className="space-x-2">
                  <button onClick={() => check(r.id)} disabled={busyId === r.id} className="rounded border border-slate-700 px-2 py-1 hover:border-cyan-500">
                    {busyId === r.id ? "…" : "Cek Status"}
                  </button>
                  <button onClick={() => del(r.id)} className="rounded border border-slate-700 px-2 py-1 hover:border-red-500 hover:text-red-400">Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
