import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, apiHandler, HttpError } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";
import { addPppoeSecret } from "@/lib/mikrotik-sync";

// GET daftar pelanggan PPPoE milik user
export async function GET() {
  return apiHandler(async () => {
    const user = await requireUser();
    const users = await prisma.pppoeUser.findMany({
      where: { userId: user.id },
      include: {
        profile: { select: { name: true, price: true } },
        router: { select: { name: true } },
        customer: { select: { name: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return { users };
  });
}

// POST tambah pelanggan PPPoE → tersimpan di DB + secret dibuat di MikroTik
export async function POST(req: NextRequest) {
  return apiHandler(async () => {
    const user = await requireUser();
    const parsed = z
      .object({
        routerId: z.string(),
        profileId: z.string(),
        username: z.string().min(3),
        password: z.string().min(4),
        customerName: z.string().min(1),
        customerPhone: z.string().min(9),
        customerAddress: z.string().optional(),
      })
      .safeParse(await req.json());
    if (!parsed.success) throw new HttpError(400, "Data pelanggan PPPoE tidak valid");
    const d = parsed.data;

    const router = await prisma.router.findFirst({ where: { id: d.routerId, userId: user.id } });
    const profile = await prisma.profile.findFirst({ where: { id: d.profileId, userId: user.id, type: "PPPOE" } });
    if (!router) throw new HttpError(404, "Router tidak ditemukan / bukan milik Anda");
    if (!profile) throw new HttpError(404, "Profil PPPoE tidak ditemukan");
    if (await prisma.pppoeUser.findFirst({ where: { routerId: d.routerId, username: d.username } }))
      throw new HttpError(409, "Username PPPoE sudah dipakai di router ini");

    // Customer terkait (upsert by phone per user)
    let customer = await prisma.customer.findFirst({
      where: { userId: user.id, phone: d.customerPhone },
    });
    if (!customer) {
      customer = await prisma.customer.create({
        data: { userId: user.id, name: d.customerName, phone: d.customerPhone, address: d.customerAddress },
      });
    }

    let syncError: string | null = null;
    try {
      await addPppoeSecret(d.routerId, d.username, d.password, profile.name, "RTNetPanel");
    } catch {
      syncError = "Router tidak terjangkau: secret akan dibuat saat router online (job sinkron).";
    }

    const pppoe = await prisma.pppoeUser.create({
      data: {
        userId: user.id,
        routerId: d.routerId,
        profileId: d.profileId,
        customerId: customer.id,
        username: d.username,
        passwordEnc: encrypt(d.password), // tersimpan terenkripsi, diperlukan untuk sync ulang
        status: "ACTIVE",
        ...(syncError ? {} : { syncedAt: new Date() }),
      },
      include: { profile: true, customer: true },
    });

    return { ok: true, pppoe, syncError };
  });
}
