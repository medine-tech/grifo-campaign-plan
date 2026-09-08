import { z } from "zod";
import { camel, query, ready, transaction } from "./db";
import {
  authenticate,
  audit,
  cookie,
  passwordHash,
  passwordMatches,
  requireAdmin,
  requireSession,
  secret,
  session,
  SESSION_COOKIE,
  type Actor,
} from "./auth";
import {
  ApiError,
  body,
  checkOrigin,
  failure,
  hash,
  json,
  limit,
} from "./http";
import {
  islands,
  potentialPoints,
  type CampaignRecord,
  type User,
} from "./domain";
import { parse, loginSchema, memberSchema, registration } from "./validation";
import {
  createRecord,
  deleteRecord,
  getRecord,
  idempotent,
  listRecords,
  recordColumns,
  reviewRecord,
  updateRecord,
} from "./records";

function uuid(id: string) {
  return parse(z.uuid(), id);
}
async function authRoutes(request: Request, path: string[]) {
  const action = path[1];
  const method = request.method;
  if (action === "me" && method === "GET") {
    const actor = await authenticate(request);
    return json({
      data: {
        id: actor.id,
        name: actor.name,
        email: actor.email,
        role: actor.role,
      },
    });
  }
  if (action === "logout" && method === "POST") {
    const actor = await authenticate(request);
    requireSession(actor);
    const value = request.headers
      .get("cookie")
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith(SESSION_COOKIE + "="))
      ?.slice(SESSION_COOKIE.length + 1);
    if (value) await query("DELETE FROM sessions WHERE hash=$1", [hash(value)]);
    return json({ data: { ok: true } }, 200, {
      "Set-Cookie": cookie("", true),
    });
  }
  if (action === "password" && method === "PUT") {
    const actor = await authenticate(request, "write");
    requireSession(actor);
    const value = parse(
      z
        .object({
          currentPassword: z.string().max(128),
          newPassword: z.string().min(12).max(128),
        })
        .strict(),
      await body(request),
    );
    await limit("password:" + actor.id, 10, 900);
    const { rows } = await query(
      "SELECT password_hash FROM users WHERE id=$1",
      [actor.id],
    );
    if (
      !(await passwordMatches(
        value.currentPassword,
        String(rows[0].password_hash),
      ))
    )
      throw new ApiError(401, "La contraseña actual no coincide.");
    const encoded = await passwordHash(value.newPassword);
    const valueCookie = await transaction(async (c) => {
      await c.query("UPDATE users SET password_hash=$1 WHERE id=$2", [
        encoded,
        actor.id,
      ]);
      await c.query("DELETE FROM sessions WHERE user_id=$1", [actor.id]);
      await c.query(
        "UPDATE api_tokens SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",
        [actor.id],
      );
      await audit(c, actor, "user.password_changed", actor.id);
      return session(actor.id, c);
    });
    return json({ data: { ok: true } }, 200, {
      "Set-Cookie": cookie(valueCookie),
    });
  }
  if (method !== "POST" || !["register", "login"].includes(action))
    throw new ApiError(404, "Ruta no encontrada.");
  checkOrigin(request);
  const ip = process.env.VERCEL
    ? request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown"
    : "local";
  await limit("auth-ip:" + ip, 60, 60);
  const input = await body(request);
  if (action === "register") {
    const value = parse(registration, input);
    await limit("register:" + ip, 20, 900);
    const encoded = await passwordHash(value.password);
    const result = await transaction(async (c) => {
      await c.query("LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE");
      const existing = await c.query(
        "SELECT count(*)::int AS count FROM users",
      );
      const first = existing.rows[0].count === 0;
      if (first) {
        if (
          !process.env.SETUP_TOKEN ||
          hash(value.inviteCode) !== hash(process.env.SETUP_TOKEN)
        )
          throw new ApiError(403, "La invitación no es válida o ya fue usada.");
      } else {
        const invitation = await c.query(
          "UPDATE invitations SET used_at=now() WHERE hash=$1 AND used_at IS NULL AND expires_at>now() RETURNING id",
          [hash(value.inviteCode)],
        );
        if (!invitation.rows.length)
          throw new ApiError(
            403,
            "La invitación no es válida, venció o ya fue usada.",
          );
      }
      const user: User = {
        id: crypto.randomUUID(),
        name: value.name,
        email: value.email,
        role: first ? "admin" : "member",
      };
      await c.query(
        "INSERT INTO users(id,name,email,password_hash,role) VALUES($1,$2,$3,$4,$5)",
        [user.id, user.name, user.email, encoded, user.role],
      );
      const actor: Actor = {
        ...user,
        tokenId: null,
        scopes: ["read", "write", "approve"],
      };
      await audit(c, actor, "user.registered", user.id);
      return { user, session: await session(user.id, c) };
    });
    return json({ data: result.user }, 201, {
      "Set-Cookie": cookie(result.session),
    });
  }
  const value = parse(loginSchema, input);
  await limit("login:" + ip + ":" + value.email, 15, 900);
  const { rows } = await query(
    "SELECT id,name,email,role,password_hash FROM users WHERE email=$1",
    [value.email],
  );
  const encoded =
    rows[0]?.password_hash ||
    "00000000000000000000000000000000:" + "00".repeat(64);
  if (!(await passwordMatches(value.password, String(encoded))) || !rows[0])
    throw new ApiError(401, "Correo o contraseña incorrectos.", "unauthorized");
  const user = camel<User>(rows[0]);
  const token = await session(user.id);
  return json(
    {
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
    200,
    { "Set-Cookie": cookie(token) },
  );
}

