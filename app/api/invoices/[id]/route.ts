import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, apiHandler, HttpError } from "@/lib/auth";

type Ctx = { params: { id: string } };

// PATCH: tandai lunas (mencatat Payment) / kembalikan ke belum bayar
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return apiHandler(async () => {
    const user = await requireUser();
    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, userId: user.id },
    });
    if (!invoice) throw new HttpError(404, "Tagihan tidak ditemukan");

    const parsed = z
      .object({ action: z.enum(["markPaid", "markUnpaid"]), method: z.enum(["MANUAL", "MIDTRANS", "XENDIT"]).default("MANUAL") })
      .safeParse(await req.json());
    if (!parsed.success) throw new HttpError(400, "Aksi tidak valid");

    if (parsed.data.action === "markPaid") {
      if (invoice.status === "PAID") throw new HttpError(400, "Tagihan sudah lunas");
      await prisma.$transaction([
        prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: "PAID", paidAt: new Date() },
        }),
        prisma.payment.create({
          data: {
            userId: user.id,
            invoiceId: invoice.id,
            amount: invoice.amount,
            method: parsed.data.method,
          },
        }),
      ]);
      return { ok: true, action: "markPaid" };
    }

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: "UNPAID", paidAt: null },
    });
    return { ok: true, action: "markUnpaid" };
  });
}

// GET: detail satu invoice
export async function GET(_req: NextRequest, { params }: Ctx) {
  return apiHandler(async () => {
    const user = await requireUser();
    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, userId: user.id },
      include: {
        customer: true,
        pppoeUser: { select: { username: true } },
        payments: true,
      },
    });
    if (!invoice) throw new HttpError(404, "Tagihan tidak ditemukan");
    return { invoice };
  });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  return apiHandler(async () => {
    const user = await requireUser();
    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, userId: user.id },
    });
    if (!invoice) throw new HttpError(404, "Tagihan tidak ditemukan");
    await prisma.invoice.delete({ where: { id: invoice.id } });
    return { ok: true };
  });
}
