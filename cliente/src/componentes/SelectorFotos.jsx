import { useEffect, useRef } from 'react'

// Vista previa de una foto elegida en el equipo, antes de subirla.
// URL.createObjectURL crea una dirección temporal que hay que liberar: eso es la limpieza del efecto.
function Miniatura({ archivo }) {
  const imgRef = useRef(null)

  useEffect(() => {
    const url = URL.createObjectURL(archivo)
    imgRef.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [archivo])

  return <img ref={imgRef} alt={archivo.name} width="96" height="96" />
}

// Elegir hasta 3 fotos. Las fotos viven en el estado del padre (fotos / onCambiar).
function SelectorFotos({ fotos, onCambiar, max = 3 }) {
  const inputRef = useRef(null)

  function elegir(evento) {
    const nuevas = Array.from(evento.target.files).filter((f) => f.type.startsWith('image/'))
    onCambiar([...fotos, ...nuevas].slice(0, max))
    inputRef.current.value = '' // permite volver a elegir el mismo archivo
  }

  function quitar(indice) {
    onCambiar(fotos.filter((_, i) => i !== indice))
  }

  return (
    <div className="campo">
      <span className="etiqueta">Fotos del equipo (hasta {max})</span>
      <div className="galeria">
        {fotos.map((archivo, i) => (
          <figure key={archivo.name + archivo.lastModified + i}>
            <Miniatura archivo={archivo} />
            <button type="button" className="quitar" onClick={() => quitar(i)} aria-label={`Quitar ${archivo.name}`}>✕</button>
          </figure>
        ))}
      </div>
      {fotos.length < max && (
        <button type="button" onClick={() => inputRef.current.click()}>+ Agregar fotos</button>
      )}
      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={elegir} />
    </div>
  )
}

export default SelectorFotos
