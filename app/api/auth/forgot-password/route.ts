import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiHandler, HttpError } from "@/lib/auth";
import { sendResetEmail } from "@/lib/mailer";
import { randomToken, hashToken } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";

// Lupa password: selalu balas ok (tidak membocorkan apakah email terdaftar)
export async function POST(req: NextRequest) {
  return apiHandler(async () => {
    const parsed = z
      .object({ email: z.string().email() })
      .safeParse(await req.json());
    if (!parsed.success) throw new HttpError(400, "Email tidak valid");

    const ip = req.headers.get("x-forwarded-for") ?? "local";
    if (!rateLimit(`forgot:${ip}`, 3, 60e3))
      throw new HttpError(429, "Terlalu banyak permintaan. Coba lagi nanti.");

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (user) {
      const token = randomToken();
      await prisma.verificationToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(token),
          type: "PASSWORD_RESET",
          expiresAt: new Date(Date.now() + 3600e3),
        },
      });
      await sendResetEmail(user.email, token);
    }
    return { ok: true, message: "Jika email terdaftar, tautan reset telah dikirim." };
  });
}
