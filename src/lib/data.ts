import "server-only";
import { query, queryOne } from "./db";

export type Tienda = {
  id: number;
  nombre: string;
  categoria: string;
  patrocinadora: boolean;
  boletos_por_bloque: number;
  activa: boolean;
};

export type Config = {
  monto_por_bloque: number;
  fecha_inicio_promo: string | null;
  fecha_fin_promo: string | null;
  activa: boolean;
};

export async function getTiendas(soloActivas = true) {
  return query<Tienda>(
    `SELECT id, nombre, categoria, patrocinadora, boletos_por_bloque, activa
       FROM tiendas ${soloActivas ? "WHERE activa" : ""}
      ORDER BY patrocinadora DESC, nombre`,
  );
}

export async function getConfig(): Promise<Config> {
  const c = await queryOne<Config>(
    "SELECT monto_por_bloque, fecha_inicio_promo, fecha_fin_promo, activa FROM configuracion WHERE id = 1",
  );
  return c ?? { monto_por_bloque: 10000, fecha_inicio_promo: null, fecha_fin_promo: null, activa: true };
}

/** Indica si la promoción recibe facturas en este momento y, si no, por qué. */
export function estadoPromo(c: Config, ahora = new Date()): { abierta: boolean; motivo?: string } {
  if (!c.activa) return { abierta: false, motivo: "La promoción está pausada en este momento." };
  if (c.fecha_inicio_promo && ahora < new Date(c.fecha_inicio_promo))
    return { abierta: false, motivo: "La promoción todavía no ha iniciado." };
  if (c.fecha_fin_promo && ahora > new Date(c.fecha_fin_promo))
    return { abierta: false, motivo: "La promoción ya finalizó. ¡Gracias por participar!" };
  return { abierta: true };
}

export type FiltroFacturas = {
  tienda?: string;
  estado?: string;
  q?: string;
  desde?: string;
  hasta?: string;
};

/** Construye el WHERE parametrizado compartido por el listado del panel y la exportación a Excel. */
export function whereFacturas(f: FiltroFacturas) {
  const conds: string[] = [];
  const params: unknown[] = [];
  const add = (sql: string, v: unknown) => {
    params.push(v);
    conds.push(sql.replace("?", `$${params.length}`));
  };
  if (f.tienda && /^\d+$/.test(f.tienda)) add("f.tienda_id = ?", Number(f.tienda));
  if (f.estado === "aprobada" || f.estado === "rechazada") add("f.estado = ?", f.estado);
  if (f.q?.trim()) {
    const term = `%${f.q.trim().replace(/[%_]/g, "")}%`;
    params.push(term);
    const n = `$${params.length}`;
    conds.push(
      `(p.cedula ILIKE ${n} OR f.numero_factura ILIKE ${n} OR p.nombre_completo ILIKE ${n} OR p.email ILIKE ${n}
        OR EXISTS (SELECT 1 FROM boletos bq WHERE bq.factura_id = f.id AND bq.numero_boleto ILIKE ${n}))`,
    );
  }
  if (f.desde && /^\d{4}-\d{2}-\d{2}$/.test(f.desde))
    add("f.creado_en >= (?::date AT TIME ZONE 'America/Costa_Rica')", f.desde);
  if (f.hasta && /^\d{4}-\d{2}-\d{2}$/.test(f.hasta))
    add("f.creado_en < ((?::date + 1) AT TIME ZONE 'America/Costa_Rica')", f.hasta);
  return { where: conds.length ? `WHERE ${conds.join(" AND ")}` : "", params };
}

export type FacturaFila = {
  id: number;
  numero_factura: string;
  monto: string;
  estado: "aprobada" | "rechazada";
  motivo_rechazo: string | null;
  boletos_asignados: number;
  creado_en: string;
  revisado_en: string | null;
  canal: string;
  tienda: string;
  patrocinadora: boolean;
  cedula: string;
  nombre_completo: string;
  email: string;
  telefono: string;
  boletos: string[];
  notificaciones: { canal: string; tipo: string; estado: string }[];
};

export async function listarFacturas(f: FiltroFacturas, limit = 50, offset = 0) {
  const { where, params } = whereFacturas(f);
  const rows = await query<FacturaFila>(
    `SELECT f.id, f.numero_factura, f.monto, f.estado, f.motivo_rechazo, f.boletos_asignados,
            f.creado_en, f.revisado_en, f.canal,
            t.nombre AS tienda, t.patrocinadora,
            p.cedula, p.nombre_completo, p.email, p.telefono,
            COALESCE((SELECT array_agg(b.numero_boleto ORDER BY b.id) FROM boletos b WHERE b.factura_id = f.id), '{}') AS boletos,
            COALESCE((SELECT json_agg(json_build_object('canal', n.canal, 'tipo', n.tipo, 'estado', n.estado) ORDER BY n.id)
                        FROM notificaciones n WHERE n.factura_id = f.id), '[]') AS notificaciones
       FROM facturas f
       JOIN tiendas t ON t.id = f.tienda_id
       JOIN participantes p ON p.id = f.participante_id
       ${where}
      ORDER BY f.creado_en DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params,
  );
  const total = await queryOne<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM facturas f JOIN participantes p ON p.id = f.participante_id ${where}`,
    params,
  );
  return { rows, total: total?.n ?? 0 };
}

export type Resumen = {
  participantes: number;
  facturas: number;
  rechazadas: number;
  boletos: number;
  monto: string;
};

export async function getResumen() {
  const totales = await queryOne<Resumen>(
    `SELECT (SELECT COUNT(*)::int FROM participantes) AS participantes,
            (SELECT COUNT(*)::int FROM facturas WHERE estado = 'aprobada') AS facturas,
            (SELECT COUNT(*)::int FROM facturas WHERE estado = 'rechazada') AS rechazadas,
            (SELECT COUNT(*)::int FROM boletos WHERE NOT anulado) AS boletos,
            (SELECT COALESCE(SUM(monto), 0)::text FROM facturas WHERE estado = 'aprobada') AS monto`,
  );
  const porTienda = await query<{
    id: number;
    nombre: string;
    patrocinadora: boolean;
    facturas: number;
    boletos: number;
    monto: string;
  }>(
    `SELECT t.id, t.nombre, t.patrocinadora,
            COUNT(f.id) FILTER (WHERE f.estado = 'aprobada')::int AS facturas,
            COALESCE(SUM(f.boletos_asignados) FILTER (WHERE f.estado = 'aprobada'), 0)::int AS boletos,
            COALESCE(SUM(f.monto) FILTER (WHERE f.estado = 'aprobada'), 0)::text AS monto
       FROM tiendas t LEFT JOIN facturas f ON f.tienda_id = t.id
      GROUP BY t.id
      ORDER BY boletos DESC, t.nombre`,
  );
  return { totales: totales!, porTienda };
}
