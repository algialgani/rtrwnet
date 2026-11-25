import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, apiHandler, HttpError } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";
import { maxRouters } from "@/lib/plan-limits";
import { generateVpnCredentials, buildMikrotikScript } from "@/lib/openvpn";

// GET: daftar router milik user (kepemilikan selalu difilter by userId)
export async function GET() {
  return apiHandler(async () => {
    const user = await requireUser();
    const routers = await prisma.router.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return { routers, maxRouters: user.subscription?.maxRouters ?? 1 };
  });
}

// POST: tambah router — batas paket DITEGAKKAN DI SERVER
export async function POST(req: NextRequest) {
  return apiHandler(async () => {
    const user = await requireUser();
    const parsed = z
      .object({
        name: z.string().min(2),
        apiUser: z.string().min(1),
        apiPass: z.string().min(1),
        useRest: z.boolean().default(true),
      })
      .safeParse(await req.json());
    if (!parsed.success) throw new HttpError(400, "Data router tidak valid");
    const { name, apiUser, apiPass, useRest } = parsed.data;

    const count = await prisma.router.count({ where: { userId: user.id } });
    const limit = user.subscription?.maxRouters ?? maxRouters(user.subscription?.plan ?? "FREE");
    if (count >= limit)
      throw new HttpError(403, `Batas paket ${user.subscription?.plan} adalah ${limit} router. Upgrade paket untuk menambah.`);

    // 1) Buat router dulu (status PENDING) agar punya id
    const router = await prisma.router.create({
      data: {
        userId: user.id,
        name,
        apiUser,
        apiPassEnc: encrypt(apiPass), // kredensial tidak pernah plaintext
        useRest,
        status: "PENDING",
      },
    });

    // 2) Generate kredensial VPN unik per router + script MikroTik
    const cred = generateVpnCredentials(router.id);
    const script = buildMikrotikScript(name, cred.username, cred.password);
    await prisma.router.update({
      where: { id: router.id },
      data: { configScript: script },
    });

    return { ok: true, routerId: router.id, script };
  });
}
