"use server";

import { after } from "next/server";
import { z } from "zod";
import { isUniqueViolation, query, queryOne } from "@/lib/db";
import { estadoPromo, getConfig } from "@/lib/data";
import { calcularBoletos, colones } from "@/lib/format";
import { notificar } from "@/lib/notify";
import { borrarFoto, fotoExiste } from "@/lib/storage";
import {
  cedulaSchema,
  numeroFacturaSchema,
  primerError,
  registroSchema,
  type RegistroInput,
} from "@/lib/validation";

type TiendaRegla = { id: number; nombre: string; boletos_por_bloque: number; activa: boolean };

/** Paso 2 del formulario: revisa antes de subir la foto que la factura no esté registrada ya. */
export async function verificarFactura(tiendaId: number, numeroFactura: string) {
  const numero = numeroFacturaSchema.safeParse(numeroFactura);
  if (!numero.success) return { ok: false as const, error: primerError(numero.error) };
  const existe = await queryOne(
    "SELECT 1 FROM facturas WHERE tienda_id = $1 AND numero_factura = $2",
    [Number(tiendaId), numero.data],
  );
  if (existe) return { ok: false as const, error: "Esta factura ya fue registrada para esa tienda." };
  return { ok: true as const };
}

export type ResultadoRegistro =
  | { ok: true; boletos: string[]; tienda: string; monto: string; nombre: string }
  | { ok: false; error: string; duplicada?: boolean };

export async function registrarFactura(input: RegistroInput): Promise<ResultadoRegistro> {
  const parsed = registroSchema.safeParse(input);
  const pathname = typeof input?.foto?.pathname === "string" ? input.foto.pathname : null;
  // Borra la foto subida si el registro no se completa, pero nunca una foto que ya respalda otra factura.
  const descartarFoto = async () => {
    if (!pathname?.startsWith("facturas/")) return;
    const enUso = await queryOne("SELECT 1 FROM facturas WHERE foto_blob_pathname = $1", [pathname]);
    if (!enUso) await borrarFoto(pathname);
  };

  if (!parsed.success) {
    await descartarFoto();
    return { ok: false, error: primerError(parsed.error) };
  }
  const d = parsed.data;

  // Anti-bots: campo trampa lleno o formulario enviado en menos de 4 segundos.
  if (d.sitio || (d.tiempoLlenado !== undefined && d.tiempoLlenado < 4000)) {
    await descartarFoto();
    return { ok: false, error: "No pudimos procesar tu registro. Intenta de nuevo." };
  }

  const config = await getConfig();
  const promo = estadoPromo(config);
  if (!promo.abierta) {
    await descartarFoto();
    return { ok: false, error: promo.motivo! };
  }

  const tienda = await queryOne<TiendaRegla>(
    "SELECT id, nombre, boletos_por_bloque, activa FROM tiendas WHERE id = $1",
    [d.tiendaId],
  );
  if (!tienda || !tienda.activa) {
    await descartarFoto();
    return { ok: false, error: "La tienda seleccionada no participa en la promoción." };
  }

  const boletos = calcularBoletos(d.monto, config.monto_por_bloque, tienda.boletos_por_bloque);
  if (boletos < 1) {
    await descartarFoto();
    return {
      ok: false,
      error: `El monto mínimo para participar es ${colones(config.monto_por_bloque)} por factura.`,
    };
  }

  if (!(await fotoExiste(d.foto.pathname))) {
    return { ok: false, error: "No encontramos la foto de la factura. Vuelve a tomarla e intenta de nuevo." };
  }

  try {
    // Todo en una sola sentencia: participante (upsert), factura y boletos se crean juntos o no se crea nada.
    // La restricción única (tienda_id, numero_factura) es la que garantiza que no haya duplicados,
    // incluso si dos personas envían la misma factura al mismo tiempo.
    const rows = await query<{ factura_id: number; numero_boleto: string }>(
      `WITH p AS (
         INSERT INTO participantes (cedula, nombre_completo, email, telefono, prefiere_whatsapp, acepta_terminos, fecha_aceptacion)
         VALUES ($1, $2, $3, $4, $5, TRUE, NOW())
         -- Si la cédula ya existe se conservan sus datos originales: así nadie que conozca una cédula
         -- ajena puede cambiar el correo o teléfono a donde llegan los boletos de esa persona.
         ON CONFLICT (cedula) DO UPDATE SET actualizado_en = NOW()
         RETURNING id
       ), f AS (
         INSERT INTO facturas (participante_id, tienda_id, numero_factura, monto, foto_blob_url, foto_blob_pathname,
                               foto_bytes, foto_tipo, boletos_asignados)
         SELECT p.id, $6, $7, $8, $9, $10, $11, $12, $13 FROM p
         RETURNING id, boletos_asignados
       ), b AS (
         INSERT INTO boletos (factura_id, numero_boleto)
         SELECT f.id, 'MSP-' || LPAD(nextval('boleto_seq')::text, 6, '0')
           FROM f, generate_series(1, f.boletos_asignados)
         RETURNING factura_id, numero_boleto, id
       )
       SELECT factura_id, numero_boleto FROM b ORDER BY id`,
      [
        d.cedula,
        d.nombre,
        d.email,
        d.telefono,
        d.prefiereWhatsapp,
        tienda.id,
        d.numeroFactura,
        d.monto,
        d.foto.url,
        d.foto.pathname,
        d.foto.bytes ?? null,
        d.foto.tipo ?? null,
        boletos,
      ],
    );

    const facturaId = rows[0]?.factura_id;
    if (facturaId) after(() => notificar(facturaId, "boletos_asignados"));

    return {
      ok: true,
      boletos: rows.map((r) => r.numero_boleto),
      tienda: tienda.nombre,
      monto: colones(d.monto),
      nombre: d.nombre.split(/\s+/)[0],
    };
  } catch (e) {
    await descartarFoto();
    if (isUniqueViolation(e, "facturas_tienda_numero_unico")) {
      return { ok: false, duplicada: true, error: "Esta factura ya fue registrada para esa tienda." };
    }
    console.error("Error al registrar factura", e);
    return { ok: false, error: "Ocurrió un error al guardar tu registro. Intenta de nuevo en unos minutos." };
  }
}

