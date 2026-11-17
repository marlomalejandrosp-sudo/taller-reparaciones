import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { cambiarEtapa, listarEventos, obtenerOrden } from '../api.js'
import { etiqueta, fecha, tienePresupuesto } from '../etapas.js'
import { useAlVolver } from '../hooks/useAlVolver.js'
import Aviso from '../componentes/Aviso.jsx'
import AccionesOrden from '../componentes/AccionesOrden.jsx'
import EtiquetaEtapa from '../componentes/EtiquetaEtapa.jsx'
import FormPresupuesto from '../componentes/FormPresupuesto.jsx'
import GaleriaFotos from '../componentes/GaleriaFotos.jsx'
import Historial from '../componentes/Historial.jsx'
import Presupuesto from '../componentes/Presupuesto.jsx'
import Progreso from '../componentes/Progreso.jsx'

// Detalle de una orden (/ordenes/:id): datos, etapa, presupuesto, fotos e historial
function DetalleOrden() {
  const { id } = useParams()
  const [orden, setOrden] = useState(null)
  const [eventos, setEventos] = useState([])
  const [errorCarga, setErrorCarga] = useState(null)
  const [version, setVersion] = useState(0)
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState(null) // { tipo, texto } tras una acción

  const recargar = useCallback(() => setVersion((v) => v + 1), [])
  useAlVolver(recargar)

  // Se vuelve a pedir al cambiar el id de la URL o al pedir una recarga
  useEffect(() => {
    const control = new AbortController()
    Promise.all([obtenerOrden(id, control.signal), listarEventos(id, control.signal)])
      .then(([o, evs]) => {
        setOrden(o)
        setEventos(evs)
        setErrorCarga(null)
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setErrorCarga(e)
      })
    return () => control.abort()
  }, [id, version])

  // Cambia la etapa en el servidor y vuelve a leer la orden: lo que se ve es siempre lo guardado
  async function cambiar(estado, presupuesto) {
    setOcupado(true)
    setAviso(null)
    try {
      await cambiarEtapa(id, estado, presupuesto)
      setAviso({ tipo: 'ok', texto: `La orden pasó a "${etiqueta(estado)}".` })
    } catch (e) {
      // Puede que otra persona la haya cambiado: el servidor lo rechaza y recargamos
      setAviso({ tipo: 'error', texto: e.message })
    } finally {
      setOcupado(false)
      recargar()
    }
  }

  if (errorCarga) {
    return (
      <>
        <Aviso tipo="error">{errorCarga.status === 404 ? 'No existe esa orden.' : errorCarga.message}</Aviso>
        <Link to="/ordenes">← Volver a las órdenes</Link>
      </>
    )
  }
  if (!orden) return <Aviso>Cargando…</Aviso>

  const cliente = orden.expand?.cliente

  return (
    <>
      <Link to="/ordenes" className="volver">← Órdenes</Link>
      <div className="titulo">
        <h1>{orden.equipo}</h1>
        <EtiquetaEtapa estado={orden.estado} />
      </div>

      <Progreso estado={orden.estado} />
      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}
      <AccionesOrden estado={orden.estado} ocupado={ocupado} onCambiar={(estado) => cambiar(estado)} />

      <div className="columnas">
        <div>
          <section className="caja">
            <h2>Datos de la orden</h2>
            <dl>
              <dt>Cliente</dt>
              <dd>{cliente ? <>{cliente.nombre} · <a href={`tel:${cliente.telefono}`}>{cliente.telefono}</a></> : '—'}</dd>
              <dt>Recibida</dt>
              <dd>{fecha(orden.created, true)}</dd>
              <dt>Problema</dt>
              <dd>{orden.problema}</dd>
            </dl>
          </section>

          <section className="caja">
            <h2>Presupuesto</h2>
            {orden.estado === 'en_diagnostico' ? (
              <FormPresupuesto ocupado={ocupado} onEnviar={(datos) => cambiar('presupuestada', datos)} />
            ) : tienePresupuesto(orden) ? (
              <Presupuesto orden={orden} />
            ) : (
              <p className="vacio">Se registra al terminar la revisión del equipo.</p>
            )}
          </section>
        </div>

        <div>
          <section className="caja">
            <h2>Fotos</h2>
            <GaleriaFotos orden={orden} />
          </section>
          <section className="caja">
            <h2>Historial</h2>
            <Historial eventos={eventos} />
          </section>
        </div>
      </div>
    </>
  )
}

export default DetalleOrden
