import { NextRequest } from "next/server";
import { stringify } from "csv-stringify/sync";
import { prisma } from "@/lib/db";
import { requireUser, apiHandler, HttpError } from "@/lib/auth";

// Export laporan CSV/Excel (bisa dibuka langsung di Excel/LibreOffice)
export async function GET(req: NextRequest) {
  return apiHandler(async () => {
    const user = await requireUser();
    const from = new Date(req.nextUrl.searchParams.get("from") || Date.now() - 30 * 86400e3);
    const to = new Date(req.nextUrl.searchParams.get("to") || Date.now());
    to.setHours(23, 59, 59, 999);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) throw new HttpError(400, "Format tanggal tidak valid");

    const [vouchers, payments] = await Promise.all([
      prisma.voucher.findMany({
        where: { userId: user.id, status: { in: ["SOLD", "ACTIVE"] }, soldAt: { gte: from, lte: to } },
        include: { profile: true, agent: true },
        orderBy: { soldAt: "asc" },
      }),
      prisma.payment.findMany({
        where: { userId: user.id, paidAt: { gte: from, lte: to } },
        include: { invoice: { include: { pppoeUser: { include: { customer: true } } } } },
        orderBy: { paidAt: "asc" },
      }),
    ]);

    const rows: string[][] = [
      ["Tanggal", "Jenis", "Keterangan", "Pembeli/Pelanggan", "Agen", "Nominal"],
    ];
    for (const v of vouchers) {
      rows.push([
        v.soldAt!.toISOString().slice(0, 10),
        "Voucher",
        v.code,
        v.buyerName ?? "Umum",
        v.agent?.name ?? "-",
        String(v.price),
      ]);
    }
    for (const p of payments) {
      rows.push([
        p.paidAt.toISOString().slice(0, 10),
        "Tagihan PPPoE",
        p.invoice.number,
        p.invoice.pppoeUser?.customer?.name ?? "-",
        "-",
        String(p.amount),
      ]);
    }

    const csv = stringify(rows, { delimiter: ";" }); // delimiter ; agar Excel ID langsung rapi
    return new Response("\uFEFF" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="laporan-${from.toISOString().slice(0, 10)}_${to.toISOString().slice(0, 10)}.csv"`,
      },
    });
  });
}