const consultaSchema = z.object({
  cedula: cedulaSchema,
  email: z.string().trim().toLowerCase().email("Correo inválido."),
});

export type ConsultaBoletos =
  | {
      ok: true;
      nombre: string;
      facturas: {
        id: number;
        tienda: string;
        numero_factura: string;
        monto: string;
        estado: string;
        creado_en: string;
        boletos: { numero: string; anulado: boolean }[];
      }[];
    }
  | { ok: false; error: string; cedula?: string; email?: string };

/** Consulta pública: requiere cédula y correo que coincidan, para no exponer datos con solo la cédula. */
export async function consultarBoletos(_prev: unknown, form: FormData): Promise<ConsultaBoletos> {
  const cedula = String(form.get("cedula") ?? "");
  const email = String(form.get("email") ?? "");
  const parsed = consultaSchema.safeParse({ cedula, email });
  if (!parsed.success) return { ok: false, error: primerError(parsed.error), cedula, email };
  const p = await queryOne<{ id: number; nombre_completo: string }>(
    "SELECT id, nombre_completo FROM participantes WHERE cedula = $1 AND LOWER(email) = $2",
    [parsed.data.cedula, parsed.data.email],
  );
  if (!p) return { ok: false, error: "No encontramos participaciones con esa cédula y correo.", cedula, email };
  const facturas = await query<{
    id: number;
    tienda: string;
    numero_factura: string;
    monto: string;
    estado: string;
    creado_en: string;
    boletos: { numero: string; anulado: boolean }[];
  }>(
    `SELECT f.id, t.nombre AS tienda, f.numero_factura, f.monto::text, f.estado, f.creado_en,
            COALESCE((SELECT json_agg(json_build_object('numero', b.numero_boleto, 'anulado', b.anulado) ORDER BY b.id)
                        FROM boletos b WHERE b.factura_id = f.id), '[]') AS boletos
       FROM facturas f JOIN tiendas t ON t.id = f.tienda_id
      WHERE f.participante_id = $1
      ORDER BY f.creado_en DESC`,
    [p.id],
  );
  return {
    ok: true,
    nombre: p.nombre_completo.split(/\s+/)[0],
    facturas: facturas.map((f) => ({ ...f, creado_en: new Date(f.creado_en).toISOString() })),
  };
}
