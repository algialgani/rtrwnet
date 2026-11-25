"use client";

import { useEffect, useState } from "react";

// Laporan penjualan per periode + export CSV
export default function ReportsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400e3).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");

  const load = async () => {
    const res = await fetch(`/api/reports?from=${from}&to=${to}`);
    const d = await res.json();
    if (!res.ok) return setErr(d.error);
    setData(d);
  };
  useEffect(() => { load(); }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold">Laporan Penjualan</h1>
      {err && <p className="mt-4 rounded bg-red-950 p-2 text-sm text-red-400">{err}</p>}
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs text-slate-400">Dari</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="block rounded border border-slate-700 bg-slate-800 p-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-slate-400">Sampai</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="block rounded border border-slate-700 bg-slate-800 p-2 text-sm" />
        </div>
        <button onClick={load} className="rounded bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950">Tampilkan</button>
        <a href={`/api/reports/export?from=${from}&to=${to}`} className="rounded border border-cyan-500 px-4 py-2 text-sm text-cyan-400">⬇ Export CSV/Excel</a>
      </div>

      {!data ? <p className="mt-6 text-slate-400">Memuat…</p> : (
        <>
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs text-slate-400">Penjualan Voucher</p>
              <p className="text-2xl font-bold text-cyan-400">{data.voucherCount}</p>
              <p className="text-sm">Rp{data.voucherTotal.toLocaleString("id-ID")}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs text-slate-400">Tagihan PPPoE Lunas</p>
              <p className="text-2xl font-bold text-cyan-400">{data.pppoeCount}</p>
              <p className="text-sm">Rp{data.pppoeTotal.toLocaleString("id-ID")}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs text-slate-400">Total Pendapatan</p>
              <p className="text-2xl font-bold text-green-400">Rp{data.grandTotal.toLocaleString("id-ID")}</p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="font-semibold">Rincian Penjualan Voucher</h2>
            {data.vouchers.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Tidak ada penjualan voucher pada periode ini.</p>
            ) : (
              <table className="mt-3 w-full text-sm">
                <thead className="text-left text-slate-400"><tr><th className="py-1">Tanggal</th><th>Kode</th><th>Profil</th><th>Agen</th><th>Pembeli</th><th>Harga</th></tr></thead>
                <tbody>
                  {data.vouchers.map((v: any) => (
                    <tr key={v.id} className="border-t border-slate-800">
                      <td className="py-1.5">{new Date(v.soldAt).toLocaleDateString("id-ID")}</td>
                      <td className="font-mono">{v.code}</td>
                      <td>{v.profile.name}</td>
                      <td>{v.agent?.name ?? "—"}</td>
                      <td>{v.buyerName ?? "Umum"}</td>
                      <td>Rp{v.price.toLocaleString("id-ID")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
