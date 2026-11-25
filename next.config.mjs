/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdfkit & fontkit wajib dijalankan dari node_modules langsung (bukan di-bundle
  // webpack) karena membaca file font/data via fs saat runtime
  experimental: {
    serverComponentsExternalPackages: ["pdfkit", "fontkit", "unicode-properties"],
  },
};

export default nextConfig;
