import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, apiHandler, HttpError } from "@/lib/auth";
import PDFDocument from "pdfkit";

type Ctx = { params: { id: string } };

// GET: unduh invoice sebagai PDF (pdfkit, digenerate on-the-fly)
export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const user = await requireUser();
    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, userId: user.id },
      include: { customer: true, pppoeUser: { select: { username: true } } },
    });
    if (!invoice) throw new HttpError(404, "Tagihan tidak ditemukan");

    const settings = await prisma.settings.findUnique({ where: { userId: user.id } });
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

    doc.fontSize(18).text(settings?.businessName ?? "RT Net Panel", { align: "left" });
    doc.fontSize(10).fillColor("#555")
      .text(settings?.businessAddress ?? "")
      .text(settings?.businessPhone ?? "")
      .moveDown();
    doc.fontSize(16).fillColor("#000").text(`INVOICE ${invoice.number}`, { align: "right" });
    doc.moveDown();
    doc.fontSize(11);
    doc.text(`Kepada: ${invoice.customer?.name ?? "-"}`);
    doc.text(`Layanan: PPPoE ${invoice.pppoeUser?.username ?? "-"}`);
    doc.text(`Periode: ${invoice.periodStart.toLocaleDateString("id-ID")} - ${invoice.periodEnd.toLocaleDateString("id-ID")}`);
    doc.text(`Jatuh tempo: ${invoice.dueDate.toLocaleDateString("id-ID")}`);
    doc.text(`Status: ${invoice.status === "PAID" ? "LUNAS" : invoice.status === "OVERDUE" ? "LEWAT JATUH TEMPO" : "BELUM DIBAYAR"}`);
    doc.moveDown();
    doc.rect(50, doc.y, 495, 30).fill("#f0f0f0");
    doc.fillColor("#000").fontSize(12)
      .text(`Tagihan bulanan internet`, 60, doc.y + 9)
      .text(`Rp${invoice.amount.toLocaleString("id-ID")}`, 400, doc.y, { width: 130, align: "right" });
    doc.moveDown(2);
    doc.fontSize(10).fillColor("#555")
      .text(`Pembayaran online: ${process.env.APP_URL}/pay/${invoice.number}`);
    doc.end();

    const pdf = await done;
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.number}.pdf"`,
      },
    });
  } catch (e) {
    if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
    console.error("[pdf]", e);
    return Response.json({ error: "Gagal membuat PDF" }, { status: 500 });
  }
}
