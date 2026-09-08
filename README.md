# Tómbola de diciembre · demo

Demo privada, navegable y apta para celulares con datos completamente ficticios. Incluye registro en memoria, revisión manual, detección de duplicados, asignación idempotente por rangos, exportación de historial y un módulo opcional de sorteo.

## Demo

La aplicación se encuentra en `work/site`. Ejecutar `npm install` y `npm run dev` dentro de esa carpeta. La demo no guarda datos reales ni conecta el formulario simulado con Google.

Escenario precargado: cuatro facturas, incluida una persona con dos facturas distintas. Aprobarlas y asignar el lote produce 11 tickets: 2 + 8 + 1 + 0. Repetir la asignación no agrega rangos. El sorteo solo se habilita al cerrar recepción, completar revisión, asignar y congelar el padrón.

## Reglas verificadas

Cada factura se calcula por separado con `floor(monto / 10000) × multiplicador`. Se conservan ceros iniciales y la clave de duplicidad combina negocio, serie/sucursal e identificador completo. Todas las coincidencias quedan retenidas. Los rangos ya emitidos conservan su huella; una anulación los excluye sin reutilizar números. El sorteo elige un ticket entre todos los números válidos con Web Crypto y muestreo por rechazo.

Las comprobaciones de frontera son ₡9.000 → 0/0, ₡10.000 → 1/2, ₡25.000 → 2/4 y ₡40.000 → 4/8.

## Google Forms + Sheets

La arquitectura propuesta para campaña real es un Google Form vinculado a una hoja privada del organizador. Forms no valida unicidad contra envíos previos. La foto nativa exige que la persona inicie sesión en Google. Las coincidencias deben detectarse y revisarse después del envío; no se debe aprobar automáticamente la primera coincidencia.

`work/Tombola_Diciembre_DEMO.xlsx` contiene la estructura inicial de la hoja: Inicio, Catálogo, Ejemplos, Revisión, Tickets e Historial. Puede importarse como hoja nativa y proteger las columnas calculadas/revisión. El script de Apps Script para crear y vincular el Form queda en `work/forms_setup.gs`; requiere ejecutarse en la cuenta del organizador y es el único paso externo pendiente si la interfaz no permite automatizarlo.

El sorteo opcional es un alcance separado. La demo no es certificación legal ni sorteo oficial.

## Costos

15–22 horas y el ejemplo ₡240.000 de costo / ₡350.000 de venta son supuestos sujetos al documento de costos y a la compatibilidad real de Forms. El sorteo se cotiza aparte.
