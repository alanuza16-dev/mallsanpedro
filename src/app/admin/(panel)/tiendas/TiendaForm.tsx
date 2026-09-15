"use client";

import { useActionState, useEffect, useRef } from "react";
import { guardarTienda, type FormState } from "../../actions";

type Tienda = { id: number; nombre: string; categoria: string; patrocinadora: boolean; activa: boolean };

export default function TiendaForm({ tienda }: { tienda?: Tienda }) {
  const [estado, accion, pendiente] = useActionState<FormState, FormData>(guardarTienda, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado?.ok && !tienda) ref.current?.reset();
  }, [estado, tienda]);

  return (
    <form ref={ref} action={accion} className="flex flex-wrap items-center gap-3">
      {tienda && <input type="hidden" name="id" value={tienda.id} />}
      <input name="nombre" defaultValue={tienda?.nombre} placeholder="Nombre de la tienda" className="campo-claro min-w-48 flex-1" required />
      <input name="categoria" defaultValue={tienda?.categoria ?? ""} placeholder="Categoría" className="campo-claro w-44" required />
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" name="patrocinadora" defaultChecked={tienda?.patrocinadora} className="size-4 accent-[#d9b44a]" />
        Patrocinadora <span className="rounded bg-oro px-1 text-[10px] font-extrabold">x2</span>
      </label>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" name="activa" defaultChecked={tienda ? tienda.activa : true} className="size-4 accent-[#0b1d33]" />
        Activa
      </label>
      <button className={tienda ? "btn-sec" : "btn"} disabled={pendiente}>
        {pendiente ? "Guardando…" : tienda ? "Guardar" : "Agregar"}
      </button>
      {estado?.error && <p className="w-full text-sm font-semibold text-red-700">{estado.error}</p>}
      {estado?.ok && <p className="w-full text-sm font-semibold text-emerald-700">{estado.mensaje}</p>}
    </form>
  );
}
