import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, apiHandler } from "@/lib/auth";

// ============ Laporan penjualan per periode ============
// GET /api/reports?from=2026-11-01&to=2026-11-30
// → penjualan voucher + tagihan PPPoE lunas, per hari, dengan total.
export async function GET(req: NextRequest) {
  return apiHandler(async () => {
    const user = await requireUser();
    const from = new Date(req.nextUrl.searchParams.get("from") || Date.now() - 30 * 86400e3);
    const to = new Date(req.nextUrl.searchParams.get("to") || Date.now());
    to.setHours(23, 59, 59);

    const vouchers = await prisma.voucher.findMany({
      where: { userId: user.id, status: { in: ["SOLD", "ACTIVE"] }, soldAt: { gte: from, lte: to } },
      include: { profile: { select: { name: true } }, agent: { select: { name: true } } },
      orderBy: { soldAt: "desc" },
      take: 1000,
    });
    const payments = await prisma.payment.findMany({
      where: { userId: user.id, paidAt: { gte: from, lte: to } },
      include: { invoice: { select: { number: true, customer: { select: { name: true } } } } },
      orderBy: { paidAt: "desc" },
      take: 1000,
    });

    const voucherTotal = vouchers.reduce((s, v) => s + v.price, 0);
    const pppoeTotal = payments.reduce((s, p) => s + p.amount, 0);
    return { from, to, voucherCount: vouchers.length, voucherTotal, pppoeCount: payments.length, pppoeTotal, grandTotal: voucherTotal + pppoeTotal, vouchers, payments };
  });
}

// GET /api/reports/export?from=...&to=... → CSV (bisa dibuka di Excel)
export async function POST(req: NextRequest) {
  const user = await requireUser();
  const from = new Date(req.nextUrl.searchParams.get("from") || Date.now() - 30 * 86400e3);
  const to = new Date(req.nextUrl.searchParams.get("to") || Date.now());
  to.setHours(23, 59, 59);

  const { stringify } = await import("csv-stringify/sync");
  const vouchers = await prisma.voucher.findMany({
    where: { userId: user.id, status: { in: ["SOLD", "ACTIVE"] }, soldAt: { gte: from, lte: to } },
    include: { profile: { select: { name: true } }, agent: { select: { name: true } } },
    orderBy: { soldAt: "asc" },
    take: 5000,
  });
  const rows = vouchers.map((v) => [
    new Date(v.soldAt!).toISOString().slice(0, 10),
    "VOUCHER",
    v.code,
    v.profile.name,
    v.agent?.name ?? "-",
    v.buyerName ?? "Umum",
    v.price,
  ]);
  const csv = await stringify(rows, {
    header: true,
    columns: ["Tanggal", "Jenis", "Kode/No", "Profil", "Agen", "Pembeli", "Jumlah (Rp)"],
  });
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="laporan-${from.toISOString().slice(0, 10)}_${to.toISOString().slice(0, 10)}.csv"`,
    },
  });
}
