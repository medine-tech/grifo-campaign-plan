import { camel, query, transaction, type Connection } from "./db";
import { audit, type Actor } from "./auth";
import { ApiError, hash } from "./http";
import { type CampaignRecord, potentialPoints } from "./domain";
import { parse, recordSchema, reviewSchema, validateKind } from "./validation";

export const recordColumns =
  "id,island,kind,title,description,member_id,assignee_id,due_date::text,event_date::text,status,priority,next_action,evidence_url,official_url,verification,review_note,points,data,version,created_by,created_at,updated_at";
export async function getRecord(
  c: Connection,
  id: string,
  island: string,
  lock = false,
) {
  const { rows } = await c.query(
    `SELECT ${recordColumns} FROM records WHERE id=$1 AND island=$2 AND deleted_at IS NULL ${lock ? "FOR UPDATE" : ""}`,
    [id, island],
  );
  if (!rows[0]) throw new ApiError(404, "Registro no encontrado.");
  return camel<CampaignRecord>(rows[0]);
}
export function canEdit(actor: Actor, record: CampaignRecord) {
  if (
    actor.role !== "admin" &&
    record.createdBy !== actor.id &&
    record.assigneeId !== actor.id
  )
    throw new ApiError(
      403,
      "Solo el autor, responsable o administración puede modificar este registro.",
    );
}
export async function idempotent(
  actor: Actor,
  request: Request,
  payload: unknown,
  operation: (c: Connection) => Promise<unknown>,
  status = 201,
) {
  const key = request.headers.get("idempotency-key");
  if (key && !/^[A-Za-z0-9._:-]{8,128}$/.test(key))
    throw new ApiError(
      422,
      "Idempotency-Key debe tener entre 8 y 128 caracteres alfanuméricos.",
    );
  return transaction(async (c) => {
    if (key) {
      await c.query("LOCK TABLE idempotency_keys IN SHARE ROW EXCLUSIVE MODE");
      const { rows } = await c.query(
        "SELECT request_hash,response,status FROM idempotency_keys WHERE key=$1 AND user_id=$2",
        [key, actor.id],
      );
      const digest = hash(
        request.method +
          new URL(request.url).pathname +
          JSON.stringify(payload),
      );
      if (rows[0]) {
        if (rows[0].request_hash !== digest)
          throw new ApiError(
            409,
            "La clave de idempotencia ya se usó con otra solicitud.",
          );
        return {
          data: rows[0].response,
          status: Number(rows[0].status),
          replayed: true,
        };
      }
      const data = await operation(c);
      await c.query(
        "INSERT INTO idempotency_keys(key,user_id,request_hash,response,status) VALUES($1,$2,$3,$4,$5)",
        [key, actor.id, digest, JSON.stringify(data), status],
      );
      return { data, status, replayed: false };
    }
    return { data: await operation(c), status, replayed: false };
  });
}
export async function createRecord(
  c: Connection,
  actor: Actor,
  island: string,
  input: unknown,
) {
  const value = parse(recordSchema, input);
  validateKind(island, value);
  const id = crypto.randomUUID();
  await c.query(
    `INSERT INTO records(id,island,kind,title,description,member_id,assignee_id,due_date,event_date,status,priority,next_action,evidence_url,data,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [
      id,
      island,
      value.kind,
      value.title,
      value.description,
      value.memberId,
      value.assigneeId,
      value.dueDate,
      value.eventDate,
      value.status,
      value.priority,
      value.nextAction,
      value.evidenceUrl,
      JSON.stringify(value.data),
      actor.id,
    ],
  );
  await audit(c, actor, "record.created", id, { island, kind: value.kind });
  return { data: await getRecord(c, id, island) };
}
export async function updateRecord(
  actor: Actor,
  island: string,
  id: string,
  input: unknown,
) {
  const value = parse(recordSchema, input);
  validateKind(island, value);
  return transaction(async (c) => {
    await c.query("LOCK TABLE records IN SHARE ROW EXCLUSIVE MODE");
    const previous = await getRecord(c, id, island, true);
    canEdit(actor, previous);
    if (value.version !== previous.version)
      throw new ApiError(
        409,
        "El registro cambió. Recarga antes de guardar.",
        "version_conflict",
      );
    if (previous.verification === "accredited")
      throw new ApiError(
        409,
        "Retira la acreditación con un motivo antes de editar.",
      );
    if (previous.kind !== value.kind)
      throw new ApiError(
        422,
        "El tipo no cambia después de crear el registro.",
      );
    await c.query(
      `UPDATE records SET title=$1,description=$2,member_id=$3,assignee_id=$4,due_date=$5,event_date=$6,status=$7,priority=$8,next_action=$9,evidence_url=$10,data=$11,version=version+1,verification='pending',official_url='',review_note='',points=0,updated_at=now() WHERE id=$12`,
      [
        value.title,
        value.description,
        value.memberId,
        value.assigneeId,
        value.dueDate,
        value.eventDate,
        value.status,
        value.priority,
        value.nextAction,
        value.evidenceUrl,
        JSON.stringify(value.data),
        id,
      ],
    );
    await audit(c, actor, "record.updated", id, {
      island,
      previousVersion: previous.version,
      verificationReset: previous.verification !== "pending",
    });
    return { data: await getRecord(c, id, island) };
  });
}
function evidenceRequirements(record: CampaignRecord) {
  if (!record.evidenceUrl)
    throw new ApiError(
      422,
      "Añade el enlace de la publicación o evidencia antes de enviarla a revisión.",
    );
  if (potentialPoints(record) > 0 && !record.memberId)
    throw new ApiError(422, "Vincula al miembro que obtiene los puntos.");
  if (
    record.kind === "entrada" &&
    (!record.data.demoUrl || !record.data.process || !record.data.impact)
  )
    throw new ApiError(422, "La entrada necesita demo, proceso e impacto.");
  if (record.kind === "entrada" && record.data.xBonus && !record.data.xUrl)
    throw new ApiError(
      422,
      "El bonus en X requiere el enlace a la publicación.",
    );
  if (
    ["venta", "referido"].includes(record.kind) &&
    (!record.data.paymentConfirmed || !record.data.paymentProofUrl)
  )
    throw new ApiError(
      422,
      "Confirma el pago y adjunta su comprobante antes de enviar.",
    );
  if (
    record.kind === "referido" &&
    !String(record.data.referredPerson || "").trim()
  )
    throw new ApiError(422, "Identifica a la persona referida.");
  if (record.kind === "racha" && !record.data.week)
    throw new ApiError(422, "Selecciona la semana de la racha.");
}
export async function reviewRecord(
  actor: Actor,
  island: string,
  id: string,
  input: unknown,
) {
  const value = parse(reviewSchema, input);
  return transaction(async (c) => {
    // Serialize accreditation to enforce person/day, sale caps and duplicate evidence under concurrency.
    await c.query("LOCK TABLE records IN SHARE ROW EXCLUSIVE MODE");
    const record = await getRecord(c, id, island, true);
    if (record.version !== value.version)
      throw new ApiError(409, "El registro cambió. Recarga antes de revisar.");
    if (actor.role !== "admin" || !actor.scopes.includes("approve")) {
      canEdit(actor, record);
      if (
        !["pending", "submitted"].includes(value.verification) ||
        ["validated", "accredited"].includes(record.verification)
      )
        throw new ApiError(
          403,
          "La validación y acreditación requieren administración y permiso approve.",
        );
    }
    if (value.verification !== "pending" && value.verification !== "rejected")
      evidenceRequirements(record);
    if (
      (value.verification === "rejected" ||
        record.verification === "accredited") &&
      !value.reviewNote
    )
      throw new ApiError(
        422,
        "Explica el motivo de rechazo o cambio de acreditación.",
      );
    let points = 0;
    if (value.verification === "accredited") {
      if (!value.officialUrl)
        throw new ApiError(
          422,
          "Se requiere el enlace de la acreditación oficial.",
        );
      const { rows } = await c.query(
        `SELECT ${recordColumns} FROM records WHERE verification='accredited' AND deleted_at IS NULL AND id<>$1`,
        [id],
      );
      const others = rows.map((r) => camel<CampaignRecord>(r));
      const sameMember = others.filter((r) => r.memberId === record.memberId);
      if (
        potentialPoints(record) > 0 &&
        others.some(
          (r) =>
            r.kind === record.kind &&
            evidenceIdentity(r.evidenceUrl) ===
              evidenceIdentity(record.evidenceUrl),
        )
      )
        throw new ApiError(
          409,
          "Esta evidencia ya acredita otro registro del mismo tipo.",
        );
      if (
        ["venta", "referido"].includes(record.kind) &&
        others.some(
          (r) =>
            r.kind === record.kind &&
            r.data.paymentProofUrl &&
            evidenceIdentity(String(r.data.paymentProofUrl)) ===
              evidenceIdentity(String(record.data.paymentProofUrl)),
        )
      )
        throw new ApiError(
          409,
          "Este comprobante de pago ya acredita otro registro.",
        );
      if (
        record.kind === "venta" &&
        sameMember.filter((r) => r.kind === "venta").length >= 5
      )
        throw new ApiError(
          409,
          "Este miembro ya alcanzó 5 ventas acreditadas en la temporada.",
        );
      if (
        record.kind === "logro" &&
        sameMember.some(
          (r) => r.kind === "logro" && r.eventDate === record.eventDate,
        )
      )
        throw new ApiError(
          409,
          "El miembro ya tiene un logro acreditado en esa fecha.",
        );
      if (
        record.kind === "racha" &&
        sameMember.some(
          (r) => r.kind === "racha" && r.data.week === record.data.week,
        )
      )
        throw new ApiError(409, "Esta racha semanal ya fue acreditada.");
      if (
        record.kind === "referido" &&
        others.some(
          (r) =>
            r.kind === "referido" &&
            String(r.data.referredPerson).trim().toLowerCase() ===
              String(record.data.referredPerson).trim().toLowerCase(),
        )
      )
        throw new ApiError(409, "Esta persona referida ya fue acreditada.");
      points = potentialPoints(record);
    }
    await c.query(
      "UPDATE records SET verification=$1,official_url=$2,review_note=$3,points=$4,version=version+1,updated_at=now() WHERE id=$5",
      [value.verification, value.officialUrl, value.reviewNote, points, id],
    );
    await audit(c, actor, "record.reviewed", id, {
      previous: record.verification,
      verification: value.verification,
      points,
      reason: value.reviewNote,
    });
    return { data: await getRecord(c, id, island) };
  });
}
export async function deleteRecord(
  actor: Actor,
  island: string,
  id: string,
  version: number,
) {
  return transaction(async (c) => {
    await c.query("LOCK TABLE records IN SHARE ROW EXCLUSIVE MODE");
    const record = await getRecord(c, id, island, true);
    canEdit(actor, record);
    if (record.version !== version)
      throw new ApiError(409, "El registro cambió. Recarga antes de eliminar.");
    if (record.verification === "accredited")
      throw new ApiError(
        409,
        "Retira la acreditación con un motivo antes de eliminar.",
      );
    await c.query(
      "UPDATE records SET deleted_at=now(),version=version+1 WHERE id=$1",
      [id],
    );
    await audit(c, actor, "record.deleted", id, { island });
  });
}
export async function listRecords(island?: string, search?: URLSearchParams) {
  const clauses = ["deleted_at IS NULL"];
  const values: unknown[] = [];
  for (const [column, value] of [
    ["island", island],
    ["status", search?.get("status")],
    ["verification", search?.get("verification")],
    ["member_id", search?.get("memberId")],
    ["assignee_id", search?.get("assigneeId")],
  ])
    if (value) {
      values.push(value);
      clauses.push(`${column}=$${values.length}`);
    }
  const q = search?.get("q");
  if (q) {
    values.push("%" + q.slice(0, 180) + "%");
    clauses.push(
      `(title ILIKE $${values.length} OR description ILIKE $${values.length})`,
    );
  }
  const page = Number(search?.get("page") || 1);
  const perPage = Number(search?.get("perPage") || 100);
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    page > 10000 ||
    !Number.isInteger(perPage) ||
    perPage < 1 ||
    perPage > 100
  )
    throw new ApiError(
      422,
      "page debe ser un entero entre 1 y 10000; perPage, entre 1 y 100.",
    );
  const { rows: count } = await query(
    `SELECT count(*)::int AS total FROM records WHERE ${clauses.join(" AND ")}`,
    values,
  );
  const { rows } = await query(
    `SELECT ${recordColumns} FROM records WHERE ${clauses.join(" AND ")} ORDER BY created_at DESC,id LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, perPage, (page - 1) * perPage],
  );
  return {
    data: rows.map((r) => camel<CampaignRecord>(r)),
    pagination: { page, perPage, total: count[0].total },
  };
}
export function evidenceIdentity(value: string) {
  const url = new URL(value);
  url.hash = "";
  for (const key of [...url.searchParams.keys()])
    if (key.startsWith("utm_") || ["fbclid", "gclid"].includes(key))
      url.searchParams.delete(key);
  url.searchParams.sort();
  url.pathname = url.pathname.replace(/\/$/, "") || "/";
  return url.toString();
}
