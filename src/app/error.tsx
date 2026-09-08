"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <main id="main-content" className="not-found">
      <h1>La campaña necesita un momento.</h1>
      <p>No pudimos cargar esta página. Puedes intentarlo nuevamente.</p>
      <button className="button primary" onClick={reset}>
        Reintentar
      </button>
    </main>
  );
}
