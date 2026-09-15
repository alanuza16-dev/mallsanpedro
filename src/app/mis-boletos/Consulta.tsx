"use client";

import { useActionState } from "react";
import { consultarBoletos, type ConsultaBoletos } from "@/app/actions";

const crc = new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 });
const fecha = new Intl.DateTimeFormat("es-CR", { dateStyle: "medium", timeZone: "America/Costa_Rica" });

export default function Consulta() {
  const [estado, accion, pendiente] = useActionState<ConsultaBoletos | null, FormData>(consultarBoletos, null);

  const validos = estado?.ok
    ? estado.facturas.flatMap((f) => f.boletos.filter((b) => !b.anulado)).length
    : 0;

  return (
    <>
      <form action={accion} className="tarjeta mt-6 space-y-4 p-5 sm:p-7">
        <div>
          <label className="etiqueta" htmlFor="cedula">
            Cédula
          </label>
          <input id="cedula" name="cedula" className="campo" inputMode="numeric" defaultValue={estado && !estado.ok ? estado.cedula : undefined} required />
        </div>
        <div>
          <label className="etiqueta" htmlFor="email">
            Correo
          </label>
          <input id="email" name="email" type="email" className="campo" autoComplete="email" defaultValue={estado && !estado.ok ? estado.email : undefined} required />
        </div>
        {estado && !estado.ok && (
          <p role="alert" className="rounded-xl border border-cereza/50 bg-cereza/15 px-4 py-3 text-sm text-[#ffd9d5]">
            {estado.error}
          </p>
        )}
        <button className="boton w-full" disabled={pendiente}>
          {pendiente ? "Buscando…" : "Consultar"}
        </button>
      </form>

      {estado?.ok && (
        <section className="mt-8" aria-live="polite">
          <h2 className="font-display text-2xl">
            Hola {estado.nombre}, tienes <span className="text-oro">{validos}</span> boleto{validos === 1 ? "" : "s"} válido
            {validos === 1 ? "" : "s"}
          </h2>
          <ul className="mt-5 space-y-4">
            {estado.facturas.map((f) => (
              <li key={f.id} className="tarjeta p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-bold">{f.tienda}</p>
                  <p className="text-sm text-niebla">{fecha.format(new Date(f.creado_en))}</p>
                </div>
                <p className="mt-1 text-sm text-niebla">
                  Factura <span className="font-mono">{f.numero_factura}</span> · {crc.format(Number(f.monto))}
                </p>
                {f.estado === "rechazada" && (
                  <p className="mt-2 text-sm font-semibold text-[#ffb4ab]">Esta factura fue anulada.</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {f.boletos.map((b) => (
                    <span
                      key={b.numero}
                      className={`rounded-lg px-2.5 py-1 font-mono text-sm font-bold ${
                        b.anulado ? "bg-white/5 text-niebla line-through" : "bg-crema text-noche"
                      }`}
                    >
                      {b.numero}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
