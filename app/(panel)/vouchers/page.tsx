"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Daftar voucher + filter status + aksi jual/hapus/cetak
const STATUS_LABEL: Record<string, string> = {
  UNSOLD: "Belum terjual", SOLD: "Terjual", ACTIVE: "Aktif", EXPIRED: "Kedaluwarsa",
};
const STATUS_COLOR: Record<string, string> = {
  UNSOLD: "text-slate-300", SOLD: "text-cyan-400", ACTIVE: "text-green-400", EXPIRED: "text-red-400",
};

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [sellFor, setSellFor] = useState<any>(null);
  const [buyer, setBuyer] = useState("");
  const [price, setPrice] = useState(0);
  const [err, setErr] = useState("");

  const load = async () => {
    const res = await fetch(`/api/vouchers${status ? `?status=${status}` : ""}`);
    const data = await res.json();
    if (!res.ok) return setErr(data.error);
    setVouchers(data.vouchers);
  };
  useEffect(() => { load(); }, [status]);

  async function sell() {
    const res = await fetch(`/api/vouchers/${sellFor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sell", buyerName: buyer || "Umum", price: Number(price) || sellFor.price }),
    });
    const data = await res.json();
    setSellFor(null); setBuyer(""); setPrice(0);
    if (!res.ok) return setErr(data.error);
    load();
  }

  async function del(id: string) {
    if (!confirm("Hapus voucher (juga menghapus user hotspot di MikroTik)?")) return;
    const res = await fetch(`/api/vouchers/${id}`, { method: "DELETE" });
    if (!res.ok) return setErr((await res.json()).error);
    load();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Voucher Hotspot ({vouchers.length})</h1>
        <div className="flex gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded border border-slate-700 bg-slate-800 p-2 text-sm">
            <option value="">Semua status</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <Link href="/vouchers/new" className="rounded bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950">+ Generate Voucher</Link>
        </div>
      </div>
      {err && <p className="mt-4 rounded bg-red-950 p-2 text-sm text-red-400">{err}</p>}

      {vouchers.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-slate-700 bg-slate-900 p-6 text-center text-slate-300">
          Belum ada voucher. Buat profil hotspot dulu, lalu generate voucher dari profil tersebut.
        </p>
      ) : (
        <>
          <div className="mt-4">
            <a href={`/vouchers/print${selected.length ? `?ids=${selected.join(",")}` : ""}`} target="_blank" className="rounded border border-cyan-500 px-3 py-1.5 text-sm text-cyan-400">
              🖨️ Cetak {selected.length > 0 ? `${selected.length} voucher terpilih` : "semua (filter aktif)"}
            </a>
          </div>
          <table className="mt-4 w-full text-sm">
            <thead className="text-left text-slate-400">
              <tr><th className="py-2">Kode</th><th>Profil</th><th>Router</th><th>Harga</th><th>Status</th><th>Agen</th><th>Pembeli</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              {vouchers.map((v) => (
                <tr key={v.id} className="border-t border-slate-800">
                  <td className="py-2 font-mono">{v.code}</td>
                  <td>{v.profile.name}</td>
                  <td>{v.router.name}</td>
                  <td>Rp{v.price.toLocaleString("id-ID")}</td>
                  <td className={STATUS_COLOR[v.status]}>{STATUS_LABEL[v.status]}</td>
                  <td>{v.agent?.name ?? "—"}</td>
                  <td>{v.buyerName ?? "—"}</td>
                  <td className="space-x-2">
                    {v.status === "UNSOLD" && (
                      <button onClick={() => { setSellFor(v); setPrice(v.price); }} className="rounded border border-slate-700 px-2 py-1 hover:border-cyan-500">Jual</button>
                    )}
                    <input type="checkbox" checked={selected.includes(v.id)} onChange={(e) =>
                      setSelected(e.target.checked ? [...selected, v.id] : selected.filter((s) => s !== v.id))
                    } />
                    <button onClick={() => del(v.id)} className="rounded border border-slate-700 px-2 py-1 hover:border-red-500 hover:text-red-400">Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Dialog jual voucher */}
      {sellFor && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70" onClick={() => setSellFor(null)}>
          <div className="w-96 rounded-xl border border-slate-700 bg-slate-900 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">Jual Voucher {sellFor.code}</h2>
            <input placeholder="Nama pembeli" value={buyer} onChange={(e) => setBuyer(e.target.value)} className="mt-4 w-full rounded border border-slate-700 bg-slate-800 p-2.5" />
            <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="mt-3 w-full rounded border border-slate-700 bg-slate-800 p-2.5" />
            <div className="mt-4 flex gap-2">
              <button onClick={sell} className="flex-1 rounded bg-cyan-500 py-2 font-semibold text-slate-950">Tandai Terjual</button>
              <button onClick={() => setSellFor(null)} className="rounded border border-slate-700 px-4">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
