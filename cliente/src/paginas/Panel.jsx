import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { listarOrdenes, obtenerResumen } from '../api.js'
import { CAMINO, ETIQUETAS, estaCerrada } from '../etapas.js'
import { useAlVolver } from '../hooks/useAlVolver.js'
import Aviso from '../componentes/Aviso.jsx'
import TarjetaOrden from '../componentes/TarjetaOrden.jsx'

// Visión de conjunto: cuánto trabajo hay y en qué etapa está
function Panel() {
  const [resumen, setResumen] = useState(null)
  const [ordenes, setOrdenes] = useState([])
  const [error, setError] = useState(null)
  const [version, setVersion] = useState(0)

  // useCallback: la función es dependencia del efecto de useAlVolver
  const recargar = useCallback(() => setVersion((v) => v + 1), [])
  useAlVolver(recargar)

  useEffect(() => {
    const control = new AbortController()
    Promise.all([obtenerResumen(control.signal), listarOrdenes(control.signal)])
      .then(([r, lista]) => {
        setResumen(r)
        setOrdenes(lista)
        setError(null)
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message)
      })
    return () => control.abort() // si la página se cierra antes de que llegue la respuesta
  }, [version])

  if (error) return <Aviso tipo="error">{error}</Aviso>
  if (!resumen) return <Aviso>Cargando…</Aviso>

  // Las más antiguas primero: son las que llevan más tiempo esperando
  const abiertas = ordenes.filter((o) => !estaCerrada(o)).reverse()

  return (
    <>
      <h1>Panel del taller</h1>

      <section className="cifras" aria-label="Resumen">
        <div className="cifra"><span>{resumen.abiertas}</span>órdenes en curso</div>
        <div className="cifra"><span>{resumen.porEstado.lista}</span>listas para entregar</div>
        <div className="cifra"><span>{resumen.porEstado.presupuestada}</span>esperando respuesta del cliente</div>
        <div className="cifra"><span>{resumen.total}</span>órdenes en total</div>
      </section>

      <section>
        <h2>Órdenes por etapa</h2>
        <div className="etapas">
          {[...CAMINO, 'rechazada', 'cancelada'].map((estado) => (
            <Link key={estado} to={`/ordenes?estado=${estado}`} className={'etapa-cuenta e-' + estado}>
              <span>{ETIQUETAS[estado]}</span>
              <strong>{resumen.porEstado[estado]}</strong>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2>Trabajo pendiente ({abiertas.length})</h2>
        {abiertas.length === 0 ? (
          <p className="vacio">No hay órdenes en curso.</p>
        ) : (
          <div className="tarjetas">
            {abiertas.map((o) => <TarjetaOrden key={o.id} orden={o} />)}
          </div>
        )}
      </section>
    </>
  )
}

export default Panel
