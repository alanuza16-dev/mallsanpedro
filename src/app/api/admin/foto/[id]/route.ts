import { getAdmin } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { leerFoto } from "@/lib/storage";

/** Sirve la foto privada de una factura, solo a administradores con sesión. */
export async function GET(_req: Request, ctx: RouteContext<"/api/admin/foto/[id]">) {
  const admin = await getAdmin();
  if (!admin) return new Response("No autorizado", { status: 401 });
  const { id } = await ctx.params;
  if (!/^\d+$/.test(id)) return new Response("No encontrado", { status: 404 });
  const f = await queryOne<{ foto_blob_pathname: string }>(
    "SELECT foto_blob_pathname FROM facturas WHERE id = $1",
    [Number(id)],
  );
  if (!f) return new Response("No encontrado", { status: 404 });
  const foto = await leerFoto(f.foto_blob_pathname);
  if (!foto) return new Response("Foto no disponible", { status: 404 });
  return new Response(foto.body, {
    headers: {
      "Content-Type": foto.contentType,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
