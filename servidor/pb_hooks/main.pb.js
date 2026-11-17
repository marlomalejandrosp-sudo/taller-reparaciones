/// <reference path="../pb_data/types.d.ts" />
// Validaciones del taller.
//
// Se usan hooks de MODELO (onRecordCreate / onRecordUpdate), no de petición:
// se ejecutan en CUALQUIER guardado de una orden (API, panel de administración
// o código), así que nadie puede saltarse las reglas hablando directo con la API.
// Además corren dentro de la transacción: el cambio de etapa y su evento del
// historial se guardan juntos o no se guarda ninguno.

// ---------------------------------------------------------------------------
// Crear una orden: siempre empieza en "solicitada" y sin presupuesto
// ---------------------------------------------------------------------------
onRecordCreate((e) => {
  const u = require(`${__hooks}/util.js`);

  const estado = e.record.getString("estado");
  if (estado !== "" && estado !== "solicitada") {
    throw new BadRequestError("Una orden nueva siempre empieza en 'solicitada'.");
  }
  e.record.set("estado", "solicitada");

  if (!u.presupuestoVacio(e.record)) {
    throw new BadRequestError("El presupuesto se registra al presupuestar, no al crear la orden.");
  }

  e.next(); // guarda la orden

  u.registrarEvento(e.app, e.record.id, "", "solicitada");
}, "ordenes");

// ---------------------------------------------------------------------------
// Editar una orden: etapas en orden, presupuesto inmutable, cerradas intocables
// ---------------------------------------------------------------------------
onRecordUpdate((e) => {
  const u = require(`${__hooks}/util.js`);
  const original = e.record.original();
  const antes = original.getString("estado");
  const ahora = e.record.getString("estado");

  // Rechazada, cancelada o entregada: no cambia más (ni la etapa ni ningún otro dato)
  if (u.CERRADAS.includes(antes)) {
    throw new BadRequestError("La orden está '" + antes + "' y ya no cambia más.");
  }

  if (e.record.getString("cliente") !== original.getString("cliente")) {
    throw new BadRequestError("El cliente de una orden no se puede cambiar.");
  }

  // Solo los cambios de la tabla; nunca se salta una etapa
  if (ahora !== antes && !u.SIGUIENTE[antes].includes(ahora)) {
    throw new BadRequestError("No se puede pasar de '" + antes + "' a '" + ahora + "'.");
  }

  const presupuestando = antes === "en_diagnostico" && ahora === "presupuestada";

  if (presupuestando) {
    // El presupuesto se registra justo aquí, completo y válido
    if (e.record.getString("diagnostico").trim().length < 3) {
      throw new BadRequestError("Para presupuestar hace falta el diagnóstico.");
    }
    const piezas = u.leerPiezas(e.record);
    u.validarPiezas(piezas);
    if (e.record.getFloat("manoObra") === 0 && piezas.length === 0) {
      throw new BadRequestError("El presupuesto necesita mano de obra o al menos una pieza.");
    }
  } else if (u.cambioPresupuesto(e.record, original)) {
    throw new BadRequestError(
      "El presupuesto solo se registra al pasar de 'en_diagnostico' a 'presupuestada' y después no se modifica."
    );
  }

  e.next(); // guarda la orden

  if (ahora !== antes) {
    u.registrarEvento(e.app, e.record.id, antes, ahora);
  }
}, "ordenes");

// ---------------------------------------------------------------------------
// Ruta propia: resumen de órdenes por etapa (para el panel)
// GET /api/taller/resumen
// ---------------------------------------------------------------------------
routerAdd("GET", "/api/taller/resumen", (e) => {
  const u = require(`${__hooks}/util.js`);
  const porEstado = {};
  let total = 0;

  for (const estado of u.ESTADOS) {
    const n = e.app.countRecords("ordenes", $dbx.hashExp({ estado: estado }));
    porEstado[estado] = n;
    total += n;
  }

  const cerradas = u.CERRADAS.reduce((s, est) => s + porEstado[est], 0);
  return e.json(200, { total, abiertas: total - cerradas, porEstado });
});
