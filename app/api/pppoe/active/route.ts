import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, apiHandler, HttpError } from "@/lib/auth";
import { listPppoeActive } from "@/lib/mikrotik-sync";

// GET koneksi PPPoE aktif langsung dari router (/?routerId=...)
export async function GET(req: NextRequest) {
  return apiHandler(async () => {
    const user = await requireUser();
    const routerId = req.nextUrl.searchParams.get("routerId");
    if (!routerId) throw new HttpError(400, "routerId wajib");
    const router = await prisma.router.findFirst({
      where: { id: routerId, userId: user.id },
    });
    if (!router) throw new HttpError(404, "Router tidak ditemukan");
    try {
      const active = await listPppoeActive(routerId);
      return { active, reachable: true };
    } catch {
      return { active: [], reachable: false };
    }
  });
}
