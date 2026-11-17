// Reglas del taller compartidas por los hooks.
// Cada handler de PocketBase corre aislado (no ve variables de fuera),
// por eso lo común está aquí y se carga con require(`${__hooks}/util.js`).

const ESTADOS = [
  "solicitada", "en_diagnostico", "presupuestada", "aprobada", "rechazada",
  "en_reparacion", "lista", "entregada", "cancelada",
];

// Los únicos cambios de etapa permitidos (tabla del enunciado)
const SIGUIENTE = {
  solicitada: ["en_diagnostico", "cancelada"],
  en_diagnostico: ["presupuestada"],
  presupuestada: ["aprobada", "rechazada"],
  aprobada: ["en_reparacion"],
  en_reparacion: ["lista"],
  lista: ["entregada"],
  entregada: [],
  rechazada: [],
  cancelada: [],
};

// Una orden en estos estados ya no cambia más
const CERRADAS = ["entregada", "rechazada", "cancelada"];

// Lee el campo json "piezas" como arreglo (vacío si no hay nada)
function leerPiezas(record) {
  const raw = record.getString("piezas");
  if (!raw || raw === "null") return [];
  try {
    return JSON.parse(raw);
  } catch (_) {
    throw new BadRequestError("Las piezas no son un JSON válido.");
  }
}

// Cada pieza: { descripcion: texto, cantidad: entero >= 1, precio: número >= 0 }
function validarPiezas(piezas) {
  if (!Array.isArray(piezas)) {
    throw new BadRequestError("Las piezas deben ser una lista.");
  }
  if (piezas.length > 50) {
    throw new BadRequestError("Un presupuesto admite como máximo 50 piezas.");
  }
  piezas.forEach((p, i) => {
    const n = i + 1;
    if (!p || typeof p !== "object" || Array.isArray(p)) {
      throw new BadRequestError("La pieza " + n + " no es válida.");
    }
    if (typeof p.descripcion !== "string" || p.descripcion.trim().length < 2) {
      throw new BadRequestError("La pieza " + n + " necesita una descripción.");
    }
    if (typeof p.cantidad !== "number" || !Number.isInteger(p.cantidad) || p.cantidad < 1) {
      throw new BadRequestError("La cantidad de la pieza " + n + " debe ser un entero mayor que 0.");
    }
    if (typeof p.precio !== "number" || !isFinite(p.precio) || p.precio < 0) {
      throw new BadRequestError("El precio de la pieza " + n + " debe ser un número mayor o igual que 0.");
    }
  });
}

const presupuestoVacio = (record) =>
  record.getString("diagnostico").trim() === "" &&
  record.getFloat("manoObra") === 0 &&
  leerPiezas(record).length === 0;

const cambioPresupuesto = (record, original) =>
  record.getString("diagnostico") !== original.getString("diagnostico") ||
  record.getFloat("manoObra") !== original.getFloat("manoObra") ||
  JSON.stringify(leerPiezas(record)) !== JSON.stringify(leerPiezas(original));

// Escribe una entrada del historial. Se llama con e.app, que dentro de la
// petición es la transacción: si algo falla, no queda ni el cambio ni el evento.
function registrarEvento(app, idOrden, de, a) {
  const evento = new Record(app.findCollectionByNameOrId("eventos"));
  evento.set("orden", idOrden);
  evento.set("de", de);
  evento.set("a", a);
  app.save(evento);
}

module.exports = {
  ESTADOS, SIGUIENTE, CERRADAS,
  leerPiezas, validarPiezas, presupuestoVacio, cambioPresupuesto, registrarEvento,
};
