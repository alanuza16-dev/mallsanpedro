"use client";

import { useActionState, useEffect, useRef } from "react";
import { cambiarPassword, crearAdmin, guardarConfig, type FormState } from "../../actions";

function Mensaje({ estado }: { estado: FormState }) {
  if (estado?.error) return <p className="text-sm font-semibold text-red-700">{estado.error}</p>;
  if (estado?.ok) return <p className="text-sm font-semibold text-emerald-700">{estado.mensaje}</p>;
  return null;
}

export function ConfigForm({ monto, inicio, fin, activa }: { monto: number; inicio: string; fin: string; activa: boolean }) {
  const [estado, accion, pendiente] = useActionState<FormState, FormData>(guardarConfig, null);
  return (
    <form action={accion} className="mt-4 grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-500" htmlFor="monto_por_bloque">
          Monto por bloque (₡)
        </label>
        <input id="monto_por_bloque" name="monto_por_bloque" type="number" min={1000} step={500} defaultValue={monto} className="campo-claro" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-500" htmlFor="fecha_inicio_promo">
          Inicio
        </label>
        <input id="fecha_inicio_promo" name="fecha_inicio_promo" type="date" defaultValue={inicio} className="campo-claro" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-500" htmlFor="fecha_fin_promo">
          Cierre (incluye todo el día)
        </label>
        <input id="fecha_fin_promo" name="fecha_fin_promo" type="date" defaultValue={fin} className="campo-claro" />
      </div>
      <label className="flex items-center gap-2 pb-2 text-sm font-semibold">
        <input type="checkbox" name="activa" defaultChecked={activa} className="size-4 accent-[#0b1d33]" />
        Recibir facturas
      </label>
      <button className="btn" disabled={pendiente}>
        {pendiente ? "Guardando…" : "Guardar"}
      </button>
      <div className="sm:col-span-2 lg:col-span-5">
        <Mensaje estado={estado} />
        <p className="text-xs text-slate-500">Deja las fechas vacías para no limitar por fecha.</p>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [estado, accion, pendiente] = useActionState<FormState, FormData>(cambiarPassword, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado?.ok) ref.current?.reset();
  }, [estado]);
  return (
    <form ref={ref} action={accion} className="mt-3 space-y-3">
      <input name="actual" type="password" autoComplete="current-password" placeholder="Contraseña actual" className="campo-claro" required />
      <input name="nueva" type="password" autoComplete="new-password" minLength={10} placeholder="Nueva contraseña (mín. 10)" className="campo-claro" required />
      <Mensaje estado={estado} />
      <button className="btn" disabled={pendiente}>
        Cambiar contraseña
      </button>
    </form>
  );
}

export function AdminForm() {
  const [estado, accion, pendiente] = useActionState<FormState, FormData>(crearAdmin, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado?.ok) ref.current?.reset();
  }, [estado]);
  return (
    <form ref={ref} action={accion} className="mt-3 flex flex-wrap gap-3">
      <input name="nombre" placeholder="Nombre" className="campo-claro w-44" defaultValue={estado?.valores?.nombre} required />
      <input name="email" type="email" placeholder="correo@mallsanpedro.cr" className="campo-claro min-w-52 flex-1" defaultValue={estado?.valores?.email} required />
      <input name="password" type="password" autoComplete="new-password" minLength={10} placeholder="Contraseña inicial" className="campo-claro w-52" required />
      <button className="btn" disabled={pendiente}>
        Agregar
      </button>
      <div className="w-full">
        <Mensaje estado={estado} />
      </div>
    </form>
  );
}
