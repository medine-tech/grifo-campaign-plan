"use client";
import { useState } from "react";
import { ShieldCheck, UserPlus } from "lucide-react";
import type { User } from "@/lib/domain";
import { api, useApi, ErrorBox, formatDate } from "./ui";
import { SecretBox } from "./tokens";
export function Settings({ user }: { user: User }) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ACCESO Y TRAZABILIDAD</span>
          <h1>La campaña bien cuidada.</h1>
          <p>Gestiona tu cuenta y el acceso de la casa.</p>
        </div>
      </div>
      <div className="settings-grid">
        <section className="panel">
          <ShieldCheck color="#988350" size={24} />
          <h2 style={{ marginTop: 15 }}>Mi cuenta</h2>
          <p>
            <strong>{user.name}</strong>
            <br />
            {user.email}
            <br />
            {user.role === "admin" ? "Administración" : "Miembro"}
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              setSuccess("");
              const form = e.currentTarget;
              const fd = new FormData(form);
              if (fd.get("newPassword") !== fd.get("confirmPassword")) {
                setError("Las contraseñas nuevas no coinciden.");
                setBusy(false);
                return;
              }
              try {
                await api("/auth/password", {
                  method: "PUT",
                  body: JSON.stringify({
                    currentPassword: fd.get("currentPassword"),
                    newPassword: fd.get("newPassword"),
                  }),
                });
                setSuccess(
                  "Contraseña actualizada. Las otras sesiones y los tokens anteriores se revocaron.",
                );
                form.reset();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="form-section-title">CAMBIAR CONTRASEÑA</div>
            <label>
              Contraseña actual
              <input
                type="password"
                name="currentPassword"
                autoComplete="current-password"
                required
                maxLength={128}
              />
            </label>
            <label>
              Nueva contraseña
              <input
                type="password"
                name="newPassword"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
              />
              <small>
                Al menos 12 caracteres. Se cerrarán otras sesiones y se
                revocarán tus tokens.
              </small>
            </label>
            <label>
              Repetir nueva contraseña
              <input
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
              />
            </label>
            <ErrorBox message={error} />
            {success && (
              <div className="notice success" role="status">
                {success}
              </div>
            )}
            <button className="button primary" disabled={busy}>
              {busy ? "Guardando…" : "Actualizar contraseña"}
            </button>
          </form>
        </section>
        {user.role === "admin" ? (
          <Invitations />
        ) : (
          <section className="panel">
            <h2>Una casa compartida</h2>
            <p>
              Para invitar a otra persona, solicita una invitación a
              administración. La documentación API es pública; los registros
              requieren una cuenta.
            </p>
          </section>
        )}
      </div>
      {user.role === "admin" && <Audit />}
    </>
  );
}
function Invitations() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const list = useApi<{
    data: {
      id: string;
      name: string;
      expiresAt: string;
      usedAt: string | null;
    }[];
  }>("/invitations");
  return (
    <section className="panel">
      <UserPlus color="#988350" size={24} />
      <h2 style={{ marginTop: 15 }}>Invitar a la casa</h2>
      <p>
        Crea una invitación de un solo uso, válida por siete días. La persona se
        registrará como miembro con su propio correo y contraseña.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const result = await api<{ data: { code: string } }>(
              "/invitations",
              {
                method: "POST",
                body: JSON.stringify({
                  name: new FormData(e.currentTarget).get("name"),
                }),
              },
            );
            setCode(result.data.code);
            list.reload();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Nombre para identificar la invitación
          <input
            name="name"
            required
            minLength={2}
            maxLength={100}
            placeholder="Nombre de la persona o equipo"
          />
        </label>
        <ErrorBox message={error} />
        <button className="button primary" disabled={busy}>
          {busy ? "Creando…" : "Crear invitación"}
        </button>
      </form>
      {code && (
        <div style={{ marginTop: 22 }}>
          <SecretBox
            value={code}
            title="Invitación creada"
            onDismiss={() => setCode("")}
          />
          <p>
            La persona debe abrir{" "}
            <a className="text-link" href="/register">
              Crear cuenta
            </a>{" "}
            e introducir el código. Compártelo de forma privada.
          </p>
        </div>
      )}
      <ErrorBox message={list.error} />
      <ul className="audit-list" style={{ marginTop: 20 }}>
        {list.data?.data.map((i) => (
          <li key={i.id}>
            {i.name}
            <small>
              {i.usedAt
                ? "Utilizada"
                : new Date(i.expiresAt) < new Date()
                  ? "Vencida"
                  : "Disponible"}{" "}
              · vence {formatDate(i.expiresAt)}
            </small>
          </li>
        ))}
      </ul>
    </section>
  );
}
function Audit() {
  const { data, error } = useApi<{
    data: {
      id: string;
      action: string;
      actor: string;
      createdAt: string;
      tokenName: string | null;
      entityId: string;
    }[];
  }>("/audit");
  return (
    <section className="panel" style={{ marginTop: 24 }}>
      <span className="eyebrow">TRAZABILIDAD</span>
      <h2>Las últimas 100 acciones</h2>
      <p className="muted">
        Cada cambio identifica a su autor y al agente utilizado, si corresponde.
      </p>
      <ErrorBox message={error} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Acción</th>
              <th>Autor</th>
              <th>Agente</th>
              <th>Fecha</th>
              <th>Registro</th>
            </tr>
          </thead>
          <tbody>
            {data?.data.map((a) => (
              <tr key={a.id}>
                <td>{a.action}</td>
                <td>{a.actor}</td>
                <td>{a.tokenName || "Navegador"}</td>
                <td>{formatDate(a.createdAt)}</td>
                <td>
                  <code>{a.entityId.slice(0, 8)}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
