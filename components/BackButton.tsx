"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

export function BackButton() {
  const { copy } = useLanguage();
  return (
    <Link className="icon-button back-button" href="/" aria-label={copy.backHome}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m15 18-6-6 6-6" />
      </svg>
      <span>{copy.back}</span>
    </Link>
  );
}
