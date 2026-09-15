"use client";

import { AnimatePresence, motion } from "motion/react";
import { useActionState, useEffect, useState } from "react";
import { sortear, type FormState, type Ganador } from "../../actions";

type Estado = (FormState & { ganador?: Ganador }) | null;

export default function SorteoForm() {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(sortear, null);
  const [ruleta, setRuleta] = useState("MSP-000000");

  // Números girando mientras el servidor elige el boleto: solo efecto visual.
  useEffect(() => {
    if (!pendiente) return;
    const t = setInterval(() => setRuleta(`MSP-${String(Math.floor(Math.random() * 999999)).padStart(6, "0")}`), 60);
    return () => clearInterval(t);
  }, [pendiente]);

  const g = estado?.ganador;

  return (
    <section className="grid gap-5 lg:grid-cols-2">
      <form action={accion} className="panel space-y-4 p-5">
        <div>
          <label htmlFor="premio" className="mb-1 block text-sm font-semibold">
            Premio a sortear
          </label>
          <input id="premio" name="premio" className="campo-claro" placeholder="Ej. Pantalla 55 pulgadas" defaultValue={estado?.valores?.premio} required />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="unoPorPersona" defaultChecked className="size-4 accent-[#0b1d33]" />
          Excluir a personas que ya ganaron otro premio
        </label>
        {estado?.error && <p className="text-sm font-semibold text-red-700">{estado.error}</p>}
        <button className="btn w-full py-3 text-base" disabled={pendiente}>
          {pendiente ? "Sorteando…" : "Sortear ahora"}
        </button>
      </form>

      <div className="relative flex min-h-56 flex-col items-center justify-center overflow-hidden rounded-xl bg-noche p-6 text-center text-white">
        <AnimatePresence mode="wait">
          {pendiente ? (
            <motion.p key="r" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="font-mono text-4xl font-bold text-oro">
              {ruleta}
            </motion.p>
          ) : g ? (
            <motion.div key={g.id} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15 }}>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-oro">{g.premio}</p>
              <p className="mt-2 font-mono text-5xl font-bold">{g.numero_boleto}</p>
              <p className="mt-3 font-display text-2xl">{g.nombre_completo}</p>
              <p className="mt-1 text-sm text-white/60">
                {g.tienda} · factura {g.numero_factura}
              </p>
              <p className="mt-3 text-xs text-white/50">{estado?.mensaje}</p>
            </motion.div>
          ) : (
            <motion.p key="v" className="text-white/50">
              El ganador aparecerá aquí.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
