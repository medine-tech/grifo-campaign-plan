import { Pool, type PoolClient } from "pg";
import { attachDatabasePool } from "@vercel/functions";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";

type Row = Record<string, unknown>;
export interface Connection {
  query<T extends Row = Row>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: T[] }>;
  exec?(sql: string): Promise<unknown>;
}
type State = { pool?: Pool; local?: PGlite; initialized?: Promise<void> };
const globalDb = globalThis as typeof globalThis & { grifoDb?: State };
const state = (globalDb.grifoDb ??= {});

function backend() {
  if (process.env.DATABASE_URL) {
    if (!state.pool) {
      const connection = new URL(process.env.DATABASE_URL);
      if (connection.hostname.endsWith(".neon.tech"))
        connection.searchParams.set("sslmode", "verify-full");
      state.pool = new Pool({
        connectionString: connection.toString(),
        max: 5,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 10000,
      });
      if (process.env.VERCEL) attachDatabasePool(state.pool);
    }
    return state.pool;
  }
  if (
    process.env.VERCEL ||
    (process.env.NODE_ENV === "production" && !process.env.ALLOW_LOCAL_DB)
  )
    throw new Error("DATABASE_URL is required for production");
  const path = process.env.LOCAL_DATABASE_PATH || resolve(".data/grifo");
  if (!path.includes("://")) mkdirSync(dirname(path), { recursive: true });
  return (state.local ??= new PGlite(path));
}
export async function query<T extends Row = Row>(
  sql: string,
  params: unknown[] = [],
): Promise<{ rows: T[] }> {
  const db = backend() as Connection;
  return db.query<T>(sql, params);
}
export async function transaction<T>(
  fn: (c: Connection) => Promise<T>,
): Promise<T> {
  const db = backend();
  if (db instanceof PGlite) return db.transaction((tx) => fn(tx as Connection));
  const client: PoolClient = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
export async function migrate() {
  await query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())",
  );
  const applied = await query(
    "SELECT version FROM schema_migrations WHERE version=$1",
    ["001-initial"],
  );
  if (!applied.rows.length) {
    const sql = await readFile(resolve("db/001-initial.sql"), "utf8");
    await transaction(async (c) => {
      if (c.exec) await c.exec(sql);
      else await c.query(sql);
    });
  }
}
export async function ready() {
  // Migrations are explicit in hosted environments. Local development gets a ready database.
  if (!process.env.DATABASE_URL && !process.env.VERCEL)
    await (state.initialized ??= migrate().catch((error) => {
      state.initialized = undefined;
      throw error;
    }));
}
export async function closeDb() {
  if (state.pool) await state.pool.end();
  if (state.local) await state.local.close();
}
export function camel<T>(row: Row): T {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [
      k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
      v instanceof Date ? v.toISOString() : v,
    ]),
  ) as T;
}
