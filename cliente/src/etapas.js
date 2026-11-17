// Etapas de una orden, textos para mostrar y cálculos del presupuesto.

export const ETIQUETAS = {
  solicitada: 'Solicitada',
  en_diagnostico: 'En diagnóstico',
  presupuestada: 'Presupuestada',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  en_reparacion: 'En reparación',
  lista: 'Lista',
  entregada: 'Entregada',
  cancelada: 'Cancelada',
}

// Camino normal de una orden, en orden
export const CAMINO = ['solicitada', 'en_diagnostico', 'presupuestada', 'aprobada', 'en_reparacion', 'lista', 'entregada']

export const CERRADAS = ['entregada', 'rechazada', 'cancelada']

export const estaCerrada = (orden) => CERRADAS.includes(orden.estado)

// Botones que se ofrecen en cada etapa. Es solo la interfaz: quien decide
// de verdad es el servidor (pb_hooks/main.pb.js), que rechaza cualquier otro cambio.
// "en_diagnostico" no tiene botón: se avanza enviando el formulario del presupuesto.
export const ACCIONES = {
  solicitada: [
    { a: 'en_diagnostico', texto: 'Empezar la revisión' },
    { a: 'cancelada', texto: 'Cancelar la orden', peligro: true, pregunta: '¿Cancelar la orden? Ya no se podrá reabrir.' },
  ],
  presupuestada: [
    { a: 'aprobada', texto: 'El cliente aceptó' },
    { a: 'rechazada', texto: 'El cliente rechazó', peligro: true, pregunta: '¿Registrar que el cliente rechazó? La orden se cerrará.' },
  ],
  aprobada: [{ a: 'en_reparacion', texto: 'Empezar la reparación' }],
  en_reparacion: [{ a: 'lista', texto: 'Reparación terminada' }],
  lista: [{ a: 'entregada', texto: 'Entregar al cliente', pregunta: '¿Confirmas que el equipo se entregó al cliente?' }],
}

export const etiqueta = (estado) => ETIQUETAS[estado] ?? estado

// PocketBase guarda "piezas" como json: puede llegar null si no hay presupuesto
export const piezasDe = (orden) => (Array.isArray(orden.piezas) ? orden.piezas : [])

export const tienePresupuesto = (orden) => Boolean(orden.diagnostico)

// El total no se guarda: siempre se calcula (mano de obra + cantidad × precio de cada pieza)
export function calcularTotal(manoObra, piezas) {
  return Number(manoObra || 0) + piezas.reduce((suma, p) => suma + Number(p.cantidad || 0) * Number(p.precio || 0), 0)
}

export const dinero = (n) =>
  '$' + Number(n || 0).toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// PocketBase entrega las fechas como "2026-11-16 09:00:00.000Z"
export function fecha(texto, conHora = false) {
  if (!texto) return '—'
  const d = new Date(texto.replace(' ', 'T'))
  return d.toLocaleString('es', {
    day: '2-digit', month: 'short', year: 'numeric',
    ...(conHora ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}
