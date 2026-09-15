import "server-only";
import { Resend } from "resend";
import { query, queryOne } from "./db";
import { colones } from "./format";

/**
 * Notificaciones al participante.
 * Cada canal se activa solo si sus variables de entorno existen; si no, se registra como "omitido".
 *
 * Correo:   RESEND_API_KEY, EMAIL_FROM (ej. "Mall San Pedro <sorteo@tudominio.com>")
 * WhatsApp: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_TEMPLATE_BOLETOS,
 *           WHATSAPP_TEMPLATE_ANULADA (opcional), WHATSAPP_TEMPLATE_LANG (por defecto "es")
 */

type Tipo = "boletos_asignados" | "factura_anulada";
type Canal = "email" | "whatsapp";

type Datos = {
  factura_id: number;
  numero_factura: string;
  monto: string;
  motivo_rechazo: string | null;
  tienda: string;
  nombre_completo: string;
  email: string;
  telefono: string;
  prefiere_whatsapp: boolean;
  boletos: string[];
};

async function cargar(facturaId: number) {
  return queryOne<Datos>(
    `SELECT f.id AS factura_id, f.numero_factura, f.monto, f.motivo_rechazo,
            t.nombre AS tienda, p.nombre_completo, p.email, p.telefono, p.prefiere_whatsapp,
            COALESCE((SELECT array_agg(b.numero_boleto ORDER BY b.id) FROM boletos b WHERE b.factura_id = f.id), '{}') AS boletos
       FROM facturas f
       JOIN tiendas t ON t.id = f.tienda_id
       JOIN participantes p ON p.id = f.participante_id
      WHERE f.id = $1`,
    [facturaId],
  );
}

async function registrar(facturaId: number, canal: Canal, tipo: Tipo, estado: string, detalle?: string) {
  await query(
    "INSERT INTO notificaciones (factura_id, canal, tipo, estado, detalle_error) VALUES ($1, $2, $3, $4, $5)",
    [facturaId, canal, tipo, estado, detalle?.slice(0, 500) ?? null],
  );
}

const primerNombre = (n: string) => n.trim().split(/\s+/)[0] ?? n;

const esc = (v: string) =>
  v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function correo(tipo: Tipo, d: Datos) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  if (tipo === "boletos_asignados") {
    const lista = d.boletos
      .map(
        (b) =>
          `<span style="display:inline-block;margin:4px;padding:8px 12px;border:1px solid #d4af37;border-radius:8px;font-family:monospace;font-size:16px;color:#0b1d33">${b}</span>`,
      )
      .join("");
    return {
      subject: `Tus ${d.boletos.length} boletos del Sorteo de Fin de Año`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#0b1d33">
        <h1 style="font-size:22px">¡Hola ${esc(primerNombre(d.nombre_completo))}!</h1>
        <p>Registramos tu factura <b>${esc(d.numero_factura)}</b> de <b>${esc(d.tienda)}</b> por <b>${colones(d.monto)}</b>.</p>
        <p>Estos son tus boletos para el Sorteo de Fin de Año de Mall San Pedro:</p>
        <p>${lista}</p>
        <p>Guarda este correo. Puedes consultar todos tus boletos en ${siteUrl ? `<a href="${siteUrl}/mis-boletos">${siteUrl}/mis-boletos</a>` : "la sección Mis boletos del sitio"}.</p>
        <p style="color:#667">Mall San Pedro · Sorteo de Fin de Año</p></div>`,
    };
  }
  return {
    subject: "Actualización sobre tu factura registrada",
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#0b1d33">
      <h1 style="font-size:22px">Hola ${esc(primerNombre(d.nombre_completo))}</h1>
      <p>Tu factura <b>${esc(d.numero_factura)}</b> de <b>${esc(d.tienda)}</b> fue anulada y sus boletos (${d.boletos.join(", ")}) ya no participan en el sorteo.</p>
      ${d.motivo_rechazo ? `<p>Motivo: ${esc(d.motivo_rechazo)}</p>` : ""}
      <p>Si crees que es un error, escríbenos respondiendo este correo.</p>
      <p style="color:#667">Mall San Pedro · Sorteo de Fin de Año</p></div>`,
  };
}

async function enviarCorreo(tipo: Tipo, d: Datos) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return registrar(d.factura_id, "email", tipo, "omitido", "Correo no configurado");
  try {
    const { subject, html } = correo(tipo, d);
    const { error } = await new Resend(key).emails.send({ from, to: d.email, subject, html });
    if (error) throw new Error(error.message);
    await registrar(d.factura_id, "email", tipo, "enviado");
  } catch (e) {
    await registrar(d.factura_id, "email", tipo, "fallido", (e as Error).message);
  }
}

async function enviarWhatsapp(tipo: Tipo, d: Datos) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const template =
    tipo === "boletos_asignados" ? process.env.WHATSAPP_TEMPLATE_BOLETOS : process.env.WHATSAPP_TEMPLATE_ANULADA;
  if (!d.prefiere_whatsapp) return registrar(d.factura_id, "whatsapp", tipo, "omitido", "El participante no lo pidió");
  if (!token || !phoneId || !template)
    return registrar(d.factura_id, "whatsapp", tipo, "omitido", "WhatsApp no configurado");

  // Las variables de plantilla de Meta no admiten saltos de línea.
  const params =
    tipo === "boletos_asignados"
      ? [primerNombre(d.nombre_completo), d.tienda, d.boletos.join(", ")]
      : [primerNombre(d.nombre_completo), d.numero_factura, d.motivo_rechazo ?? "revisión administrativa"];

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: d.telefono,
        type: "template",
        template: {
          name: template,
          language: { code: process.env.WHATSAPP_TEMPLATE_LANG ?? "es" },
          components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }],
        },
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    await registrar(d.factura_id, "whatsapp", tipo, "enviado");
  } catch (e) {
    await registrar(d.factura_id, "whatsapp", tipo, "fallido", (e as Error).message);
  }
}

/** Envía la notificación por todos los canales disponibles. Nunca lanza errores. */
export async function notificar(facturaId: number, tipo: Tipo, canales: Canal[] = ["email", "whatsapp"]) {
  try {
    const d = await cargar(facturaId);
    if (!d) return;
    await Promise.all([
      canales.includes("email") ? enviarCorreo(tipo, d) : null,
      canales.includes("whatsapp") ? enviarWhatsapp(tipo, d) : null,
    ]);
  } catch (e) {
    console.error("Error al notificar", facturaId, e);
  }
}

export function canalesConfigurados() {
  return {
    email: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
    whatsapp: Boolean(
      process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_TEMPLATE_BOLETOS,
    ),
  };
}
