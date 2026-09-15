"use server";

import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { cerrarSesion, crearSesion, requireAdmin } from "@/lib/auth";
import { isUniqueViolation, query, queryOne } from "@/lib/db";
import { notificar } from "@/lib/notify";

// `valores` devuelve lo escrito para que React no deje el formulario en blanco tras un error.
export type FormState = { ok?: boolean; error?: string; mensaje?: string; valores?: Record<string, string> } | null;

// ---------- Sesión ----------

// Contención simple de fuerza bruta por instancia: pausa creciente tras intentos fallidos.
const intentos = new Map<string, { n: number; hasta: number }>();

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const registro = intentos.get(email);
  if (registro && registro.hasta > Date.now()) {
    return { error: "Demasiados intentos. Espera un minuto e intenta de nuevo.", valores: { email } };
  }
  const admin = await queryOne<{ id: number; password_hash: string }>(
    "SELECT id, password_hash FROM admins WHERE email = $1",
    [email],
  );
  // Se compara siempre contra un hash para no revelar por tiempo de respuesta si el correo existe.
  const hash = admin?.password_hash ?? "$2b$12$e7gX35pigz6ny9pBluA/xeGW5OeqcmEOwAXxMLau4ZTN9yfxmaFxm";
  const valido = await bcrypt.compare(password, hash);
  if (!admin || !valido) {
    const n = (registro?.n ?? 0) + 1;
    intentos.set(email, { n, hasta: n >= 5 ? Date.now() + 60_000 : 0 });
    return { error: "Correo o contraseña incorrectos.", valores: { email } };
  }
  intentos.delete(email);
  await crearSesion(admin.id);
  redirect("/admin");
}

export async function logout() {
  await cerrarSesion();
  redirect("/admin/login");
}

export async function cambiarPassword(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const actual = String(form.get("actual") ?? "");
  const nueva = String(form.get("nueva") ?? "");
  if (nueva.length < 10) return { error: "La nueva contraseña debe tener al menos 10 caracteres." };
  const row = await queryOne<{ password_hash: string }>("SELECT password_hash FROM admins WHERE id = $1", [admin.id]);
  if (!row || !(await bcrypt.compare(actual, row.password_hash))) return { error: "La contraseña actual no es correcta." };
  await query("UPDATE admins SET password_hash = $1 WHERE id = $2", [await bcrypt.hash(nueva, 12), admin.id]);
  return { ok: true, mensaje: "Contraseña actualizada." };
}

