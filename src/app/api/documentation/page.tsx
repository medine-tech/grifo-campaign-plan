import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { ApiDocs } from "@/components/api-docs";
export const metadata = { title: "Documentación API" };
export default function Page() {
  return (
    <main
      id="main-content"
      className="docs-page"
      style={{ padding: 0, maxWidth: "none" }}
    >
      <header className="docs-header">
        <Link href="/dashboard">
          <ArrowLeft size={16} /> Volver a la campaña
        </Link>
        <h1>Grifo · Documentación API</h1>
        <a href="/api/openapi.json" download="grifo-openapi.json">
          <Download size={16} /> Descargar OpenAPI
        </a>
      </header>
      <div className="docs-intro">
        <p>
          Genera un token personal en <Link href="/tokens">Mis agentes</Link> y
          usa <code>Authorization: Bearer TU_TOKEN</code>. Esta documentación es
          pública; los registros están protegidos.
        </p>
        <p>
          Para un agente: comparte <a href="/llms.txt">la guía de conexión</a> y
          el contrato OpenAPI. Las operaciones que crees aquí son reales: usa tu
          token y revisa los datos antes de ejecutar.
        </p>
      </div>
      <ApiDocs />
    </main>
  );
}
