"use client";

/** Botón de envío que pide confirmación antes de ejecutar la acción del formulario. */
export default function BotonConfirmar({
  mensaje,
  className,
  children,
  title,
}: {
  mensaje: string;
  className?: string;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      className={className}
      title={title}
      onClick={(e) => {
        if (!confirm(mensaje)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
