# Publicación con GitHub y Cloudflare

El repositorio está creado como privado en GitHub: `https://github.com/alanuza16-dev/tombola-diciembre-demo`.

La demo ya fue compilada, subida al repositorio privado de Sites y enviada a publicación privada. El estado de publicación seguía `publishing` al cerrar esta entrega, por lo que se conserva el enlace esperado de Sites en el reporte y no se presenta como URL activa hasta que el proveedor lo marque `succeeded`.

La integración automática de Cloudflare Pages/Workers con GitHub no quedó autorizada en el panel: la sesión web de Cloudflare solicita iniciar sesión y conectar la GitHub App. El paso mínimo pendiente es abrir Workers & Pages, importar el repositorio `alanuza16-dev/tombola-diciembre-demo`, seleccionar `master` y configurar el build en `work/site` (`npm ci`, `npm run build`, salida `work/site/dist/client`). Cloudflare desplegará cada push después de completar esa autorización. El repositorio no contiene tokens ni secretos.
