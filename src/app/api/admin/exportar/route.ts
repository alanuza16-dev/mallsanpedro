import ExcelJS from "exceljs";
import type { NextRequest } from "next/server";
import { getAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { getResumen, whereFacturas } from "@/lib/data";

export const maxDuration = 60;

const AZUL = "FF0B1D33";
const DORADO = "FFD4AF37";

function encabezado(ws: ExcelJS.Worksheet) {
  const row = ws.getRow(1);
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL } };
  row.alignment = { vertical: "middle" };
  row.height = 22;
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };
}

const CRC = '"₡"#,##0';

// Excel no maneja zonas horarias: se escribe la hora de Costa Rica (UTC-6, sin horario de verano).
const hora = (d: string | Date) => new Date(new Date(d).getTime() - 6 * 3600 * 1000);
const FECHA = "dd/mm/yyyy hh:mm";

/**
 * Exporta a Excel en cualquier momento. Respeta los filtros del panel si vienen en la URL
 * (tienda, estado, q, desde, hasta); sin filtros exporta todo.
 */
export async function GET(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return new Response("No autorizado", { status: 401 });

  const sp = req.nextUrl.searchParams;
  const filtro = {
    tienda: sp.get("tienda") ?? undefined,
    estado: sp.get("estado") ?? undefined,
    q: sp.get("q") ?? undefined,
    desde: sp.get("desde") ?? undefined,
    hasta: sp.get("hasta") ?? undefined,
  };
  const { where, params } = whereFacturas(filtro);

  type FacturaX = {
    id: number;
    creado_en: string;
    tienda: string;
    patrocinadora: boolean;
    numero_factura: string;
    monto: string;
    boletos_asignados: number;
    estado: string;
    motivo_rechazo: string | null;
    cedula: string;
    nombre_completo: string;
    email: string;
    telefono: string;
    boletos: string | null;
    revisado_en: string | null;
    revisor: string | null;
  };

  const facturas = await query<FacturaX>(
    `SELECT f.id, f.creado_en, t.nombre AS tienda, t.patrocinadora, f.numero_factura, f.monto,
            f.boletos_asignados, f.estado, f.motivo_rechazo,
            p.cedula, p.nombre_completo, p.email, p.telefono,
            (SELECT string_agg(b.numero_boleto, ', ' ORDER BY b.id) FROM boletos b WHERE b.factura_id = f.id) AS boletos,
            f.revisado_en, a.nombre AS revisor
       FROM facturas f
       JOIN tiendas t ON t.id = f.tienda_id
       JOIN participantes p ON p.id = f.participante_id
       LEFT JOIN admins a ON a.id = f.revisado_por
       ${where}
      ORDER BY f.creado_en`,
    params,
  );

  const participantes = await query<{
    cedula: string;
    nombre_completo: string;
    email: string;
    telefono: string;
    prefiere_whatsapp: boolean;
    fecha_aceptacion: string;
    facturas: number;
    boletos: number;
    monto: string;
  }>(
    `SELECT p.cedula, p.nombre_completo, p.email, p.telefono, p.prefiere_whatsapp, p.fecha_aceptacion,
            COUNT(f.id) FILTER (WHERE f.estado = 'aprobada')::int AS facturas,
            COALESCE(SUM(f.boletos_asignados) FILTER (WHERE f.estado = 'aprobada'), 0)::int AS boletos,
            COALESCE(SUM(f.monto) FILTER (WHERE f.estado = 'aprobada'), 0)::text AS monto
       FROM participantes p
       JOIN facturas f ON f.participante_id = p.id
      WHERE f.id IN (SELECT f.id FROM facturas f JOIN participantes p ON p.id = f.participante_id ${where})
      GROUP BY p.id
      ORDER BY p.nombre_completo`,
    params,
  );

  const boletos = await query<{
    numero_boleto: string;
    anulado: boolean;
    numero_factura: string;
    tienda: string;
    cedula: string;
    nombre_completo: string;
    creado_en: string;
  }>(
    `SELECT b.numero_boleto, b.anulado, f.numero_factura, t.nombre AS tienda, p.cedula, p.nombre_completo, b.creado_en
       FROM boletos b
       JOIN facturas f ON f.id = b.factura_id
       JOIN tiendas t ON t.id = f.tienda_id
       JOIN participantes p ON p.id = f.participante_id
       ${where}
      ORDER BY b.id`,
    params,
  );

  const ganadores = await query<{
    premio: string;
    numero_boleto: string;
    nombre_completo: string;
    cedula: string;
    telefono: string;
    email: string;
    tienda: string;
    fecha_sorteo: string;
  }>(
    `SELECT g.premio, b.numero_boleto, p.nombre_completo, p.cedula, p.telefono, p.email, t.nombre AS tienda, g.fecha_sorteo
       FROM ganadores g
       JOIN boletos b ON b.id = g.boleto_id
       JOIN facturas f ON f.id = b.factura_id
       JOIN tiendas t ON t.id = f.tienda_id
       JOIN participantes p ON p.id = f.participante_id
      ORDER BY g.fecha_sorteo`,
  );

  const { totales, porTienda } = await getResumen();

  const wb = new ExcelJS.Workbook();
  wb.creator = "Mall San Pedro · Sorteo de Fin de Año";
  wb.created = new Date();

  // Resumen
  const wsR = wb.addWorksheet("Resumen", { properties: { tabColor: { argb: DORADO } } });
  wsR.columns = [
    { header: "Tienda", key: "nombre", width: 28 },
    { header: "Tipo", key: "tipo", width: 18 },
    { header: "Facturas", key: "facturas", width: 12 },
    { header: "Boletos", key: "boletos", width: 12 },
    { header: "Monto facturado", key: "monto", width: 18, style: { numFmt: CRC } },
  ];
  porTienda.forEach((t) =>
    wsR.addRow({
      nombre: t.nombre,
      tipo: t.patrocinadora ? "Patrocinadora x2" : "Participante",
      facturas: t.facturas,
      boletos: t.boletos,
      monto: Number(t.monto),
    }),
  );
  const tot = wsR.addRow({
    nombre: "TOTAL",
    facturas: totales.facturas,
    boletos: totales.boletos,
    monto: Number(totales.monto),
  });
  tot.font = { bold: true };
  encabezado(wsR);
  wsR.addRow([]);
  wsR.addRow([`Participantes únicos: ${totales.participantes}`]);
  wsR.addRow([`Facturas anuladas: ${totales.rechazadas}`]);
  wsR.addRow([`Exportado: ${new Date().toLocaleString("es-CR", { timeZone: "America/Costa_Rica" })} por ${admin.nombre}`]);
  const filtrosActivos = Object.entries(filtro).filter(([, v]) => v);
  if (filtrosActivos.length)
    wsR.addRow([`Filtros aplicados: ${filtrosActivos.map(([k, v]) => `${k}=${v}`).join(", ")}`]);

  // Facturas
  const wsF = wb.addWorksheet("Facturas");
  wsF.columns = [
    { header: "ID", key: "id", width: 8 },
    { header: "Fecha", key: "creado_en", width: 18, style: { numFmt: FECHA } },
    { header: "Tienda", key: "tienda", width: 24 },
    { header: "x2", key: "x2", width: 6 },
    { header: "N.º factura", key: "numero_factura", width: 18 },
    { header: "Monto", key: "monto", width: 14, style: { numFmt: CRC } },
    { header: "Boletos", key: "boletos_asignados", width: 10 },
    { header: "Números de boleto", key: "boletos", width: 40 },
    { header: "Estado", key: "estado", width: 12 },
    { header: "Motivo anulación", key: "motivo_rechazo", width: 30 },
    { header: "Anulada por", key: "revisor", width: 18 },
    { header: "Cédula", key: "cedula", width: 14 },
    { header: "Nombre", key: "nombre_completo", width: 28 },
    { header: "Correo", key: "email", width: 28 },
    { header: "Teléfono", key: "telefono", width: 14 },
  ];
  facturas.forEach((f) =>
    wsF.addRow({
      ...f,
      creado_en: hora(f.creado_en),
      x2: f.patrocinadora ? "Sí" : "No",
      estado: f.estado === "aprobada" ? "Válida" : "Anulada",
      monto: Number(f.monto),
    }),
  );
  encabezado(wsF);

  // Participantes
  const wsP = wb.addWorksheet("Participantes");
  wsP.columns = [
    { header: "Cédula", key: "cedula", width: 14 },
    { header: "Nombre", key: "nombre_completo", width: 30 },
    { header: "Correo", key: "email", width: 30 },
    { header: "Teléfono", key: "telefono", width: 14 },
    { header: "Acepta WhatsApp", key: "whatsapp", width: 16 },
    { header: "Consentimiento", key: "fecha_aceptacion", width: 18, style: { numFmt: FECHA } },
    { header: "Facturas válidas", key: "facturas", width: 16 },
    { header: "Boletos válidos", key: "boletos", width: 16 },
    { header: "Monto válido", key: "monto", width: 16, style: { numFmt: CRC } },
  ];
  participantes.forEach((p) =>
    wsP.addRow({
      ...p,
      whatsapp: p.prefiere_whatsapp ? "Sí" : "No",
      fecha_aceptacion: hora(p.fecha_aceptacion),
      monto: Number(p.monto),
    }),
  );
  encabezado(wsP);

  // Boletos
  const wsB = wb.addWorksheet("Boletos");
  wsB.columns = [
    { header: "Boleto", key: "numero_boleto", width: 14 },
    { header: "Estado", key: "estado", width: 12 },
    { header: "N.º factura", key: "numero_factura", width: 18 },
    { header: "Tienda", key: "tienda", width: 24 },
    { header: "Cédula", key: "cedula", width: 14 },
    { header: "Nombre", key: "nombre_completo", width: 28 },
    { header: "Fecha", key: "creado_en", width: 18, style: { numFmt: FECHA } },
  ];
  boletos.forEach((b) =>
    wsB.addRow({ ...b, estado: b.anulado ? "Anulado" : "Válido", creado_en: hora(b.creado_en) }),
  );
  encabezado(wsB);

  // Ganadores
  const wsG = wb.addWorksheet("Ganadores");
  wsG.columns = [
    { header: "Premio", key: "premio", width: 28 },
    { header: "Boleto", key: "numero_boleto", width: 14 },
    { header: "Nombre", key: "nombre_completo", width: 28 },
    { header: "Cédula", key: "cedula", width: 14 },
    { header: "Teléfono", key: "telefono", width: 14 },
    { header: "Correo", key: "email", width: 28 },
    { header: "Tienda", key: "tienda", width: 24 },
    { header: "Fecha sorteo", key: "fecha_sorteo", width: 18, style: { numFmt: FECHA } },
  ];
  ganadores.forEach((g) => wsG.addRow({ ...g, fecha_sorteo: hora(g.fecha_sorteo) }));
  encabezado(wsG);

  const buffer = await wb.xlsx.writeBuffer();
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="sorteo-mall-san-pedro-${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
