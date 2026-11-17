import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { crearCliente, listarClientes, listarOrdenes } from '../api.js'
import { estaCerrada } from '../etapas.js'
import { useAlVolver } from '../hooks/useAlVolver.js'
import Aviso from '../componentes/Aviso.jsx'
import EtiquetaEtapa from '../componentes/EtiquetaEtapa.jsx'

// Clientes del taller con sus equipos. Útil cuando un cliente llama para preguntar.
function Clientes() {
  const [clientes, setClientes] = useState(null)
  const [ordenes, setOrdenes] = useState([])
  const [error, setError] = useState(null)
  const [version, setVersion] = useState(0)
  const [busqueda, setBusqueda] = useState('')

  const recargar = useCallback(() => setVersion((v) => v + 1), [])
  useAlVolver(recargar)

  useEffect(() => {
    const control = new AbortController()
    Promise.all([listarClientes(control.signal), listarOrdenes(control.signal)])
      .then(([c, o]) => {
        setClientes(c)
        setOrdenes(o)
        setError(null)
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message)
      })
    return () => control.abort()
  }, [version])

  if (error) return <Aviso tipo="error">{error}</Aviso>
  if (!clientes) return <Aviso>Cargando…</Aviso>

  const t = busqueda.trim().toLowerCase()
  const visibles = clientes.filter((c) => !t || `${c.nombre} ${c.telefono}`.toLowerCase().includes(t))

  return (
    <>
      <h1>Clientes</h1>
      <NuevoCliente onCreado={recargar} />

      <div className="filtros">
        <div className="campo">
          <label htmlFor="buscar-cliente">Buscar por nombre o teléfono</label>
          <input id="buscar-cliente" type="search" value={busqueda} autoComplete="off"
            onChange={(e) => setBusqueda(e.target.value)} />
        </div>
      </div>

      {visibles.length === 0 ? (
        <p className="vacio">No hay clientes con esa búsqueda.</p>
      ) : (
        <ul className="lista-clientes">
          {visibles.map((c) => (
            <FichaCliente key={c.id} cliente={c} ordenes={ordenes.filter((o) => o.cliente === c.id)} />
          ))}
        </ul>
      )}
    </>
  )
}

function FichaCliente({ cliente, ordenes }) {
  const enCurso = ordenes.filter((o) => !estaCerrada(o)).length
  return (
    <li className="caja">
      <div className="fila">
        <strong>{cliente.nombre}</strong>
        <a href={`tel:${cliente.telefono}`}>{cliente.telefono}</a>
      </div>
      <p className="meta">{ordenes.length} {ordenes.length === 1 ? 'orden' : 'órdenes'} · {enCurso} en curso</p>
      {ordenes.length > 0 && (
        <ul className="equipos">
          {ordenes.map((o) => (
            <li key={o.id}>
              <Link to={`/ordenes/${o.id}`}>{o.equipo}</Link>
              <EtiquetaEtapa estado={o.estado} />
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

// Alta rápida de un cliente (formulario controlado)
function NuevoCliente({ onCreado }) {
  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento) {
    evento.preventDefault()
    setEnviando(true)
    setError('')
    try {
      await crearCliente({ nombre: nombre.trim(), telefono: telefono.trim() })
      setNombre('')
      setTelefono('')
      setAbierto(false)
      onCreado()
    } catch (e) {
      const detalle = Object.entries(e.campos ?? {}).map(([campo, m]) => `${campo}: ${m}`).join(' ')
      setError(detalle || e.message)
    } finally {
      setEnviando(false)
    }
  }

  if (!abierto) {
    return <button type="button" className="principal" onClick={() => setAbierto(true)}>+ Nuevo cliente</button>
  }

  return (
    <form className="formulario en-linea" onSubmit={enviar}>
      <div className="campo">
        <label htmlFor="nc-nombre">Nombre</label>
        <input id="nc-nombre" value={nombre} required minLength={2} autoFocus onChange={(e) => setNombre(e.target.value)} />
      </div>
      <div className="campo">
        <label htmlFor="nc-telefono">Teléfono</label>
        <input id="nc-telefono" type="tel" value={telefono} required minLength={5} onChange={(e) => setTelefono(e.target.value)} />
      </div>
      <div className="acciones">
        <button type="submit" className="principal" disabled={enviando}>Guardar</button>
        <button type="button" onClick={() => setAbierto(false)}>Cancelar</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
    </form>
  )
}

export default Clientes
