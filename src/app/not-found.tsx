import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main-content" className="not-found">
      <span className="eyebrow">FUERA DEL MAPA</span>
      <h1>Este territorio no existe.</h1>
      <p>Regresa a la campaña para encontrar tu próxima acción.</p>
      <Link href="/dashboard" className="button primary">
        Volver a la vista general
      </Link>
    </main>
  );
}
