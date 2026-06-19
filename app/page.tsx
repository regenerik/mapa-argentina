import Link from "next/link";

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
  return (
    <main className="home-shell">
      <div className="home-glow home-glow-one" />
      <div className="home-glow home-glow-two" />

      <section className="home-content">
        <div className="brand-mark" aria-hidden="true"><span /></div>
        <p className="eyebrow">Experiencia interactiva</p>
        <h1>Territorio<br /><span>Productivo</span></h1>
        <p className="home-lead">
          Explorá la presencia agroindustrial a lo largo de toda la Argentina.
        </p>

        <nav className="home-actions" aria-label="Navegación principal">
          <Link className="home-card home-card-primary" href="/mapa">
            <span className="card-icon"><MapIcon /></span>
            <span className="card-copy">
              <strong>Ver mapa</strong>
              <small>Explorar el territorio</small>
            </span>
            <span className="card-arrow" aria-hidden="true">→</span>
          </Link>

          <Link className="home-card" href="/edicion">
            <span className="card-icon"><EditIcon /></span>
            <span className="card-copy">
              <strong>Editar puntos</strong>
              <small>Gestionar ubicaciones</small>
            </span>
            <span className="card-arrow" aria-hidden="true">→</span>
          </Link>
        </nav>
      </section>

      <p className="home-footer">Argentina · Plataforma territorial</p>
    </main>
  );
}
