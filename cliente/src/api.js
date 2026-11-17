// Acceso a PocketBase con fetch (sin el SDK, como pide el enunciado).
// Todas las pantallas piden y guardan datos a través de estas funciones.

export const PB_URL = import.meta.env.VITE_PB_URL ?? 'http://127.0.0.1:8090'
const API = `${PB_URL}/api`

// Error con el mensaje para el usuario y, si los hay, los errores por campo
export class ErrorApi extends Error {
  constructor(mensaje, status = 0, campos = {}) {
    super(mensaje)
    this.status = status
    this.campos = campos
  }
}

const TRADUCCIONES = {
  'Cannot be blank.': 'Es obligatorio.',
  'Value must be unique.': 'Ya existe.',
}

// Envoltorio de fetch: añade cabeceras, convierte a JSON y lanza ErrorApi si algo falla.
// El body puede ser un objeto (se envía como JSON) o un FormData (para subir fotos).
async function solicitar(ruta, opciones = {}) {
  const { body, ...resto } = opciones
  const esFormulario = body instanceof FormData

  let respuesta
  try {
    respuesta = await fetch(`${API}${ruta}`, {
      ...resto,
      // Con FormData NO se pone Content-Type: el navegador lo calcula solo
      headers: body && !esFormulario ? { 'Content-Type': 'application/json' } : undefined,
      body: body && !esFormulario ? JSON.stringify(body) : body,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error // la pantalla canceló la petición
    throw new ErrorApi('No se pudo conectar con el servidor. ¿Está encendido PocketBase?')
  }

  if (respuesta.status === 204) return null // sin cuerpo: no se llama a .json()

  const datos = await respuesta.json().catch(() => null)

  // fetch no falla con 400 o 404: hay que revisar response.ok
  if (!respuesta.ok) {
    const campos = {}
    for (const [campo, detalle] of Object.entries(datos?.data ?? {})) {
      campos[campo] = TRADUCCIONES[detalle.message] ?? detalle.message
    }
    const hayCampos = Object.keys(campos).length > 0
    const mensaje = hayCampos ? 'Revisa los datos marcados.' : datos?.message || `Error ${respuesta.status}`
    throw new ErrorApi(mensaje, respuesta.status, campos)
  }
  return datos
}

// Los id de PocketBase son 15 letras minúsculas o números.
// Se comprueba antes de meterlo en un filtro para que nadie pueda inyectar texto.
const idValido = (id) => /^[a-z0-9]{15}$/.test(id)

// ---------- Órdenes ----------
export function listarOrdenes(signal) {
  const params = new URLSearchParams({ perPage: '500', sort: '-created', expand: 'cliente' })
  return solicitar(`/collections/ordenes/records?${params}`, { signal }).then((d) => d.items)
}

export function obtenerOrden(id, signal) {
  if (!idValido(id)) return Promise.reject(new ErrorApi('No existe esa orden.', 404))
  return solicitar(`/collections/ordenes/records/${id}?expand=cliente`, { signal })
}

// datos: FormData con cliente, equipo, problema y fotos
export function crearOrden(datos) {
  return solicitar('/collections/ordenes/records', { method: 'POST', body: datos })
}

// extra: el presupuesto (diagnostico, manoObra, piezas) al pasar a "presupuestada"
export function cambiarEtapa(id, estado, extra = {}) {
  return solicitar(`/collections/ordenes/records/${id}`, {
    method: 'PATCH',
    body: { estado, ...extra },
  })
}

export function listarEventos(idOrden, signal) {
  if (!idValido(idOrden)) return Promise.resolve([])
  const params = new URLSearchParams({ filter: `orden = "${idOrden}"`, sort: 'created', perPage: '200' })
  return solicitar(`/collections/eventos/records?${params}`, { signal }).then((d) => d.items)
}

export function urlFoto(orden, archivo, miniatura) {
  const url = `${API}/files/${orden.collectionId}/${orden.id}/${encodeURIComponent(archivo)}`
  return miniatura ? `${url}?thumb=${miniatura}` : url
}

// ---------- Clientes ----------
export function listarClientes(signal) {
  const params = new URLSearchParams({ perPage: '500', sort: 'nombre' })
  return solicitar(`/collections/clientes/records?${params}`, { signal }).then((d) => d.items)
}

export function crearCliente(cliente) {
  return solicitar('/collections/clientes/records', { method: 'POST', body: cliente })
}

// ---------- Resumen (ruta propia del servidor) ----------
export function obtenerResumen(signal) {
  return solicitar('/taller/resumen', { signal })
}