export async function crearAdmin(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = z
    .object({
      nombre: z.string().trim().min(2, "Escribe el nombre."),
      email: z.string().trim().toLowerCase().email("Correo inválido."),
      password: z.string().min(10, "La contraseña debe tener al menos 10 caracteres."),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { error: parsed.error.issues[0].message, valores: { nombre: String(form.get("nombre") ?? ""), email: String(form.get("email") ?? "") } };
  try {
    await query("INSERT INTO admins (email, password_hash, nombre) VALUES ($1, $2, $3)", [
      parsed.data.email,
      await bcrypt.hash(parsed.data.password, 12),
      parsed.data.nombre,
    ]);
  } catch (e) {
    if (isUniqueViolation(e)) return { error: "Ya existe un administrador con ese correo." };
    throw e;
  }
  revalidatePath("/admin/ajustes");
  return { ok: true, mensaje: `Administrador ${parsed.data.email} creado.` };
}

// ---------- Facturas ----------

export async function anularFactura(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = Number(form.get("id"));
  const motivo = String(form.get("motivo") ?? "").trim();
  const avisar = form.get("avisar") === "on";
  if (!Number.isInteger(id)) return { error: "Factura inválida." };
  if (motivo.length < 5) return { error: "Escribe el motivo de la anulación (mínimo 5 caracteres).", valores: { motivo } };

  const rows = await query<{ id: number }>(
    `WITH f AS (
       UPDATE facturas SET estado = 'rechazada', motivo_rechazo = $2, revisado_por = $3, revisado_en = NOW()
        WHERE id = $1 AND estado = 'aprobada'
       RETURNING id
     ), b AS (
       UPDATE boletos SET anulado = TRUE WHERE factura_id IN (SELECT id FROM f) RETURNING id
     )
     SELECT id FROM f`,
    [id, motivo.slice(0, 300), admin.id],
  );
  if (!rows.length) return { error: "La factura ya estaba anulada o no existe." };
  if (avisar) after(() => notificar(id, "factura_anulada"));
  revalidatePath("/admin", "layout");
  return { ok: true, mensaje: "Factura anulada. Sus boletos ya no participan en el sorteo." };
}

export async function restaurarFactura(form: FormData) {
  const admin = await requireAdmin();
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return;
  await query(
    `WITH f AS (
       UPDATE facturas SET estado = 'aprobada', motivo_rechazo = NULL, revisado_por = $2, revisado_en = NOW()
        WHERE id = $1 AND estado = 'rechazada'
       RETURNING id
     )
     UPDATE boletos SET anulado = FALSE WHERE factura_id IN (SELECT id FROM f)`,
    [id, admin.id],
  );
  revalidatePath("/admin", "layout");
}

export async function reenviarNotificacion(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return;
  const f = await queryOne<{ estado: string }>("SELECT estado FROM facturas WHERE id = $1", [id]);
  if (!f) return;
  await notificar(id, f.estado === "aprobada" ? "boletos_asignados" : "factura_anulada");
  revalidatePath("/admin");
}

// ---------- Tiendas ----------

const tiendaSchema = z.object({
  id: z.coerce.number().int().optional(),
  nombre: z.string().trim().min(2, "Escribe el nombre de la tienda.").max(80),
  categoria: z.string().trim().min(2, "Escribe la categoría.").max(60),
  patrocinadora: z.boolean(),
  activa: z.boolean(),
});

export async function guardarTienda(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = tiendaSchema.safeParse({
    id: form.get("id") || undefined,
    nombre: form.get("nombre"),
    categoria: form.get("categoria"),
    patrocinadora: form.get("patrocinadora") === "on",
    activa: form.get("activa") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const t = parsed.data;
  // Patrocinadora = x2 boletos por bloque; participante = x1.
  const boletos = t.patrocinadora ? 2 : 1;
  try {
    if (t.id) {
      await query(
        `UPDATE tiendas SET nombre = $2, categoria = $3, patrocinadora = $4, boletos_por_bloque = $5, activa = $6
          WHERE id = $1`,
        [t.id, t.nombre, t.categoria, t.patrocinadora, boletos, t.activa],
      );
    } else {
      await query(
        `INSERT INTO tiendas (nombre, categoria, patrocinadora, boletos_por_bloque, activa) VALUES ($1, $2, $3, $4, $5)`,
        [t.nombre, t.categoria, t.patrocinadora, boletos, t.activa],
      );
    }
  } catch (e) {
    if (isUniqueViolation(e)) return { error: "Ya existe una tienda con ese nombre." };
    throw e;
  }
  revalidatePath("/", "layout");
  return { ok: true, mensaje: t.id ? "Tienda actualizada." : "Tienda agregada." };
}

// ---------- Configuración ----------

export async function guardarConfig(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const monto = Number(form.get("monto_por_bloque"));
  if (!Number.isInteger(monto) || monto < 1000) return { error: "El monto por bloque debe ser un número entero ≥ ₡1 000." };
  const fecha = (k: string) => {
    const v = String(form.get(k) ?? "");
    return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
  };
  const inicio = fecha("fecha_inicio_promo");
  const fin = fecha("fecha_fin_promo");
  if (inicio && fin && fin < inicio) return { error: "La fecha de cierre no puede ser anterior a la de inicio." };
  await query(
    `UPDATE configuracion
        SET monto_por_bloque = $1,
            fecha_inicio_promo = ($2::date AT TIME ZONE 'America/Costa_Rica'),
            fecha_fin_promo = (($3::date + 1) AT TIME ZONE 'America/Costa_Rica') - INTERVAL '1 second',
            activa = $4,
            actualizado_en = NOW()
      WHERE id = 1`,
    [monto, inicio, fin, form.get("activa") === "on"],
  );
  revalidatePath("/", "layout");
  return { ok: true, mensaje: "Configuración guardada." };
}

// ---------- Sorteo ----------

export async function sortear(_prev: FormState, form: FormData): Promise<FormState & { ganador?: Ganador }> {
  const admin = await requireAdmin();
  const premio = String(form.get("premio") ?? "").trim();
  const unoPorPersona = form.get("unoPorPersona") === "on";
  if (premio.length < 2) return { error: "Escribe el premio que se está sorteando." };

  // Boletos elegibles: válidos, de facturas aprobadas, que no hayan ganado; opcionalmente excluye personas que ya ganaron.
  const elegibles = `
    FROM boletos b
    JOIN facturas f ON f.id = b.factura_id
   WHERE NOT b.anulado AND f.estado = 'aprobada'
     AND NOT EXISTS (SELECT 1 FROM ganadores g WHERE g.boleto_id = b.id)
     ${
       unoPorPersona
         ? `AND f.participante_id NOT IN (
              SELECT f2.participante_id FROM ganadores g2
                JOIN boletos b2 ON b2.id = g2.boleto_id
                JOIN facturas f2 ON f2.id = b2.factura_id)`
         : ""
     }`;
  const total = await queryOne<{ n: number }>(`SELECT COUNT(*)::int AS n ${elegibles}`);
  if (!total?.n) return { error: "No hay boletos elegibles para sortear.", valores: { premio } };

  // Número aleatorio criptográficamente seguro: cada boleto válido tiene la misma probabilidad.
  const posicion = randomInt(total.n);
  const elegido = await queryOne<{ id: number }>(
    `SELECT b.id ${elegibles} ORDER BY b.id OFFSET $1 LIMIT 1`,
    [posicion],
  );
  if (!elegido) return { error: "No se pudo seleccionar un boleto. Intenta de nuevo." };

  try {
    await query("INSERT INTO ganadores (boleto_id, premio, sorteado_por) VALUES ($1, $2, $3)", [
      elegido.id,
      premio.slice(0, 120),
      admin.id,
    ]);
  } catch (e) {
    if (isUniqueViolation(e)) return { error: "Ese boleto acaba de ganar en otro sorteo. Intenta de nuevo." };
    throw e;
  }
  const ganador = await getGanador(elegido.id);
  revalidatePath("/admin/sorteo");
  return { ok: true, ganador: ganador ?? undefined, mensaje: `Sorteado entre ${total.n} boletos elegibles.` };
}

export type Ganador = {
  id: number;
  premio: string;
  numero_boleto: string;
  nombre_completo: string;
  cedula: string;
  telefono: string;
  email: string;
  tienda: string;
  numero_factura: string;
  fecha_sorteo: string;
};

async function getGanador(boletoId: number) {
  return queryOne<Ganador>(
    `SELECT g.id, g.premio, b.numero_boleto, p.nombre_completo, p.cedula, p.telefono, p.email,
            t.nombre AS tienda, f.numero_factura, g.fecha_sorteo::text
       FROM ganadores g
       JOIN boletos b ON b.id = g.boleto_id
       JOIN facturas f ON f.id = b.factura_id
       JOIN tiendas t ON t.id = f.tienda_id
       JOIN participantes p ON p.id = f.participante_id
      WHERE g.boleto_id = $1`,
    [boletoId],
  );
}

export async function eliminarGanador(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return;
  await query("DELETE FROM ganadores WHERE id = $1", [id]);
  revalidatePath("/admin/sorteo");
}
