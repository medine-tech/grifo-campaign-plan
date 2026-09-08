"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  Search,
  ArrowUpRight,
  Pencil,
  Trash2,
  CheckCheck,
} from "lucide-react";
import {
  fields,
  getIsland,
  kindLabels,
  statusLabels,
  verificationLabels,
  priorityLabels,
  potentialPoints,
  type CampaignRecord,
  type Member,
  type User,
  type IslandId,
} from "@/lib/domain";
import {
  api,
  useApi,
  IslandIcon,
  Loading,
  ErrorBox,
  Empty,
  Modal,
  formatDate,
} from "./ui";
type RecordList = {
  data: CampaignRecord[];
  pagination: { total: number; page: number; perPage: number };
};
export function IslandWorkspace({
  islandId,
  user,
}: {
  islandId: IslandId;
  user: User;
}) {
  const island = getIsland(islandId)!;
  const params = useSearchParams();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [verification, setVerification] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<CampaignRecord | null>(null);
  const [editing, setEditing] = useState<CampaignRecord | null>(null);
  const [form, setForm] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const records = useApi<RecordList>(
    `/islands/${islandId}/records?perPage=25&page=${page}&q=${encodeURIComponent(q)}&status=${status}&verification=${verification}`,
  );
  const members = useApi<{ data: Member[] }>("/members");
  const users = useApi<{ data: User[] }>("/users");
  const stats = useApi<{
    data: {
      islands: { id: string; total: number; done: number; points: number }[];
    };
  }>("/dashboard");
  const id = params.get("record");
  useEffect(() => {
    if (id)
      api<{ data: CampaignRecord }>(`/islands/${islandId}/records/${id}`)
        .then((r) => setSelected(r.data))
        .catch((e) => setError(e.message));
  }, [id, islandId]);
  function refresh() {
    records.reload();
    stats.reload();
  }
  const stat = stats.data?.data.islands.find((i) => i.id === islandId);
  return (
    <>
      <div className="page-heading">
        <div className="island-heading">
          <span
            className="island-symbol"
            style={{ color: island.color, background: island.color + "18" }}
          >
            <IslandIcon name={island.icon} size={29} />
          </span>
          <div>
            <span className="eyebrow">
              TERRITORIO 0
              {[
                "cazadores",
                "seguimiento",
                "ideas",
                "competencia",
                "ventas",
                "administracion",
                "referidos",
              ].indexOf(islandId) + 1}
            </span>
            <h1>{island.name}</h1>
          </div>
        </div>
        <button
          className="button primary"
          onClick={() => {
            setEditing(null);
            setForm(true);
          }}
        >
          <Plus size={17} /> Nuevo registro
        </button>
      </div>
      <p className="island-description">{island.description}</p>
      <div className="mini-stats">
        <div>
          <strong>{stat?.total ?? "—"}</strong>
          <small>Registros en la isla</small>
        </div>
        <div>
          <strong>{stat?.done ?? "—"}</strong>
          <small>Acciones completadas</small>
        </div>
        <div>
          <strong>{stat ? stat.total - stat.done : "—"}</strong>
          <small>Acciones abiertas</small>
        </div>
        <div>
          <strong>{stat?.points ?? "—"}</strong>
          <small>Puntos acreditados</small>
        </div>
      </div>
      <div className="toolbar">
        <div className="search-input">
          <Search />
          <input
            aria-label="Buscar registros"
            placeholder="Buscar en esta isla…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          aria-label="Filtrar por estado"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos los estados</option>
          {Object.entries(statusLabels).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar por acreditación"
          value={verification}
          onChange={(e) => {
            setVerification(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Toda acreditación</option>
          {Object.entries(verificationLabels).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <ErrorBox
        message={error || records.error || members.error || users.error}
      />
      {notice && (
        <div className="notice success" role="status">
          {notice}
        </div>
      )}
      {!records.data ? (
        <Loading />
      ) : records.data.data.length ? (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Registro</th>
                  <th>Responsable</th>
                  <th>Estado</th>
                  <th>Fecha límite</th>
                  <th>Evidencia / puntos</th>
                  <th>
                    <span className="muted">Abrir</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {records.data.data.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <button
                        className="row-title"
                        onClick={() => setSelected(r)}
                      >
                        {r.title}
                      </button>
                      <small>
                        {kindLabels[r.kind]} ·{" "}
                        {members.data?.data.find((m) => m.id === r.memberId)
                          ?.name || "Sin miembro vinculado"}
                      </small>
                    </td>
                    <td>
                      {users.data?.data.find((u) => u.id === r.assigneeId)
                        ?.name || "Por asignar"}
                    </td>
                    <td>
                      <span className={"pill status-" + r.status}>
                        {statusLabels[r.status]}
                      </span>
                    </td>
                    <td>{formatDate(r.dueDate)}</td>
                    <td>
                      <span className={"pill verification-" + r.verification}>
                        {verificationLabels[r.verification]}
                      </span>
                      {r.points > 0 && <small>+{r.points} acreditados</small>}
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label={"Abrir " + r.title}
                        onClick={() => setSelected(r)}
                      >
                        <ArrowUpRight size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <span>
              {records.data.pagination.total} registros · página {page}
            </span>
            <div>
              <button
                className="button small"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </button>
              <button
                className="button small"
                disabled={page * 25 >= records.data.pagination.total}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="panel">
          <Empty
            title={
              q || status || verification
                ? "No encontramos coincidencias"
                : "Esta isla está lista para empezar"
            }
          >
            <p>
              {q || status || verification
                ? "Cambia los filtros para ver otros registros."
                : island.tagline +
                  ". Crea una acción y define quién la acompaña."}
            </p>
            <button
              className="button"
              onClick={() => {
                setEditing(null);
                setForm(true);
              }}
            >
              <Plus size={16} /> Crear registro
            </button>
          </Empty>
        </div>
      )}
      {form && (
        <RecordForm
          islandId={islandId}
          record={editing}
          members={members.data?.data || []}
          users={users.data?.data || []}
          onClose={() => setForm(false)}
          onSaved={() => {
            setForm(false);
            refresh();
            setNotice(
              editing
                ? "Cambios guardados. La evidencia vuelve a quedar pendiente de revisión."
                : "Registro creado.",
            );
          }}
        />
      )}
      {selected && !form && (
        <RecordDetail
          record={selected}
          user={user}
          members={members.data?.data || []}
          users={users.data?.data || []}
          onClose={() => setSelected(null)}
          onEdit={() => {
            setEditing(selected);
            setSelected(null);
            setForm(true);
          }}
          onChange={(r) => {
            setSelected(r);
            refresh();
          }}
          onDeleted={() => {
            setSelected(null);
            refresh();
            setNotice(
              "Registro eliminado. El historial de cambios se conserva.",
            );
          }}
        />
      )}
    </>
  );
}
export function RecordForm({
  islandId,
  record,
  members,
  users,
  onClose,
  onSaved,
}: {
  islandId: IslandId;
  record: CampaignRecord | null;
  members: Member[];
  users: User[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const island = getIsland(islandId)!;
  const [kind, setKind] = useState(record?.kind || island.kinds[0]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const currentFields = fields[kind];
  return (
    <Modal
      title={record ? "Editar registro" : "Nuevo registro en " + island.name}
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const fd = new FormData(e.currentTarget);
          const data: Record<string, string | number | boolean> = {};
          for (const f of currentFields) {
            const value = fd.get("data." + f.key);
            if (f.type === "checkbox") data[f.key] = value === "on";
            else if (f.type === "number") {
              if (value !== "") data[f.key] = Number(value);
            } else data[f.key] = String(value || "");
          }
          const value = {
            kind,
            title: fd.get("title"),
            description: fd.get("description"),
            memberId: fd.get("memberId") || null,
            assigneeId: fd.get("assigneeId") || null,
            dueDate: fd.get("dueDate") || null,
            eventDate: fd.get("eventDate"),
            status: fd.get("status"),
            priority: fd.get("priority"),
            nextAction: fd.get("nextAction"),
            evidenceUrl: fd.get("evidenceUrl"),
            data,
            ...(record ? { version: record.version } : {}),
          };
          try {
            await api(
              `/islands/${islandId}/records${record ? "/" + record.id : ""}`,
              {
                method: record ? "PUT" : "POST",
                body: JSON.stringify(value),
                headers: record
                  ? {}
                  : { "Idempotency-Key": crypto.randomUUID() },
              },
            );
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
            Tipo de registro
            <select
              name="kind"
              value={kind}
              disabled={!!record}
              onChange={(e) => setKind(e.target.value)}
            >
              {island.kinds.map((k) => (
                <option key={k} value={k}>
                  {kindLabels[k]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Prioridad
            <select name="priority" defaultValue={record?.priority || "medium"}>
              {Object.entries(priorityLabels).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="span-2">
            Título
            <input
              name="title"
              defaultValue={record?.title}
              required
              minLength={3}
              maxLength={180}
              placeholder="Una acción concreta, con un resultado claro"
            />
          </label>
          <label className="span-2">
            Descripción
            <textarea
              name="description"
              defaultValue={record?.description}
              maxLength={5000}
            />
          </label>
          <label>
            Miembro vinculado
            <select name="memberId" defaultValue={record?.memberId || ""}>
              <option value="">Sin miembro</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.surname}
                </option>
              ))}
            </select>
            <small>
              La persona a quien pertenece el logro, venta o referido.
            </small>
          </label>
          <label>
            Responsable
            <select name="assigneeId" defaultValue={record?.assigneeId || ""}>
              <option value="">Por asignar</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <small>La cuenta que acompaña y puede editar esta acción.</small>
          </label>
          <label>
            Fecha del evento
            <input
              type="date"
              name="eventDate"
              defaultValue={
                record?.eventDate ||
                new Date().toLocaleDateString("en-CA", {
                  timeZone: "America/Santiago",
                })
              }
              required
            />
          </label>
          <label>
            Fecha límite
            <input
              type="date"
              name="dueDate"
              defaultValue={record?.dueDate || ""}
            />
          </label>
          <label>
            Estado
            <select name="status" defaultValue={record?.status || "pending"}>
              {Object.entries(statusLabels).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label>
            Próxima acción
            <input
              name="nextAction"
              defaultValue={record?.nextAction}
              maxLength={1000}
              placeholder="Qué sigue y con quién"
            />
          </label>
        </div>
        <div className="form-section-title">
          DATOS DE {kindLabels[kind].toUpperCase()}
        </div>
        <div className="form-grid" key={kind}>
          {currentFields.map((f) => (
            <label
              key={f.key}
              className={
                f.type === "checkbox"
                  ? "check-label span-2"
                  : f.type === "textarea"
                    ? "span-2"
                    : ""
              }
            >
              {f.type === "checkbox" ? (
                <>
                  <input
                    type="checkbox"
                    name={"data." + f.key}
                    defaultChecked={Boolean(record?.data[f.key])}
                  />
                  {f.label}
                </>
              ) : (
                <>
                  {f.label}
                  {f.type === "textarea" ? (
                    <textarea
                      name={"data." + f.key}
                      defaultValue={String(record?.data[f.key] || "")}
                      maxLength={5000}
                    />
                  ) : f.type === "select" ? (
                    <select
                      name={"data." + f.key}
                      defaultValue={String(
                        record?.data[f.key] || f.options?.[0] || "",
                      )}
                    >
                      {f.options?.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      name={"data." + f.key}
                      type={f.type || "text"}
                      defaultValue={String(record?.data[f.key] ?? "")}
                      min={f.type === "number" ? 0 : undefined}
                      step={f.type === "number" ? "0.01" : undefined}
                      maxLength={f.type === "url" ? 2000 : 5000}
                    />
                  )}
                </>
              )}
              {f.help && <small>{f.help}</small>}
            </label>
          ))}
        </div>
        <label>
          Enlace de publicación o evidencia
          <input
            type="url"
            name="evidenceUrl"
            defaultValue={record?.evidenceUrl}
            placeholder="https://…"
            maxLength={2000}
          />
          <small>
            Una evidencia permite enviar a revisión. Administración registra la
            acreditación oficial.
          </small>
        </label>
        <ErrorBox message={error} />
        <div className="form-actions">
          <button type="button" className="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="button primary" disabled={busy}>
            {busy
              ? "Guardando…"
              : record
                ? "Guardar cambios"
                : "Crear registro"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function RecordDetail({
  record: r,
  user,
  members,
  users,
  onClose,
  onEdit,
  onChange,
  onDeleted,
}: {
  record: CampaignRecord;
  user: User;
  members: Member[];
  users: User[];
  onClose: () => void;
  onEdit: () => void;
  onChange: (r: CampaignRecord) => void;
  onDeleted: () => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const canEdit =
    user.role === "admin" ||
    r.createdBy === user.id ||
    r.assigneeId === user.id;
  return (
    <Modal title={r.title} onClose={onClose}>
      <div className="record-detail">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className={"pill status-" + r.status}>
            {statusLabels[r.status]}
          </span>
          <span className={"pill verification-" + r.verification}>
            {verificationLabels[r.verification]}
          </span>
          <span className="pill">{kindLabels[r.kind]}</span>
        </div>
        <p className="detail-text">
          {r.description || "Sin descripción adicional."}
        </p>
        <div className="detail-grid">
          <div>
            <small>Miembro</small>
            {members.find((m) => m.id === r.memberId)?.name ||
              "Sin miembro vinculado"}
          </div>
          <div>
            <small>Responsable</small>
            {users.find((u) => u.id === r.assigneeId)?.name || "Por asignar"}
          </div>
          <div>
            <small>Fecha del evento / límite</small>
            {formatDate(r.eventDate)} / {formatDate(r.dueDate)}
          </div>
          <div>
            <small>Puntos</small>
            {r.points} acreditados ·{" "}
            {r.verification === "accredited" ? 0 : potentialPoints(r)}{" "}
            potenciales
          </div>
        </div>
        {r.nextAction && (
          <div>
            <span className="eyebrow">PRÓXIMA ACCIÓN</span>
            <p className="detail-text">{r.nextAction}</p>
          </div>
        )}
        {fields[r.kind].map((f) =>
          r.data[f.key] !== undefined && r.data[f.key] !== "" ? (
            <div key={f.key}>
              <small className="muted">{f.label}</small>
              <div className="detail-text">
                {f.type === "url" && r.data[f.key] ? (
                  <a
                    href={String(r.data[f.key])}
                    className="detail-link"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir enlace ↗
                  </a>
                ) : typeof r.data[f.key] === "boolean" ? (
                  r.data[f.key] ? (
                    "Sí"
                  ) : (
                    "No"
                  )
                ) : (
                  String(r.data[f.key])
                )}
              </div>
            </div>
          ) : null,
        )}
        {r.evidenceUrl && (
          <a
            className="detail-link"
            href={r.evidenceUrl}
            target="_blank"
            rel="noreferrer"
          >
            Ver publicación o evidencia ↗
          </a>
        )}
        {r.officialUrl && (
          <a
            className="detail-link"
            href={r.officialUrl}
            target="_blank"
            rel="noreferrer"
          >
            Ver acreditación oficial ↗
          </a>
        )}
        {r.reviewNote && <div className="notice">Revisión: {r.reviewNote}</div>}
        <ErrorBox message={error} />
        {review && (
          <form
            key={r.version}
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              const fd = new FormData(e.currentTarget);
              try {
                const result = await api<{ data: CampaignRecord }>(
                  `/islands/${r.island}/records/${r.id}/review`,
                  {
                    method: "POST",
                    body: JSON.stringify({
                      verification: fd.get("verification"),
                      officialUrl: fd.get("officialUrl") || "",
                      reviewNote: fd.get("reviewNote") || "",
                      version: r.version,
                    }),
                  },
                );
                onChange(result.data);
                setReview(false);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="form-section-title">REVISIÓN DE EVIDENCIA</div>
            <label>
              Resultado
              <select name="verification" defaultValue={r.verification}>
                {Object.entries(verificationLabels)
                  .filter(
                    ([v]) =>
                      user.role === "admin" ||
                      ["pending", "submitted"].includes(v),
                  )
                  .map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
              </select>
            </label>
            {user.role === "admin" && (
              <label>
                Enlace de acreditación oficial
                <input
                  name="officialUrl"
                  type="url"
                  defaultValue={r.officialUrl}
                  placeholder="Publicación o registro oficial que lo confirma"
                />
              </label>
            )}
            <label>
              Motivo o notas
              <textarea
                name="reviewNote"
                defaultValue={r.reviewNote}
                maxLength={2000}
              />
              <small>
                Obligatorio al rechazar o retirar una acreditación. Acreditar
                significa haber comprobado el reconocimiento oficial.
              </small>
            </label>
            <button className="button primary" disabled={busy}>
              Guardar revisión
            </button>
          </form>
        )}
        {confirm && (
          <div className="notice">
            <p className="confirm-copy">
              Se retirará este registro de las listas. Su historial de auditoría
              se conserva.
            </p>
            <div className="form-actions">
              <button
                className="button small"
                onClick={() => setConfirm(false)}
              >
                Cancelar
              </button>
              <button
                className="button danger small"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await api(
                      `/islands/${r.island}/records/${r.id}?version=${r.version}`,
                      { method: "DELETE" },
                    );
                    onDeleted();
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Confirmar eliminación
              </button>
            </div>
          </div>
        )}
        <div className="detail-toolbar">
          <div>
            {canEdit && r.verification !== "accredited" && (
              <button className="button small" onClick={onEdit}>
                <Pencil size={14} /> Editar
              </button>
            )}
            {canEdit &&
              (user.role === "admin" ||
                !["accredited", "validated"].includes(r.verification)) && (
                <button
                  className="button small"
                  onClick={() => {
                    setReview(!review);
                    setConfirm(false);
                  }}
                >
                  <CheckCheck size={15} /> Revisar evidencia
                </button>
              )}
          </div>
          {canEdit && r.verification !== "accredited" && (
            <button
              className="button small danger"
              onClick={() => {
                setConfirm(!confirm);
                setReview(false);
              }}
            >
              <Trash2 size={14} /> Eliminar
            </button>
          )}
        </div>
        <small className="muted">
          Creado por{" "}
          {users.find((u) => u.id === r.createdBy)?.name || "miembro"} ·{" "}
          {formatDate(r.createdAt)} · versión {r.version}
        </small>
      </div>
    </Modal>
  );
}
