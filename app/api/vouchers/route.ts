import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, apiHandler, HttpError } from "@/lib/auth";
import { voucherCode } from "@/lib/crypto";
import { ensureHotspotProfile, addHotspotUser } from "@/lib/mikrotik-sync";

// GET daftar voucher: admin = semua voucher miliknya; agen = hanya stok miliknya
export async function GET(req: NextRequest) {
  return apiHandler(async () => {
    const user = await requireUser();
    const status = req.nextUrl.searchParams.get("status");
    const routerId = req.nextUrl.searchParams.get("routerId");
    let where: any = {
      ...(status ? { status: status as any } : {}),
      ...(routerId ? { routerId } : {}),
    };
    if (user.role === "AGENT") {
      const agent = await prisma.agent.findUnique({ where: { userId: user.id } });
      if (!agent) return { vouchers: [], agentBalance: 0 };
      where.agentId = agent.id;
      const vouchers = await prisma.voucher.findMany({
        where, include: { profile: { select: { name: true, price: true } }, router: { select: { name: true } }, agent: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 500,
      });
      return { vouchers, agentBalance: agent.balance, role: "AGENT" };
    }
    where.userId = user.id;
    const vouchers = await prisma.voucher.findMany({
      where, include: { profile: { select: { name: true, price: true } }, router: { select: { name: true } }, agent: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    return { vouchers, role: "ADMIN" };
  });
}

// POST generate voucher massal 1–500 → tersimpan di DB DAN dibuat di MikroTik
export async function POST(req: NextRequest) {
  return apiHandler(async () => {
    const user = await requireUser();
    const parsed = z
      .object({
        routerId: z.string(),
        profileId: z.string(),
        quantity: z.number().int().min(1).max(500),
        codeLength: z.number().int().min(4).max(10).default(6),
        agentId: z.string().optional(),
      })
      .safeParse(await req.json());
    if (!parsed.success) throw new HttpError(400, "Jumlah voucher harus 1–500");
    const { routerId, profileId, quantity, codeLength, agentId } = parsed.data;

    const router = await prisma.router.findFirst({ where: { id: routerId, userId: user.id } });
    const profile = await prisma.profile.findFirst({ where: { id: profileId, userId: user.id, type: "HOTSPOT" } });
    if (!router) throw new HttpError(404, "Router tidak ditemukan / bukan milik Anda");
    if (!profile) throw new HttpError(404, "Profil hotspot tidak ditemukan");
    if (agentId) {
      const agent = await prisma.agent.findFirst({ where: { id: agentId, ownerId: user.id } });
      if (!agent) throw new HttpError(404, "Agen tidak ditemukan");
    }

    // Sinkronisasi ke MikroTik: profil dulu, lalu tiap kode voucher
    let synced = 0;
    let syncError: string | null = null;
    try {
      await ensureHotspotProfile(routerId, profileId);
    } catch (e: any) {
      syncError = `Router offline / API tidak terjangkau: voucher tetap dibuat di panel dan akan disinkronkan saat router online.`;
    }

    const codes: string[] = [];
    for (let i = 0; i < quantity; i++) {
      let code = voucherCode(codeLength);
      while (await prisma.voucher.findUnique({ where: { code } })) code = voucherCode(codeLength);
      codes.push(code);
    }

    const created = await prisma.$transaction(
      codes.map((code) =>
        prisma.voucher.create({
          data: {
            userId: user.id,
            routerId,
            profileId,
            code,
            price: profile.price,
            ...(agentId ? { agentId } : {}),
          },
        })
      )
    );

    // Kirim user hotspot ke router (best-effort; gagal → diulang job sinkron)
    if (!syncError) {
      for (const code of codes) {
        try {
          await addHotspotUser(routerId, code, profile.name, profile.durationValue, profile.durationUnit);
          await prisma.voucher.update({ where: { id: created[codes.indexOf(code)].id }, data: { syncedAt: new Date() } });
          synced++;
        } catch (e: any) {
          syncError = "Sebagian voucher gagal sinkron ke router (akan diulang otomatis).";
          break;
        }
      }
    }

    return { ok: true, created: created.length, syncedToRouter: synced, syncError, vouchers: created };
  });
}
