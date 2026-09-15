# Góndola de Fin de Año · Mall San Pedro

Sitio del Sorteo de Fin de Año: los clientes registran sus facturas de compra con foto, reciben boletos al instante
y el mall administra todo desde un panel (anulaciones, tiendas, sorteo y exportación a Excel).

Stack: Next.js 16 en Vercel, Postgres en Neon, fotos en Vercel Blob (privado), correo con Resend y WhatsApp con la
API oficial de Meta.

## Reglas del sorteo

- Por cada bloque completo de ₡10 000 en una factura se da **1 boleto**; en tiendas **patrocinadoras, 2 (x2)**.
- Una factura no se puede repetir **en la misma tienda** (restricción única `tienda_id + numero_factura` en la base de
  datos). Si se repite, el registro se rechaza al instante y la foto subida se borra.
- Si no es duplicada, la factura queda válida y los boletos se asignan y notifican en el momento.
- Desde el panel se puede anular una factura después (sus boletos quedan marcados como anulados y salen del sorteo) o
  restaurarla.
- Si la cédula ya existe, se conservan su correo y teléfono originales, para que nadie pueda desviar las
  notificaciones de otra persona.

## Estructura

```
db/schema.sql            Esquema completo (idempotente)
db/seed.sql              Tiendas iniciales (5 patrocinadoras x2 y 5 participantes)
scripts/                 Migración y creación de administradores
src/app/page.tsx         Landing con animación de nieve y luces
src/app/participar/      Formulario en 3 pasos con cámara
src/app/mis-boletos/     Consulta pública por cédula + correo
src/app/admin/           Panel: facturas, detalle con foto, tiendas, sorteo y ajustes
src/app/api/upload/      Tokens de subida directa a Vercel Blob
src/app/api/admin/       Foto privada y exportación a Excel
src/lib/                 Base de datos, sesión, almacenamiento, notificaciones y validaciones
```

## Puesta en marcha

```bash
npm install
cp .env.example .env.local        # completar DATABASE_URL y AUTH_SECRET
npm run db:migrate -- --seed      # crea tablas y tiendas
npm run admin:create -- correo@dominio.com "contraseña-segura" "Nombre"
npm run dev
```

## Despliegue en Vercel

1. Importar el repositorio en Vercel (framework Next.js, sin cambios de build).
2. En **Storage**, crear un **Blob Store** y conectarlo al proyecto (crea `BLOB_READ_WRITE_TOKEN`).
3. Agregar `DATABASE_URL`, `AUTH_SECRET` y `NEXT_PUBLIC_SITE_URL` en Environment Variables.
4. Opcional: `RESEND_API_KEY` + `EMAIL_FROM` para correo; variables `WHATSAPP_*` para WhatsApp.
5. Desplegar. El panel queda en `/admin`.

### WhatsApp

Meta exige plantillas aprobadas para mensajes que la empresa inicia. Crear en WhatsApp Manager una plantilla de
categoría **Utility**, idioma español, con este cuerpo (o similar):

> Hola {{1}}, registramos tu factura de {{2}} en el Sorteo de Fin de Año de Mall San Pedro. Tus boletos son: {{3}}. ¡Mucha suerte!

Su nombre va en `WHATSAPP_TEMPLATE_BOLETOS`. Mientras no esté configurado, el sistema funciona igual y registra el
aviso como "omitido".

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run typecheck` | Revisión de tipos |
| `npm run db:migrate` | Aplica `db/schema.sql` (agrega `-- --seed` para tiendas) |
| `npm run admin:create` | Crea o actualiza un administrador |

## Pendiente antes del lanzamiento

- Revisión legal del texto de `/privacidad` (Ley 8968) y del reglamento del sorteo.
- Confirmar con el mall la lista real de tiendas y cuáles son patrocinadoras (se edita en `/admin/tiendas`).
- Definir fechas de la promoción en `/admin/ajustes`.
- Logo oficial del mall.
