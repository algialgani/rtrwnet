import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, apiHandler, HttpError } from "@/lib/auth";
import { sendWa } from "@/lib/wa";

type Ctx = { params: { id: string } };

// POST: kirim pengingat tagihan via WhatsApp ke pelanggan
// Pesan berisi nomor invoice, jumlah, jatuh tempo, dan link halaman bayar.
export async function POST(_req: NextRequest, { params }: Ctx) {
  return apiHandler(async () => {
    const user = await requireUser();
    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, userId: user.id },
      include: { customer: true, pppoeUser: { select: { username: true } } },
    });
    if (!invoice) throw new HttpError(404, "Tagihan tidak ditemukan");
    if (!invoice.customer?.phone) throw new HttpError(400, "Pelanggan tidak punya nomor WhatsApp");
    if (invoice.status === "PAID") throw new HttpError(400, "Tagihan sudah lunas");

    const settings = await prisma.settings.findUnique({ where: { userId: user.id } });
    const payUrl = `${process.env.APP_URL}/pay/${invoice.number}`;
    const message =
      `*${invoice.customer.name}*, tagihan internet Anda:\n\n` +
      `No: ${invoice.number}\n` +
      `Layanan: PPPoE ${invoice.pppoeUser?.username ?? "-"}\n` +
      `Jumlah: Rp${invoice.amount.toLocaleString("id-ID")}\n` +
      `Jatuh tempo: ${invoice.dueDate.toLocaleDateString("id-ID")}\n\n` +
      `Bayar online: ${payUrl}\n\n` +
      `${settings?.businessName ?? "RT Net Panel"} 🙏`;

    const result = await sendWa(user.id, invoice.customer.phone, message);
    if (!result.sent) throw new HttpError(400, result.error ?? "Gagal mengirim");
    return { ok: true, sentTo: invoice.customer.phone };
  });
}
