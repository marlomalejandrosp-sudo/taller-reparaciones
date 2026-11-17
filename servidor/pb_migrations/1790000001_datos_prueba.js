/// <reference path="../pb_data/types.d.ts" />
// Datos de prueba: 2 clientes y 6 órdenes en etapas distintas.
//
// Las órdenes se crean en "solicitada" y se hacen avanzar etapa por etapa con
// app.save(): así pasan por los mismos hooks que la API y el historial (eventos)
// se genera solo. Al final se ajustan las fechas para que el historial parezca real.
//
// Si quieres empezar sin datos, borra este archivo antes del primer arranque.

migrate((app) => {
  const hace = (dias, hora) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - dias);
    d.setUTCHours(hora, 0, 0, 0);
    return d.toISOString().replace("T", " ");
  };

  const crearCliente = (nombre, telefono) => {
    const c = new Record(app.findCollectionByNameOrId("clientes"));
    c.set("nombre", nombre);
    c.set("telefono", telefono);
    app.save(c);
    return c;
  };

  // pasos: [{ a: "en_diagnostico", dias: 3 }, ...]; el presupuesto va en el paso "presupuestada"
  const crearOrden = (cliente, equipo, problema, diasCreada, pasos) => {
    const o = new Record(app.findCollectionByNameOrId("ordenes"));
    o.set("cliente", cliente.id);
    o.set("equipo", equipo);
    o.set("problema", problema);
    o.setRaw("created", hace(diasCreada, 9)); // fecha realista (se fija al crear)
    app.save(o); // hook: estado "solicitada" + evento de creación

    // Fecha de cada evento según la etapa a la que llega (en una orden nunca se repite)
    const fechas = { solicitada: hace(diasCreada, 9) };
    for (const paso of pasos) {
      // Se vuelve a leer de la base de datos, igual que hace la API en cada petición
      const actual = app.findRecordById("ordenes", o.id);
      actual.set("estado", paso.a);
      if (paso.presupuesto) {
        actual.set("diagnostico", paso.presupuesto.diagnostico);
        actual.set("manoObra", paso.presupuesto.manoObra);
        actual.set("piezas", paso.presupuesto.piezas);
      }
      app.save(actual); // hook: valida el cambio y registra el evento
      fechas[paso.a] = hace(paso.dias, paso.hora || 10);
    }

    // Fechas realistas para cada evento del historial
    // (se ajustan aquí, en la migración; por la API nadie puede editar eventos)
    const eventos = app.findRecordsByFilter("eventos", "orden = {:id}", "", 0, 0, { id: o.id });
    for (const ev of eventos) {
      ev.setRaw("created", fechas[ev.getString("a")]);
      app.save(ev);
    }
    return o;
  };

  const ana = crearCliente("Ana María Pérez", "52345678");
  const luis = crearCliente("Luis Alberto Gómez", "53456789");

  // 1. Entregada: recorrió todo el proceso
  crearOrden(ana, "iPhone 11", "Pantalla rota tras una caída; el táctil responde a medias.", 12, [
    { a: "en_diagnostico", dias: 11 },
    {
      a: "presupuestada", dias: 11, hora: 15,
      presupuesto: {
        diagnostico: "Pantalla y digitalizador dañados. El resto del equipo funciona bien.",
        manoObra: 15,
        piezas: [{ descripcion: "Pantalla OLED iPhone 11", cantidad: 1, precio: 65 }],
      },
    },
    { a: "aprobada", dias: 10 },
    { a: "en_reparacion", dias: 9 },
    { a: "lista", dias: 8, hora: 16 },
    { a: "entregada", dias: 7, hora: 11 },
  ]);

  // 2. En reparación
  crearOrden(luis, "Laptop HP Pavilion 15", "No enciende; el cargador muestra la luz encendida.", 6, [
    { a: "en_diagnostico", dias: 5 },
    {
      a: "presupuestada", dias: 4,
      presupuesto: {
        diagnostico: "Conector de carga suelto y batería agotada (no retiene carga).",
        manoObra: 20,
        piezas: [
          { descripcion: "Conector DC jack", cantidad: 1, precio: 8 },
          { descripcion: "Batería 3 celdas", cantidad: 1, precio: 45 },
        ],
      },
    },
    { a: "aprobada", dias: 3 },
    { a: "en_reparacion", dias: 2 },
  ]);

  // 3. Presupuestada: esperando la decisión del cliente
  crearOrden(ana, "Televisor Samsung 43\"", "Hay sonido pero no imagen.", 4, [
    { a: "en_diagnostico", dias: 3 },
    {
      a: "presupuestada", dias: 1,
      presupuesto: {
        diagnostico: "Tiras LED de la retroiluminación quemadas.",
        manoObra: 25,
        piezas: [{ descripcion: "Juego de tiras LED 43\"", cantidad: 1, precio: 30 }],
      },
    },
  ]);

  // 4. En diagnóstico
  crearOrden(luis, "Xiaomi Redmi Note 10", "No carga; a veces se apaga solo.", 1, [
    { a: "en_diagnostico", dias: 0 },
  ]);

  // 5. Solicitada: recién llegada
  crearOrden(ana, "Tablet Lenovo Tab M10", "Se reinicia al abrir algunas aplicaciones.", 0, []);

  // 6. Rechazada: el cliente no aceptó el presupuesto
  crearOrden(luis, "Laptop Dell Inspiron 3520", "Teclado con varias teclas que no responden.", 9, [
    { a: "en_diagnostico", dias: 8 },
    {
      a: "presupuestada", dias: 8, hora: 15,
      presupuesto: {
        diagnostico: "Teclado dañado por derrame de líquido; hay que reemplazarlo completo.",
        manoObra: 10,
        piezas: [{ descripcion: "Teclado Dell Inspiron 15", cantidad: 1, precio: 35 }],
      },
    },
    { a: "rechazada", dias: 7 },
  ]);
}, (app) => {
  // Deshacer: los eventos y las órdenes se borran como superusuario (las reglas no aplican aquí)
  for (const nombre of ["eventos", "ordenes", "clientes"]) {
    for (const r of app.findAllRecords(nombre)) app.delete(r);
  }
});
