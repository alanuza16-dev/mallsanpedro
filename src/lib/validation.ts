import { z } from "zod";

/** Deja solo dígitos. */
export const soloDigitos = (v: string) => v.replace(/\D/g, "");

// Cédula física (9 dígitos), jurídica (10) o DIMEX (11 a 12).
export const cedulaSchema = z
  .string()
  .transform(soloDigitos)
  .refine((v) => v.length >= 9 && v.length <= 12, "Ingresa una cédula válida (9 a 12 dígitos, sin guiones).");

// Teléfono de Costa Rica: 8 dígitos, se guarda con prefijo 506.
export const telefonoSchema = z
  .string()
  .transform(soloDigitos)
  .transform((v) => (v.length === 11 && v.startsWith("506") ? v.slice(3) : v))
  .refine((v) => /^[2-8]\d{7}$/.test(v), "Ingresa un teléfono de 8 dígitos.")
  .transform((v) => `506${v}`);

export const numeroFacturaSchema = z
  .string()
  .trim()
  .toUpperCase()
  .transform((v) => v.replace(/\s+/g, ""))
  .refine((v) => /^[A-Z0-9\-]{3,50}$/.test(v), "El número de factura debe tener entre 3 y 50 letras o números.");

export const participanteSchema = z.object({
  cedula: cedulaSchema,
  nombre: z.string().trim().min(5, "Escribe tu nombre completo.").max(120),
  email: z.string().trim().toLowerCase().email("Correo inválido."),
  telefono: telefonoSchema,
  prefiereWhatsapp: z.boolean(),
  aceptaTerminos: z.literal(true, { message: "Debes aceptar el tratamiento de datos para participar." }),
});

export const facturaSchema = z.object({
  tiendaId: z.coerce.number().int().positive("Selecciona una tienda."),
  numeroFactura: numeroFacturaSchema,
  monto: z.coerce
    .number({ message: "Ingresa el monto de la factura." })
    .positive("Ingresa el monto de la factura.")
    .max(100_000_000, "Monto fuera de rango."),
});

export const registroSchema = participanteSchema.merge(facturaSchema).extend({
  foto: z.object({
    pathname: z.string().startsWith("facturas/"),
    url: z.string().min(1),
    bytes: z.number().int().nonnegative().optional(),
    tipo: z.string().optional(),
  }),
  // Campo trampa: los humanos no lo ven, los bots lo llenan.
  sitio: z.string().max(0).optional(),
  // Tiempo en ms desde que se abrió el formulario.
  tiempoLlenado: z.number().optional(),
});

export type RegistroInput = z.input<typeof registroSchema>;

export function primerError(err: z.ZodError) {
  return err.issues[0]?.message ?? "Datos inválidos.";
}
