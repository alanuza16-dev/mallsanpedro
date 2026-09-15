"use client";

import { useState } from "react";

const formato = new Intl.NumberFormat("es-CR");

export default function Calculadora({ montoPorBloque }: { montoPorBloque: number }) {
  const [monto, setMonto] = useState(35000);
  const bloques = Math.floor(monto / montoPorBloque);

  return (
    <div className="tarjeta p-6 sm:p-8">
      <label htmlFor="calc" className="text-sm font-semibold text-niebla">
        Si tu factura es de
      </label>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-display text-4xl text-oro">₡</span>
        <input
          id="calc"
          inputMode="numeric"
          value={formato.format(monto)}
          onChange={(e) => setMonto(Math.min(9_999_999, Number(e.target.value.replace(/\D/g, "")) || 0))}
          className="w-full bg-transparent font-display text-4xl tracking-tight text-crema outline-none sm:text-5xl"
        />
      </div>
      <input
        type="range"
        min={0}
        max={200000}
        step={1000}
        value={Math.min(monto, 200000)}
        onChange={(e) => setMonto(Number(e.target.value))}
        className="mt-4 w-full accent-[#d9b44a]"
        aria-label="Monto de la factura"
      />
      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-wider text-niebla">Tienda participante</p>
          <p className="mt-1 font-display text-4xl">{bloques}</p>
          <p className="text-sm text-niebla">boleto{bloques === 1 ? "" : "s"}</p>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-oro/50 bg-oro/10 p-4">
          <span className="absolute right-3 top-3 rounded-full bg-oro px-2 py-0.5 text-xs font-extrabold text-noche">x2</span>
          <p className="text-xs uppercase tracking-wider text-oro-suave">Patrocinadora</p>
          <p className="mt-1 font-display text-4xl text-oro">{bloques * 2}</p>
          <p className="text-sm text-oro-suave/80">boleto{bloques * 2 === 1 ? "" : "s"}</p>
        </div>
      </div>
      <p className="mt-4 text-xs text-niebla">
        Se cuentan bloques completos de ₡{formato.format(montoPorBloque)} por factura.
      </p>
    </div>
  );
}
