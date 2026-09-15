/** Guirnalda de luces tenues que titilan con desfase. Solo CSS. */
const COLORES = ["bg-oro", "bg-crema", "bg-oro-suave", "bg-cereza/80", "bg-pino"];

export default function Luces({ cantidad = 28, className = "" }: { cantidad?: number; className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none relative h-10 w-full overflow-hidden ${className}`}>
      <svg className="absolute inset-x-0 top-0 h-10 w-full" preserveAspectRatio="none" viewBox="0 0 100 10">
        <path d="M0 2 Q 12.5 9 25 3 T 50 3 T 75 3 T 100 2" fill="none" stroke="rgba(247,243,234,0.18)" strokeWidth="0.25" />
      </svg>
      <div className="absolute inset-x-0 top-0 flex h-10 justify-between px-[1%]">
        {Array.from({ length: cantidad }, (_, i) => {
          // Aproxima la curva del cable para que cada foco cuelgue de ella.
          const x = i / (cantidad - 1);
          const y = 2 + Math.abs(Math.sin(x * Math.PI * 4)) * 5;
          return (
            <span
              key={i}
              className={`block size-1.5 rounded-full ${COLORES[i % COLORES.length]} animate-titilar shadow-[0_0_10px_2px_currentColor]`}
              style={{ marginTop: `${y * 3.2}px`, animationDelay: `${(i * 0.37) % 3.2}s`, color: "rgba(217,180,74,0.45)" }}
            />
          );
        })}
      </div>
    </div>
  );
}
