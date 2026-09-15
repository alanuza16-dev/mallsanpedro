import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Nieve from "@/components/Nieve";
import { Marca } from "@/components/Sitio";
import { getAdmin } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Ingreso administración", robots: { index: false } };

export default async function Login() {
  if (await getAdmin()) redirect("/admin");
  return (
    <main className="relative isolate flex flex-1 items-center justify-center overflow-hidden px-5 py-16">
      <Nieve densidad={0.5} />
      <div className="tarjeta relative w-full max-w-sm p-7">
        <Marca />
        <h1 className="mt-6 font-display text-2xl">Panel de administración</h1>
        <LoginForm />
      </div>
    </main>
  );
}
