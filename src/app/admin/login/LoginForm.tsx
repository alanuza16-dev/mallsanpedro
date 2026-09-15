"use client";

import { useActionState } from "react";
import { login, type FormState } from "../actions";

export default function LoginForm() {
  const [estado, accion, pendiente] = useActionState<FormState, FormData>(login, null);
  return (
    <form action={accion} className="mt-6 space-y-4">
      <div>
        <label className="etiqueta" htmlFor="email">
          Correo
        </label>
        <input id="email" name="email" type="email" autoComplete="username" className="campo" defaultValue={estado?.valores?.email} key={estado?.valores?.email} required />
      </div>
      <div>
        <label className="etiqueta" htmlFor="password">
          Contraseña
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" className="campo" required />
      </div>
      {estado?.error && (
        <p role="alert" className="rounded-xl border border-cereza/50 bg-cereza/15 px-4 py-3 text-sm text-[#ffd9d5]">
          {estado.error}
        </p>
      )}
      <button className="boton w-full" disabled={pendiente}>
        {pendiente ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
