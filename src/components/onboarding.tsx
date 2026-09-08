"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import { ArrowLeft, ArrowRight, Check, Copy, RotateCcw } from "lucide-react";
import { entryLink, walkthrough } from "@/lib/onboarding";
import styles from "@/app/onboarding/onboarding.module.css";

const subscribeToHydration = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

// The HTML is visible before React attaches handlers. Keep its controls disabled
// until hydration finishes so an early click never appears to be accepted.
function useInteractiveReady() {
  return useSyncExternalStore(subscribeToHydration, clientReady, serverReady);
}

export function CopyGuideText({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  const ready = useInteractiveReady();
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  return (
    <div className={styles.copyAction}>
      <button
        className="button"
        disabled={!ready}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setStatus("copied");
          } catch {
            setStatus("error");
          }
        }}
      >
        {status === "copied" ? (
          <Check size={16} aria-hidden="true" />
        ) : (
          <Copy size={16} aria-hidden="true" />
        )}
        {label}
      </button>
      <span role="status">
        {status === "copied" && "Copiado."}
        {status === "error" &&
          "No pudimos copiar. Selecciona el texto y cópialo manualmente."}
      </span>
    </div>
  );
}

const stepLabels = [
  "Elegir isla",
  "Vincular personas",
  "Próximo paso",
  "Añadir evidencia",
  "Pedir revisión",
  "Practicar",
];

export function FirstRecordWalkthrough() {
  const ready = useInteractiveReady();
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const current = walkthrough[step];
  const correct = answer === 1;
  function goTo(next: number) {
    setStep(next);
    setAnswer(null);
    requestAnimationFrame(() => heading.current?.focus());
  }
  return (
    <div className={styles.walkthrough}>
      <nav aria-label="Pasos del primer registro" className={styles.stepNav}>
        <ol>
          {stepLabels.map((label, index) => (
            <li key={label}>
              <button
                disabled={!ready}
                onClick={() => goTo(index)}
                aria-current={step === index ? "step" : undefined}
                aria-label={`Paso ${index + 1}: ${label}`}
              >
                <span aria-hidden="true">{index + 1}</span>
                {label}
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <div className={styles.stepContent}>
        <p className={styles.stepCount} aria-live="polite">
          {ready
            ? `Paso ${step + 1} de ${walkthrough.length}`
            : "Preparando el recorrido…"}
        </p>
        <h3 ref={heading} tabIndex={-1} className={styles.stepTitle}>
          {current.title}
        </h3>
        <p>{current.instruction}</p>
        <div className={styles.example}>
          <span className={styles.exampleLabel}>
            EJEMPLO ILUSTRATIVO · ANA Y LUIS
          </span>
          <dl>
            {current.fields.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        {step === walkthrough.length - 1 ? (
          <fieldset className={styles.knowledgeCheck}>
            <legend>Elige una respuesta</legend>
            {[
              "Corresponde a Ana y ya tiene puntos porque terminó la tarea.",
              "Corresponde a Luis; falta enviar la evidencia, revisarla y acreditar con respaldo oficial.",
            ].map((label, index) => (
              <button
                key={label}
                disabled={!ready}
                className={answer === index ? styles.selectedAnswer : ""}
                onClick={() => setAnswer(index)}
                aria-pressed={answer === index}
              >
                {label}
              </button>
            ))}
            <p
              role="status"
              className={correct ? styles.correct : styles.feedback}
            >
              {answer === null
                ? "Puedes intentarlo y volver a revisar los pasos."
                : correct
                  ? "Correcto. Luis es el miembro vinculado; Ana acompaña el trabajo. La acreditación requiere evidencia y respaldo oficial."
                  : "Revisa los campos: la participación pertenece a Luis. Completado describe el trabajo; todavía no acredita puntos. Prueba la otra respuesta."}
            </p>
            {correct && (
              <Link
                className="button primary"
                href={entryLink("/islands/competencia")}
              >
                Ir a Competencia <ArrowRight size={16} aria-hidden="true" />
              </Link>
            )}
          </fieldset>
        ) : (
          <p className={styles.takeaway}>{current.takeaway}</p>
        )}
        <div className={styles.stepActions}>
          <button
            className="button"
            disabled={!ready || step === 0}
            onClick={() => goTo(step - 1)}
          >
            <ArrowLeft size={16} aria-hidden="true" /> Anterior
          </button>
          {step < walkthrough.length - 1 ? (
            <button
              className="button primary"
              disabled={!ready}
              onClick={() => goTo(step + 1)}
            >
              Siguiente <ArrowRight size={16} aria-hidden="true" />
            </button>
          ) : (
            <button
              className="button"
              disabled={!ready}
              onClick={() => goTo(0)}
            >
              <RotateCcw size={16} aria-hidden="true" /> Repetir recorrido
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
