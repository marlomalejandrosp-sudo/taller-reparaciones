import { etiqueta, fecha } from '../etapas.js'

// Lista de eventos (cambios de etapa) en orden cronológico
function Historial({ eventos }) {
  if (eventos.length === 0) return <p className="vacio">Sin movimientos todavía.</p>
  return (
    <ol className="historial">
      {eventos.map((ev) => (
        <li key={ev.id}>
          <time dateTime={ev.created.replace(' ', 'T')}>{fecha(ev.created, true)}</time>
          <span>{ev.de ? `${etiqueta(ev.de)} → ${etiqueta(ev.a)}` : `Orden registrada (${etiqueta(ev.a)})`}</span>
        </li>
      ))}
    </ol>
  )
}

export default Historial
