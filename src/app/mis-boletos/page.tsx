import type { Metadata } from "next";
import Nieve from "@/components/Nieve";
import { Encabezado, Pie } from "@/components/Sitio";
import Consulta from "./Consulta";

export const metadata: Metadata = { title: "Mis boletos" };

export default function MisBoletos() {
  return (
    <>
      <div className="relative isolate flex-1 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,#1a3a5e_0%,transparent_70%)]" />
        <Nieve densidad={0.4} />
        <Encabezado />
        <main className="relative z-10 mx-auto w-full max-w-xl px-5 pb-20 pt-6">
          <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Mis boletos</h1>
          <p className="mt-3 text-crema/70">Escribe la cédula y el correo con los que registraste tus facturas.</p>
          <Consulta />
        </main>
      </div>
      <Pie />
    </>
  );
}
