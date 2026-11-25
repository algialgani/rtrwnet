"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

// Halaman bayar pelanggan: publik, dibuka dari link di pesan WhatsApp
export default function PayPage() {
  const { number } = useParams();
  const [inv, setInv] = useState<any>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/pay/${number}`);
      const data = await res.json();
      if (!res.ok) return setErr(data.error);
      setInv(data);
    })();
  }, [number]);

  if (err) return <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100"><p className="text-red-400">{err}</p></main>;
  if (!inv) return <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100"><p>Memuat…</p></main>;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-8">
        <p className="text-sm text-slate-400">{inv.businessName}</p>
        <h1 className="text-2xl font-bold">Invoice {inv.number}</h1>
        <div className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-slate-400">Pelanggan</span><span>{inv.customer}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Jumlah</span><span className="text-xl font-bold text-cyan-400">Rp{inv.amount.toLocaleString("id-ID")}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Jatuh tempo</span><span>{new Date(inv.dueDate).toLocaleDateString("id-ID")}</span></div>
          <div className="flex justify-between">
            <span className="text-slate-400">Status</span>
            <span className={inv.status === "PAID" ? "text-green-400" : "text-red-400"}>
              {inv.status === "PAID" ? "LUNAS" : inv.status === "OVERDUE" ? "LEWAT JATUH TEMPO" : "BELUM DIBAYAR"}
            </span>
          </div>
        </div>
        {inv.status === "PAID" ? (
          <p className="mt-6 rounded bg-green-950 p-3 text-sm text-green-400">✓ Terima kasih, tagihan sudah lunas.</p>
        ) : inv.payUrl ? (
          <a href={inv.payUrl} className="mt-6 block rounded bg-cyan-500 py-3 text-center font-semibold text-slate-950">
            Bayar via {inv.gateway} {inv.sandbox && <span className="text-xs">(sandbox)</span>}
          </a>
        ) : (
          <div className="mt-6 rounded bg-amber-950 p-3 text-sm text-amber-300">
            Pembayaran online belum diaktifkan. Silakan transfer manual & kirim bukti ke admin — admin akan menandai lunas dari panel.
          </div>
        )}
      </div>
    </main>
  );
}
