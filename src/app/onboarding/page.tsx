import Link from "next/link";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  ArrowRight,
  Compass,
  PlayCircle,
  UserRound,
  Users,
  ShieldCheck,
} from "lucide-react";
import { islands } from "@/lib/domain";
import {
  agentOnboardingPrompt,
  entryLink,
  islandGuide,
} from "@/lib/onboarding";
import { IslandIcon } from "@/components/ui";
import { CopyGuideText, FirstRecordWalkthrough } from "@/components/onboarding";
import styles from "./onboarding.module.css";

export const metadata = {
  title: "Empieza aquí",
  description:
    "Conoce las siete islas de Grifo, qué le toca a cada persona y cómo registrar tu primera acción.",
};

export default async function OnboardingPage() {
  const origin = process.env.APP_URL || "http://localhost:3000";
  const prompt = agentOnboardingPrompt(origin);
  const transcript = await readFile(
    join(process.cwd(), "public/onboarding/guion.txt"),
    "utf8",
  );
  return (
    <div className={styles.guide}>
      <header className={styles.header}>
        <Link href="/onboarding" className={styles.brand}>
          <Compass aria-hidden="true" /> GRIFO <span>Empieza aquí</span>
        </Link>
        <Link href={entryLink("/dashboard")} className="button">
          Ir a la campaña <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </header>
      <main id="main-content" className={styles.main}>
        <div className={styles.intro}>
          <span className={styles.kicker}>TU PRIMER PASO EN LA CASA</span>
          <h1>
            Encuentra tu isla.
            <br />
            Deja claro el siguiente paso.
          </h1>
          <p>
            Grifo reúne qué estamos haciendo, quién lo acompaña, qué falta y la
            evidencia de cada avance. Empieza por el trabajo que quieres hacer.
          </p>
          <div className={styles.introActions}>
            <a href="#primer-registro" className="button primary">
              Ver ejemplo paso a paso{" "}
              <ArrowRight size={16} aria-hidden="true" />
            </a>
            <a href="#video" className="button">
              <PlayCircle size={18} aria-hidden="true" /> Ver video breve
            </a>
          </div>
          <p className={styles.access}>
            Para trabajar necesitas una cuenta con invitación.{" "}
            <Link href="/register">Crear mi cuenta</Link> · Puedes consultar
            esta guía sin iniciar sesión.
          </p>
        </div>
        <nav className={styles.contents} aria-label="Contenido de la guía">
          <a href="#islas">Las islas</a>
          <a href="#personas">Qué me toca</a>
          <a href="#primer-registro">Mi primer registro</a>
          <a href="#video">Video</a>
          <a href="#agentes">Con mi agente</a>
        </nav>
        <section
          id="islas"
          aria-labelledby="islands-title"
          className={styles.section}
        >
          <div className={styles.sectionHeading}>
            <span className={styles.kicker}>01 · ENCUENTRA TU LUGAR</span>
            <h2 id="islands-title">¿En qué isla trabajo?</h2>
            <p>
              Elige la isla según la actividad. Puedes colaborar en más de una.
            </p>
          </div>
          <div className={styles.islandGrid}>
            {islands.map((island) => {
              const guide = islandGuide[island.id];
              return (
                <article key={island.id} className={styles.islandCard}>
                  <div className={styles.cardTitle}>
                    <span style={{ color: island.color }}>
                      <IslandIcon name={island.icon} size={26} />
                    </span>
                    <h3>{island.name}</h3>
                  </div>
                  <p>{guide.when}</p>
                  <dl>
                    <dt>Qué dejas registrado</dt>
                    <dd>{guide.result}</dd>
                    <dt>Ejemplo ilustrativo</dt>
                    <dd>{guide.example}</dd>
                  </dl>
                  <Link
                    href={entryLink(`/islands/${island.id}`)}
                    className={styles.cardLink}
                  >
                    Ir a {island.name}{" "}
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </article>
              );
            })}
          </div>
          <p className={styles.note}>
            El equipo acuerda quién acompaña cada isla y lo registra en
            Administración. Confirma cada responsabilidad con la persona antes
            de darla por aceptada.
          </p>
        </section>
        <section
          id="personas"
          aria-labelledby="people-title"
          className={styles.section}
        >
          <div className={styles.sectionHeading}>
            <span className={styles.kicker}>
              02 · PERSONAS Y RESPONSABILIDADES
            </span>
            <h2 id="people-title">¿Qué me toca hacer a mí?</h2>
            <p>
              Una persona puede participar y otra ayudarla a avanzar. Estos
              nombres son ejemplos, no integrantes asignados de la campaña.
            </p>
          </div>
          <div className={styles.peopleGrid}>
            <article className={styles.personCard}>
              <UserRound aria-hidden="true" />
              <h3>Cuenta: quien entra</h3>
              <p>
                Ana accede con su correo y contraseña. Puede crear registros,
                consultar la campaña y editar los registros que creó o que tiene
                asignados.
              </p>
            </article>
            <article className={styles.personCard}>
              <Users aria-hidden="true" />
              <h3>Miembro: quien participa</h3>
              <p>
                Luis tiene una ficha en Miembros. La participación le pertenece
                a él, aunque Ana la registre. Un miembro puede existir sin tener
                cuenta.
              </p>
            </article>
            <article className={styles.personCard}>
              <ShieldCheck aria-hidden="true" />
              <h3>Responsable: quien acompaña</h3>
              <p>
                Ana figura como responsable de esta acción: mantiene el avance,
                la próxima fecha y la evidencia al día. El responsable es una
                cuenta de la app.
              </p>
            </article>
          </div>
          <div className={styles.roleNote}>
            <h3>Isla Administración y cuenta administradora</h3>
            <p>
              La isla organiza acuerdos y tareas. Una cuenta administradora
              tiene además permisos para invitar personas, revisar y acreditar
              con respaldo oficial. Trabajar en esa isla no cambia los permisos
              de tu cuenta.
            </p>
          </div>
          <details className={styles.detail}>
            <summary>Cómo entrar y preparar tu ficha</summary>
            <ol>
              <li>
                Pide a administración una invitación privada. Se usa una sola
                vez y vence a los siete días.
              </li>
              <li>
                Abre <Link href="/register">Crear cuenta</Link> y elige tu
                contraseña de al menos 12 caracteres. La cuenta es personal.
              </li>
              <li>
                Busca tu ficha en{" "}
                <Link href={entryLink("/members")}>Miembros</Link> antes de
                crearla. Registrarte no crea una ficha automáticamente.
              </li>
              <li>
                Acuerda con el equipo qué actividad vas a acompañar. Puedes
                colaborar en varias islas.
              </li>
            </ol>
            <p>
              Los registros se comparten entre las cuentas invitadas a la casa.
              Revisa qué información necesitas incluir y los permisos de
              cualquier comprobante enlazado.
            </p>
          </details>
        </section>
        <section
          id="primer-registro"
          aria-labelledby="first-record-title"
          className={styles.section}
        >
          <div className={styles.sectionHeading}>
            <span className={styles.kicker}>
              03 · APRENDE HACIENDO EL RECORRIDO
            </span>
            <h2 id="first-record-title">Tu primer registro, paso a paso.</h2>
            <p>
              Ana ayuda a Luis a preparar una participación. Explora el ejemplo:
              los botones de este recorrido no guardan datos ni generan puntos.
            </p>
          </div>
          <FirstRecordWalkthrough />
          <div className={styles.statusGuide}>
            <h3>Dos estados para responder dos preguntas</h3>
            <div>
              <p>
                <strong>Trabajo: ¿en qué vamos?</strong>
                <br />
                Por hacer · En curso · Bloqueado · Completado
              </p>
              <p>
                <strong>Revisión: ¿qué respaldo tenemos?</strong>
                <br />
                Sin enviar · En revisión · Validado internamente · Acreditado ·
                Rechazado
              </p>
            </div>
            <p>
              Los dashboards resumen los registros guardados. El marcador
              histórico es una referencia separada; la app no se sincroniza
              automáticamente con el marcador oficial.
            </p>
          </div>
        </section>
        <section
          id="video"
          aria-labelledby="video-title"
          className={styles.section}
        >
          <div className={styles.sectionHeading}>
            <span className={styles.kicker}>04 · MÍRALO O COMPÁRTELO</span>
            <h2 id="video-title">Grifo en unos minutos.</h2>
            <p>
              Una guía ilustrada con narración en español y subtítulos. Puedes
              pausar, repetir o descargar el video para compartirlo con el
              equipo.
            </p>
          </div>
          <video
            className={styles.video}
            controls
            preload="none"
            playsInline
            poster="/onboarding/poster.jpg"
            aria-label="Video de introducción a Grifo"
            aria-describedby="video-description"
          >
            <source src="/onboarding/grifo-en-4-minutos.mp4" type="video/mp4" />
            <track
              kind="captions"
              src="/onboarding/subtitulos.vtt"
              srcLang="es"
              label="Español"
              default
            />
            Tu navegador no reproduce este video. Puedes descargarlo o leer el
            guion.
          </video>
          <p id="video-description" className={styles.access}>
            Ejemplos ilustrativos con voz sintética. El contenido explica el
            flujo de trabajo; no muestra actividad real de la campaña.
          </p>
          <div className={styles.mediaActions}>
            <a
              className="button"
              href="/onboarding/grifo-en-4-minutos.mp4"
              download
            >
              Descargar video
            </a>
            <a className="button" href="/onboarding/guion.txt" download>
              Descargar transcripción
            </a>
            <CopyGuideText
              value={`${origin}/onboarding`}
              label="Copiar enlace de la guía"
            />
          </div>
          <details className={styles.detail}>
            <summary>Leer transcripción</summary>
            <div className={styles.transcript}>
              {transcript
                .split("\n\n")
                .filter(Boolean)
                .map((paragraph, index) =>
                  /^\d{2}\./.test(paragraph) ? (
                    <h3 key={index}>{paragraph}</h3>
                  ) : (
                    <p key={index}>{paragraph}</p>
                  ),
                )}
            </div>
          </details>
        </section>
        <section
          id="agentes"
          aria-labelledby="agent-title"
          className={styles.section}
        >
          <div className={styles.sectionHeading}>
            <span className={styles.kicker}>
              OPCIONAL · TU AGENTE TAMBIÉN PUEDE AYUDAR
            </span>
            <h2 id="agent-title">Hazlo desde tu chat.</h2>
            <p>
              Si tu agente puede usar la API o una terminal, sus cambios pueden
              quedar vinculados a tu cuenta.
            </p>
          </div>
          <details className={styles.detail}>
            <summary>Conectar mi agente y copiar las instrucciones</summary>
            <ol>
              <li>
                Abre <Link href={entryLink("/tokens")}>Mis agentes</Link> y
                genera un token con nombre y vencimiento.
              </li>
              <li>
                Para consultar, elige <strong>Leer la campaña</strong>. Añade{" "}
                <strong>Crear y editar</strong> solo si le delegarás cambios.
                Acreditar requiere una cuenta administradora y permisos
                adicionales.
              </li>
              <li>
                Guarda el token en una variable o secreto privado llamado{" "}
                <code>GRIFO_TOKEN</code> dentro del entorno del agente. El
                prompt de abajo no incluye tu token.
              </li>
              <li>
                Comparte el <a href="/api/openapi.json">contrato OpenAPI</a> y
                estas instrucciones. Al terminar, puedes revocar el token desde
                Mis agentes.
              </li>
            </ol>
            <p>
              El token se muestra completo una sola vez. No lo pegues en grupos,
              issues o documentos públicos. Sus permisos nunca superan los de tu
              cuenta.
            </p>
            <label className={styles.promptLabel} htmlFor="agent-prompt">
              Instrucciones para tu agente
            </label>
            <textarea
              id="agent-prompt"
              className={styles.prompt}
              value={prompt}
              readOnly
              rows={12}
              spellCheck={false}
            />
            <CopyGuideText value={prompt} label="Copiar instrucciones" />
            <p>
              <Link href="/api/documentation">
                Abrir documentación interactiva
              </Link>
            </p>
          </details>
        </section>
        <section className={styles.finish} aria-labelledby="finish-title">
          <div>
            <h2 id="finish-title">Deja tu primera acción encaminada.</h2>
            <p>
              Elige una actividad real, acuerda el responsable y escribe qué
              sigue. Puedes volver a esta guía desde el menú Empieza aquí.
            </p>
          </div>
          <Link href={entryLink("/dashboard")} className="button primary">
            Entrar a la campaña <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>
      </main>
      <footer className={styles.footer}>
        <span>Operación Grifo · Una guía para trabajar juntos.</span>
        <a href="#main-content">Volver al inicio ↑</a>
      </footer>
    </div>
  );
}
