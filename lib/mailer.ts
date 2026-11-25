import nodemailer from "nodemailer";

// Kirim email verifikasi/reset. Jika SMTP belum dikonfigurasi, token
// di-log ke console server (dev mode) agar alur tetap bisa dites.
export async function sendMail(to: string, subject: string, html: string) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST) {
    console.log(`[mail:dev] Kepada: ${to} | Subjek: ${subject}\n${html}`);
    return;
  }
  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: Number(SMTP_PORT) === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
  await transport.sendMail({
    from: SMTP_FROM || "RT Net Panel <no-reply@localhost>",
    to,
    subject,
    html,
  });
}

export async function sendVerificationEmail(to: string, token: string) {
  const url = `${process.env.APP_URL}/verify-email?token=${token}`;
  await sendMail(
    to,
    "Verifikasi Email — RT Net Panel",
    `<p>Klik tautan berikut untuk verifikasi email Anda:</p>
     <p><a href="${url}">${url}</a></p>
     <p>Tautan berlaku 24 jam.</p>`
  );
}

export async function sendResetEmail(to: string, token: string) {
  const url = `${process.env.APP_URL}/reset-password?token=${token}`;
  await sendMail(
    to,
    "Reset Password — RT Net Panel",
    `<p>Klik tautan berikut untuk reset password:</p>
     <p><a href="${url}">${url}</a></p>
     <p>Tautan berlaku 1 jam.</p>`
  );
}
