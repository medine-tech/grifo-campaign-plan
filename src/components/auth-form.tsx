"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Compass, KeyRound } from "lucide-react";
import { api, ErrorBox } from "./ui";
export function AuthForm({
  register = false,
  nextPath = "/dashboard",
}: {
  register?: boolean;
  nextPath?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main id="main-content" className="auth-page">
      <section className="auth-art">
        <div className="auth-brand">
          <Compass size={30} /> GRIFO
        </div>
        <div>
          <span className="eyebrow">JUEGOS IMPERIALES · 2026</span>
          <h1>
            Siete islas.
            <br />
            Un mismo
            <br />
            <em>horizonte.</em>
          </h1>
          <p>
            El lugar donde las ideas se convierten en acciones y cada avance
            deja su huella.
          </p>
        </div>
        <span className="auth-caption">PLAN DE CAMPAÑA / CASA DEL GRIFO</span>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <span className="eyebrow">CENTRO DE OPERACIONES</span>
          <h2>{register ? "Únete a la campaña" : "De vuelta a la campaña"}</h2>
          <p className="muted">
            {register
              ? "Crea tu cuenta con la invitación de administración."
              : "Entra para organizar tus islas y conectar a tus agentes."}
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              const value = Object.fromEntries(new FormData(e.currentTarget));
              try {
                await api("/auth/" + (register ? "register" : "login"), {
                  method: "POST",
                  body: JSON.stringify(value),
                });
                router.push(register ? "/onboarding" : nextPath);
                router.refresh();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {register && (
              <label>
                Nombre
                <input
                  name="name"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={100}
                />
              </label>
            )}
            <label>
              Correo electrónico
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                placeholder="tu@correo.com"
              />
            </label>
            <label>
              Contraseña
              <input
                type="password"
                name="password"
                autoComplete={register ? "new-password" : "current-password"}
                minLength={register ? 12 : 1}
                maxLength={128}
                required
              />
              {register && <small>Al menos 12 caracteres.</small>}
            </label>
            {register && (
              <label>
                Código de invitación
                <input
                  name="inviteCode"
                  autoComplete="off"
                  required
                  placeholder="Tu código privado de acceso"
                />
                <small>Cada invitación se utiliza una sola vez.</small>
              </label>
            )}
            <ErrorBox message={error} />
            <button className="button primary full" disabled={busy}>
              {busy
                ? "Un momento…"
                : register
                  ? "Crear mi cuenta"
                  : "Entrar a la campaña"}
              <ArrowRight size={17} />
            </button>
          </form>
          <p className="auth-switch">
            {register ? "¿Ya tienes cuenta?" : "¿Primera vez aquí?"}{" "}
            <Link href={register ? "/login" : "/register"}>
              {register ? "Inicia sesión" : "Usa tu invitación"}
            </Link>
          </p>
          <div className="auth-api">
            <KeyRound size={18} />
            <span>
              ¿Vienes con un agente?
              <br />
              <Link href="/api/documentation">
                Consulta la documentación API ↗
              </Link>
            </span>
          </div>
          <p className="auth-switch">
            <Link href="/onboarding">
              Empieza aquí: conoce las islas y tu primera acción ↗
            </Link>
          </p>
        </div>
        <p className="auth-footnote">
          Construido en abierto por MedineTech · Operación Grifo
        </p>
      </section>
    </main>
  );
}
