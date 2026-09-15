import "server-only";
import { del, get, head } from "@vercel/blob";
import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { join, normalize } from "node:path";

/**
 * Almacenamiento de fotos de facturas.
 * - Con BLOB_READ_WRITE_TOKEN (Vercel): Vercel Blob en modo privado.
 * - Sin token (solo desarrollo local): carpeta .uploads/ del proyecto.
 */

export function blobEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

const LOCAL_DIR = join(process.cwd(), ".uploads");

function localPath(pathname: string) {
  const clean = normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, "");
  if (!clean.startsWith("facturas/")) throw new Error("Ruta de archivo inválida");
  return join(LOCAL_DIR, clean);
}

export async function saveLocal(pathname: string, data: ArrayBuffer) {
  if (process.env.VERCEL) throw new Error("Configura Vercel Blob (BLOB_READ_WRITE_TOKEN) en producción.");
  const path = localPath(pathname);
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, Buffer.from(data));
}

export async function fotoExiste(pathname: string) {
  try {
    if (blobEnabled()) {
      await head(pathname);
      return true;
    }
    await stat(localPath(pathname));
    return true;
  } catch {
    return false;
  }
}

export async function borrarFoto(pathname: string) {
  try {
    if (blobEnabled()) await del(pathname);
    else await unlink(localPath(pathname));
  } catch (e) {
    console.error("No se pudo borrar la foto", pathname, e);
  }
}

export async function leerFoto(pathname: string): Promise<{ body: BodyInit; contentType: string } | null> {
  if (blobEnabled()) {
    const res = await get(pathname, { access: "private" });
    if (!res || res.statusCode !== 200 || !res.stream) return null;
    return { body: res.stream, contentType: res.blob.contentType ?? "image/jpeg" };
  }
  try {
    const data = await readFile(localPath(pathname));
    return { body: new Uint8Array(data), contentType: "image/jpeg" };
  } catch {
    return null;
  }
}
