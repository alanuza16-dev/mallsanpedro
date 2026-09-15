import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import Luces from "@/components/Luces";
import Nieve from "@/components/Nieve";
import { Encabezado, Pie } from "@/components/Sitio";
import { estadoPromo, getConfig, getTiendas } from "@/lib/data";
import { canalesConfigurados } from "@/lib/notify";
import { blobEnabled } from "@/lib/storage";
import Formulario from "./Formulario";

export const metadata: Metadata = { title: "Registrar factura" };

export default async function Participar() {
  await connection();
  const [config, tiendas] = await Promise.all([getConfig(), getTiendas()]);
  const promo = estadoPromo(config);

  return (
    <>
      <div className="relative isolate flex-1 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,#1a3a5e_0%,transparent_70%)]" />
        <Nieve densidad={0.45} />
        <Luces className="absolute inset-x-0 top-0 z-10" cantidad={20} />
        <Encabezado />
        <main className="relative z-10 mx-auto w-full max-w-xl px-5 pb-20 pt-6">
          {promo.abierta ? (
            <Formulario
              tiendas={tiendas.map((t) => ({
                id: t.id,
                nombre: t.nombre,
                categoria: t.categoria,
                patrocinadora: t.patrocinadora,
                boletosPorBloque: t.boletos_por_bloque,
              }))}
              montoPorBloque={config.monto_por_bloque}
              blob={blobEnabled()}
              whatsapp={canalesConfigurados().whatsapp}
              correo={canalesConfigurados().email}
            />
          ) : (
            <div className="tarjeta p-8 text-center">
              <h1 className="font-display text-3xl">Registro cerrado</h1>
              <p className="mt-3 text-crema/75">{promo.motivo}</p>
              <Link href="/mis-boletos" className="boton mt-6">
                Consultar mis boletos
              </Link>
            </div>
          )}
        </main>
      </div>
      <Pie />
    </>
  );
}
