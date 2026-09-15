import Link from "next/link";
import { connection } from "next/server";
import { getResumen, getTiendas, listarFacturas } from "@/lib/data";
import { Estado } from "@/components/EstadoFactura";
import { colones, fechaHora } from "@/lib/format";

export const metadata = { title: "Facturas" };

const POR_PAGINA = 50;

export default async function Facturas({ searchParams }: PageProps<"/admin">) {
  await connection();
  const sp = await searchParams;
  const val = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const filtro = { tienda: val("tienda"), estado: val("estado"), q: val("q"), desde: val("desde"), hasta: val("hasta") };
  const pagina = Math.max(1, Number(val("pagina")) || 1);

  const [{ totales, porTienda }, tiendas, { rows, total }] = await Promise.all([
    getResumen(),
    getTiendas(false),
    listarFacturas(filtro, POR_PAGINA, (pagina - 1) * POR_PAGINA),
  ]);

  const qs = new URLSearchParams(Object.entries(filtro).filter(([, v]) => v) as [string, string][]);
  const exportar = `/api/admin/exportar${qs.size ? `?${qs}` : ""}`;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const irA = (p: number) => {
    const n = new URLSearchParams(qs);
    n.set("pagina", String(p));
    return `/admin?${n}`;
  };
  const maxBoletos = Math.max(1, ...porTienda.map((t) => t.boletos));

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi titulo="Participantes" valor={totales.participantes.toLocaleString("es-CR")} />
        <Kpi titulo="Facturas válidas" valor={totales.facturas.toLocaleString("es-CR")} />
        <Kpi titulo="Boletos válidos" valor={totales.boletos.toLocaleString("es-CR")} destacado />
        <Kpi titulo="Monto facturado" valor={colones(totales.monto)} />
        <Kpi titulo="Anuladas" valor={totales.rechazadas.toLocaleString("es-CR")} />
      </section>

      <section className="panel p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Boletos por tienda</h2>
        <ul className="mt-4 grid gap-x-8 gap-y-2.5 md:grid-cols-2">
          {porTienda.map((t) => (
            <li key={t.id} className="grid grid-cols-[9rem_1fr_auto] items-center gap-3 text-sm">
              <span className="truncate font-medium">
                {t.nombre}
                {t.patrocinadora && <span className="ml-1.5 rounded bg-oro px-1 text-[10px] font-extrabold text-noche">x2</span>}
              </span>
              <span className="h-2 overflow-hidden rounded-full bg-slate-100">
                <span
                  className={`block h-full rounded-full ${t.patrocinadora ? "bg-oro" : "bg-noche-3"}`}
                  style={{ width: `${(t.boletos / maxBoletos) * 100}%` }}
                />
              </span>
              <span className="w-24 text-right tabular-nums text-slate-600">
                {t.boletos} <span className="text-slate-400">· {t.facturas} fact.</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <form className="flex flex-wrap items-end gap-3 border-b border-slate-200 p-4">
          <div className="min-w-48 flex-1">
            <label className="mb-1 block text-xs font-semibold text-slate-500" htmlFor="q">
              Buscar
            </label>
            <input id="q" name="q" defaultValue={filtro.q} placeholder="Cédula, nombre, correo, factura o boleto" className="campo-claro" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500" htmlFor="tienda">
              Tienda
            </label>
            <select id="tienda" name="tienda" defaultValue={filtro.tienda ?? ""} className="campo-claro">
              <option value="">Todas</option>
              {tiendas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500" htmlFor="estado">
              Estado
            </label>
            <select id="estado" name="estado" defaultValue={filtro.estado ?? ""} className="campo-claro">
              <option value="">Todos</option>
              <option value="aprobada">Válidas</option>
              <option value="rechazada">Anuladas</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500" htmlFor="desde">
              Desde
            </label>
            <input id="desde" name="desde" type="date" defaultValue={filtro.desde} className="campo-claro" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500" htmlFor="hasta">
              Hasta
            </label>
            <input id="hasta" name="hasta" type="date" defaultValue={filtro.hasta} className="campo-claro" />
          </div>
          <button className="btn">Filtrar</button>
          {qs.size > 0 && (
            <Link href="/admin" className="btn-sec">
              Limpiar
            </Link>
          )}
          <a href={exportar} className="btn ml-auto bg-pino hover:bg-pino/85" download>
            <svg viewBox="0 0 20 20" className="size-4" fill="currentColor" aria-hidden>
              <path d="M10 2a1 1 0 0 1 1 1v8.6l2.3-2.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L9 11.6V3a1 1 0 0 1 1-1ZM4 16a1 1 0 1 0 0 2h12a1 1 0 1 0 0-2H4Z" />
            </svg>
            Exportar a Excel{qs.size ? " (filtrado)" : ""}
          </a>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Participante</th>
                <th className="px-4 py-3">Tienda</th>
                <th className="px-4 py-3">Factura</th>
                <th className="px-4 py-3 text-right">Monto</th>
                <th className="px-4 py-3 text-right">Boletos</th>
                <th className="px-4 py-3">Avisos</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((f) => (
                <tr key={f.id} className="group hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">{fechaHora(f.creado_en)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/facturas/${f.id}`} className="font-semibold text-noche group-hover:underline">
                      {f.nombre_completo}
                    </Link>
                    <p className="text-xs text-slate-500">{f.cedula}</p>
                  </td>
                  <td className="px-4 py-3">
                    {f.tienda}
                    {f.patrocinadora && <span className="ml-1.5 rounded bg-oro px-1 text-[10px] font-extrabold text-noche">x2</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{f.numero_factura}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{colones(f.monto)}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums">{f.boletos_asignados}</td>
                  <td className="px-4 py-3">
                    <Avisos lista={f.notificaciones} />
                  </td>
                  <td className="px-4 py-3">
                    <Estado estado={f.estado} />
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-slate-500">
                    {qs.size ? "No hay facturas con esos filtros." : "Todavía no se han registrado facturas."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
          <span>
            {total.toLocaleString("es-CR")} factura{total === 1 ? "" : "s"}
          </span>
          {paginas > 1 && (
            <div className="flex items-center gap-2">
              {pagina > 1 && (
                <Link className="btn-sec" href={irA(pagina - 1)}>
                  Anterior
                </Link>
              )}
              <span>
                Página {pagina} de {paginas}
              </span>
              {pagina < paginas && (
                <Link className="btn-sec" href={irA(pagina + 1)}>
                  Siguiente
                </Link>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Kpi({ titulo, valor, destacado }: { titulo: string; valor: string; destacado?: boolean }) {
  return (
    <div className={`rounded-xl p-4 shadow-sm ${destacado ? "bg-noche text-white" : "border border-slate-200 bg-white"}`}>
      <p className={`text-xs font-semibold uppercase tracking-wider ${destacado ? "text-oro" : "text-slate-500"}`}>{titulo}</p>
      <p className="mt-1 font-display text-2xl tabular-nums sm:text-3xl">{valor}</p>
    </div>
  );
}

function Avisos({ lista }: { lista: { canal: string; tipo: string; estado: string }[] }) {
  const ultimo = (canal: string) => [...lista].reverse().find((n) => n.canal === canal);
  return (
    <span className="flex gap-1.5">
      {(["email", "whatsapp"] as const).map((c) => {
        const n = ultimo(c);
        const color = !n
          ? "bg-slate-100 text-slate-400"
          : n.estado === "enviado"
            ? "bg-emerald-50 text-emerald-700"
            : n.estado === "fallido"
              ? "bg-red-50 text-red-700"
              : "bg-slate-100 text-slate-500";
        return (
          <span key={c} title={`${c}: ${n?.estado ?? "pendiente"}`} className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${color}`}>
            {c === "email" ? "Correo" : "WA"}
          </span>
        );
      })}
    </span>
  );
}
