import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { logout } from "../actions";
import NavAdmin from "./NavAdmin";

export const metadata: Metadata = {
  title: { default: "Administración", template: "%s · Administración" },
  robots: { index: false, follow: false },
};

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="tema-claro flex min-h-dvh flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-noche text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/admin" className="font-display text-lg">
            Mall San Pedro <span className="text-oro">· Sorteo</span>
          </Link>
          <NavAdmin />
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden text-white/70 sm:inline">{admin.nombre}</span>
            <form action={logout}>
              <button className="rounded-md border border-white/25 px-3 py-1.5 font-semibold hover:bg-white/10">Salir</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
