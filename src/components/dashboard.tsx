"use client";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight,
  ArrowRight,
  Flag,
  CircleCheck,
  Clock3,
  Users,
  ShieldCheck,
  CalendarDays,
} from "lucide-react";
import { type CampaignRecord, islands, officialSnapshot } from "@/lib/domain";
import { useApi, Loading, ErrorBox, IslandIcon, Empty, formatDate } from "./ui";
type DashboardData = {
  total: number;
  accreditedPoints: number;
  pendingPoints: number;
  potentialPoints: number;
  pendingEvidence: number;
  blocked: number;
  overdue: number;
  members: { total: number; active: number };
  islands: ((typeof islands)[number] & {
    total: number;
    done: number;
    points: number;
  })[];
  upcoming: CampaignRecord[];
  review: CampaignRecord[];
};
export function Dashboard({ name }: { name: string }) {
  const { data, error, reload } = useApi<{ data: DashboardData }>("/dashboard");
  if (error)
    return (
      <>
        <ErrorBox message={error} />
        <button className="button" onClick={reload}>
          Reintentar
        </button>
      </>
    );
  if (!data) return <Loading />;
  const d = data.data;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">VISTA GENERAL</span>
          <h1>
            La campaña, en tus manos<span className="gold">.</span>
          </h1>
          <p>Hola, {name.split(" ")[0]}. Este es el pulso de nuestra casa.</p>
        </div>
        <Link href="/map" className="button">
          Explorar el mapa <ArrowUpRight size={17} />
        </Link>
      </div>
      <Link href="/onboarding" className="onboarding-callout">
        <span>
          <strong>¿Primera vez en Grifo?</strong> Conoce las islas, tu
          responsabilidad y cómo registrar una acción.
        </span>
        <span>
          Empieza aquí <ArrowRight size={16} aria-hidden="true" />
        </span>
      </Link>
      <div className="stats-grid">
        <Stat
          label="Puntos acreditados"
          value={d.accreditedPoints}
          note="Registros con respaldo oficial"
          icon={<ShieldCheck />}
        />
        <Stat
          label="Pendientes de acreditar"
          value={d.pendingPoints}
          note={`${d.pendingEvidence} registros sin evidencia completa`}
          icon={<Clock3 />}
        />
        <Stat
          label="Miembros activos"
          value={d.members.active}
          note={`${d.members.total} personas en la campaña`}
          icon={<Users />}
        />
        <Stat
          label="Acciones completadas"
          value={d.islands.reduce((s, i) => s + i.done, 0)}
          note={`${d.total} acciones · ${d.blocked} bloqueadas`}
          icon={<CircleCheck />}
        />
      </div>
      <div className="dashboard-feature">
        <section className="campaign-brief">
          <div className="brief-top">
            <span className="eyebrow light">EL FOCO DE LA SEMANA</span>
            <span className="pill gold-pill">BUILT WITH ASTRA</span>
          </div>
          <h2>
            Construir. Mostrar.
            <br />
            Dejar evidencia.
          </h2>
          <p>
            Organiza las entradas al concurso, completa los comprobantes y
            acompaña a cada referido hasta el pago.
          </p>
          <div className="brief-deadline">
            <CalendarDays size={18} />
            <span>
              Cierre del concurso <b>13 sep · 23:59, Chile</b>
            </span>
          </div>
          <Link className="button gold-button" href="/islands/competencia">
            Ir a Competencia <ArrowRight size={17} />
          </Link>
          <div className="brief-compass">
            <Flag size={130} strokeWidth={0.5} />
          </div>
        </section>
        <Link href="/map" className="map-preview">
          <Image
            src="/images/campaign-map.jpeg"
            alt="Mapa del plan de campaña con las siete islas"
            fill
            sizes="(max-width: 900px) 100vw, 40vw"
            priority
          />
          <span className="map-overlay">
            <span>
              <small>TU TERRITORIO</small>
              <strong>Siete islas, una campaña</strong>
            </span>
            <span className="round-arrow">
              <ArrowUpRight />
            </span>
          </span>
        </Link>
      </div>
      <section className="section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">TERRITORIOS EN MOVIMIENTO</span>
            <h2>El estado de cada isla</h2>
          </div>
          <span className="muted">{d.total} registros compartidos</span>
        </div>
        <div className="island-grid">
          {d.islands.map((i, index) => (
            <Link href={"/islands/" + i.id} className="island-card" key={i.id}>
              <div className="island-card-top">
                <span
                  className="island-symbol"
                  style={{ color: i.color, background: i.color + "15" }}
                >
                  <IslandIcon name={i.icon} size={23} />
                </span>
                <span className="island-number">0{index + 1}</span>
                <ArrowUpRight size={17} />
              </div>
              <h3>{i.name}</h3>
              <p>{i.tagline}</p>
              <div className="island-card-bottom">
                <span>
                  <strong>{i.total}</strong> registros
                </span>
                <span>{i.done} completados</span>
              </div>
              <div className="progress-track">
                <span
                  style={{
                    width: (i.total ? (i.done / i.total) * 100 : 0) + "%",
                    background: i.color,
                  }}
                />
              </div>
            </Link>
          ))}
        </div>
      </section>
      <div className="dashboard-bottom">
        <section className="panel">
          <div className="section-heading">
            <h2>En el horizonte</h2>
            <span className="pill">{d.overdue} vencidas</span>
          </div>
          {d.upcoming.length ? (
            <div className="action-list">
              {d.upcoming.map((r) => (
                <Link
                  key={r.id}
                  href={"/islands/" + r.island + "?record=" + r.id}
                >
                  <span className={"priority-mark " + r.priority} />
                  <span>
                    <strong>{r.title}</strong>
                    <small>
                      {islands.find((i) => i.id === r.island)?.name} ·{" "}
                      {r.nextAction || "Define la próxima acción"}
                    </small>
                  </span>
                  <time>{formatDate(r.dueDate)}</time>
                  <ArrowUpRight size={15} />
                </Link>
              ))}
            </div>
          ) : (
            <Empty title="El horizonte está despejado">
              <p>
                Registra la primera acción en una isla para darle seguimiento.
              </p>
              <Link href="/islands/administracion" className="text-link">
                Crear una acción <ArrowRight size={15} />
              </Link>
            </Empty>
          )}
        </section>
        <section className="panel scoreboard">
          <span className="eyebrow">PUNTO DE PARTIDA</span>
          <h2>El marcador de la semana 1</h2>
          <p className="muted">
            {officialSnapshot.label}.<br />
            Instantánea del {formatDate(officialSnapshot.date)}; no es un
            marcador en vivo.
          </p>
          {[
            { name: "Pegaso", points: 519, color: "#6381b1" },
            { name: "Grifo", points: 375, color: "#ba944b" },
            { name: "Águila", points: 308, color: "#b2746b" },
          ].map((h) => (
            <div
              className={"score-row " + (h.name === "Grifo" ? "our-house" : "")}
              key={h.name}
            >
              <span className="house-dot" style={{ background: h.color }} />
              <span>{h.name}</span>
              <strong>{h.points}</strong>
            </div>
          ))}
          <a
            className="text-link"
            href={officialSnapshot.source}
            target="_blank"
            rel="noreferrer"
          >
            Consultar marcador oficial <ArrowUpRight size={15} />
          </a>
          <small className="score-note">
            Los puntos de esta aplicación se muestran por separado para evitar
            sumar dos veces la instantánea.
          </small>
        </section>
      </div>
    </>
  );
}
function Stat({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: number;
  note: string;
  icon: React.ReactNode;
}) {
  return (
    <section className="stat">
      <div>
        <span>{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <strong>{value.toLocaleString("es")}</strong>
      <small>{note}</small>
    </section>
  );
}
