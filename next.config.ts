import type { NextConfig } from "next";

/* Sin el botón "N" de Next en desarrollo: tapaba la flecha izquierda en el móvil (en producción no sale) */
const nextConfig: NextConfig = {
  devIndicators: false,
  /* Ilustraciones subidas desde el backoffice a Vercel Blob */
  images: { remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }] },
};

export default nextConfig;
