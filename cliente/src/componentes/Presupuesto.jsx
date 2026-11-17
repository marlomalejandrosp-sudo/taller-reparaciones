import { calcularTotal, dinero, piezasDe } from '../etapas.js'

// Muestra el presupuesto guardado. El total se calcula, no viene del servidor.
function Presupuesto({ orden }) {
  const piezas = piezasDe(orden)
  return (
    <div className="presupuesto">
      <p><strong>Diagnóstico:</strong> {orden.diagnostico}</p>
      <table>
        <thead>
          <tr><th>Concepto</th><th className="num">Cant.</th><th className="num">Precio</th><th className="num">Importe</th></tr>
        </thead>
        <tbody>
          <tr><td>Mano de obra</td><td className="num">—</td><td className="num">—</td><td className="num">{dinero(orden.manoObra)}</td></tr>
          {piezas.map((p, i) => (
            // Las piezas guardadas no tienen id y nunca cambian de orden: el índice es estable aquí
            <tr key={i}>
              <td>{p.descripcion}</td>
              <td className="num">{p.cantidad}</td>
              <td className="num">{dinero(p.precio)}</td>
              <td className="num">{dinero(p.cantidad * p.precio)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr><td colSpan={3}>Total</td><td className="num">{dinero(calcularTotal(orden.manoObra, piezas))}</td></tr>
        </tfoot>
      </table>
    </div>
  )
}

export default Presupuesto
