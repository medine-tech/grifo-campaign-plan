"use client";
import Link from "next/link";
import { useState } from "react";
import { Plus, Copy, KeyRound, Ban, Check } from "lucide-react";
import type { ApiToken, User } from "@/lib/domain";
import { api, useApi, Empty, Modal, ErrorBox, Loading, formatDate } from "./ui";
export function SecretBox({
  value,
  title,
  onDismiss,
}: {
  value: string;
  title: string;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="secret-box" role="status">
      <h3>{title}</h3>
      <p>Copia este código ahora. No volveremos a mostrarlo completo.</p>
      <code>{value}</code>
      <ErrorBox message={error} />
      <div style={{ display: "flex", gap: 10 }}>
        <button
          className="button small"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
            } catch {
              setError(
                "No pudimos copiar. Selecciona y copia el código manualmente.",
              );
            }
          }}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}{" "}
          {copied ? "Copiado" : "Copiar"}
        </button>
        <button className="button small" onClick={onDismiss}>
          Ya lo guardé
        </button>
      </div>
    </div>
  );
}
export function Tokens({ user, origin }: { user: User; origin: string }) {
  const { data, error, reload } = useApi<{ data: ApiToken[] }>("/tokens");
  const [form, setForm] = useState(false);
  const [plain, setPlain] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revoking, setRevoking] = useState<ApiToken | null>(null);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">TU EQUIPO, TAMBIÉN AGÉNTICO</span>
          <h1>Un acceso para cada agente.</h1>
          <p>Conecta desde ChatGPT, Claude o cualquier agente con terminal.</p>
        </div>
        <button
          className="button primary"
          onClick={() => {
            setFormError("");
            setForm(true);
          }}
        >
          <Plus size={16} /> Generar token
        </button>
      </div>
      <div className="token-intro">
        <div className="panel">
          <KeyRound size={23} color="#ae925b" />
          <h2 style={{ marginTop: 15 }}>Tu agente actúa contigo.</h2>
          <ol>
            <li>Genera un token con los permisos necesarios.</li>
            <li>
              Entrégale la documentación y el token en un entorno privado.
            </li>
            <li>Sus cambios quedarán vinculados a tu usuario.</li>
          </ol>
          <Link className="text-link" href="/api/documentation">
            Abrir documentación interactiva ↗
          </Link>
        </div>
        <div className="code-panel">
          <span className="eyebrow">PRIMERA CONEXIÓN</span>
          <pre>{`export GRIFO_TOKEN='TU_TOKEN'\ncurl '${origin}/api/v1/islands' \\\n  -H "Authorization: Bearer $GRIFO_TOKEN"`}</pre>
          <p>
            Los permisos del token nunca superan los de tu cuenta. Los tokens no
            pueden generar nuevos tokens ni invitaciones.
          </p>
        </div>
      </div>
      {plain && (
        <SecretBox
          value={plain}
          title="Tu token está listo"
          onDismiss={() => setPlain("")}
        />
      )}
      <ErrorBox message={error} />
      {!data ? (
        <Loading />
      ) : !data.data.length ? (
        <div className="panel">
          <Empty title="Tu primer agente empieza aquí">
            <p>Genera un token, elige sus permisos y define cuándo vence.</p>
            <button
              className="button"
              onClick={() => {
                setFormError("");
                setForm(true);
              }}
            >
              Generar mi primer token
            </button>
          </Empty>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Agente / token</th>
                <th>Permisos</th>
                <th>Vencimiento</th>
                <th>Último uso</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((t) => (
                <tr key={t.id}>
                  <td>
                    <strong>{t.name}</strong>
                    <small>{t.prefix}…</small>
                  </td>
                  <td>{t.scopes.join(", ")}</td>
                  <td>{formatDate(t.expiresAt)}</td>
                  <td>{t.lastUsedAt ? formatDate(t.lastUsedAt) : "Sin uso"}</td>
                  <td>
                    <span
                      className={
                        "pill " +
                        (!t.revokedAt && new Date(t.expiresAt) > new Date()
                          ? "status-done"
                          : "")
                      }
                    >
                      {t.revokedAt
                        ? "Revocado"
                        : new Date(t.expiresAt) < new Date()
                          ? "Vencido"
                          : "Activo"}
                    </span>
                  </td>
                  <td>
                    {!t.revokedAt && (
                      <button
                        className="button small danger"
                        onClick={() => {
                          setRevoking(t);
                          setFormError("");
                        }}
                      >
                        <Ban size={13} /> Revocar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {form && (
        <Modal
          title="Generar token para un agente"
          onClose={() => setForm(false)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setFormError("");
              const fd = new FormData(e.currentTarget);
              try {
                const result = await api<{
                  data: ApiToken & { token: string };
                }>("/tokens", {
                  method: "POST",
                  body: JSON.stringify({
                    name: fd.get("name"),
                    scopes: fd.getAll("scopes"),
                    expiresInDays: Number(fd.get("expiresInDays")),
                  }),
                });
                setPlain(result.data.token);
                setForm(false);
                reload();
              } catch (e) {
                setFormError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Nombre del agente
              <input
                name="name"
                placeholder="Por ejemplo: Claude · Seguimiento"
                required
                minLength={2}
                maxLength={80}
              />
            </label>
            <label>
              Vigencia
              <select name="expiresInDays" defaultValue="30">
                <option value="7">7 días</option>
                <option value="30">30 días</option>
                <option value="90">90 días</option>
              </select>
            </label>
            <div className="form-section-title">PERMISOS</div>
            <label className="check-label">
              <input
                type="checkbox"
                name="scopes"
                value="read"
                defaultChecked
              />{" "}
              Leer la campaña
            </label>
            <label className="check-label">
              <input type="checkbox" name="scopes" value="write" /> Crear y
              editar registros permitidos a mi usuario
            </label>
            {user.role === "admin" && (
              <label className="check-label">
                <input type="checkbox" name="scopes" value="approve" />{" "}
                Acreditar o corregir puntos (también requiere write)
              </label>
            )}
            <ErrorBox message={formError} />
            <div className="form-actions">
              <button
                type="button"
                className="button"
                onClick={() => setForm(false)}
              >
                Cancelar
              </button>
              <button className="button primary" disabled={busy}>
                {busy ? "Generando…" : "Generar token"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {revoking && (
        <Modal
          title={"Revocar " + revoking.name}
          onClose={() => setRevoking(null)}
        >
          <p className="confirm-copy">
            El agente perderá acceso inmediatamente. Sus registros e historial
            se conservan. Puedes generar otro token cuando lo necesites.
          </p>
          <ErrorBox message={formError} />
          <div className="form-actions">
            <button className="button" onClick={() => setRevoking(null)}>
              Cancelar
            </button>
            <button
              className="button danger"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api("/tokens/" + revoking.id, { method: "DELETE" });
                  setRevoking(null);
                  reload();
                } catch (e) {
                  setFormError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Confirmar revocación
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
