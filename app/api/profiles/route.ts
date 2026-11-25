import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, apiHandler, HttpError } from "@/lib/auth";

const schema = z.object({
  routerId: z.string(),
  name: z.string().min(1),
  price: z.number().int().min(0).default(0),
  downSpeed: z.string().min(1),
  upSpeed: z.string().min(1),
  durationValue: z.number().int().min(1).default(30),
  durationUnit: z.enum(["HOURS", "DAYS", "MONTHS"]).default("DAYS"),
  type: z.enum(["HOTSPOT", "PPPOE"]).default("HOTSPOT"),
});

export async function GET() {
  return apiHandler(async () => {
    const user = await requireUser();
    const profiles = await prisma.profile.findMany({
      where: { userId: user.id },
      include: { router: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return { profiles };
  });
}

export async function POST(req: NextRequest) {
  return apiHandler(async () => {
    const user = await requireUser();
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) throw new HttpError(400, "Data profil tidak valid");
    const d = parsed.data;
    // Router wajib milik user
    const router = await prisma.router.findFirst({ where: { id: d.routerId, userId: user.id } });
    if (!router) throw new HttpError(404, "Router tidak ditemukan / bukan milik Anda");
    const profile = await prisma.profile.create({ data: { ...d, userId: user.id } });
    return { ok: true, profile };
  });
}
