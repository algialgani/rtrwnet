import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiHandler, HttpError } from "@/lib/auth";
import { hashToken } from "@/lib/crypto";

// Verifikasi email via tautan: /api/auth/verify-email?token=...
export async function GET(req: NextRequest) {
  return apiHandler(async () => {
    const token = req.nextUrl.searchParams.get("token");
    if (!token) throw new HttpError(400, "Token tidak ada");
    const rec = await prisma.verificationToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (
      !rec ||
      rec.type !== "EMAIL_VERIFY" ||
      rec.usedAt ||
      rec.expiresAt < new Date()
    )
      throw new HttpError(400, "Token tidak valid atau kedaluwarsa");

    await prisma.$transaction([
      prisma.user.update({
        where: { id: rec.userId },
        data: { emailVerifiedAt: new Date() },
      }),
      prisma.verificationToken.update({
        where: { id: rec.id },
        data: { usedAt: new Date() },
      }),
    ]);
    return Response.redirect(`${process.env.APP_URL}/dashboard?verified=1`);
  });
}
