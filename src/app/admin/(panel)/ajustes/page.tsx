import { connection } from "next/server";
import { query } from "@/lib/db";
import { estadoPromo, getConfig } from "@/lib/data";
import { canalesConfigurados } from "@/lib/notify";
import { blobEnabled } from "@/lib/storage";
import { AdminForm, ConfigForm, PasswordForm } from "./Formularios";

export const metadata = { title: "Ajustes" };

const fechaInput = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-CA", { timeZone: "America/Costa_Rica" }) : "";

export default async function Ajustes() {
  await connection();
  const [config, admins] = await Promise.all([
    getConfig(),
    query<{ id: number; nombre: string; email: string }>("SELECT id, nombre, email FROM admins ORDER BY id"),
  ]);
  const canales = canalesConfigurados();
  const promo = estadoPromo(config);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="panel p-5 lg:col-span-2">
        <h1 className="font-display text-2xl">Promoción</h1>
        <p className={`mt-1 text-sm font-semibold ${promo.abierta ? "text-emerald-700" : "text-red-700"}`}>
          {promo.abierta ? "Recibiendo facturas ahora." : promo.motivo}
        </p>
        <ConfigForm
          monto={config.monto_por_bloque}
          inicio={fechaInput(config.fecha_inicio_promo)}
          fin={fechaInput(config.fecha_fin_promo)}
          activa={config.activa}
        />
      </section>

      <section className="panel p-5">
        <h2 className="font-display text-xl">Integraciones</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <Integracion nombre="Vercel Blob (fotos)" ok={blobEnabled()} ayuda="BLOB_READ_WRITE_TOKEN" />
          <Integracion nombre="Correo (Resend)" ok={canales.email} ayuda="RESEND_API_KEY y EMAIL_FROM" />
          <Integracion
            nombre="WhatsApp (Meta Cloud API)"
            ok={canales.whatsapp}
            ayuda="WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID y WHATSAPP_TEMPLATE_BOLETOS"
          />
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          Las integraciones se activan con variables de entorno en Vercel. Mientras no estén, el sistema funciona igual y
          registra los avisos como omitidos.
        </p>
      </section>

      <section className="panel p-5">
        <h2 className="font-display text-xl">Mi contraseña</h2>
        <PasswordForm />
      </section>

      <section className="panel p-5 lg:col-span-2">
        <h2 className="font-display text-xl">Administradores</h2>
        <ul className="mt-3 divide-y divide-slate-100 text-sm">
          {admins.map((a) => (
            <li key={a.id} className="flex justify-between py-2">
              <span className="font-semibold">{a.nombre}</span>
              <span className="text-slate-500">{a.email}</span>
            </li>
          ))}
        </ul>
        <h3 className="mt-5 text-sm font-bold uppercase tracking-wider text-slate-500">Agregar administrador</h3>
        <AdminForm />
      </section>
    </div>
  );
}

function Integracion({ nombre, ok, ayuda }: { nombre: string; ok: boolean; ayuda: string }) {
  return (
    <li className="flex items-start justify-between gap-3">
      <span>
        <span className="font-semibold">{nombre}</span>
        {!ok && <span className="block text-xs text-slate-500">Falta: {ayuda}</span>}
      </span>
      <span
        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${ok ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
      >
        {ok ? "Activo" : "Sin configurar"}
      </span>
    </li>
  );
}
