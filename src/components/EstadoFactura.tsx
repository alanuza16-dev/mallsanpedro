export function Estado({ estado }: { estado: string }) {
  return estado === "aprobada" ? (
    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">Válida</span>
  ) : (
    <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 ring-1 ring-red-200">Anulada</span>
  );
}
