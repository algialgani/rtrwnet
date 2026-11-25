import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, apiHandler, HttpError } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";

type Ctx = { params: { id: string } };

// GET detail router + data live (interface, resource, log) dari MikroTik
export async function GET(_req: NextRequest, { params }: Ctx) {
  return apiHandler(async () => {
    const user = await requireUser();
    const router = await prisma.router.findFirst({
      where: { id: params.id, userId: user.id }, // kepemilikan dicek di query
    });
    if (!router) throw new HttpError(404, "Router tidak ditemukan");
    return { router };
  });
}

// PATCH edit router (nama, kredensial API)
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return apiHandler(async () => {
    const user = await requireUser();
    const router = await prisma.router.findFirst({
      where: { id: params.id, userId: user.id },
    });
    if (!router) throw new HttpError(404, "Router tidak ditemukan");

    const parsed = z
      .object({
        name: z.string().min(2).optional(),
        apiUser: z.string().min(1).optional(),
        apiPass: z.string().min(1).optional(),
        useRest: z.boolean().optional(),
      })
      .safeParse(await req.json());
    if (!parsed.success) throw new HttpError(400, "Data tidak valid");

    const data: Record<string, unknown> = {};
    if (parsed.data.name) data.name = parsed.data.name;
    if (parsed.data.apiUser) data.apiUser = parsed.data.apiUser;
    if (parsed.data.useRest != null) data.useRest = parsed.data.useRest;
    if (parsed.data.apiPass) data.apiPassEnc = encrypt(parsed.data.apiPass);

    await prisma.router.update({ where: { id: router.id }, data });
    return { ok: true };
  });
}

// DELETE hapus router (cascade ke data terkait)
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  return apiHandler(async () => {
    const user = await requireUser();
    const router = await prisma.router.findFirst({
      where: { id: params.id, userId: user.id },
    });
    if (!router) throw new HttpError(404, "Router tidak ditemukan");
    await prisma.router.delete({ where: { id: router.id } });
    return { ok: true };
  });
}
