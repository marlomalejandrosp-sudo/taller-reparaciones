import { CAMINO, etiqueta } from '../etapas.js'

// Muestra en qué punto del camino normal está la orden
function Progreso({ estado }) {
  if (estado === 'cancelada' || estado === 'rechazada') {
    return (
      <p className={'cierre e-' + estado}>
        {estado === 'cancelada' ? 'Orden cancelada a petición del cliente.' : 'El cliente rechazó el presupuesto. Orden cerrada.'}
      </p>
    )
  }
  const actual = CAMINO.indexOf(estado)
  return (
    <ol className="progreso" aria-label="Progreso de la orden">
      {CAMINO.map((paso, i) => (
        <li
          key={paso}
          className={i < actual ? 'hecho' : i === actual ? 'actual' : ''}
          aria-current={i === actual ? 'step' : undefined}
        >
          {etiqueta(paso)}
        </li>
      ))}
    </ol>
  )
}

export default Progreso
