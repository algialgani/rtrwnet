import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, apiHandler, HttpError, hashPassword } from "@/lib/auth";
import { randomToken } from "@/lib/crypto";

// ============ Agen / Reseller ============
// Agen punya akun login sendiri (role AGENT), hanya bisa melihat/voucher
// miliknya sendiri. Saldo diatur oleh admin.

const schema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  commissionPct: z.number().int().min(0).max(100).default(0),
  // Opsional: buatkan akun login agen langsung
  agentEmail: z.string().email().optional(),
  agentPassword: z.string().min(8).optional(),
});

export async function GET() {
  return apiHandler(async () => {
    const user = await requireUser();
    const agents = await prisma.agent.findMany({
      where: { ownerId: user.id },
      include: {
        user: { select: { email: true } },
        _count: { select: { vouchers: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return { agents };
  });
}

export async function POST(req: NextRequest) {
  return apiHandler(async () => {
    const user = await requireUser();
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) throw new HttpError(400, "Data agen tidak valid");
    const { name, phone, commissionPct, agentEmail, agentPassword } = parsed.data;

    let userId: string | undefined;
    if (agentEmail && agentPassword) {
      if (await prisma.user.findUnique({ where: { email: agentEmail } }))
        throw new HttpError(409, "Email agen sudah terdaftar");
      const agentUser = await prisma.user.create({
        data: {
          name,
          email: agentEmail,
          passwordHash: await hashPassword(agentPassword),
          whatsapp: phone,
          role: "AGENT",
          subscription: { create: { plan: "FREE", maxRouters: 0 } },
          settings: { create: {} },
        },
      });
      userId = agentUser.id;
    }

    const agent = await prisma.agent.create({
      data: { ownerId: user.id, userId, name, phone, commissionPct },
    });
    return { ok: true, agent };
  });
}
