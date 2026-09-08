function crearFormularioTombolaDemo() {
  const form = FormApp.create('Tómbola de diciembre · Registro de compra');
  form.setDescription('Campaña de demostración. Cada factura se revisa antes de emitir tickets. La carga de archivos exige iniciar sesión en Google.');
  form.setConfirmationMessage('Recibimos el registro. Esto no confirma tickets: el organizador revisará la factura.');
  form.addTextItem().setTitle('Nombre de la persona compradora').setRequired(true);
  form.addTextItem().setTitle('Correo o contacto').setRequired(true);
  form.addTextItem().setTitle('Identificador de negocio').setHelpText('Use el catálogo del organizador; no lo invente.').setRequired(true);
  form.addTextItem().setTitle('Serie / sucursal').setRequired(true);
  form.addTextItem().setTitle('Identificador completo de factura').setHelpText('Conserve ceros iniciales.').setRequired(true);
  form.addDateItem().setTitle('Fecha de la factura').setRequired(true);
  form.addTextItem().setTitle('Monto de la factura en colones').setRequired(true);
  form.addFileUploadItem().setTitle('Foto legible de la factura').setHelpText('Requiere iniciar sesión en Google.').setRequired(true);
  const sheet = SpreadsheetApp.create('Tómbola de diciembre · Registro privado');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());
  Logger.log(JSON.stringify({editUrl:form.getEditUrl(),responseUrl:form.getPublishedUrl(),sheetUrl:sheet.getUrl()}));
}
