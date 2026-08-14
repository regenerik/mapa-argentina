import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { HydrationMarker } from "@/components/HydrationMarker";
import { LanguageProvider } from "@/components/LanguageProvider";
import { UIScaleProvider } from "@/components/UIScaleProvider";
import "./globals.css";

const googleTagManagerId = "GTM-WL8B6CWS";

const googleTagManagerScript = `
  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','${googleTagManagerId}');
`;

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
      <Script
        id="google-tag-manager"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: googleTagManagerScript }}
      />
      <body>
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${googleTagManagerId}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
            title="Google Tag Manager"
          />
        </noscript>
        <script dangerouslySetInnerHTML={{ __html: hydrationRecoveryScript }} />
        <HydrationMarker />
        <LanguageProvider>
          <UIScaleProvider>{children}</UIScaleProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
