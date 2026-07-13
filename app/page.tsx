"use client";

import Link from "next/link";
import { LanguageSwitch, useLanguage } from "@/components/LanguageProvider";
import { useUIScale } from "@/components/UIScaleProvider";

function MapIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9 18-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Zm0 0V3m6 18V6" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4L16.5 3.5Z" />
    </svg>
  );
}

export default function Home() {
  const { copy } = useLanguage();
  const { scale, canDecrease, canIncrease, decrease, increase } = useUIScale();
  return (
    <main className="home-shell">
      <div className="home-glow home-glow-one" />
      <div className="home-glow home-glow-two" />
      <LanguageSwitch />

      <section className="home-content">
        <div className="brand-mark" aria-hidden="true"><span /></div>
        <p className="eyebrow">{copy.homeEyebrow}</p>
        <div className="home-title-wrap">
          {/* The source diagram is preserved exactly; CSS blends away its white background. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="home-molecule" src="/molecula.png" alt="" aria-hidden="true" draggable={false} />
          <h1>{copy.homeTitleLine1}<br /><span>{copy.homeTitleLine2}</span></h1>
        </div>
        <p className="home-lead">
          {copy.homeLead}
        </p>

        <nav className="home-actions" aria-label={copy.mainNavigation}>
          <Link className="home-card home-card-primary" href="/mapa">
            <span className="card-icon"><MapIcon /></span>
            <span className="card-copy">
              <strong>{copy.homeViewMap}</strong>
              <small>{copy.homeExplore}</small>
            </span>
            <span className="card-arrow" aria-hidden="true">→</span>
          </Link>

          <Link className="home-card" href="/edicion">
            <span className="card-icon"><EditIcon /></span>
            <span className="card-copy">
              <strong>{copy.homeEdit}</strong>
              <small>{copy.homeManage}</small>
            </span>
            <span className="card-arrow" aria-hidden="true">→</span>
          </Link>
        </nav>

        <div className="home-zoom-panel" aria-label={copy.interfaceScale}>
          <div>
            <strong>{copy.interfaceScale}</strong>
            <small>{copy.interfaceScaleValue} {Math.round(scale * 100)}%</small>
          </div>
          <div className="home-zoom-actions">
            <button type="button" onClick={decrease} disabled={!canDecrease} aria-label={copy.decreaseInterfaceScale}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /></svg>
            </button>
            <button type="button" onClick={increase} disabled={!canIncrease} aria-label={copy.increaseInterfaceScale}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            </button>
          </div>
        </div>
      </section>

      <p className="home-footer">{copy.homeFooter}</p>
    </main>
  );
}
