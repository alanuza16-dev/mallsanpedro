import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

const MAX_FOTO_BYTES = 10 * 1024 * 1024;

/**
 * Emite tokens de subida directa del navegador a Vercel Blob (almacenamiento privado).
 * El archivo nunca pasa por esta función, así no aplica el límite de tamaño de las funciones.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith("facturas/") || pathname.includes("..")) {
          throw new Error("Ruta inválida");
        }
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          maximumSizeInBytes: MAX_FOTO_BYTES,
          addRandomSuffix: true,
          validUntil: Date.now() + 10 * 60 * 1000,
        };
      },
    });
    return NextResponse.json(json);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
