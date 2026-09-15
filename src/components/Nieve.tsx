"use client";

import { useEffect, useRef } from "react";

type Copo = { x: number; y: number; r: number; vy: number; fase: number; amp: number; alfa: number };

/**
 * Nieve minimalista en <canvas>: pocas partículas, se pausa cuando la pestaña no está visible
 * y queda estática si la persona pidió reducir movimiento.
 */
export default function Nieve({ densidad = 1 }: { densidad?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let copos: Copo[] = [];
    let raf = 0;
    let ultimo = performance.now();

    const nuevo = (y?: number): Copo => ({
      x: Math.random() * w,
      y: y ?? Math.random() * h,
      r: 0.6 + Math.random() * 2.2,
      vy: 12 + Math.random() * 28,
      fase: Math.random() * Math.PI * 2,
      amp: 6 + Math.random() * 18,
      alfa: 0.25 + Math.random() * 0.6,
    });

    const medir = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cantidad = Math.round(Math.min(110, (w * h) / 14000) * densidad);
      copos = Array.from({ length: cantidad }, () => nuevo());
    };

    const pintar = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const c of copos) {
        const x = c.x + Math.sin(t / 1600 + c.fase) * c.amp;
        ctx.beginPath();
        ctx.arc(x, c.y, c.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(247, 243, 234, ${c.alfa})`;
        ctx.fill();
      }
    };

    const cuadro = (t: number) => {
      const dt = Math.min(0.05, (t - ultimo) / 1000);
      ultimo = t;
      for (let i = 0; i < copos.length; i++) {
        const c = copos[i];
        c.y += c.vy * dt;
        if (c.y - c.r > h) copos[i] = nuevo(-4);
      }
      pintar(t);
      raf = requestAnimationFrame(cuadro);
    };

    const visibilidad = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reducir) {
        ultimo = performance.now();
        raf = requestAnimationFrame(cuadro);
      }
    };

    medir();
    if (reducir) pintar(0);
    else raf = requestAnimationFrame(cuadro);

    const ro = new ResizeObserver(() => {
      medir();
      if (reducir) pintar(0);
    });
    ro.observe(canvas);
    document.addEventListener("visibilitychange", visibilidad);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", visibilidad);
    };
  }, [densidad]);

  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
}
