import Link from "next/link";

export function Marca({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`group flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 32 32" className="size-8 text-oro transition group-hover:rotate-12" aria-hidden>
        <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none">
          <path d="M16 3v26M4.7 9.5l22.6 13M4.7 22.5l22.6-13" />
          <path d="M16 7l-2.5-2.5M16 7l2.5-2.5M16 25l-2.5 2.5M16 25l2.5 2.5" />
        </g>
        <circle cx="16" cy="16" r="2.2" fill="currentColor" />
      </svg>
      <span className="leading-none">
        <span className="block font-display text-lg font-semibold tracking-tight">Mall San Pedro</span>
        <span className="block text-[11px] uppercase tracking-[0.22em] text-niebla">Sorteo de fin de año</span>
      </span>
    </Link>
  );
}

export function Encabezado() {
  return (
    <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
      <Marca />
      <nav className="flex items-center gap-1 text-sm font-semibold sm:gap-3">
        <Link href="/mis-boletos" className="rounded-full px-3 py-2 text-crema/80 transition hover:text-oro">
          Mis boletos
        </Link>
        <Link href="/participar" className="hidden rounded-full border border-oro/60 px-4 py-2 text-oro transition hover:bg-oro hover:text-noche sm:inline-flex">
          Participar
        </Link>
      </nav>
    </header>
  );
}

export function Pie() {
  return (
    <footer className="relative z-10 mt-auto border-t border-white/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-niebla sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Mall San Pedro · San Pedro de Montes de Oca, San José</p>
        <div className="flex gap-5">
          <Link href="/privacidad" className="hover:text-oro">
            Privacidad y reglamento
          </Link>
          <Link href="/mis-boletos" className="hover:text-oro">
            Consultar boletos
          </Link>
        </div>
      </div>
    </footer>
  );
}
