import type { Metadata, Viewport } from "next";
import { HydrationMarker } from "@/components/HydrationMarker";
import { LanguageProvider } from "@/components/LanguageProvider";
import { UIScaleProvider } from "@/components/UIScaleProvider";
import "./globals.css";

const hydrationRecoveryScript = `
  (() => {
    const recoveryKey = "mapa-hydration-recovery";
    window.setTimeout(() => {
      if (document.documentElement.dataset.appHydrated === "true") return;
      let storage;
      try { storage = window.sessionStorage; } catch { return; }
      if (!storage) return;
      const lastRecovery = Number(storage.getItem(recoveryKey) || 0);
      if (Date.now() - lastRecovery < 60000) return;
      storage.setItem(recoveryKey, String(Date.now()));
      const recoveryUrl = new URL(window.location.href);
      recoveryUrl.searchParams.set("_recover", String(Date.now()));
      window.location.replace(recoveryUrl.toString());
    }, 12000);
  })();
`;

export const metadata: Metadata = {
  title: "Mapa Contundencia Empera®",
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
        <LanguageProvider>
          <UIScaleProvider>{children}</UIScaleProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
