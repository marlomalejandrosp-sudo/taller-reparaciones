import { Link } from 'react-router'

function NoEncontrada() {
  return (
    <div className="no-encontrada">
      <h1>Página no encontrada</h1>
      <p>La dirección que buscas no existe en el taller.</p>
      <Link to="/" className="boton principal">Volver al panel</Link>
    </div>
  )
}

export default NoEncontrada
