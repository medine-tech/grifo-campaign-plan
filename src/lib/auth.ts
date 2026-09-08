import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { camel, query, ready, type Connection } from "./db";
import { ApiError, checkOrigin, hash, limit } from "./http";
import type { User } from "./domain";
const scrypt = promisify(scryptCb);
export const SESSION_COOKIE = "grifo_session";
export type Actor = User & { tokenId: string | null; scopes: string[] };
export async function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${((await scrypt(password, salt, 64)) as Buffer).toString("hex")}`;
}
export async function passwordMatches(password: string, encoded: string) {
  const [salt, key] = encoded.split(":");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const original = Buffer.from(key, "hex");
  return (
    original.length === derived.length && timingSafeEqual(original, derived)
  );
}
export function secret(prefix = "grifo_") {
  return prefix + randomBytes(32).toString("base64url");
}
export function cookie(value: string, clear = false) {
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${clear ? 0 : 60 * 60 * 24 * 7}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}
export async function session(userId: string, c: Connection = { query }) {
  const value = secret("");
  await c.query(
    "INSERT INTO sessions(hash,user_id,expires_at) VALUES($1,$2,now()+interval '7 days')",
    [hash(value), userId],
  );
  return value;
}
export async function currentUser(): Promise<User | null> {
  await ready();
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value) return null;
  const { rows } = await query(
    "SELECT u.id,u.name,u.email,u.role FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.hash=$1 AND s.expires_at>now()",
    [hash(value)],
  );
  return rows[0] ? camel<User>(rows[0]) : null;
}
export async function authenticate(
  request: Request,
  scope = "read",
): Promise<Actor> {
  await ready();
  const authorization = request.headers.get("authorization");
  let actor: Actor;
  if (authorization) {
    const match = authorization.match(/^Bearer (grifo_[A-Za-z0-9_-]{43})$/);
    if (!match) throw new ApiError(401, "Token no válido.", "unauthorized");
    const { rows } = await query(
      `SELECT u.id,u.name,u.email,u.role,t.id AS token_id,t.scopes FROM users u JOIN api_tokens t ON t.user_id=u.id WHERE t.hash=$1 AND t.revoked_at IS NULL AND t.expires_at>now()`,
      [hash(match[1])],
    );
    if (!rows[0])
      throw new ApiError(
        401,
        "Token vencido, revocado o no válido.",
        "unauthorized",
      );
    actor = camel<Actor>(rows[0]);
    if (!actor.scopes.includes(scope))
      throw new ApiError(
        403,
        "El token no tiene el permiso requerido.",
        "forbidden",
      );
    await query("UPDATE api_tokens SET last_used_at=now() WHERE id=$1", [
      actor.tokenId,
    ]);
  } else {
    const value = request.headers
      .get("cookie")
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith(SESSION_COOKIE + "="))
      ?.slice(SESSION_COOKIE.length + 1);
    if (!value)
      throw new ApiError(401, "Inicia sesión para continuar.", "unauthorized");
    const { rows } = await query(
      "SELECT u.id,u.name,u.email,u.role FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.hash=$1 AND s.expires_at>now()",
      [hash(value)],
    );
    if (!rows[0]) throw new ApiError(401, "Tu sesión venció.", "unauthorized");
    actor = {
      ...camel<User>(rows[0]),
      tokenId: null,
      scopes: ["read", "write", "approve"],
    };
    if (!["GET", "HEAD"].includes(request.method)) checkOrigin(request, true);
  }
  if (scope === "approve" && actor.role !== "admin")
    throw new ApiError(
      403,
      "Solo administración puede acreditar puntos.",
      "forbidden",
    );
  await limit("api:" + actor.id, 300);
  return actor;
}
export function requireAdmin(actor: Actor) {
  if (actor.role !== "admin")
    throw new ApiError(
      403,
      "Se requiere una cuenta administradora.",
      "forbidden",
    );
}
export function requireSession(actor: Actor) {
  if (actor.tokenId)
    throw new ApiError(
      403,
      "Gestiona el acceso desde una sesión en el navegador.",
      "forbidden",
    );
}
export async function audit(
  c: Connection,
  actor: Actor,
  action: string,
  entityId: string,
  details: Record<string, unknown> = {},
) {
  await c.query(
    "INSERT INTO audit_events(id,user_id,token_id,action,entity_id,details) VALUES($1,$2,$3,$4,$5,$6)",
    [
      crypto.randomUUID(),
      actor.id,
      actor.tokenId,
      action,
      entityId,
      JSON.stringify(details),
    ],
  );
}
