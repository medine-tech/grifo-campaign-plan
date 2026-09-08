import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "Grifo · Plan de campaña", template: "%s · Grifo" },
  description:
    "Siete islas para coordinar personas, ideas y resultados. Operación Grifo, Juegos Imperiales 2026.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <a className="skip-link" href="#main-content">
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}
