import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { blobEnabled, saveLocal } from "@/lib/storage";

const MAX = 10 * 1024 * 1024;
const TIPOS = ["image/jpeg", "image/png", "image/webp"];

/** Solo para desarrollo local sin Vercel Blob: guarda la foto en .uploads/. */
export async function POST(request: Request) {
  if (blobEnabled() || process.env.VERCEL) {
    return NextResponse.json(
      { error: "Almacenamiento de fotos no configurado: falta BLOB_READ_WRITE_TOKEN en Vercel" },
      { status: 503 },
    );
  }
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  if (!TIPOS.includes(file.type)) return NextResponse.json({ error: "Formato no permitido" }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: "Archivo muy grande" }, { status: 400 });
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const pathname = `facturas/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${ext}`;
  await saveLocal(pathname, await file.arrayBuffer());
  return NextResponse.json({ pathname, url: `local:${pathname}` });
}
