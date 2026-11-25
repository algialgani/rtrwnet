import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, apiHandler, HttpError } from "@/lib/auth";

// ============ Tiket Bantuan ============
// Nomor tiket: IN + 2 digit tahun + nomor urut 6 digit → IN25000001

async function nextTicketNumber(): Promise<string> {
  const year = new Date().getFullYear() % 100;
  const seq = (await prisma.ticket.count({
    where: { number: { startsWith: `IN${year}` } },
  })) + 1;
  return `IN${year}${String(seq).padStart(6, "0")}`;
}

export async function GET(req: NextRequest) {
  return apiHandler(async () => {
    const user = await requireUser();
    const status = req.nextUrl.searchParams.get("status");
    // Admin melihat tiket miliknya; pelanggan/agen melihat tiket buatannya sendiri
    const tickets = await prisma.ticket.findMany({
      where: { userId: user.id, ...(status ? { status: status as any } : {}) },
      include: { _count: { select: { replies: true } } },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });
    return { tickets };
  });
}

export async function POST(req: NextRequest) {
  return apiHandler(async () => {
    const user = await requireUser();
    const parsed = z
      .object({ subject: z.string().min(3), message: z.string().min(3) })
      .safeParse(await req.json());
    if (!parsed.success) throw new HttpError(400, "Subjek dan pesan wajib diisi");

    const ticket = await prisma.ticket.create({
      data: { number: await nextTicketNumber(), userId: user.id, subject: parsed.data.subject, status: "OPEN" },
    });
    await prisma.ticketReply.create({
      data: { ticketId: ticket.id, userId: user.id, message: parsed.data.message },
    });
    return { ok: true, ticket };
  });
}
