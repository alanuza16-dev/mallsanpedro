import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Fuentes alojadas en el propio proyecto (Fraunces y Manrope, licencia OFL): cero dependencias externas al cargar.
const fraunces = localFont({
  variable: "--font-fraunces",
  src: [
    { path: "../fonts/fraunces-latin-opsz-normal.woff2", weight: "100 900", style: "normal" },
    { path: "../fonts/fraunces-latin-opsz-italic.woff2", weight: "100 900", style: "italic" },
  ],
});

const manrope = localFont({
  variable: "--font-manrope",
  src: "../fonts/manrope-latin-wght-normal.woff2",
  weight: "200 800",
});

export const metadata: Metadata = {
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : undefined,
  title: {
    default: "Sorteo de Fin de Año · Mall San Pedro",
    template: "%s · Mall San Pedro",
  },
  description:
    "Registra tus facturas de las tiendas participantes de Mall San Pedro y gana boletos para el Sorteo de Fin de Año.",
  openGraph: {
    title: "Sorteo de Fin de Año · Mall San Pedro",
    description: "Cada ₡10 000 en compras te da boletos. En tiendas patrocinadoras, el doble.",
    locale: "es_CR",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1d33",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CR" className={`${fraunces.variable} ${manrope.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
