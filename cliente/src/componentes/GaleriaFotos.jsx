import { urlFoto } from '../api.js'

// Fotos guardadas en PocketBase: miniatura que abre la foto completa
function GaleriaFotos({ orden }) {
  if (!orden.fotos?.length) return <p className="vacio">Esta orden no tiene fotos.</p>
  return (
    <div className="galeria">
      {orden.fotos.map((archivo, i) => (
        <a key={archivo} href={urlFoto(orden, archivo)} target="_blank" rel="noreferrer">
          <img src={urlFoto(orden, archivo, '120x120')} alt={`Foto ${i + 1} del equipo ${orden.equipo}`} width="120" height="120" />
        </a>
      ))}
    </div>
  )
}

export default GaleriaFotos
