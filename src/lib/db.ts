import "server-only";
import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";

/**
 * Acceso a Postgres.
 * - Producción / Vercel: driver HTTP serverless de Neon (sin conexiones persistentes).
 * - Desarrollo local contra un Postgres en localhost: driver `pg` normal.
 * Toda la app usa SQL parametrizado a través de `query()`, nunca concatenación de strings.
 */

type Row = Record<string, unknown>;

const url = process.env.DATABASE_URL;

function isLocal(connectionString: string) {
  try {
    const host = new URL(connectionString).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

const globalForDb = globalThis as unknown as { __pgPool?: Pool };

export async function query<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  if (!url) throw new Error("Falta la variable de entorno DATABASE_URL");
  if (isLocal(url)) {
    globalForDb.__pgPool ??= new Pool({ connectionString: url, max: 5 });
    const res = await globalForDb.__pgPool.query(text, params);
    return res.rows as T[];
  }
  const sql = neon(url);
  return (await sql.query(text, params)) as T[];
}

export async function queryOne<T = Row>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/** Código de Postgres para violación de restricción única. */
export function isUniqueViolation(err: unknown, constraint?: string) {
  const e = err as { code?: string; constraint?: string; message?: string };
  if (e?.code !== "23505") return false;
  if (!constraint) return true;
  return e.constraint === constraint || (e.message ?? "").includes(constraint);
}
