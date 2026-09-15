import Link from "next/link";
import { Encabezado, Pie } from "@/components/Sitio";

export default function NoEncontrado() {
  return (
    <>
      <Encabezado />
      <main className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center px-5 py-24 text-center">
        <p className="font-display text-7xl text-oro">404</p>
        <h1 className="mt-4 font-display text-3xl">Esta página no existe</h1>
        <Link href="/" className="boton mt-8">
          Volver al inicio
        </Link>
      </main>
      <Pie />
    </>
  );
}