export async function handleApi(
  request: Request,
  path: string[],
): Promise<Response> {
  try {
    await ready();
    const method = request.method;
    const url = new URL(request.url);
    if (path.join("/") === "health" && method === "GET") {
      await query("SELECT version FROM schema_migrations LIMIT 1");
      return json({
        status: "ok",
        service: "grifo-campaign-plan",
        version: "1.0.0",
      });
    }
    if (path[0] === "auth" && path.length === 2)
      return await authRoutes(request, path);
    const actor = await authenticate(
      request,
      method === "GET" ? "read" : "write",
    );
    if (path.join("/") === "users" && method === "GET") {
      const { rows } = await query(
        "SELECT id,name,role FROM users ORDER BY name",
      );
      return json({ data: rows });
    }
    if (path.join("/") === "islands" && method === "GET")
      return json({ data: islands });
    if (path.join("/") === "dashboard" && method === "GET") {
      const { rows } = await query(
        `SELECT ${recordColumns} FROM records WHERE deleted_at IS NULL ORDER BY due_date ASC NULLS LAST`,
      );
      const records = rows.map((r) => camel<CampaignRecord>(r));
      const today = new Date().toLocaleDateString("en-CA", {
        timeZone: "America/Santiago",
      });
      const { rows: members } = await query(
        "SELECT count(*)::int AS total, count(*) FILTER (WHERE active)::int AS active FROM members",
      );
      return json({
        data: {
          total: records.length,
          accreditedPoints: records.reduce((s, r) => s + r.points, 0),
          pendingPoints: records
            .filter((r) => ["submitted", "validated"].includes(r.verification))
            .reduce((s, r) => s + potentialPoints(r), 0),
          potentialPoints: records
            .filter((r) => r.verification === "pending")
            .reduce((s, r) => s + potentialPoints(r), 0),
          pendingEvidence: records.filter(
            (r) =>
              potentialPoints(r) > 0 &&
              (!r.evidenceUrl ||
                (["venta", "referido"].includes(r.kind) &&
                  !r.data.paymentProofUrl)),
          ).length,
          blocked: records.filter((r) => r.status === "blocked").length,
          overdue: records.filter(
            (r) => r.dueDate && r.dueDate < today && r.status !== "done",
          ).length,
          members: members[0],
          islands: islands.map((i) => ({
            ...i,
            total: records.filter((r) => r.island === i.id).length,
            done: records.filter(
              (r) => r.island === i.id && r.status === "done",
            ).length,
            points: records
              .filter((r) => r.island === i.id)
              .reduce((s, r) => s + r.points, 0),
          })),
          upcoming: records.filter((r) => r.status !== "done").slice(0, 8),
          review: records
            .filter((r) => r.verification === "submitted")
            .slice(0, 8),
        },
      });
    }
    if (
      path[0] === "islands" &&
      path[2] === "records" &&
      path.length >= 3 &&
      path.length <= 5
    ) {
      const island = path[1];
      if (!islands.some((i) => i.id === island))
        throw new ApiError(404, "Isla no encontrada.");
      const id = path[3];
      if (id) uuid(id);
      if (path.length === 3 && method === "GET")
        return json(await listRecords(island, url.searchParams));
      if (path.length === 3 && method === "POST") {
        const input = await body(request);
        const result = await idempotent(actor, request, input, (c) =>
          createRecord(c, actor, island, input),
        );
        return json(result.data, result.status, {
          "Idempotency-Replayed": String(result.replayed),
        });
      }
      if (path.length === 4 && method === "GET")
        return json({ data: await getRecord({ query }, id, island) });
      if (path.length === 4 && method === "PUT")
        return json(await updateRecord(actor, island, id, await body(request)));
      if (path.length === 4 && method === "DELETE") {
        const version = parse(
          z.coerce.number().int().positive(),
          url.searchParams.get("version"),
        );
        await deleteRecord(actor, island, id, version);
        return new Response(null, { status: 204 });
      }
      if (path.length === 5 && path[4] === "review" && method === "POST")
        return json(await reviewRecord(actor, island, id, await body(request)));
    }
    if (path[0] === "members" && path.length <= 2) {
      const id = path[1];
      if (id) uuid(id);
      if (!id && method === "GET") {
        const { rows } = await query(
          "SELECT * FROM members ORDER BY name,surname",
        );
        return json({ data: rows.map((r) => camel(r)) });
      }
      if (id && method === "GET") {
        const { rows } = await query("SELECT * FROM members WHERE id=$1", [id]);
        if (!rows.length) throw new ApiError(404, "Miembro no encontrado.");
        return json({ data: camel(rows[0]) });
      }
      if (!id && method === "POST") {
        const input = await body(request);
        const value = parse(memberSchema, input);
        const result = await idempotent(actor, request, value, async (c) => {
          const newId = crypto.randomUUID();
          const { rows } = await c.query(
            "INSERT INTO members(id,name,surname,profile_url,cohort,active,notes,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
            [
              newId,
              value.name,
              value.surname,
              value.profileUrl,
              value.cohort,
              value.active,
              value.notes,
              actor.id,
            ],
          );
          await audit(c, actor, "member.created", newId);
          return { data: camel(rows[0]) };
        });
        return json(result.data, result.status);
      }
      if (id && ["PUT", "DELETE"].includes(method)) {
        const value =
          method === "PUT" ? parse(memberSchema, await body(request)) : null;
        const result = await transaction(async (c) => {
          const { rows } = await c.query(
            "SELECT * FROM members WHERE id=$1 FOR UPDATE",
            [id],
          );
          if (!rows.length) throw new ApiError(404, "Miembro no encontrado.");
          if (actor.role !== "admin" && rows[0].created_by !== actor.id)
            throw new ApiError(
              403,
              "Solo el autor o administración puede modificar este miembro.",
            );
          if (value) {
            const updated = await c.query(
              "UPDATE members SET name=$1,surname=$2,profile_url=$3,cohort=$4,active=$5,notes=$6,updated_at=now() WHERE id=$7 RETURNING *",
              [
                value.name,
                value.surname,
                value.profileUrl,
                value.cohort,
                value.active,
                value.notes,
                id,
              ],
            );
            await audit(c, actor, "member.updated", id);
            return camel(updated.rows[0]);
          }
          await c.query("DELETE FROM members WHERE id=$1", [id]);
          await audit(c, actor, "member.deleted", id);
          return null;
        });
        return method === "DELETE"
          ? new Response(null, { status: 204 })
          : json({ data: result });
      }
    }
    if (path[0] === "tokens" && path.length <= 2) {
      requireSession(actor);
      const id = path[1];
      if (id) uuid(id);
      if (!id && method === "GET") {
        const { rows } = await query(
          "SELECT id,name,prefix,scopes,expires_at,created_at,last_used_at,revoked_at FROM api_tokens WHERE user_id=$1 ORDER BY created_at DESC",
          [actor.id],
        );
        return json({ data: rows.map((r) => camel(r)) });
      }
      if (!id && method === "POST") {
        const value = parse(
          z
            .object({
              name: z.string().trim().min(2).max(80),
              scopes: z
                .array(z.enum(["read", "write", "approve"]))
                .min(1)
                .max(3),
              expiresInDays: z.number().int().min(1).max(90),
            })
            .strict(),
          await body(request),
        );
        if (value.scopes.includes("approve")) requireAdmin(actor);
        const plain = secret();
        const id = crypto.randomUUID();
        const result = await transaction(async (c) => {
          const { rows } = await c.query(
            `INSERT INTO api_tokens(id,user_id,name,hash,prefix,scopes,expires_at) VALUES($1,$2,$3,$4,$5,$6,now()+($7*interval '1 day')) RETURNING id,name,prefix,scopes,expires_at,created_at,last_used_at,revoked_at`,
            [
              id,
              actor.id,
              value.name,
              hash(plain),
              plain.slice(0, 13),
              JSON.stringify([...new Set(value.scopes)]),
              value.expiresInDays,
            ],
          );
          await audit(c, actor, "token.created", id, { scopes: value.scopes });
          return camel(rows[0]);
        });
        return json({ data: { ...(result as object), token: plain } }, 201);
      }
      if (id && method === "DELETE") {
        await transaction(async (c) => {
          const { rows } = await c.query(
            "UPDATE api_tokens SET revoked_at=now() WHERE id=$1 AND user_id=$2 RETURNING id",
            [id, actor.id],
          );
          if (!rows.length) throw new ApiError(404, "Token no encontrado.");
          await audit(c, actor, "token.revoked", id);
        });
        return new Response(null, { status: 204 });
      }
    }
    if (path.join("/") === "invitations") {
      requireSession(actor);
      requireAdmin(actor);
      if (method === "GET") {
        const { rows } = await query(
          "SELECT id,name,expires_at,used_at FROM invitations ORDER BY expires_at DESC LIMIT 100",
        );
        return json({ data: rows.map((r) => camel(r)) });
      }
      if (method === "POST") {
        const value = parse(
          z.object({ name: z.string().trim().min(2).max(100) }).strict(),
          await body(request),
        );
        const code = secret("invite_");
        const id = crypto.randomUUID();
        await transaction(async (c) => {
          await c.query(
            "INSERT INTO invitations(id,hash,name,created_by,expires_at) VALUES($1,$2,$3,$4,now()+interval '7 days')",
            [id, hash(code), value.name, actor.id],
          );
          await audit(c, actor, "invitation.created", id);
        });
        return json({ data: { id, code, expiresInDays: 7 } }, 201);
      }
    }
    if (path.join("/") === "audit" && method === "GET") {
      requireAdmin(actor);
      const { rows } = await query(
        "SELECT a.id,a.action,a.entity_id,a.details,a.created_at,u.name AS actor,t.name AS token_name FROM audit_events a JOIN users u ON u.id=a.user_id LEFT JOIN api_tokens t ON t.id=a.token_id ORDER BY a.created_at DESC LIMIT 100",
      );
      return json({ data: rows.map((r) => camel(r)) });
    }
    throw new ApiError(404, "Ruta no encontrada.", "not_found");
  } catch (error) {
    return failure(error);
  }
}
