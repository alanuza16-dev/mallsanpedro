import { NextResponse, type NextRequest } from "next/server";

/**
 * Chequeo optimista: si no hay cookie de sesión, se manda al login antes de renderizar.
 * La verificación real (firma del token y admin en base de datos) se hace en cada página y acción.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/admin/login")) return NextResponse.next();
  if (!request.cookies.has("msp_admin")) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
