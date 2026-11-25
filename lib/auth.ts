import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./db";
import { Role } from "@prisma/client";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-only-insecure-secret"
);
const COOKIE_NAME = "rtnp_session";

// ============ Password ============
export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 12);
}
export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

// ============ Session JWT (httpOnly cookie) ============
export async function createSession(userId: string, role: Role) {
  const token = await new SignJWT({ uid: userId, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax", // proteksi CSRF dasar: cookie tidak terkirim cross-site POST
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE_NAME);
}

export async function getSessionUser() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    const user = await prisma.user.findUnique({
      where: { id: payload.uid as string },
      include: { subscription: true },
    });
    return user;
  } catch {
    return null;
  }
}

// Untuk API routes: lempar 401 jika belum login
export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw new HttpError(401, "Belum login");
  return user;
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Bungkus handler API agar error konsisten JSON dan tidak bocor detail
export async function apiHandler<T>(fn: () => Promise<T>): Promise<Response> {
  try {
    const data = await fn();
    // Response mentah (misal CSV/PDF) dilewatkan apa adanya
    if (data instanceof Response) return data;
    return Response.json(data ?? { ok: true });
  } catch (e) {
    if (e instanceof HttpError)
      return Response.json({ error: e.message }, { status: e.status });
    console.error("[api]", e);
    return Response.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
