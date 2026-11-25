import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, apiHandler, HttpError } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";
import { PLAN_LIMITS } from "@/lib/plan-limits";

// ============ Pengaturan ============
// GET: profil usaha + status gateway (API key TIDAK dikirim balik)
export async function GET() {
  return apiHandler(async () => {
    const user = await requireUser();
    const settings = await prisma.settings.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });
    return {
      settings: {
        businessName: settings.businessName,
        businessPhone: settings.businessPhone,
        businessAddress: settings.businessAddress,
        waProvider: settings.waProvider,
        waEnabled: settings.waEnabled,
        waKeySet: !!settings.waApiKeyEnc, // hanya indikator, bukan nilainya
        pgProvider: settings.pgProvider,
        pgSandbox: settings.pgSandbox,
        pgKeySet: !!settings.pgApiKeyEnc,
        autoIsolate: settings.autoIsolate,
      },
      plan: user.subscription?.plan,
      maxRouters: user.subscription?.maxRouters,
    };
  });
}

// PUT: simpan pengaturan / ganti paket langganan (batas router berubah otomatis)
export async function PUT(req: NextRequest) {
  return apiHandler(async () => {
    const user = await requireUser();
    const parsed = z
      .object({
        businessName: z.string().optional(),
        businessPhone: z.string().optional(),
        businessAddress: z.string().optional(),
        waProvider: z.enum(["fonnte", "wablas"]).optional(),
        waApiKey: z.string().optional(), // plaintext via HTTPS, disimpan terenkripsi
        waEnabled: z.boolean().optional(),
        pgProvider: z.enum(["midtrans", "xendit"]).optional(),
        pgApiKey: z.string().optional(),
        pgSandbox: z.boolean().optional(),
        autoIsolate: z.boolean().optional(),
        // upgrade/downgrade paket
        plan: z.enum(["FREE", "BASIC", "PRO"]).optional(),
      })
      .safeParse(await req.json());
    if (!parsed.success) throw new HttpError(400, "Data pengaturan tidak valid");
    const d = parsed.data;

    // Ganti paket → batas router server berubah langsung
    let newPlan: string | undefined;
    if (d.plan) {
      newPlan = d.plan;
      await prisma.subscription.update({
        where: { userId: user.id },
        data: { plan: d.plan, maxRouters: PLAN_LIMITS[d.plan] },
      });
    }

    const data: Record<string, unknown> = {};
    if (d.businessName !== undefined) data.businessName = d.businessName;
    if (d.businessPhone !== undefined) data.businessPhone = d.businessPhone;
    if (d.businessAddress !== undefined) data.businessAddress = d.businessAddress;
    if (d.waProvider) data.waProvider = d.waProvider;
    if (d.waApiKey) data.waApiKeyEnc = encrypt(d.waApiKey);
    if (d.waEnabled !== undefined) data.waEnabled = d.waEnabled;
    if (d.pgProvider) data.pgProvider = d.pgProvider;
    if (d.pgApiKey) data.pgApiKeyEnc = encrypt(d.pgApiKey);
    if (d.pgSandbox !== undefined) data.pgSandbox = d.pgSandbox;
    if (d.autoIsolate !== undefined) data.autoIsolate = d.autoIsolate;

    await prisma.settings.upsert({
      where: { userId: user.id },
      update: data,
      create: { userId: user.id, ...data },
    });

    return { ok: true, plan: newPlan };
  });
}
