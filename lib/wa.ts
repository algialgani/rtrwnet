import { prisma } from "./db";
import { decrypt } from "./crypto";

// ============ Modul WhatsApp Gateway (Fonnte / Wablas) ============
// Bisa diaktifkan/nonaktifkan di Pengaturan. API key disimpan terenkripsi.
// Kalau disabled / key kosong / provider gagal → balikan { sent: false }.

export async function sendWa(userId: string, to: string, message: string): Promise<{ sent: boolean; error?: string }> {
  const settings = await prisma.settings.findUnique({ where: { userId } });
  if (!settings?.waEnabled || !settings.waApiKeyEnc || !settings.waProvider)
    return { sent: false, error: "WhatsApp gateway belum diaktifkan" };

  const apiKey = decrypt(settings.waApiKeyEnc);
  const phone = to.replace(/[^0-9]/g, "").replace(/^0/, "62"); // normalisasi 08 → 62

  try {
    if (settings.waProvider === "fonnte") {
      const res = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: { Authorization: apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ target: phone, message }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return { sent: false, error: `Fonnte HTTP ${res.status}` };
      return { sent: true };
    }
    if (settings.waProvider === "wablas") {
      const server = process.env.WABLAS_SERVER || "https://console.wablas.com";
      const res = await fetch(`${server}/api/send-message`, {
        method: "POST",
        headers: { Authorization: apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone, message }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return { sent: false, error: `Wablas HTTP ${res.status}` };
      return { sent: true };
    }
    return { sent: false, error: "Provider WhatsApp tidak dikenal" };
  } catch (e: any) {
    return { sent: false, error: e.message ?? "Gagal mengirim WhatsApp" };
  }
}
