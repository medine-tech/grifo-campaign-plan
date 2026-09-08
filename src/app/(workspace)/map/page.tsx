import Image from "next/image";
import Link from "next/link";
import { islands } from "@/lib/domain";
import { IslandIcon } from "@/components/ui";
export const metadata = { title: "Mapa de territorios" };
export default function Page() {
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">EL ARCHIPIÉLAGO GRIFO</span>
          <h1>Todo camino conecta.</h1>
          <p>Siete territorios para organizar personas, ideas y resultados.</p>
        </div>
      </div>
      <div className="map-full">
        <Image
          src="/images/campaign-map.jpeg"
          width={1448}
          height={1086}
          priority
          alt="Plan de campaña: Cazadores nuevos y antiguos, Seguimiento, Ideas, Competencia, Ventas, Administración y Referidos."
        />
      </div>
      <nav className="map-pins" aria-label="Ir a una isla">
        {islands.map((i) => (
          <Link key={i.id} href={"/islands/" + i.id}>
            <IslandIcon name={i.icon} />
            {i.name} ↗
          </Link>
        ))}
      </nav>
    </>
  );
}
