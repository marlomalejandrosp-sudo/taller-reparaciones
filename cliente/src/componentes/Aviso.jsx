// Mensaje de carga o de error
function Aviso({ tipo = 'info', children }) {
  return (
    <p className={'aviso ' + tipo} role={tipo === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  )
}

export default Aviso
