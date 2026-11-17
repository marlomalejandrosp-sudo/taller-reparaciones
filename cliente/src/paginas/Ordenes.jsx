import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { listarOrdenes } from '../api.js'
import { ETIQUETAS, estaCerrada } from '../etapas.js'
import { useAlVolver } from '../hooks/useAlVolver.js'
import Aviso from '../componentes/Aviso.jsx'
import TarjetaOrden from '../componentes/TarjetaOrden.jsx'

// Lista de órdenes con búsqueda (cliente, teléfono, equipo) y filtro por etapa.
// Los filtros viven en la URL (?q=...&estado=...) para que se puedan compartir y recargar.
function Ordenes() {
  const [ordenes, setOrdenes] = useState(null)
  const [error, setError] = useState(null)
  const [version, setVersion] = useState(0)
  const [params, setParams] = useSearchParams()
  const texto = params.get('q') ?? ''
  const estado = params.get('estado') ?? 'todas'

  const recargar = useCallback(() => setVersion((v) => v + 1), [])
  useAlVolver(recargar)

  useEffect(() => {
    const control = new AbortController()
    listarOrdenes(control.signal)
      .then((lista) => {
        setOrdenes(lista)
        setError(null)
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message)
      })
    return () => control.abort()
  }, [version])

  function cambiarFiltro(clave, valor) {
    const nuevos = new URLSearchParams(params)
    if (valor && valor !== 'todas') nuevos.set(clave, valor)
    else nuevos.delete(clave)
    setParams(nuevos, { replace: true })
  }

  if (error) return <Aviso tipo="error">{error}</Aviso>
  if (!ordenes) return <Aviso>Cargando…</Aviso>

  // Se calcula al dibujar: con unos cientos de órdenes es instantáneo y no hace falta useMemo
  const t = texto.trim().toLowerCase()
  const visibles = ordenes.filter((o) => {
    const c = o.expand?.cliente ?? {}
    const okTexto = !t || [o.equipo, o.problema, c.nombre, c.telefono].join(' ').toLowerCase().includes(t)
    const okEstado =
      estado === 'todas' || (estado === 'abiertas' ? !estaCerrada(o) : o.estado === estado)
    return okTexto && okEstado
  })

  return (
    <>
      <div className="titulo">
        <h1>Órdenes</h1>
        <Link to="/ordenes/nueva" className="boton principal">+ Nueva orden</Link>
      </div>

      <div className="filtros">
        <div className="campo">
          <label htmlFor="buscar">Buscar por cliente, teléfono o equipo</label>
          <input id="buscar" type="search" value={texto} autoComplete="off"
            onChange={(e) => cambiarFiltro('q', e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="estado">Etapa</label>
          <select id="estado" value={estado} onChange={(e) => cambiarFiltro('estado', e.target.value)}>
            <option value="todas">Todas</option>
            <option value="abiertas">En curso</option>
            {Object.entries(ETIQUETAS).map(([valor, texto]) => (
              <option key={valor} value={valor}>{texto}</option>
            ))}
          </select>
        </div>
      </div>

      <p className="meta" aria-live="polite">
        {visibles.length} {visibles.length === 1 ? 'orden' : 'órdenes'}
      </p>
      {visibles.length === 0 ? (
        <p className="vacio">No hay órdenes con esos filtros.</p>
      ) : (
        <div className="tarjetas">
          {visibles.map((o) => <TarjetaOrden key={o.id} orden={o} />)}
        </div>
      )}
    </>
  )
}

export default Ordenes
