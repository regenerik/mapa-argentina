import type { Metadata, Viewport } from "next";
import { ClientBootScripts } from "@/components/ClientBootScripts";
import { HydrationMarker } from "@/components/HydrationMarker";
import { LanguageProvider } from "@/components/LanguageProvider";
import { UIScaleProvider } from "@/components/UIScaleProvider";
import "./globals.css";

const googleTagManagerId = "GTM-WL8B6CWS";

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
        <ClientBootScripts googleTagManagerId={googleTagManagerId} />
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${googleTagManagerId}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
            title="Google Tag Manager"
          />
        </noscript>
        <HydrationMarker />
        <LanguageProvider>
          <UIScaleProvider>{children}</UIScaleProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
