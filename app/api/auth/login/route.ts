import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  verifyPassword,
  createSession,
  apiHandler,
  HttpError,
} from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({ email: z.string().email(), password: z.string() });

export async function POST(req: NextRequest) {
  return apiHandler(async () => {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) throw new HttpError(400, "Email/password tidak valid");

    const ip = req.headers.get("x-forwarded-for") ?? "local";
    // Rate limit: max 5 percobaan login per IP per menit
    if (!rateLimit(`login:${ip}`, 5, 60e3))
      throw new HttpError(429, "Terlalu banyak percobaan. Coba lagi nanti.");

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });
    // Pesan error identik utk email salah & password salah (mencegah user enumeration)
    if (!user || !(await verifyPassword(password, user.passwordHash)))
      throw new HttpError(401, "Email atau password salah");

    await createSession(user.id, user.role);
    return { ok: true, role: user.role, verified: !!user.emailVerifiedAt };
  });
}
