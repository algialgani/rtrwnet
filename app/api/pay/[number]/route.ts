import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiHandler, HttpError } from "@/lib/auth";

// ============ Halaman bayar pelanggan (publik via nomor invoice) ============
type Ctx = { params: { number: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  return apiHandler(async () => {
    const invoice = await prisma.invoice.findUnique({
      where: { number: params.number },
      include: { customer: true, user: { include: { settings: true } } },
    });
    if (!invoice) throw new HttpError(404, "Invoice tidak ditemukan");

    // Payment gateway: Midtrans/Xendit mode sandbox (konfigurasi dari Pengaturan).
    // Kalau API key belum diisi → tampilkan instruksi transfer manual.
    const settings = invoice.user.settings;
    const gatewayConfigured = !!(settings?.pgProvider && settings.pgApiKeyEnc);
    return {
      number: invoice.number,
      businessName: settings?.businessName ?? "RT Net Panel",
      customer: invoice.customer?.name,
      amount: invoice.amount,
      dueDate: invoice.dueDate,
      status: invoice.status,
      sandbox: settings?.pgSandbox ?? true,
      gateway: gatewayConfigured ? settings?.pgProvider : null,
      payUrl: gatewayConfigured
        ? `/api/pay/${invoice.number}/checkout` // endpoint checkout gateway (sandbox)
        : null,
    };
  });
}
