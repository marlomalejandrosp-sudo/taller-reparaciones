/// <reference path="../pb_data/types.d.ts" />
// Esquema del taller de reparaciones: clientes, ordenes y eventos.
//
// No hay autenticación, así que las reglas no distinguen quién pide.
// Las reglas BLOQUEAN lo que nunca debe ocurrir (null = nadie, salvo el superusuario):
//   - borrar clientes u órdenes
//   - crear, editar o borrar eventos a mano (el historial lo escribe el servidor)
// Las reglas vacías ("") dejan pasar la petición, y los hooks (pb_hooks/main.pb.js)
// validan todo lo demás: etapas, presupuesto y órdenes cerradas.

migrate((app) => {
  const PUBLICA = "";

  const clientes = new Collection({
    type: "base",
    name: "clientes",
    listRule: PUBLICA,
    viewRule: PUBLICA,
    createRule: PUBLICA,
    updateRule: PUBLICA,
    deleteRule: null,
    fields: [
      { name: "nombre", type: "text", required: true, min: 2, max: 100 },
      { name: "telefono", type: "text", required: true, min: 5, max: 30 },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
  });
  app.save(clientes);

  const ordenes = new Collection({
    type: "base",
    name: "ordenes",
    listRule: PUBLICA,
    viewRule: PUBLICA,
    createRule: PUBLICA,
    updateRule: PUBLICA, // los hooks deciden qué cambios son válidos
    deleteRule: null, // las órdenes nunca se borran
    fields: [
      { name: "cliente", type: "relation", required: true, collectionId: clientes.id, maxSelect: 1 },
      { name: "equipo", type: "text", required: true, max: 100 },
      { name: "problema", type: "text", required: true, max: 1000 },
      {
        name: "estado",
        type: "select",
        required: true,
        maxSelect: 1,
        values: [
          "solicitada", "en_diagnostico", "presupuestada", "aprobada", "rechazada",
          "en_reparacion", "lista", "entregada", "cancelada",
        ],
      },
      { name: "diagnostico", type: "text", max: 2000 },
      { name: "manoObra", type: "number", min: 0 },
      { name: "piezas", type: "json", maxSize: 20000 }, // [{ descripcion, cantidad, precio }]
      {
        name: "fotos",
        type: "file",
        maxSelect: 3,
        maxSize: 5242880, // 5 MB por foto
        mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
        thumbs: ["120x120", "600x0"],
      },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE INDEX idx_ordenes_cliente ON ordenes (cliente)",
      "CREATE INDEX idx_ordenes_estado ON ordenes (estado)",
    ],
  });
  app.save(ordenes);

  const eventos = new Collection({
    type: "base",
    name: "eventos",
    listRule: PUBLICA,
    viewRule: PUBLICA,
    createRule: null, // solo los crea el servidor, en la misma operación que cambia la etapa
    updateRule: null, // nadie edita el historial
    deleteRule: null, // nadie borra el historial
    fields: [
      { name: "orden", type: "relation", required: true, collectionId: ordenes.id, maxSelect: 1 },
      { name: "de", type: "text", max: 30 }, // vacío en el evento de creación
      { name: "a", type: "text", required: true, max: 30 },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
    ],
    indexes: ["CREATE INDEX idx_eventos_orden ON eventos (orden)"],
  });
  app.save(eventos);
}, (app) => {
  for (const nombre of ["eventos", "ordenes", "clientes"]) {
    try {
      app.delete(app.findCollectionByNameOrId(nombre));
    } catch (_) {
      // ya no existe
    }
  }
});
