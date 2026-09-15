"use client";

import { useActionState } from "react";
import { anularFactura, type FormState } from "../../../actions";

const MOTIVOS = [
  "El monto de la foto no coincide con el declarado",
  "La foto no corresponde a una factura válida",
  "La tienda de la factura no coincide",
  "Factura fuera del período de la promoción",
];

export default function AnularForm({ id, boletos }: { id: number; boletos: number }) {
  const [estado, accion, pendiente] = useActionState<FormState, FormData>(anularFactura, null);
  return (
    <form
      action={accion}
      onSubmit={(e) => {
        if (!confirm(`¿Anular esta factura? Sus ${boletos} boletos dejarán de participar.`)) e.preventDefault();
      }}
      className="mt-3 space-y-3"
    >
      <input type="hidden" name="id" value={id} />
      <label className="block text-sm font-semibold" htmlFor="motivo">
        Motivo
      </label>
      <input id="motivo" name="motivo" list="motivos" className="campo-claro" placeholder="Explica por qué se anula" defaultValue={estado?.valores?.motivo} required />
      <datalist id="motivos">
        {MOTIVOS.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="avisar" defaultChecked className="size-4 accent-[#0b1d33]" />
        Avisar al participante
      </label>
      {estado?.error && <p className="text-sm font-semibold text-red-700">{estado.error}</p>}
      {estado?.ok && <p className="text-sm font-semibold text-emerald-700">{estado.mensaje}</p>}
      <button className="btn bg-cereza hover:bg-cereza/85" disabled={pendiente}>
        {pendiente ? "Anulando…" : `Anular factura y ${boletos} boletos`}
      </button>
    </form>
  );
}
