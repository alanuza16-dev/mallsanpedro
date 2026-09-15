"use client";

import imageCompression from "browser-image-compression";
import { upload } from "@vercel/blob/client";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { registrarFactura, verificarFactura } from "@/app/actions";

type Tienda = { id: number; nombre: string; categoria: string; patrocinadora: boolean; boletosPorBloque: number };

type Props = { tiendas: Tienda[]; montoPorBloque: number; blob: boolean; whatsapp: boolean; correo: boolean };

const PASOS = ["Tus datos", "Factura", "Foto"];
const num = new Intl.NumberFormat("es-CR");
const digitos = (v: string) => v.replace(/\D/g, "");

export default function Formulario({ tiendas, montoPorBloque, blob, whatsapp, correo }: Props) {
  const [paso, setPaso] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState<string | null>(null);
  const [progreso, setProgreso] = useState(0);
  const inicio = useRef(0);

  useEffect(() => {
    inicio.current = Date.now();
  }, []);

  // Paso 1
  const [nombre, setNombre] = useState("");
  const [cedula, setCedula] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [prefiereWhatsapp, setPrefiereWhatsapp] = useState(true);
  const [acepta, setAcepta] = useState(false);
  const [sitio, setSitio] = useState("");

  // Paso 2
  const [tiendaId, setTiendaId] = useState<number | null>(null);
  const [numeroFactura, setNumeroFactura] = useState("");
  const [monto, setMonto] = useState("");

  // Paso 3
  const [foto, setFoto] = useState<File | null>(null);
  const preview = useMemo(() => (foto ? URL.createObjectURL(foto) : null), [foto]);

  // Resultado
  const [resultado, setResultado] = useState<{ boletos: string[]; tienda: string; monto: string; nombre: string } | null>(
    null,
  );

  const tienda = tiendas.find((t) => t.id === tiendaId) ?? null;
  const montoNum = Number(digitos(monto)) || 0;
  const boletos = tienda ? Math.floor(montoNum / montoPorBloque) * tienda.boletosPorBloque : 0;

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const ordenadas = useMemo(
    () => [...tiendas].sort((a, b) => Number(b.patrocinadora) - Number(a.patrocinadora) || a.nombre.localeCompare(b.nombre)),
    [tiendas],
  );

  function validarDatos() {
    if (nombre.trim().split(/\s+/).length < 2) return "Escribe tu nombre y al menos un apellido.";
    const c = digitos(cedula);
    if (c.length < 9 || c.length > 12) return "Ingresa tu cédula (9 a 12 dígitos, sin guiones).";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return "Revisa tu correo electrónico.";
    if (!/^[2-8]\d{7}$/.test(digitos(telefono))) return "Ingresa tu teléfono de 8 dígitos.";
    if (!acepta) return "Debes aceptar el tratamiento de datos y el reglamento para participar.";
    return null;
  }

  async function continuarFactura() {
    if (!tienda) return setError("Selecciona la tienda donde compraste.");
    if (numeroFactura.trim().length < 3) return setError("Escribe el número de la factura.");
    if (boletos < 1) return setError(`El monto mínimo por factura es ₡${num.format(montoPorBloque)}.`);
    setCargando("Verificando factura…");
    try {
      const r = await verificarFactura(tienda.id, numeroFactura);
      if (!r.ok) return setError(r.error);
      setError(null);
      setPaso(2);
    } catch {
      setError("No pudimos verificar la factura. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setCargando(null);
    }
  }

  async function elegirFoto(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("El archivo debe ser una imagen.");
    setCargando("Preparando foto…");
    try {
      const comprimida = await imageCompression(file, {
        maxSizeMB: 0.7,
        maxWidthOrHeight: 1800,
        fileType: "image/jpeg",
        initialQuality: 0.82,
        useWebWorker: true,
      });
      setFoto(new File([comprimida], "factura.jpg", { type: "image/jpeg" }));
    } catch {
      setError("No pudimos leer esa imagen. Intenta tomar la foto de nuevo.");
    } finally {
      setCargando(null);
    }
  }

  async function subirFoto(file: File) {
    const ruta = `facturas/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.jpg`;
    if (blob) {
      const r = await upload(ruta, file, {
        access: "private",
        handleUploadUrl: "/api/upload",
        contentType: "image/jpeg",
        onUploadProgress: (p) => setProgreso(p.percentage),
      });
      return { pathname: r.pathname, url: r.url };
    }
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload-local", { method: "POST", body: fd });
    if (!res.ok) {
      const cuerpo = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(cuerpo?.error ?? `Error ${res.status} al subir (almacenamiento no configurado)`);
    }
    setProgreso(100);
    return (await res.json()) as { pathname: string; url: string };
  }

  async function enviar() {
    if (!foto || !tienda) return setError("Toma o sube la foto de tu factura.");
    setError(null);
    setProgreso(0);
    try {
      setCargando("Subiendo foto…");
      let subida: { pathname: string; url: string };
      try {
        subida = await subirFoto(foto);
      } catch (e) {
        console.error("Error al subir la foto", e);
        const detalle = e instanceof Error ? e.message : String(e);
        setError(`No pudimos subir la foto. Intenta de nuevo en unos minutos. (Detalle: ${detalle.slice(0, 140)})`);
        return;
      }
      setCargando("Registrando tus boletos…");
      const r = await registrarFactura({
        nombre,
        cedula,
        email,
        telefono,
        prefiereWhatsapp: whatsapp ? prefiereWhatsapp : false,
        aceptaTerminos: acepta as true,
        tiendaId: tienda.id,
        numeroFactura,
        monto: montoNum,
        foto: { ...subida, bytes: foto.size, tipo: foto.type },
        sitio,
        tiempoLlenado: Date.now() - inicio.current,
      });
      if (!r.ok) {
        setError(r.error);
        if (r.duplicada) {
          setFoto(null);
          setPaso(1);
        }
        return;
      }
      setResultado(r);
      setPaso(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      console.error("Error al registrar la factura", e);
      setError("Hubo un problema con la conexión. Intenta de nuevo.");
    } finally {
      setCargando(null);
    }
  }

  function otraFactura() {
    setTiendaId(null);
    setNumeroFactura("");
    setMonto("");
    setFoto(null);
    setResultado(null);
    setError(null);
    setPaso(1);
  }

  return (
    <div>
      {paso < 3 && (
        <>
          <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Registra tu factura</h1>
          <ol className="mt-6 grid grid-cols-3 gap-2" aria-label="Progreso">
            {PASOS.map((p, i) => (
              <li key={p}>
                <div className={`h-1 rounded-full transition-colors ${i <= paso ? "bg-oro" : "bg-white/15"}`} />
                <p className={`mt-2 text-xs font-semibold ${i === paso ? "text-oro" : "text-niebla"}`}>
                  {i + 1}. {p}
                </p>
              </li>
            ))}
          </ol>
        </>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={paso}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className={paso < 3 ? "tarjeta mt-6 p-5 sm:p-7" : ""}
        >
          {paso === 0 && (
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                const err = validarDatos();
                setError(err);
                if (!err) setPaso(1);
              }}
              className="space-y-5"
            >
              <div>
                <label className="etiqueta" htmlFor="nombre">
                  Nombre completo
                </label>
                <input id="nombre" className="campo" autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="María Fernández Rojas" />
              </div>
              <div>
                <label className="etiqueta" htmlFor="cedula">
                  Cédula
                </label>
                <input id="cedula" className="campo" inputMode="numeric" value={cedula} onChange={(e) => setCedula(e.target.value)} placeholder="1 2345 6789" />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="etiqueta" htmlFor="email">
                    Correo
                  </label>
                  <input id="email" type="email" className="campo" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="maria@correo.com" />
                </div>
                <div>
                  <label className="etiqueta" htmlFor="telefono">
                    Teléfono
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-niebla">+506</span>
                    <input id="telefono" type="tel" className="campo pl-16" autoComplete="tel-national" inputMode="numeric" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="8888 8888" />
                  </div>
                </div>
              </div>

              {/* Campo trampa para bots, invisible para personas */}
              <div className="absolute -left-[9999px]" aria-hidden>
                <label htmlFor="sitio">Sitio web</label>
                <input id="sitio" tabIndex={-1} autoComplete="off" value={sitio} onChange={(e) => setSitio(e.target.value)} />
              </div>

              {whatsapp && (
                <Check checked={prefiereWhatsapp} onChange={setPrefiereWhatsapp}>
                  Quiero recibir mis números de boleto también por WhatsApp.
                </Check>
              )}
              <Check checked={acepta} onChange={setAcepta}>
                Autorizo a Mall San Pedro a tratar mis datos personales para este sorteo, conforme a la Ley 8968, y
                acepto el{" "}
                <Link href="/privacidad" target="_blank" className="font-semibold text-oro underline underline-offset-2">
                  reglamento y aviso de privacidad
                </Link>
                .
              </Check>

              <AvisoError texto={error} />
              <button className="boton w-full">Continuar</button>
            </form>
          )}

          {paso === 1 && (
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                continuarFactura();
              }}
              className="space-y-6"
            >
              <div>
                <label className="etiqueta" htmlFor="tienda">
                  ¿Dónde compraste?
                </label>
                <div className="relative">
                  <select
                    id="tienda"
                    className="campo appearance-none pr-12"
                    value={tiendaId ?? ""}
                    onChange={(e) => setTiendaId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="" disabled className="bg-noche text-niebla">
                      Selecciona la tienda
                    </option>
                    <optgroup label="Patrocinadoras: doble boleto (x2)" className="bg-noche text-oro">
                      {ordenadas
                        .filter((t) => t.patrocinadora)
                        .map((t) => (
                          <option key={t.id} value={t.id} className="bg-noche text-crema">
                            {t.nombre} (x2)
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Participantes" className="bg-noche text-niebla">
                      {ordenadas
                        .filter((t) => !t.patrocinadora)
                        .map((t) => (
                          <option key={t.id} value={t.id} className="bg-noche text-crema">
                            {t.nombre}
                          </option>
                        ))}
                    </optgroup>
                  </select>
                  <svg
                    viewBox="0 0 20 20"
                    className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-oro"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" />
                  </svg>
                </div>
                {tienda && (
                  <p className="mt-2 flex items-center gap-2 text-sm text-niebla">
                    {tienda.patrocinadora && (
                      <span className="rounded-full bg-oro px-2 text-xs font-extrabold text-noche">x2</span>
                    )}
                    {tienda.categoria}
                  </p>
                )}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="etiqueta" htmlFor="numero">
                    Número de factura
                  </label>
                  <input id="numero" className="campo font-mono uppercase" autoComplete="off" value={numeroFactura} onChange={(e) => setNumeroFactura(e.target.value)} placeholder="00100001010000012345" />
                </div>
                <div>
                  <label className="etiqueta" htmlFor="monto">
                    Monto total
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-niebla">₡</span>
                    <input
                      id="monto"
                      className="campo pl-9"
                      inputMode="numeric"
                      value={monto ? num.format(montoNum) : ""}
                      onChange={(e) => setMonto(digitos(e.target.value).slice(0, 9))}
                      placeholder="25 000"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="text-sm text-niebla">
                  {tienda ? (tienda.patrocinadora ? "Tienda patrocinadora: doble boleto" : "Tienda participante") : "Selecciona una tienda"}
                </span>
                <span className="font-display text-2xl">
                  <motion.span key={boletos} initial={{ scale: 1.3, color: "#d9b44a" }} animate={{ scale: 1, color: "#f7f3ea" }} className="inline-block">
                    {boletos}
                  </motion.span>{" "}
                  <span className="text-base text-niebla">boleto{boletos === 1 ? "" : "s"}</span>
                </span>
              </div>

              <AvisoError texto={error} />
              <div className="flex gap-3">
                <button type="button" onClick={() => (setError(null), setPaso(0))} className="boton-sec">
                  Atrás
                </button>
                <button className="boton flex-1" disabled={!!cargando}>
                  {cargando ?? "Continuar"}
                </button>
              </div>
            </form>
          )}

          {paso === 2 && (
            <div className="space-y-5">
              <div>
                <p className="etiqueta">Foto de la factura</p>
                <p className="text-sm text-niebla">Que se lean bien el número, la fecha y el total.</p>
              </div>

              <label
                className={`relative flex min-h-56 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition ${
                  preview ? "border-oro/60" : "border-white/20 hover:border-oro/60"
                }`}
              >
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="Vista previa de la factura" className="max-h-80 w-full object-contain" />
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" className="size-12 text-oro" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                      <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.8l1.2-1.8A1.5 1.5 0 0 1 9.8 3.5h4.4a1.5 1.5 0 0 1 1.3.7L16.7 6h1.8A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" />
                      <circle cx="12" cy="12.5" r="3.5" />
                    </svg>
                    <span className="mt-3 text-lg font-bold">Tomar foto</span>
                    <span className="text-sm text-niebla">o elegir de la galería</span>
                  </>
                )}
                <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => elegirFoto(e.target.files?.[0])} />
              </label>
              {preview && <p className="text-center text-sm text-niebla">Toca la imagen para cambiarla.</p>}

              <dl className="grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
                <div>
                  <dt className="text-niebla">Tienda</dt>
                  <dd className="font-semibold">{tienda?.nombre}</dd>
                </div>
                <div>
                  <dt className="text-niebla">Factura</dt>
                  <dd className="break-all font-mono font-semibold">{numeroFactura.toUpperCase()}</dd>
                </div>
                <div className="text-right">
                  <dt className="text-niebla">Boletos</dt>
                  <dd className="font-display text-xl text-oro">{boletos}</dd>
                </div>
              </dl>

              {cargando && progreso > 0 && progreso < 100 && (
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-oro transition-all" style={{ width: `${progreso}%` }} />
                </div>
              )}
              <AvisoError texto={error} />
              <div className="flex gap-3">
                <button type="button" onClick={() => (setError(null), setPaso(1))} className="boton-sec" disabled={!!cargando}>
                  Atrás
                </button>
                <button type="button" onClick={enviar} className="boton flex-1" disabled={!foto || !!cargando}>
                  {cargando ?? "Registrar factura"}
                </button>
              </div>
            </div>
          )}

          {paso === 3 && resultado && <Exito resultado={resultado} email={correo ? email : null} whatsapp={whatsapp && prefiereWhatsapp} onOtra={otraFactura} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer gap-3 text-sm leading-relaxed text-crema/80">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[#d9b44a]" />
      <span>{children}</span>
    </label>
  );
}

function AvisoError({ texto }: { texto: string | null }) {
  if (!texto) return null;
  return (
    <p role="alert" className="rounded-xl border border-cereza/50 bg-cereza/15 px-4 py-3 text-sm font-medium text-[#ffd9d5]">
      {texto}
    </p>
  );
}

function Exito({
  resultado,
  email,
  whatsapp,
  onOtra,
}: {
  resultado: { boletos: string[]; tienda: string; monto: string; nombre: string };
  email: string | null;
  whatsapp: boolean;
  onOtra: () => void;
}) {
  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 14 }}
        className="mx-auto flex size-20 items-center justify-center rounded-full bg-oro text-noche"
      >
        <svg viewBox="0 0 24 24" className="size-10" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.25, duration: 0.4 }} />
        </svg>
      </motion.div>
      <h1 className="mt-6 font-display text-4xl tracking-tight">¡Listo, {resultado.nombre}!</h1>
      <p className="mt-2 text-crema/75">
        Tu factura de {resultado.tienda} por {resultado.monto} te dio{" "}
        <strong className="text-oro">
          {resultado.boletos.length} boleto{resultado.boletos.length === 1 ? "" : "s"}
        </strong>
        .
      </p>

      <ul className="mt-8 grid grid-cols-2 gap-3">
        {resultado.boletos.map((b, i) => (
          <motion.li
            key={b}
            initial={{ opacity: 0, y: 16, rotate: -3 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ delay: 0.35 + i * 0.08 }}
            className="relative overflow-hidden rounded-2xl bg-crema px-3 py-4 text-noche"
          >
            <span className="block text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">Boleto</span>
            <span className="font-mono text-lg font-bold sm:text-xl">{b}</span>
            <span className="absolute -left-2 top-1/2 size-4 -translate-y-1/2 rounded-full bg-noche" />
            <span className="absolute -right-2 top-1/2 size-4 -translate-y-1/2 rounded-full bg-noche" />
          </motion.li>
        ))}
      </ul>

      <p className="mt-6 text-sm text-niebla">
        Guarda estos números.{" "}
        {email || whatsapp
          ? `También te los enviamos ${[email && `a ${email}`, whatsapp && "por WhatsApp"].filter(Boolean).join(" y ")}. Si no llegan, puedes consultarlos en `
          : "Puedes consultarlos cuando quieras en "}
        <Link href="/mis-boletos" className="text-oro underline underline-offset-2">
          Mis boletos
        </Link>
        .
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button onClick={onOtra} className="boton">
          Registrar otra factura
        </button>
        <Link href="/" className="boton-sec">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
