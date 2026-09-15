"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Facturas" },
  { href: "/admin/tiendas", label: "Tiendas" },
  { href: "/admin/sorteo", label: "Sorteo" },
  { href: "/admin/ajustes", label: "Ajustes" },
];

export default function NavAdmin() {
  const path = usePathname();
  return (
    <nav className="order-last flex w-full gap-1 overflow-x-auto text-sm sm:order-none sm:w-auto">
      {LINKS.map((l) => {
        const activo = l.href === "/admin" ? path === "/admin" || path.startsWith("/admin/facturas") : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-md px-3 py-1.5 font-semibold transition ${activo ? "bg-white/15 text-oro" : "text-white/75 hover:text-white"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
