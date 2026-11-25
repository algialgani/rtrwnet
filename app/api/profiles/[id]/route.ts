import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, apiHandler, HttpError } from "@/lib/auth";

type Ctx = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  return apiHandler(async () => {
    const user = await requireUser();
    const profile = await prisma.profile.findFirst({
      where: { id: params.id, userId: user.id },
    });
    if (!profile) throw new HttpError(404, "Profil tidak ditemukan");
    const parsed = z
      .object({
        name: z.string().min(1).optional(),
        price: z.number().int().min(0).optional(),
        downSpeed: z.string().optional(),
        upSpeed: z.string().optional(),
        durationValue: z.number().int().min(1).optional(),
        durationUnit: z.enum(["HOURS", "DAYS", "MONTHS"]).optional(),
        type: z.enum(["HOTSPOT", "PPPOE"]).optional(),
      })
      .safeParse(await req.json());
    if (!parsed.success) throw new HttpError(400, "Data tidak valid");
    await prisma.profile.update({ where: { id: profile.id }, data: parsed.data });
    return { ok: true };
  });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  return apiHandler(async () => {
    const user = await requireUser();
    const profile = await prisma.profile.findFirst({
      where: { id: params.id, userId: user.id },
    });
    if (!profile) throw new HttpError(404, "Profil tidak ditemukan");
    await prisma.profile.delete({ where: { id: profile.id } });
    return { ok: true };
  });
}
