# Propuesta de funcionamiento · tómbola de diciembre

Documento de trabajo actualizado con el resultado de la demo. La base económica usa Google Forms vinculado a una hoja privada del organizador. El comprador aporta contacto, negocio, serie o sucursal, identificador completo de factura, fecha, monto y foto. La carga de archivos de Forms exige iniciar sesión en Google.

Cada factura se calcula por separado. Un bloque completo de ₡10.000 produce un ticket en un negocio ordinario y dos en un patrocinador definido por el catálogo del organizador. Los sobrantes no se acumulan. Se conservan ceros iniciales. La unicidad usa negocio + serie o sucursal + factura completa. Todas las coincidencias quedan retenidas hasta revisión.

El flujo es recepción, revisión manual, asignación por lotes y exportación. Los tickets se asignan en rangos estables e idempotentes. Repetir un lote no duplica participaciones. Editar una factura después de emitir tickets requiere anulación o corrección registrada; los números anteriores no se reutilizan. La probabilidad del sorteo se pondera por ticket, nunca por fila de factura.

El módulo de sorteo es opcional y separado. Cierra recepción, exige revisión completa, congela una copia fija del padrón válido, elige un número con probabilidad uniforme y registra el resultado. La animación de la demo revela el resultado real. No es certificación legal ni sorteo oficial.

La demo contiene solo personas, negocios e identificadores ficticios. El presupuesto provisional de la base es 15–22 horas sujeto a integración y volumen. El ejemplo de ₡240.000 de costo y ₡350.000 de venta es un supuesto interno. El sorteo opcional se cotiza aparte.

Pendientes para una campaña real: fechas y año, condiciones de facturas y devoluciones, catálogo definitivo, responsable de revisión y asignación, retención de fotos, medio de comunicación de tickets, permisos de la cuenta y procedimiento legal del sorteo.
