import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, apiHandler, HttpError } from "@/lib/auth";
import { resolveVpnIp } from "@/lib/openvpn";
import { checkRouterStatus } from "@/lib/mikrotik";

type Ctx = { params: { id: string } };

// POST: cek status router sekarang.
// Untuk router PENDING: baca status log OpenVPN untuk mendeteksi IP tunnel,
// lalu coba konek API → kalau sukses, status berubah ONLINE.
export async function POST(_req: NextRequest, { params }: Ctx) {
  return apiHandler(async () => {
    const user = await requireUser();
    const router = await prisma.router.findFirst({
      where: { id: params.id, userId: user.id },
    });
    if (!router) throw new HttpError(404, "Router tidak ditemukan");

    if (router.status === "PENDING") {
      const vpnIp = await resolveVpnIp(router.id);
      if (!vpnIp)
        return {
          status: "PENDING",
          message:
            "Router belum terdeteksi. Pastikan script sudah dijalankan di terminal MikroTik dan klien OpenVPN sudah connected.",
        };
      await prisma.router.update({ where: { id: router.id }, data: { vpnIp } });
    }

    const status = await checkRouterStatus(router.id);
    await prisma.routerLog.create({
      data: {
        routerId: router.id,
        message: `Status check: ${status}`,
        level: status === "ONLINE" ? "INFO" : "WARN",
      },
    });
    return { status };
  });
}
