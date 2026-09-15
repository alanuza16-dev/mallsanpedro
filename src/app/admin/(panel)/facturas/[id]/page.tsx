import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Estado } from "@/components/EstadoFactura";
import { query, queryOne } from "@/lib/db";
import { colones, fechaHora } from "@/lib/format";
import { reenviarNotificacion, restaurarFactura } from "../../../actions";
import AnularForm from "./AnularForm";

export const metadata = { title: "Detalle de factura" };

type Detalle = {
  id: number;
  numero_factura: string;
  monto: string;
  estado: string;
  motivo_rechazo: string | null;
  boletos_asignados: number;
  creado_en: string;
  revisado_en: string | null;
  revisor: string | null;
  tienda: string;
  patrocinadora: boolean;
  participante_id: number;
  cedula: string;
  nombre_completo: string;
  email: string;
  telefono: string;
  prefiere_whatsapp: boolean;
  fecha_aceptacion: string;
  foto_bytes: number | null;
};

export default async function DetalleFactura({ params }: PageProps<"/admin/facturas/[id]">) {
  await connection();
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const f = await queryOne<Detalle>(
    `SELECT f.id, f.numero_factura, f.monto, f.estado, f.motivo_rechazo, f.boletos_asignados, f.creado_en,
            f.revisado_en, a.nombre AS revisor, f.foto_bytes,
            t.nombre AS tienda, t.patrocinadora,
            p.id AS participante_id, p.cedula, p.nombre_completo, p.email, p.telefono, p.prefiere_whatsapp, p.fecha_aceptacion
       FROM facturas f
       JOIN tiendas t ON t.id = f.tienda_id
       JOIN participantes p ON p.id = f.participante_id
       LEFT JOIN admins a ON a.id = f.revisado_por
      WHERE f.id = $1`,
    [Number(id)],
  );
  if (!f) notFound();

  const [boletos, avisos, otras] = await Promise.all([
    query<{ numero_boleto: string; anulado: boolean; ganador: string | null }>(
      `SELECT b.numero_boleto, b.anulado, g.premio AS ganador
         FROM boletos b LEFT JOIN ganadores g ON g.boleto_id = b.id
        WHERE b.factura_id = $1 ORDER BY b.id`,
      [f.id],
    ),
    query<{ canal: string; tipo: string; estado: string; detalle_error: string | null; creado_en: string }>(
      "SELECT canal, tipo, estado, detalle_error, creado_en FROM notificaciones WHERE factura_id = $1 ORDER BY id DESC",
      [f.id],
    ),
    query<{ id: number; tienda: string; numero_factura: string; monto: string; estado: string; boletos_asignados: number }>(
      `SELECT f.id, t.nombre AS tienda, f.numero_factura, f.monto, f.estado, f.boletos_asignados
         FROM facturas f JOIN tiendas t ON t.id = f.tienda_id
        WHERE f.participante_id = $1 AND f.id <> $2 ORDER BY f.creado_en DESC`,
      [f.participante_id, f.id],
    ),
  ]);

  const tel = f.telefono.replace(/^506/, "");

  return (
    <div className="space-y-5">
      <Link href="/admin" className="text-sm font-semibold text-slate-500 hover:text-noche">
        ← Volver a facturas
      </Link>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h1 className="font-display text-xl">Factura {f.numero_factura}</h1>
            <Estado estado={f.estado} />
          </div>
          <a href={`/api/admin/foto/${f.id}`} target="_blank" className="block bg-slate-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/admin/foto/${f.id}`} alt={`Foto de la factura ${f.numero_factura}`} className="mx-auto max-h-[70vh] object-contain" />
          </a>
          <p className="px-4 py-2 text-xs text-slate-500">
            Clic en la imagen para abrirla en tamaño completo{f.foto_bytes ? ` · ${Math.round(f.foto_bytes / 1024)} KB` : ""}
          </p>
        </section>

        <div className="space-y-5">
          <section className="panel p-5">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Dato k="Tienda" v={<>{f.tienda}{f.patrocinadora && <span className="ml-1.5 rounded bg-oro px-1 text-[10px] font-extrabold">x2</span>}</>} />
              <Dato k="Monto declarado" v={colones(f.monto)} />
              <Dato k="Registrada" v={fechaHora(f.creado_en)} />
              <Dato k="Boletos" v={f.boletos_asignados} />
            </dl>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {boletos.map((b) => (
                <span
                  key={b.numero_boleto}
                  title={b.ganador ? `Ganador: ${b.ganador}` : undefined}
                  className={`rounded-md px-2 py-1 font-mono text-xs font-bold ${
                    b.ganador ? "bg-oro text-noche" : b.anulado ? "bg-slate-100 text-slate-400 line-through" : "bg-noche text-white"
                  }`}
                >
                  {b.numero_boleto}
                </span>
              ))}
            </div>
          </section>

          <section className="panel p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Participante</h2>
            <p className="mt-2 text-lg font-semibold">{f.nombre_completo}</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Dato k="Cédula" v={f.cedula} />
              <Dato k="Teléfono" v={<a className="underline" href={`https://wa.me/${f.telefono}`} target="_blank">{tel.slice(0, 4)} {tel.slice(4)}</a>} />
              <Dato k="Correo" v={<a className="break-all underline" href={`mailto:${f.email}`}>{f.email}</a>} />
              <Dato k="WhatsApp" v={f.prefiere_whatsapp ? "Sí" : "No"} />
              <Dato k="Consentimiento" v={fechaHora(f.fecha_aceptacion)} />
            </dl>
            {otras.length > 0 && (
              <>
                <h3 className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-500">Otras facturas de esta persona</h3>
                <ul className="mt-2 divide-y divide-slate-100 text-sm">
                  {otras.map((o) => (
                    <li key={o.id} className="flex items-center justify-between gap-2 py-1.5">
                      <Link href={`/admin/facturas/${o.id}`} className="hover:underline">
                        {o.tienda} · <span className="font-mono text-xs">{o.numero_factura}</span>
                      </Link>
                      <span className={`tabular-nums ${o.estado === "rechazada" ? "text-slate-400 line-through" : ""}`}>
                        {colones(o.monto)} · {o.boletos_asignados} bol.
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className="panel p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              {f.estado === "aprobada" ? "Anular factura" : "Factura anulada"}
            </h2>
            {f.estado === "aprobada" ? (
              <AnularForm id={f.id} boletos={f.boletos_asignados} />
            ) : (
              <div className="mt-3 space-y-3 text-sm">
                <p>
                  <span className="font-semibold">Motivo:</span> {f.motivo_rechazo}
                </p>
                <p className="text-slate-500">
                  Por {f.revisor ?? "un administrador"} el {fechaHora(f.revisado_en)}
                </p>
                <form action={restaurarFactura}>
                  <input type="hidden" name="id" value={f.id} />
                  <button className="btn-sec">Restaurar factura y sus boletos</button>
                </form>
              </div>
            )}
          </section>

          <section className="panel p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Notificaciones</h2>
              <form action={reenviarNotificacion}>
                <input type="hidden" name="id" value={f.id} />
                <button className="btn-sec">Reenviar</button>
              </form>
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              {avisos.map((a, i) => (
                <li key={i} className="flex flex-wrap items-baseline justify-between gap-2">
                  <span>
                    <span className="font-semibold">{a.canal === "email" ? "Correo" : "WhatsApp"}</span>{" "}
                    <span className="text-slate-500">({a.tipo === "boletos_asignados" ? "boletos" : "anulación"})</span>
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      a.estado === "enviado" ? "text-emerald-700" : a.estado === "fallido" ? "text-red-700" : "text-slate-400"
                    }`}
                    title={a.detalle_error ?? undefined}
                  >
                    {a.estado} · {fechaHora(a.creado_en)}
                  </span>
                  {a.detalle_error && a.estado !== "enviado" && <span className="w-full text-xs text-slate-400">{a.detalle_error}</span>}
                </li>
              ))}
              {!avisos.length && <li className="text-slate-500">Sin registros todavía.</li>}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function Dato({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}
