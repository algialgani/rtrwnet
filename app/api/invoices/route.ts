import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, apiHandler, HttpError } from "@/lib/auth";

// ============ Tagihan & Invoice ============
// Nomor invoice: INV-YYYYMM-XXXX (urut per user per bulan)

export async function GET(req: NextRequest) {
  return apiHandler(async () => {
    const user = await requireUser();
    const status = req.nextUrl.searchParams.get("status");
    const invoices = await prisma.invoice.findMany({
      where: {
        userId: user.id,
        ...(status ? { status: status as any } : {}),
      },
      include: {
        customer: { select: { name: true, phone: true } },
        pppoeUser: { select: { username: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    return { invoices };
  });
}

// POST: generate tagihan bulanan untuk semua pelanggan PPPoE aktif.
// Dipakai tombol manual di UI dan oleh cron bulanan (jobs/invoices.ts).
export async function POST(req: NextRequest) {
  return apiHandler(async () => {
    const user = await requireUser();
    const parsed = z
      .object({ period: z.string().regex(/^\d{4}-\d{2}$/).optional() })
      .safeParse(await req.json().catch(() => ({})));
    // Default: periode bulan depan
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const period = parsed.success && parsed.data.period ? parsed.data.period : `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
    const [year, month] = period.split("-").map(Number);
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0, 23, 59, 59);
    const dueDate = new Date(periodEnd.getTime() + 7 * 86400e3); // jatuh tempo +7 hari

    const activeUsers = await prisma.pppoeUser.findMany({
      where: { userId: user.id, status: "ACTIVE", isolated: false },
      include: { profile: true, customer: true },
    });
    if (activeUsers.length === 0)
      throw new HttpError(400, "Tidak ada pelanggan PPPoE aktif untuk ditagih");

    const created = [];
    for (const pu of activeUsers) {
      // Anti-duplikat: satu tagihan per pelanggan per periode
      const dup = await prisma.invoice.findFirst({
        where: { userId: user.id, pppoeUserId: pu.id, periodStart },
      });
      if (dup) continue;

      // Nomor urut per user: INV-YYYYMM-0001
      const seq = (await prisma.invoice.count({
        where: { userId: user.id, number: { startsWith: `INV-${period}` } },
      })) + 1;
      const number = `INV-${period}-${String(seq).padStart(4, "0")}`;

      created.push(
        await prisma.invoice.create({
          data: {
            userId: user.id,
            customerId: pu.customerId,
            pppoeUserId: pu.id,
            number,
            amount: pu.profile.price,
            periodStart,
            periodEnd,
            dueDate,
            status: "UNPAID",
          },
        })
      );
    }
    return { ok: true, created: created.length };
  });
}
