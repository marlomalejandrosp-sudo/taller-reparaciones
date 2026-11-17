import { etiqueta } from '../etapas.js'

function EtiquetaEtapa({ estado }) {
  return <span className={'etapa e-' + estado}>{etiqueta(estado)}</span>
}

export default EtiquetaEtapa
