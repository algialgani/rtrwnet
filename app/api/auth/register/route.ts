import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, apiHandler, HttpError } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/mailer";
import { randomToken, hashToken } from "@/lib/crypto";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  whatsapp: z.string().min(9),
});

export async function POST(req: NextRequest) {
  return apiHandler(async () => {
    const body = schema.safeParse(await req.json());
    if (!body.success)
      throw new HttpError(400, "Data tidak valid. Password minimal 8 karakter.");

    const { name, email, password, whatsapp } = body.data;
    if (await prisma.user.findUnique({ where: { email } }))
      throw new HttpError(409, "Email sudah terdaftar");

    const user = await prisma.user.create({
      data: {
        name,
        email,
        whatsapp,
        passwordHash: await hashPassword(password),
        subscription: { create: { plan: "FREE", maxRouters: 1 } },
        settings: { create: {} },
      },
    });

    // Token verifikasi: asli dikirim via email, DB hanya simpan hash
    const token = randomToken();
    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        type: "EMAIL_VERIFY",
        expiresAt: new Date(Date.now() + 24 * 3600e3),
      },
    });
    await sendVerificationEmail(email, token);

    return {
      ok: true,
      message:
        "Registrasi berhasil. Silakan cek email untuk verifikasi" +
        (process.env.SMTP_HOST ? "" : " (dev mode: token ada di log server)"),
    };
  });
}
