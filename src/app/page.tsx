import Link from "next/link";
import { connection } from "next/server";
import Calculadora from "@/components/Calculadora";
import Luces from "@/components/Luces";
import Nieve from "@/components/Nieve";
import { Encabezado, Pie } from "@/components/Sitio";
import { estadoPromo, getConfig, getTiendas } from "@/lib/data";
import { colones } from "@/lib/format";
import { canalesConfigurados } from "@/lib/notify";

export default async function Inicio() {
  await connection();
  const [config, tiendas] = await Promise.all([getConfig(), getTiendas()]);
  const promo = estadoPromo(config);
  const patrocinadoras = tiendas.filter((t) => t.patrocinadora);
  const participantes = tiendas.filter((t) => !t.patrocinadora);
  const bloque = colones(config.monto_por_bloque);
  const canales = canalesConfigurados();
  const aviso = canales.whatsapp ? " y te llegan por correo y WhatsApp." : canales.email ? " y te llegan por correo." : ".";

  return (
    <>
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,#1a3a5e_0%,transparent_70%)]" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-noche to-transparent" />
        <Nieve />
        <Luces className="absolute inset-x-0 top-0 z-10" />
        <Encabezado />

        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-10 sm:pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:pb-28">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-oro-suave">
              <span className="size-1.5 animate-titilar rounded-full bg-oro" />
              {promo.abierta ? "Promoción activa" : "Promoción cerrada"}
            </p>
            <h1 className="mt-6 font-display text-[2.6rem] font-medium leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              Tus compras de fin de año
              <span className="block italic text-oro">se convierten en boletos.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-crema/75">
              Por cada {bloque} en tu factura recibes un boleto para el gran sorteo. En las tiendas
              patrocinadoras, <strong className="text-oro-suave">recibes el doble</strong>.
            </p>
            {promo.abierta ? (
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/participar" className="boton text-lg">
                  Registrar mi factura
                  <span aria-hidden>→</span>
                </Link>
                <Link href="/mis-boletos" className="boton-sec">
                  Ver mis boletos
                </Link>
              </div>
            ) : (
              <p className="mt-9 max-w-md rounded-xl border border-white/15 bg-white/5 p-4 text-crema/85">{promo.motivo}</p>
            )}
          </div>

          <Boleto />
        </div>
      </section>

      <main className="relative z-10">
        <section className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
          <h2 className="font-display text-3xl tracking-tight sm:text-4xl">Así de simple</h2>
          <ol className="mt-10 grid gap-5 sm:grid-cols-3">
            {[
              ["Compra", "En cualquiera de las tiendas participantes del mall y pide tu factura."],
              ["Fotografía", "Registra tus datos, el número de factura y tómale una foto desde el celular."],
              ["Recibe", `Tus números de boleto aparecen al instante${aviso}`],
            ].map(([titulo, texto], i) => (
              <li key={titulo} className="tarjeta relative p-6">
                <span className="font-display text-5xl text-oro/30">0{i + 1}</span>
                <h3 className="mt-2 text-xl font-bold">{titulo}</h3>
                <p className="mt-2 leading-relaxed text-crema/70">{texto}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-y border-white/10 bg-noche-2/40">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 sm:py-24 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl tracking-tight sm:text-4xl">¿Cuántos boletos me tocan?</h2>
              <p className="mt-4 max-w-md leading-relaxed text-crema/70">
                Cada factura suma por separado y puedes registrar todas las que quieras. Una misma factura solo se
                puede registrar una vez.
              </p>
            </div>
            <Calculadora montoPorBloque={config.monto_por_bloque} />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16 sm:py-24" id="tiendas">
          <h2 className="font-display text-3xl tracking-tight sm:text-4xl">Tiendas participantes</h2>

          <div className="mt-10">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-oro px-2.5 py-0.5 text-sm font-extrabold text-noche">x2</span>
              <h3 className="text-lg font-bold">Patrocinadoras: doble boleto</h3>
            </div>
            <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {patrocinadoras.map((t) => (
                <li
                  key={t.id}
                  className="group relative overflow-hidden rounded-2xl border border-oro/40 bg-gradient-to-b from-oro/15 to-transparent p-5"
                >
                  <span className="absolute right-3 top-3 text-xs font-extrabold text-oro">x2</span>
                  <p className="font-display text-xl leading-tight">{t.nombre}</p>
                  <p className="mt-1 text-sm text-oro-suave/70">{t.categoria}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-12">
            <h3 className="text-lg font-bold">Participantes</h3>
            <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {participantes.map((t) => (
                <li key={t.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <p className="font-display text-xl leading-tight">{t.nombre}</p>
                  <p className="mt-1 text-sm text-niebla">{t.categoria}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {promo.abierta && (
          <section className="relative overflow-hidden border-t border-white/10">
            <Nieve densidad={0.5} />
            <div className="relative mx-auto flex max-w-6xl flex-col items-center px-5 py-20 text-center">
              <h2 className="font-display text-3xl tracking-tight sm:text-5xl">¿Ya tienes tu factura?</h2>
              <p className="mt-4 text-crema/70">Te toma menos de un minuto.</p>
              <Link href="/participar" className="boton mt-8 text-lg">
                Registrar mi factura
              </Link>
            </div>
          </section>
        )}
      </main>
      <Pie />
    </>
  );
}

function Boleto() {
  return (
    <div className="relative mx-auto w-full max-w-sm animate-flotar lg:mx-0 lg:justify-self-end" aria-hidden>
      <div className="absolute -inset-10 rounded-full bg-oro/10 blur-3xl" />
      <div className="relative rotate-[-4deg] overflow-hidden rounded-3xl bg-crema text-noche shadow-2xl">
        <div className="flex items-center justify-between bg-noche px-6 py-4 text-crema">
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-oro">Boleto</span>
          <span className="font-mono text-sm text-crema/70">2026</span>
        </div>
        <div className="px-6 pb-6 pt-5">
          <p className="text-xs uppercase tracking-widest text-slate-500">Número</p>
          <p className="font-mono text-4xl font-bold tracking-tight">MSP-000124</p>
          <div className="my-5 border-t-2 border-dashed border-slate-300" />
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500">Sorteo</p>
              <p className="font-display text-xl">Fin de año</p>
            </div>
            <span className="rounded-full bg-oro px-3 py-1 text-sm font-extrabold">x2</span>
          </div>
        </div>
        <span className="absolute -left-3 top-[58%] size-6 rounded-full bg-noche" />
        <span className="absolute -right-3 top-[58%] size-6 rounded-full bg-noche" />
      </div>
    </div>
  );
}
