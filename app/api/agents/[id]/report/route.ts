import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, apiHandler, HttpError } from "@/lib/auth";

// ============ Laporan agen (dilihat oleh ADMIN per agen) ============
export async function GET(_req: NextRequest, { params }: any) {
  return apiHandler(async () => {
    const user = await requireUser();
    const agent = await prisma.agent.findFirst({
      where: { id: params.id, ownerId: user.id },
    });
    if (!agent) throw new HttpError(404, "Agen tidak ditemukan");

    const sold = await prisma.voucher.findMany({
      where: { agentId: agent.id, status: { in: ["SOLD", "ACTIVE"] } },
      include: { profile: { select: { name: true } } },
      orderBy: { soldAt: "desc" },
      take: 100,
    });
    const total = sold.reduce((s, v) => s + v.price, 0);
    const commission = Math.floor((total * agent.commissionPct) / 100);
    return {
      agent: { name: agent.name, balance: agent.balance, commissionPct: agent.commissionPct },
      soldCount: sold.length,
      total,
      commission,
      sold,
    };
  });
}
