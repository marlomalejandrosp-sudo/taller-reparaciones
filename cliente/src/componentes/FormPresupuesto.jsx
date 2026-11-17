import { useRef, useState } from 'react'
import { calcularTotal, dinero } from '../etapas.js'

// Formulario controlado del presupuesto: diagnóstico, mano de obra y lista de piezas.
// Al enviarlo, la orden pasa de "en_diagnostico" a "presupuestada".
function FormPresupuesto({ ocupado, onEnviar }) {
  const [diagnostico, setDiagnostico] = useState('')
  const [manoObra, setManoObra] = useState('')
  const [piezas, setPiezas] = useState([])
  const [error, setError] = useState('')

  // Clave estable para cada fila nueva. Es un valor que no se dibuja: useRef, no useState.
  const siguienteClave = useRef(1)

  function agregarPieza() {
    const clave = siguienteClave.current++
    setPiezas([...piezas, { clave, descripcion: '', cantidad: '1', precio: '' }])
  }

  function cambiarPieza(clave, campo, valor) {
    setPiezas(piezas.map((p) => (p.clave === clave ? { ...p, [campo]: valor } : p)))
  }

  function quitarPieza(clave) {
    setPiezas(piezas.filter((p) => p.clave !== clave))
  }

  function enviar(evento) {
    evento.preventDefault()
    // Comprobación rápida para ayudar al usuario; la validación que cuenta la hace el servidor
    if (diagnostico.trim().length < 3) return setError('Escribe el diagnóstico.')
    if (manoObra === '' || Number(manoObra) < 0) return setError('Indica la mano de obra (puede ser 0).')
    if (piezas.some((p) => p.descripcion.trim() === '' || Number(p.cantidad) < 1 || p.precio === '')) {
      return setError('Completa la descripción, la cantidad y el precio de cada pieza.')
    }
    setError('')
    onEnviar({
      diagnostico: diagnostico.trim(),
      manoObra: Number(manoObra),
      piezas: piezas.map((p) => ({
        descripcion: p.descripcion.trim(),
        cantidad: Number(p.cantidad),
        precio: Number(p.precio),
      })),
    })
  }

  return (
    <form className="formulario" onSubmit={enviar} noValidate>
      <div className="campo">
        <label htmlFor="diagnostico">Diagnóstico</label>
        <textarea id="diagnostico" rows={3} value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)}
          placeholder="Qué tiene el equipo y qué hay que hacer" />
      </div>
      <div className="campo corto">
        <label htmlFor="manoObra">Mano de obra ($)</label>
        <input id="manoObra" type="number" min="0" step="0.01" inputMode="decimal" value={manoObra}
          onChange={(e) => setManoObra(e.target.value)} />
      </div>

      <fieldset>
        <legend>Piezas</legend>
        {piezas.length === 0 && <p className="vacio">Sin piezas. Agrega las que hagan falta.</p>}
        {piezas.map((p, i) => (
          <div className="fila-pieza" key={p.clave}>
            <input aria-label={`Descripción de la pieza ${i + 1}`} placeholder="Descripción" value={p.descripcion}
              onChange={(e) => cambiarPieza(p.clave, 'descripcion', e.target.value)} autoFocus />
            <input aria-label={`Cantidad de la pieza ${i + 1}`} type="number" min="1" step="1" inputMode="numeric"
              value={p.cantidad} onChange={(e) => cambiarPieza(p.clave, 'cantidad', e.target.value)} />
            <input aria-label={`Precio de la pieza ${i + 1}`} type="number" min="0" step="0.01" inputMode="decimal"
              placeholder="Precio" value={p.precio} onChange={(e) => cambiarPieza(p.clave, 'precio', e.target.value)} />
            <button type="button" className="quitar" onClick={() => quitarPieza(p.clave)}
              aria-label={`Quitar la pieza ${i + 1}`}>✕</button>
          </div>
        ))}
        <button type="button" onClick={agregarPieza}>+ Agregar pieza</button>
      </fieldset>

      <p className="total">Total del presupuesto: <strong>{dinero(calcularTotal(manoObra, piezas))}</strong></p>
      {error && <p className="error" role="alert">{error}</p>}
      <button type="submit" className="principal" disabled={ocupado}>
        {ocupado ? 'Guardando…' : 'Registrar presupuesto'}
      </button>
      <p className="nota">Una vez registrado, el presupuesto ya no se puede modificar.</p>
    </form>
  )
}

export default FormPresupuesto
