const crc = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  maximumFractionDigits: 0,
});

export function colones(n: number | string) {
  return crc.format(Number(n));
}

const fecha = new Intl.DateTimeFormat("es-CR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Costa_Rica",
});

export function fechaHora(d: Date | string | null | undefined) {
  if (!d) return "";
  return fecha.format(new Date(d));
}

/** Enmascara una cédula para mostrarla en pantallas públicas: 1-2345-6789 -> •••••6789 */
export function mascaraCedula(cedula: string) {
  return cedula.length <= 4 ? cedula : `•••••${cedula.slice(-4)}`;
}

/** Calcula los boletos de una factura: bloques completos del monto por los boletos que da la tienda. */
export function calcularBoletos(monto: number, montoPorBloque: number, boletosPorBloque: number) {
  if (!(monto > 0) || !(montoPorBloque > 0)) return 0;
  return Math.floor(monto / montoPorBloque) * boletosPorBloque;
}
