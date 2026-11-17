import { useEffect } from 'react'

// Ejecuta alVolver cada vez que el usuario regresa a esta pestaña.
// Así, si alguien cambió algo desde otro navegador, la pantalla se pone al día.
// alVolver debe ser una función estable (useCallback) para no repetir la suscripción.
export function useAlVolver(alVolver) {
  useEffect(() => {
    window.addEventListener('focus', alVolver)
    return () => window.removeEventListener('focus', alVolver) // limpieza
  }, [alVolver])
}
