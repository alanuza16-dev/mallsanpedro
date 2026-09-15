import { connection } from "next/server";
import { getTiendas } from "@/lib/data";
import TiendaForm from "./TiendaForm";

export const metadata = { title: "Tiendas" };

export default async function Tiendas() {
  await connection();
  const tiendas = await getTiendas(false);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl">Tiendas</h1>
        <p className="mt-1 text-sm text-slate-500">
          Las patrocinadoras dan <b>2 boletos</b> por bloque de monto; las participantes, 1. Desactivar una tienda la oculta
          del formulario, pero sus facturas ya registradas se conservan.
        </p>
      </div>
      <section className="panel p-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">Agregar tienda</h2>
        <TiendaForm />
      </section>
      <section className="panel divide-y divide-slate-100">
        {tiendas.map((t) => (
          <div key={t.id} className="p-4">
            <TiendaForm tienda={t} />
          </div>
        ))}
      </section>
    </div>
  );
}
