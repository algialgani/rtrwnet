import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, apiHandler, HttpError } from "@/lib/auth";
import { removeHotspotUser } from "@/lib/mikrotik-sync";

type Ctx = { params: { id: string } };

// PATCH: jual voucher (tandai terjual + catat pembeli & harga) atau ubah data
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return apiHandler(async () => {
    const user = await requireUser();
    const voucher = await prisma.voucher.findFirst({
      where: { id: params.id, userId: user.id },
    });
    if (!voucher) throw new HttpError(404, "Voucher tidak ditemukan");

    const parsed = z
      .object({
        action: z.enum(["sell", "update"]),
        buyerName: z.string().min(1).optional(),
        price: z.number().int().min(0).optional(),
      })
      .safeParse(await req.json());
    if (!parsed.success) throw new HttpError(400, "Data tidak valid");

    if (parsed.data.action === "sell") {
      if (voucher.status !== "UNSOLD")
        throw new HttpError(400, "Voucher sudah terjual/aktif");
      await prisma.voucher.update({
        where: { id: voucher.id },
        data: {
          status: "SOLD",
          soldAt: new Date(),
          buyerName: parsed.data.buyerName ?? "Umum",
          price: parsed.data.price ?? voucher.price,
        },
      });
      // Komisi agen (jika voucher dialokasikan ke agen)
      if (voucher.agentId) {
        const agent = await prisma.agent.findFirst({
          where: { id: voucher.agentId, ownerId: user.id },
        });
        if (agent && agent.commissionPct > 0) {
          const price = parsed.data.price ?? voucher.price;
          await prisma.agent.update({
            where: { id: agent.id },
            data: { balance: { increment: Math.floor((price * agent.commissionPct) / 100) } },
          });
        }
      }
      return { ok: true, action: "sell" };
    }

    await prisma.voucher.update({
      where: { id: voucher.id },
      data: {
        ...(parsed.data.price != null ? { price: parsed.data.price } : {}),
        ...(parsed.data.buyerName ? { buyerName: parsed.data.buyerName } : {}),
      },
    });
    return { ok: true, action: "update" };
  });
}

// DELETE: hapus voucher di panel DAN user hotspot-nya di MikroTik
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  return apiHandler(async () => {
    const user = await requireUser();
    const voucher = await prisma.voucher.findFirst({
      where: { id: params.id, userId: user.id },
    });
    if (!voucher) throw new HttpError(404, "Voucher tidak ditemukan");
    try {
      await removeHotspotUser(voucher.routerId, voucher.code);
    } catch {
      // router offline: voucher dihapus di panel; user hotspot di router
      // dihapus nanti oleh job sinkronisasi
    }
    await prisma.voucher.delete({ where: { id: voucher.id } });
    return { ok: true };
  });
}
