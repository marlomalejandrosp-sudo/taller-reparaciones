import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { crearCliente, crearOrden, listarClientes } from '../api.js'
import Aviso from '../componentes/Aviso.jsx'
import SelectorFotos from '../componentes/SelectorFotos.jsx'

// Registrar un equipo que llega: cliente (existente o nuevo), equipo, problema y fotos
function NuevaOrden() {
  const navigate = useNavigate()
  const [clientes, setClientes] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)

  // Formulario controlado
  const [modo, setModo] = useState('existente') // 'existente' | 'nuevo'
  const [clienteId, setClienteId] = useState('')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [equipo, setEquipo] = useState('')
  const [problema, setProblema] = useState('')
  const [fotos, setFotos] = useState([])

  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [campos, setCampos] = useState({}) // errores por campo que devuelve el servidor

  useEffect(() => {
    const control = new AbortController()
    listarClientes(control.signal)
      .then((lista) => {
        setClientes(lista)
        if (lista.length === 0) setModo('nuevo')
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setErrorCarga(e.message)
      })
    return () => control.abort()
  }, [])

  async function enviar(evento) {
    evento.preventDefault()
    setError('')
    setCampos({})

    if (modo === 'existente' && !clienteId) return setCampos({ cliente: 'Elige un cliente.' })
    if (modo === 'nuevo' && (nombre.trim().length < 2 || telefono.trim().length < 5)) {
      return setCampos({ nombre: nombre.trim().length < 2 ? 'Escribe el nombre.' : '', telefono: telefono.trim().length < 5 ? 'Escribe un teléfono válido.' : '' })
    }
    if (!equipo.trim() || !problema.trim()) {
      return setCampos({ equipo: equipo.trim() ? '' : 'Es obligatorio.', problema: problema.trim() ? '' : 'Es obligatorio.' })
    }

    setEnviando(true)
    try {
      let idCliente = clienteId
      if (modo === 'nuevo') {
        const nuevo = await crearCliente({ nombre: nombre.trim(), telefono: telefono.trim() })
        idCliente = nuevo.id
        // Si después falla la orden, al reintentar ya se usa este cliente (no se duplica)
        setClientes((lista) => [...lista, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')))
        setClienteId(nuevo.id)
        setModo('existente')
      }

      // Con fotos hay que enviar FormData (multipart), no JSON
      const datos = new FormData()
      datos.append('cliente', idCliente)
      datos.append('equipo', equipo.trim())
      datos.append('problema', problema.trim())
      fotos.forEach((foto) => datos.append('fotos', foto))

      const orden = await crearOrden(datos)
      navigate(`/ordenes/${orden.id}`)
    } catch (e) {
      setError(e.message)
      setCampos(e.campos ?? {})
      setEnviando(false)
    }
  }

  if (errorCarga) return <Aviso tipo="error">{errorCarga}</Aviso>
  if (!clientes) return <Aviso>Cargando…</Aviso>

  return (
    <>
      <h1>Nueva orden</h1>
      <form className="formulario" onSubmit={enviar} noValidate>
        <fieldset>
          <legend>Cliente</legend>
          <div className="opciones" role="radiogroup" aria-label="Tipo de cliente">
            <label>
              <input type="radio" name="modo" value="existente" checked={modo === 'existente'}
                disabled={clientes.length === 0} onChange={() => setModo('existente')} />
              Ya es cliente
            </label>
            <label>
              <input type="radio" name="modo" value="nuevo" checked={modo === 'nuevo'} onChange={() => setModo('nuevo')} />
              Cliente nuevo
            </label>
          </div>

          {modo === 'existente' ? (
            <Campo id="cliente" etiqueta="Cliente" error={campos.cliente}>
              <select id="cliente" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                <option value="">Elige un cliente…</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre} · {c.telefono}</option>
                ))}
              </select>
            </Campo>
          ) : (
            <div className="dos">
              <Campo id="nombre" etiqueta="Nombre" error={campos.nombre}>
                <input id="nombre" value={nombre} autoComplete="off" onChange={(e) => setNombre(e.target.value)} />
              </Campo>
              <Campo id="telefono" etiqueta="Teléfono" error={campos.telefono}>
                <input id="telefono" type="tel" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
              </Campo>
            </div>
          )}
        </fieldset>

        <Campo id="equipo" etiqueta="Equipo" error={campos.equipo}>
          <input id="equipo" value={equipo} placeholder="Ej.: Laptop HP Pavilion 15" autoComplete="off"
            onChange={(e) => setEquipo(e.target.value)} />
        </Campo>
        <Campo id="problema" etiqueta="Problema que describe el cliente" error={campos.problema}>
          <textarea id="problema" rows={3} value={problema} onChange={(e) => setProblema(e.target.value)} />
        </Campo>

        <SelectorFotos fotos={fotos} onCambiar={setFotos} />
        {campos.fotos && <p className="error">{campos.fotos}</p>}

        {error && <p className="error" role="alert">{error}</p>}
        <div className="acciones">
          <button type="submit" className="principal" disabled={enviando}>
            {enviando ? 'Guardando…' : 'Registrar orden'}
          </button>
          <button type="button" onClick={() => navigate(-1)}>Cancelar</button>
        </div>
      </form>
    </>
  )
}

// Etiqueta + control + mensaje de error del campo
function Campo({ id, etiqueta, error, children }) {
  return (
    <div className="campo">
      <label htmlFor={id}>{etiqueta}</label>
      {children}
      {error && <p className="error">{error}</p>}
    </div>
  )
}

export default NuevaOrden
