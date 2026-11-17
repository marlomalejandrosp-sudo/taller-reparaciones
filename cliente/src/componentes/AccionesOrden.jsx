import { useState } from 'react'
import { ACCIONES } from '../etapas.js'

// Botones para pasar a la siguiente etapa. Las acciones delicadas piden confirmación.
function AccionesOrden({ estado, ocupado, onCambiar }) {
  const [confirmando, setConfirmando] = useState(null) // acción que espera el "sí"
  const acciones = ACCIONES[estado] ?? []

  if (acciones.length === 0) return null

  if (confirmando) {
    return (
      <div className="acciones confirmar" role="group" aria-label="Confirmación">
        <span>{confirmando.pregunta}</span>
        <button type="button" className={confirmando.peligro ? 'peligro' : 'principal'} disabled={ocupado}
          onClick={() => { onCambiar(confirmando.a); setConfirmando(null) }}>
          Sí, confirmar
        </button>
        <button type="button" onClick={() => setConfirmando(null)}>No</button>
      </div>
    )
  }

  return (
    <div className="acciones">
      {acciones.map((accion) => (
        <button
          key={accion.a}
          type="button"
          className={accion.peligro ? 'peligro' : 'principal'}
          disabled={ocupado}
          onClick={() => (accion.pregunta ? setConfirmando(accion) : onCambiar(accion.a))}
        >
          {accion.texto}
        </button>
      ))}
    </div>
  )
}

export default AccionesOrden
