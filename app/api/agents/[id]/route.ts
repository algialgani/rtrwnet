import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, apiHandler, HttpError } from "@/lib/auth";

type Ctx = { params: { id: string } };

// PATCH: edit agen / tambah-kurangi saldo / alokasikan saldo
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return apiHandler(async () => {
    const user = await requireUser();
    const agent = await prisma.agent.findFirst({
      where: { id: params.id, ownerId: user.id },
    });
    if (!agent) throw new HttpError(404, "Agen tidak ditemukan");

    const parsed = z
      .object({
        name: z.string().min(2).optional(),
        phone: z.string().optional(),
        commissionPct: z.number().int().min(0).max(100).optional(),
        isActive: z.boolean().optional(),
        // penyesuaian saldo: positif = tambah, negatif = kurangi
        balanceDelta: z.number().int().optional(),
        note: z.string().optional(),
      })
      .safeParse(await req.json());
    if (!parsed.success) throw new HttpError(400, "Data tidak valid");
    const d = parsed.data;

    const delta = d.balanceDelta ?? 0;
    if (delta < 0 && agent.balance + delta < 0)
      throw new HttpError(400, "Saldo agen tidak boleh negatif");

    const updated = await prisma.agent.update({
      where: { id: agent.id },
      data: {
        ...(d.name ? { name: d.name } : {}),
        ...(d.phone ? { phone: d.phone } : {}),
        ...(d.commissionPct != null ? { commissionPct: d.commissionPct } : {}),
        ...(d.isActive != null ? { isActive: d.isActive } : {}),
        ...(delta ? { balance: { increment: delta } } : {}),
      },
    });
    return { ok: true, balance: updated.balance };
  });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  return apiHandler(async () => {
    const user = await requireUser();
    const agent = await prisma.agent.findFirst({
      where: { id: params.id, ownerId: user.id },
    });
    if (!agent) throw new HttpError(404, "Agen tidak ditemukan");
    await prisma.agent.delete({ where: { id: agent.id } });
    return { ok: true };
  });
}
