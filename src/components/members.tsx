"use client";
import { useState } from "react";
import { Plus, Search, Pencil, Trash2, ExternalLink } from "lucide-react";
import type { Member, User } from "@/lib/domain";
import { api, useApi, Empty, Modal, ErrorBox, Loading } from "./ui";
export function Members({ user }: { user: User }) {
  const { data, error, reload } = useApi<{ data: Member[] }>("/members");
  const [q, setQ] = useState("");
  const [form, setForm] = useState(false);
  const [selected, setSelected] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState<Member | null>(null);
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const filtered = data?.data.filter((m) =>
    (m.name + " " + m.surname).toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">LAS PERSONAS DE LA CAMPAÑA</span>
          <h1>La casa la hacemos todos.</h1>
          <p>Una ficha por persona, conectada con todas sus islas.</p>
        </div>
        <button
          className="button primary"
          onClick={() => {
            setSelected(null);
            setForm(true);
          }}
        >
          <Plus size={16} /> Nuevo miembro
        </button>
      </div>
      <div className="notice">
        La ficha de un miembro conserva sus actividades. El acceso a la
        aplicación se crea por invitación desde Configuración.
      </div>
      <div className="toolbar">
        <div className="search-input">
          <Search />
          <input
            aria-label="Buscar miembros"
            placeholder="Buscar por nombre o apellido…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <span className="muted">{data?.data.length ?? 0} miembros</span>
      </div>
      <ErrorBox message={error} />
      {!data ? (
        <Loading />
      ) : filtered?.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Miembro</th>
                <th>Grupo</th>
                <th>Actividad</th>
                <th>Perfil</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id}>
                  <td>
                    <strong>
                      {m.name} {m.surname}
                    </strong>
                    <small>{m.notes.slice(0, 75)}</small>
                  </td>
                  <td>{m.cohort === "new" ? "Nuevos" : "Antiguos"}</td>
                  <td>
                    <span className={"pill " + (m.active ? "status-done" : "")}>
                      {m.active ? "Activo" : "Por activar"}
                    </span>
                  </td>
                  <td>
                    {m.profileUrl ? (
                      <a
                        href={m.profileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-link"
                      >
                        Ver perfil <ExternalLink size={13} />
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {(user.role === "admin" || m.createdBy === user.id) && (
                      <div className="row-actions">
                        <button
                          aria-label={"Editar a " + m.name}
                          className="icon-button"
                          onClick={() => {
                            setSelected(m);
                            setForm(true);
                          }}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          aria-label={"Eliminar a " + m.name}
                          className="icon-button"
                          onClick={() => {
                            setDeleting(m);
                            setActionError("");
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="panel">
          <Empty
            title={
              q
                ? "No encontramos a esa persona"
                : "Todo empieza con una persona"
            }
          >
            <p>
              Crea la primera ficha para vincularla a acciones, logros, ventas y
              referidos.
            </p>
            <button
              className="button"
              onClick={() => {
                setSelected(null);
                setForm(true);
              }}
            >
              Añadir miembro
            </button>
          </Empty>
        </div>
      )}
      {form && (
        <MemberForm
          member={selected}
          onClose={() => setForm(false)}
          onSaved={() => {
            setForm(false);
            reload();
          }}
        />
      )}
      {deleting && (
        <Modal
          title={"Eliminar a " + deleting.name}
          onClose={() => setDeleting(null)}
        >
          <p className="confirm-copy">
            Solo se puede eliminar una ficha sin registros vinculados. Si la
            persona tiene historial, edita su actividad a “Por activar” para
            conservarlo.
          </p>
          <ErrorBox message={actionError} />
          <div className="form-actions">
            <button className="button" onClick={() => setDeleting(null)}>
              Cancelar
            </button>
            <button
              className="button danger"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api("/members/" + deleting.id, { method: "DELETE" });
                  setDeleting(null);
                  reload();
                } catch (e) {
                  setActionError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Confirmar eliminación
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function MemberForm({
  member: m,
  onClose,
  onSaved,
}: {
  member: Member | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={m ? "Editar miembro" : "Nuevo miembro"} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const fd = new FormData(e.currentTarget);
          const payload = {
            name: fd.get("name"),
            surname: fd.get("surname"),
            profileUrl: fd.get("profileUrl"),
            cohort: fd.get("cohort"),
            active: fd.get("active") === "on",
            notes: fd.get("notes"),
          };
          try {
            await api("/members" + (m ? "/" + m.id : ""), {
              method: m ? "PUT" : "POST",
              body: JSON.stringify(payload),
              headers: m ? {} : { "Idempotency-Key": crypto.randomUUID() },
            });
            onSaved();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-grid">
          <label>
            Nombre
            <input
              name="name"
              required
              minLength={2}
              maxLength={100}
              defaultValue={m?.name}
            />
          </label>
          <label>
            Primer apellido
            <input name="surname" maxLength={100} defaultValue={m?.surname} />
            <small>
              Grifo: G–O, según el padrón del reto. Verifica antes de
              incorporar.
            </small>
          </label>
          <label className="span-2">
            Perfil en la comunidad
            <input
              type="url"
              name="profileUrl"
              defaultValue={m?.profileUrl}
              maxLength={2000}
            />
          </label>
          <label>
            Grupo
            <select name="cohort" defaultValue={m?.cohort || "new"}>
              <option value="new">Nuevos</option>
              <option value="existing">Antiguos</option>
            </select>
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              name="active"
              defaultChecked={m?.active ?? true}
            />{" "}
            Participa activamente
          </label>
          <label className="span-2">
            Contexto y notas
            <textarea name="notes" maxLength={2000} defaultValue={m?.notes} />
          </label>
        </div>
        <ErrorBox message={error} />
        <div className="form-actions">
          <button type="button" className="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? "Guardando…" : m ? "Guardar cambios" : "Crear miembro"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
