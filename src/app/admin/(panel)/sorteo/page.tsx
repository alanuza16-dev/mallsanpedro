import { connection } from "next/server";
import { query, queryOne } from "@/lib/db";
import { fechaHora } from "@/lib/format";
import { eliminarGanador, type Ganador } from "../../actions";
import BotonConfirmar from "@/components/BotonConfirmar";
import SorteoForm from "./SorteoForm";

export const metadata = { title: "Sorteo" };

export default async function Sorteo() {
  await connection();
  const [elegibles, ganadores] = await Promise.all([
    queryOne<{ boletos: number; personas: number }>(
      `SELECT COUNT(*)::int AS boletos, COUNT(DISTINCT f.participante_id)::int AS personas
         FROM boletos b JOIN facturas f ON f.id = b.factura_id
        WHERE NOT b.anulado AND f.estado = 'aprobada'
          AND NOT EXISTS (SELECT 1 FROM ganadores g WHERE g.boleto_id = b.id)`,
    ),
    query<Ganador>(
      `SELECT g.id, g.premio, b.numero_boleto, p.nombre_completo, p.cedula, p.telefono, p.email,
              t.nombre AS tienda, f.numero_factura, g.fecha_sorteo::text
         FROM ganadores g
         JOIN boletos b ON b.id = g.boleto_id
         JOIN facturas f ON f.id = b.factura_id
         JOIN tiendas t ON t.id = f.tienda_id
         JOIN participantes p ON p.id = f.participante_id
        ORDER BY g.fecha_sorteo DESC`,
    ),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl">Sorteo</h1>
        <p className="mt-1 text-sm text-slate-500">
          Participan {elegibles?.boletos.toLocaleString("es-CR")} boletos válidos de {elegibles?.personas.toLocaleString("es-CR")}{" "}
          personas. Cada boleto tiene la misma probabilidad de salir.
        </p>
      </div>

      <SorteoForm />

      <section className="panel">
        <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-bold uppercase tracking-wider text-slate-500">
          Ganadores ({ganadores.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-2">Premio</th>
                <th className="px-4 py-2">Boleto</th>
                <th className="px-4 py-2">Ganador</th>
                <th className="px-4 py-2">Contacto</th>
                <th className="px-4 py-2">Tienda / factura</th>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ganadores.map((g) => (
                <tr key={g.id}>
                  <td className="px-4 py-2 font-semibold">{g.premio}</td>
                  <td className="px-4 py-2 font-mono font-bold">{g.numero_boleto}</td>
                  <td className="px-4 py-2">
                    {g.nombre_completo}
                    <p className="text-xs text-slate-500">{g.cedula}</p>
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {g.telefono.replace(/^506/, "")}
                    <p className="text-slate-500">{g.email}</p>
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {g.tienda}
                    <p className="font-mono text-slate-500">{g.numero_factura}</p>
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500">{fechaHora(g.fecha_sorteo)}</td>
                  <td className="px-4 py-2 text-right">
                    <form action={eliminarGanador}>
                      <input type="hidden" name="id" value={g.id} />
                      <BotonConfirmar
                        mensaje={`¿Invalidar el premio "${g.premio}" del boleto ${g.numero_boleto}? Podrás volver a sortearlo.`}
                        className="text-xs font-semibold text-red-700 hover:underline"
                        title="Quita el registro para volver a sortear ese premio"
                      >
                        Invalidar
                      </BotonConfirmar>
                    </form>
                  </td>
                </tr>
              ))}
              {!ganadores.length && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    Aún no se ha sorteado ningún premio.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
