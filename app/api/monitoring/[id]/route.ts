import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, apiHandler, HttpError } from "@/lib/auth";
import { connectRouter } from "@/lib/mikrotik";

type Ctx = { params: { id: string } };

// GET data monitoring router: interface live (bila router online),
// histori traffic tersimpan, DHCP leases, dan log.
// Router milik user lain → 404 (kepemilikan dicek di query).
export async function GET(_req: NextRequest, { params }: Ctx) {
  return apiHandler(async () => {
    const user = await requireUser();
    const router = await prisma.router.findFirst({
      where: { id: params.id, userId: user.id },
    });
    if (!router) throw new HttpError(404, "Router tidak ditemukan");

    let interfaces: any[] = [];
    if (router.status === "ONLINE" && router.vpnIp) {
      try {
        const { client } = await connectRouter(router.id);
        interfaces = await client.rest("/interface");
        client.close();
      } catch {
        // router hilang di tengah polling → tetap tampilkan histori
      }
    }

    const [traffic, leases, logs] = await Promise.all([
      prisma.trafficHistory.findMany({
        where: { routerId: router.id },
        orderBy: { sampledAt: "desc" },
        take: 200,
      }),
      prisma.dhcpLease.findMany({ where: { routerId: router.id } }),
      prisma.routerLog.findMany({
        where: { routerId: router.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    return { router, interfaces, traffic, leases, logs };
  });
}
