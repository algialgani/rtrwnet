"use client";

import { useEffect, useState } from "react";

// Tagihan: generate bulanan, tandai lunas, pengingat WA, unduh PDF
const STATUS: Record<string, string> = { UNPAID: "Belum bayar", PAID: "Lunas", OVERDUE: "Lewat jatuh tempo" };
const COLOR: Record<string, string> = { UNPAID: "text-amber-400", PAID: "text-green-400", OVERDUE: "text-red-400" };

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [status, setStatus] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = async () => {
    const res = await fetch(`/api/invoices${status ? `?status=${status}` : ""}`);
    const data = await res.json();
    if (!res.ok) return setErr(data.error);
    setInvoices(data.invoices);
  };
  useEffect(() => { load(); }, [status]);

  async function generate() {
    setErr(""); setMsg("");
    const res = await fetch("/api/invoices", { method: "POST" });
    const data = await res.json();
    if (!res.ok) return setErr(data.error);
    setMsg(`${data.created} tagihan dibuat untuk periode berikutnya.`);
    load();
  }

  async function action(id: string, act: string) {
    setErr("");
    const res = await fetch(`/api/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: act }),
    });
    const data = await res.json();
    if (!res.ok) return setErr(data.error);
    load();
  }

  async function remind(id: string) {
    setErr(""); setMsg("");
    const res = await fetch(`/api/invoices/${id}/remind`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) return setErr(data.error);
    setMsg(`Pengingat terkirim ke WhatsApp ${data.sentTo}`);
  }

  async function del(id: string) {
    if (!confirm("Hapus tagihan ini?")) return;
    const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    if (!res.ok) return setErr((await res.json()).error);
    load();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Tagihan ({invoices.length})</h1>
        <div className="flex gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded border border-slate-700 bg-slate-800 p-2 text-sm">
            <option value="">Semua</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button onClick={generate} className="rounded bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950">⚡ Generate Tagihan Bulanan</button>
        </div>
      </div>
      {err && <p className="mt-4 rounded bg-red-950 p-2 text-sm text-red-400">{err}</p>}
      {msg && <p className="mt-4 rounded bg-green-950 p-2 text-sm text-green-400">{msg}</p>}

      {invoices.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-slate-700 bg-slate-900 p-6 text-center text-slate-300">
          Belum ada tagihan. Tambahkan pelanggan PPPoE aktif, lalu klik Generate Tagihan Bulanan (atau biarkan cron yang jalan otomatis tiap bulan).
        </p>
      ) : (
        <table className="mt-6 w-full text-sm">
          <thead className="text-left text-slate-400"><tr><th className="py-2">Nomor</th><th>Pelanggan</th><th>Jumlah</th><th>Jatuh Tempo</th><th>Status</th><th>Aksi</th></tr></thead>
          <tbody>
            {invoices.map((iv) => (
              <tr key={iv.id} className="border-t border-slate-800">
                <td className="py-2 font-mono text-xs">{iv.number}</td>
                <td>{iv.customer?.name ?? iv.pppoeUser?.username}</td>
                <td>Rp{iv.amount.toLocaleString("id-ID")}</td>
                <td>{new Date(iv.dueDate).toLocaleDateString("id-ID")}</td>
                <td className={COLOR[iv.status]}>{STATUS[iv.status]}</td>
                <td className="space-x-2 whitespace-nowrap">
                  {iv.status !== "PAID" && (
                    <>
                      <button onClick={() => action(iv.id, "markPaid")} className="rounded border border-slate-700 px-2 py-1 hover:border-green-500 hover:text-green-400">Lunas</button>
                      <button onClick={() => remind(iv.id)} className="rounded border border-slate-700 px-2 py-1 hover:border-cyan-500">WA</button>
                    </>
                  )}
                  {iv.status === "PAID" && (
                    <button onClick={() => action(iv.id, "markUnpaid")} className="rounded border border-slate-700 px-2 py-1">Batal Lunas</button>
                  )}
                  <a href={`/api/invoices/${iv.id}/pdf`} className="rounded border border-slate-700 px-2 py-1 hover:border-cyan-500 inline-block">PDF</a>
                  <a href={`/pay/${iv.number}`} target="_blank" className="rounded border border-slate-700 px-2 py-1 inline-block">Link</a>
                  <button onClick={() => del(iv.id)} className="rounded border border-slate-700 px-2 py-1 hover:border-red-500 hover:text-red-400">Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
