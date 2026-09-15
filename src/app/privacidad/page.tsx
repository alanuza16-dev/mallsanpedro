import type { Metadata } from "next";
import { connection } from "next/server";
import { Encabezado, Pie } from "@/components/Sitio";
import { getConfig } from "@/lib/data";
import { colones, fechaHora } from "@/lib/format";

export const metadata: Metadata = { title: "Reglamento y privacidad" };

// Texto base. Debe ser revisado por el área legal del mall antes del lanzamiento.
export default async function Privacidad() {
  await connection();
  const c = await getConfig();
  return (
    <>
      <Encabezado />
      <main className="mx-auto w-full max-w-3xl px-5 pb-20 pt-6">
        <h1 className="font-display text-4xl tracking-tight">Reglamento y aviso de privacidad</h1>
        <p className="mt-2 text-sm text-niebla">Sorteo de Fin de Año · Mall San Pedro</p>

        <div className="mt-10 space-y-8 leading-relaxed text-crema/80 [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-crema">
          <section>
            <h2>Mecánica</h2>
            <p>
              Participan las compras realizadas en las tiendas participantes de Mall San Pedro durante el período de la
              promoción{c.fecha_inicio_promo ? `, del ${fechaHora(c.fecha_inicio_promo)}` : ""}
              {c.fecha_fin_promo ? ` al ${fechaHora(c.fecha_fin_promo)}` : ""}. Por cada {colones(c.monto_por_bloque)}{" "}
              completos en una factura se otorga un boleto; en las tiendas identificadas como patrocinadoras (x2) se
              otorgan dos boletos por cada {colones(c.monto_por_bloque)}. Cada factura se puede registrar una sola vez
              por tienda, y una persona puede registrar tantas facturas como tenga.
            </p>
          </section>
          <section>
            <h2>Validez de las facturas</h2>
            <p>
              La persona participante es responsable de que los datos registrados coincidan con la factura
              fotografiada. Mall San Pedro puede anular en cualquier momento las participaciones cuya factura no
              corresponda con los datos declarados, en cuyo caso sus boletos dejan de participar. Al reclamar un premio
              se solicitará la factura original y un documento de identidad vigente.
            </p>
          </section>
          <section>
            <h2>Sorteo</h2>
            <p>
              El sorteo se realiza de forma electrónica entre todos los boletos válidos, con un generador de números
              aleatorios en el que cada boleto tiene la misma probabilidad. Los ganadores serán contactados al teléfono y
              correo registrados.
            </p>
          </section>
          <section>
            <h2>Tratamiento de datos personales (Ley 8968)</h2>
            <p>
              El responsable de la base de datos es Mall San Pedro. Los datos recopilados (nombre, cédula, correo,
              teléfono y la foto de la factura) se usan exclusivamente para administrar esta promoción: asignar y
              comunicar boletos, verificar facturas, realizar el sorteo y contactar a los ganadores. No se ceden a
              terceros, salvo a los proveedores tecnológicos necesarios para operar el sitio y enviar notificaciones.
            </p>
            <p className="mt-3">
              Los datos se conservarán hasta seis meses después del sorteo y luego serán eliminados. Puedes ejercer tus
              derechos de acceso, rectificación y supresión escribiendo al correo de contacto del mall. El consentimiento
              es libre, expreso e informado, y se registra con fecha y hora al enviar el formulario.
            </p>
          </section>
        </div>
      </main>
      <Pie />
    </>
  );
}
