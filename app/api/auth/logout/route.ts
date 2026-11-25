import { destroySession, apiHandler } from "@/lib/auth";

export async function POST() {
  return apiHandler(async () => {
    await destroySession();
    return { ok: true };
  });
}
