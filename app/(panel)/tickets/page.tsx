"use client";

import { useEffect, useState } from "react";

// Tiket bantuan: buat tiket, balas, ubah status
const STATUS_LABEL: Record<string, string> = { OPEN: "Terbuka", IN_PROGRESS: "Diproses", CLOSED: "Selesai" };
const STATUS_COLOR: Record<string, string> = { OPEN: "text-amber-400", IN_PROGRESS: "text-cyan-400", CLOSED: "text-green-400" };

export default function TicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [openId, setOpenId] = useState("");
  const [thread, setThread] = useState<any>(null);
  const [reply, setReply] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const load = async () => {
    const res = await fetch("/api/tickets");
    const d = await res.json();
    if (!res.ok) return setErr(d.error);
    setTickets(d.tickets);
  };
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setMsg("");
    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, message }),
    });
    const d = await res.json();
    if (!res.ok) return setErr(d.error);
    setMsg(`Tiket ${d.ticket.number} dibuat.`);
    setSubject(""); setMessage("");
    load();
  }

  const openThread = async (id: string) => {
    setOpenId(id);
    const res = await fetch(`/api/tickets/${id}`);
    const d = await res.json();
    if (res.ok) setThread(d.ticket);
  };

  async function sendReply() {
    if (!reply) return;
    await fetch(`/api/tickets/${openId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply }),
    });
    setReply("");
    openThread(openId); load();
  }

  async function setStatus(id: string, status: string) {
    await fetch(`/api/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
    if (openId === id) openThread(id);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Tiket Bantuan</h1>
      {err && <p className="mt-4 rounded bg-red-950 p-2 text-sm text-red-400">{err}</p>}
      {msg && <p className="mt-4 rounded bg-green-950 p-2 text-sm text-green-400">{msg}</p>}

      <form onSubmit={create} className="mt-6 space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <input required placeholder="Subjek masalah" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded border border-slate-700 bg-slate-800 p-2.5" />
        <textarea required placeholder="Jelaskan masalah Anda…" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} className="w-full rounded border border-slate-700 bg-slate-800 p-2.5" />
        <button className="rounded bg-cyan-500 px-5 py-2 font-semibold text-slate-950">+ Buat Tiket</button>
      </form>

      {tickets.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-slate-700 bg-slate-900 p-6 text-center text-slate-300">Belum ada tiket.</p>
      ) : (
        <table className="mt-6 w-full text-sm">
          <thead className="text-left text-slate-400"><tr><th className="py-2">Nomor</th><th>Subjek</th><th>Status</th><th>Balasan</th><th>Update</th><th>Aksi</th></tr></thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id} className="border-t border-slate-800">
                <td className="py-2 font-mono text-xs">{t.number}</td>
                <td>{t.subject}</td>
                <td className={STATUS_COLOR[t.status]}>{STATUS_LABEL[t.status]}</td>
                <td>{t._count.replies}</td>
                <td>{new Date(t.updatedAt).toLocaleString("id-ID")}</td>
                <td className="space-x-2">
                  <button onClick={() => openThread(t.id)} className="rounded border border-slate-700 px-2 py-1">Buka</button>
                  {t.status !== "CLOSED" && (
                    <button onClick={() => setStatus(t.id, t.status === "OPEN" ? "IN_PROGRESS" : "CLOSED")} className="rounded border border-slate-700 px-2 py-1">
                      {t.status === "OPEN" ? "Proses" : "Selesaikan"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {thread && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70" onClick={() => { setThread(null); setOpenId(""); }}>
          <div className="flex max-h-[80vh] w-[36rem] flex-col rounded-xl border border-slate-700 bg-slate-900 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold">{thread.number} — {thread.subject}</h2>
            <div className="mt-4 flex-1 space-y-2 overflow-y-auto">
              {thread.replies.map((r: any) => (
                <div key={r.id} className={`rounded p-3 text-sm ${r.user.role === "ADMIN" ? "bg-cyan-950" : "bg-slate-800"}`}>
                  <p className="text-xs text-slate-400">{r.user.name} ({r.user.role === "ADMIN" ? "Admin" : "Pelanggan"}) · {new Date(r.createdAt).toLocaleString("id-ID")}</p>
                  <p className="mt-1">{r.message}</p>
                </div>
              ))}
            </div>
            {thread.status !== "CLOSED" && (
              <div className="mt-4 flex gap-2">
                <input placeholder="Tulis balasan…" value={reply} onChange={(e) => setReply(e.target.value)} className="flex-1 rounded border border-slate-700 bg-slate-800 p-2.5" />
                <button onClick={sendReply} className="rounded bg-cyan-500 px-4 font-semibold text-slate-950">Kirim</button>
              </div>
            )}
            <button onClick={() => { setThread(null); setOpenId(""); }} className="mt-3 w-full rounded border border-slate-700 py-2">Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
}
