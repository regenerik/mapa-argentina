import Link from "next/link";

export function BackButton() {
  return (
    <Link className="icon-button back-button" href="/" aria-label="Volver al inicio">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m15 18-6-6 6-6" />
      </svg>
      <span>Volver</span>
    </Link>
  );
}
