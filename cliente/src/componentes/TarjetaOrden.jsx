import { Link } from 'react-router'
import EtiquetaEtapa from './EtiquetaEtapa.jsx'
import { fecha } from '../etapas.js'

function TarjetaOrden({ orden }) {
  const cliente = orden.expand?.cliente
  return (
    <Link to={`/ordenes/${orden.id}`} className="tarjeta">
      <div className="fila">
        <strong>{orden.equipo}</strong>
        <EtiquetaEtapa estado={orden.estado} />
      </div>
      <p className="problema">{orden.problema}</p>
      <p className="meta">
        {cliente ? `${cliente.nombre} · ${cliente.telefono}` : 'Cliente'} · Recibida el {fecha(orden.created)}
      </p>
    </Link>
  )
}

export default TarjetaOrden
