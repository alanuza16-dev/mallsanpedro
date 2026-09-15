// Crea o actualiza un usuario administrador.
// Uso: npm run admin:create -- correo@dominio.com "Contraseña segura" "Nombre"
import { config } from "dotenv";
import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });
config();

async function main() {
  const [email, password, nombre = "Administrador"] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Uso: npm run admin:create -- correo@dominio.com "contraseña" "Nombre"');
    process.exit(1);
  }
  if (password.length < 10) {
    console.error("La contraseña debe tener al menos 10 caracteres.");
    process.exit(1);
  }
  const sql = neon(process.env.DATABASE_URL!);
  const hash = await bcrypt.hash(password, 12);
  await sql.query(
    `INSERT INTO admins (email, password_hash, nombre) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, nombre = EXCLUDED.nombre`,
    [email.toLowerCase().trim(), hash, nombre],
  );
  console.log(`Admin listo: ${email}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
