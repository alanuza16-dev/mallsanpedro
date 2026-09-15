// Aplica db/schema.sql (y opcionalmente db/seed.sql) a la base de datos de DATABASE_URL.
// Uso: npm run db:migrate            -> solo esquema
//      npm run db:migrate -- --seed  -> esquema + tiendas iniciales
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });
config();

type Sql = { query: (q: string) => Promise<unknown> };

// El driver HTTP de Neon ejecuta una sentencia por llamada, así que se separa el archivo.
// Los archivos de db/ no usan funciones ni bloques $$, por lo que cortar en ";" al final de línea es seguro.
async function run(file: string, sql: Sql) {
  const text = readFileSync(join(process.cwd(), "db", file), "utf8")
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n");
  const statements = text
    .split(/;\s*\n/)
    .map((s) => s.trim().replace(/;$/, ""))
    .filter(Boolean);
  for (const statement of statements) await sql.query(statement);
  console.log(`OK ${file} (${statements.length} sentencias)`);
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL");
  const sql = neon(process.env.DATABASE_URL);
  await run("schema.sql", sql);
  if (process.argv.includes("--seed")) await run("seed.sql", sql);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
