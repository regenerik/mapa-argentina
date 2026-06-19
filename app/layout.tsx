import type { Metadata, Viewport } from "next";
import { HydrationMarker } from "@/components/HydrationMarker";
import "./globals.css";

const hydrationRecoveryScript = `
  (() => {
    const recoveryKey = "mapa-hydration-recovery";
    window.setTimeout(() => {
      if (document.documentElement.dataset.appHydrated === "true") return;
      const lastRecovery = Number(window.sessionStorage.getItem(recoveryKey) || 0);
      if (Date.now() - lastRecovery < 60000) return;
      window.sessionStorage.setItem(recoveryKey, String(Date.now()));
      const recoveryUrl = new URL(window.location.href);
      recoveryUrl.searchParams.set("_recover", String(Date.now()));
      window.location.replace(recoveryUrl.toString());
    }, 12000);
  })();
`;

export const metadata: Metadata = {
  title: "Territorio Productivo | Argentina",
  description: "Mapa interactivo de la actividad agroindustrial argentina.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#06111f",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <script dangerouslySetInnerHTML={{ __html: hydrationRecoveryScript }} />
        <HydrationMarker />
        {children}
      </body>
    </html>
  );
}
