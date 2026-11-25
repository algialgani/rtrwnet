import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Dashboard: kartu statistik live dari database — TANPA data demo.
// Belum ada data → tampil state kosong dengan ajakan menambah data.
export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const uid = user.id;

  const [routers, activePppoe, vouchersToday, unpaidInv, monthRevenue] = await Promise.all([
    prisma.router.findMany({ where: { userId: uid } }),
    prisma.pppoeUser.count({ where: { userId: uid, status: "ACTIVE" } }),
    prisma.voucher.count({
      where: { userId: uid, soldAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
    prisma.invoice.count({ where: { userId: uid, status: { in: ["UNPAID", "OVERDUE"] } } }),
    prisma.payment.aggregate({
      where: { userId: uid, paidAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
      _sum: { amount: true },
    }),
  ]);

  const online = routers.filter((r) => r.status === "ONLINE").length;
  const offline = routers.filter((r) => r.status === "OFFLINE").length;

  // Penjualan voucher 7 hari terakhir untuk grafik batang
  const since = new Date(Date.now() - 7 * 24 * 3600e3);
  const sales = await prisma.voucher.groupBy({
    by: ["soldAt"],
    where: { userId: uid, soldAt: { gte: since } },
    _count: true,
  });

  const cards = [
    { label: "Router Online", value: online, href: "/routers" },
    { label: "Router Offline", value: offline, href: "/routers" },
    { label: "Pelanggan PPPoE Aktif", value: activePppoe, href: "/pppoe" },
    { label: "Voucher Terjual Hari Ini", value: vouchersToday, href: "/vouchers" },
    { label: "Tagihan Belum Dibayar", value: unpaidInv, href: "/invoices" },
    { label: "Pendapatan Bulan Ini", value: `Rp${(monthRevenue._sum.amount ?? 0).toLocaleString("id-ID")}`, href: "/reports" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      {routers.length === 0 && (
        <div className="mt-4 rounded-lg border border-dashed border-slate-700 bg-slate-900 p-6 text-center">
          <p className="text-slate-300">Belum ada router terdaftar.</p>
          <Link href="/routers/new" className="mt-3 inline-block rounded bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950">
            + Tambah Router Pertama
          </Link>
        </div>
      )}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-6">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-cyan-500">
            <p className="text-xs text-slate-400">{c.label}</p>
            <p className="mt-1 text-2xl font-bold text-cyan-400">{c.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="font-semibold">Penjualan Voucher — 7 Hari Terakhir</h2>
        {sales.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Belum ada penjualan voucher. <Link href="/vouchers" className="text-cyan-400">Buat voucher →</Link></p>
        ) : (
          <div className="mt-3 flex h-32 items-end gap-2">
            {sales.map((s) => (
              <div key={s.soldAt!.toISOString()} className="flex-1 rounded-t bg-cyan-600" style={{ height: `${Math.min(100, s._count * 10)}%` }} title={`${s._count} voucher`} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="font-semibold">Status Router</h2>
        {routers.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Tambahkan router untuk melihat status real-time.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-slate-400"><tr><th className="py-1">Nama</th><th>Status</th><th>Uptime</th><th>CPU</th><th>RouterOS</th></tr></thead>
            <tbody>
              {routers.map((r) => (
                <tr key={r.id} className="border-t border-slate-800">
                  <td className="py-1.5"><Link href={`/routers/${r.id}`} className="hover:text-cyan-400">{r.name}</Link></td>
                  <td><span className={r.status === "ONLINE" ? "text-green-400" : r.status === "OFFLINE" ? "text-red-400" : "text-amber-400"}>● {r.status}</span></td>
                  <td>{r.uptime ?? "—"}</td>
                  <td>{r.cpuLoad != null ? `${r.cpuLoad}%` : "—"}</td>
                  <td>{r.rosVersion ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
