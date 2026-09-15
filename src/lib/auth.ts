import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { queryOne } from "./db";

export const SESSION_COOKIE = "msp_admin";
const SESSION_HOURS = 8;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET debe tener al menos 32 caracteres.");
  return new TextEncoder().encode(s);
}

export type Admin = { id: number; email: string; nombre: string; rol: string };

export async function crearSesion(adminId: number) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(adminId))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secret());
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export async function cerrarSesion() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** Devuelve el admin de la sesión actual, verificado contra la base de datos. */
export async function getAdmin(): Promise<Admin | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const id = Number(payload.sub);
    if (!Number.isInteger(id)) return null;
    return await queryOne<Admin>("SELECT id, email, nombre, rol FROM admins WHERE id = $1", [id]);
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
