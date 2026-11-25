// ============ Generator konfigurasi OpenVPN ============
// Flow: server punya OpenVPN server (env OPENVPN_SERVER_IP / port 1194).
// Saat user menambah router, sistem membuat kredensial client unik
// (user = routerId, password = random), lalu menghasilkan script MikroTik
// yang user jalankan di terminal router. Router akan connect via OpenVPN
// dan mendapat IP tunnel (10.8.0.x) — server membaca status log OpenVPN
// untuk memetakan CN (routerId) → IP tunnel, lalu mencoba API ke IP itu.

import crypto from "crypto";

export function generateVpnCredentials(routerId: string) {
  const password = crypto.randomBytes(12).toString("base64url");
  return { username: routerId, password };
}

// Script yang harus dijalankan di terminal MikroTik (copy-paste).
// Kredensial hanya muncul SEKALI saat pembuatan dan disimpan terenkripsi di DB.
export function buildMikrotikScript(routerName: string, user: string, pass: string): string {
  const host = process.env.OPENVPN_SERVER_IP || "SERVER_IP_PANEL";
  const port = process.env.OPENVPN_SERVER_PORT || "1194";
  return `# === RT Net Panel: Setup koneksi router "${routerName}" ===
# Jalankan perintah berikut di terminal MikroTik (Winbox > New Terminal / SSH).
# 1) Aktifkan service API (dipakai panel untuk sinkronisasi)
/ip service enable api
/ip service set api address=0.0.0.0/0

# 2) Buat klien OpenVPN ke server panel
/interface ovpn-client add name=rtnp-tunnel connect-to=${host} port=${port} \\
  auth=SHA1 cipher=aes256 user="${user}" password="${pass}" \\
  add-default-route=no verify-server-certificate=no disabled=no
/interface ovpn-client enable rtnp-tunnel

# 3) Cek status: sampai muncul "connected" dengan IP 10.8.0.x
/interface ovpn-client print status

# Selesai. Panel akan otomatis mendeteksi router dalam 1 menit.
`;
}

// Baca status log OpenVPN (format status-log v2) dan map CN → IP tunnel.
// Path dikonfigurasi via env agar tidak hardcode.
export async function resolveVpnIp(clientName: string): Promise<string | null> {
  const fs = await import("fs/promises");
  const path = process.env.OPENVPN_STATUS_LOG || "/var/log/openvpn/status.log";
  try {
    const text = await fs.readFile(path, "utf8");
    // Format: baris "CN,virtual-ip,received,sent,connected-since" di bagian Client List
    for (const line of text.split("\n")) {
      const [cn, ip] = line.split(",");
      if (cn === clientName && ip && ip.startsWith("10.8.")) return ip;
    }
  } catch {
    // log belum ada / belum terpasang → router belum connect
  }
  return null;
}
