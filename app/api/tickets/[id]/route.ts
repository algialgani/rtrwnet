import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, apiHandler, HttpError } from "@/lib/auth";

type Ctx = { params: { id: string } };

// GET riwayat percakapan tiket
export async function GET(_req: NextRequest, { params }: Ctx) {
  return apiHandler(async () => {
    const user = await requireUser();
    const ticket = await prisma.ticket.findFirst({
      where: { id: params.id, userId: user.id },
      include: {
        replies: { include: { user: { select: { name: true, role: true } } }, orderBy: { createdAt: "asc" } },
      },
    });
    if (!ticket) throw new HttpError(404, "Tiket tidak ditemukan");
    return { ticket };
  });
}

// PATCH: balas tiket / ubah status (terbuka → diproses → selesai)
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return apiHandler(async () => {
    const user = await requireUser();
    const ticket = await prisma.ticket.findFirst({
      where: { id: params.id, userId: user.id },
    });
    if (!ticket) throw new HttpError(404, "Tiket tidak ditemukan");

    const parsed = z
      .object({
        reply: z.string().min(1).optional(),
        status: z.enum(["OPEN", "IN_PROGRESS", "CLOSED"]).optional(),
      })
      .safeParse(await req.json());
    if (!parsed.success) throw new HttpError(400, "Data tidak valid");

    if (parsed.data.reply) {
      await prisma.ticketReply.create({
        data: { ticketId: ticket.id, userId: user.id, message: parsed.data.reply },
      });
    }
    if (parsed.data.status) {
      await prisma.ticket.update({ where: { id: ticket.id }, data: { status: parsed.data.status } });
    }
    return { ok: true };
  });
}
