import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, apiHandler, HttpError } from "@/lib/auth";
import { decrypt, encrypt } from "@/lib/crypto";
import { addPppoeSecret, removePppoeSecret, listPppoeActive } from "@/lib/mikrotik-sync";

type Ctx = { params: { id: string } };

// PATCH: edit pelanggan (username/password/profil/status) → update secret di MikroTik
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return apiHandler(async () => {
    const user = await requireUser();
    const pppoe = await prisma.pppoeUser.findFirst({
      where: { id: params.id, userId: user.id },
      include: { profile: true },
    });
    if (!pppoe) throw new HttpError(404, "Pelanggan tidak ditemukan");

    const parsed = z
      .object({
        username: z.string().min(3).optional(),
        password: z.string().min(4).optional(),
        profileId: z.string().optional(),
        status: z.enum(["ACTIVE", "SUSPENDED", "EXPIRED"]).optional(),
      })
      .safeParse(await req.json());
    if (!parsed.success) throw new HttpError(400, "Data tidak valid");
    const d = parsed.data;

    let profileName = pppoe.profile.name;
    if (d.profileId) {
      const profile = await prisma.profile.findFirst({ where: { id: d.profileId, userId: user.id } });
      if (!profile) throw new HttpError(404, "Profil tidak ditemukan");
      profileName = profile.name;
    }

    const username = d.username ?? pppoe.username;
    const password = d.password ?? (pppoe.passwordEnc ? decrypt(pppoe.passwordEnc) : "");

    // Sinkron ke MikroTik: hapus secret lama, buat ulang dengan data baru.
    // SUSPENDED → di-disable di router (disable secret).
    let syncError: string | null = null;
    try {
      await removePppoeSecret(pppoe.routerId, pppoe.username);
      if (d.status !== "SUSPENDED") {
        await addPppoeSecret(pppoe.routerId, username, password, profileName, "RTNetPanel");
      }
    } catch {
      syncError = "Router tidak terjangkau: perubahan akan disinkronkan ulang otomatis.";
    }

    await prisma.pppoeUser.update({
      where: { id: pppoe.id },
      data: {
        ...(d.username ? { username } : {}),
        ...(d.password ? { passwordEnc: encrypt(d.password) } : {}),
        ...(d.profileId ? { profileId: d.profileId } : {}),
        ...(d.status ? { status: d.status } : {}),
        isolated: d.status === "SUSPENDED",
        ...(syncError ? {} : { syncedAt: new Date() }),
      },
    });
    return { ok: true, syncError };
  });
}

// DELETE: hapus pelanggan + secret di MikroTik
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  return apiHandler(async () => {
    const user = await requireUser();
    const pppoe = await prisma.pppoeUser.findFirst({
      where: { id: params.id, userId: user.id },
    });
    if (!pppoe) throw new HttpError(404, "Pelanggan tidak ditemukan");
    try {
      await removePppoeSecret(pppoe.routerId, pppoe.username);
    } catch { /* job sinkron akan membersihkan */ }
    await prisma.pppoeUser.delete({ where: { id: pppoe.id } });
    return { ok: true };
  });
}
