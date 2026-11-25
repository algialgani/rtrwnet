import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, apiHandler, HttpError } from "@/lib/auth";
import { hashToken } from "@/lib/crypto";

const schema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  return apiHandler(async () => {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success)
      throw new HttpError(400, "Data tidak valid. Password minimal 8 karakter.");

    const rec = await prisma.verificationToken.findUnique({
      where: { tokenHash: hashToken(parsed.data.token) },
    });
    if (
      !rec ||
      rec.type !== "PASSWORD_RESET" ||
      rec.usedAt ||
      rec.expiresAt < new Date()
    )
      throw new HttpError(400, "Token tidak valid atau kedaluwarsa");

    await prisma.$transaction([
      prisma.user.update({
        where: { id: rec.userId },
        data: { passwordHash: await hashPassword(parsed.data.password) },
      }),
      prisma.verificationToken.update({
        where: { id: rec.id },
        data: { usedAt: new Date() },
      }),
    ]);
    return { ok: true, message: "Password berhasil diubah. Silakan login." };
  });
}
