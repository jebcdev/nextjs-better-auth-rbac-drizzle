import * as React from "react"

const MOBILE_BREAKPOINT = 768

const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

/**
 * Suscripción a `matchMedia`: el "store" externo que este hook describe ya
 * existía, solo que se alimentaba con un `setState` dentro de un efecto, lo que
 * provocaba un render extra en cada montaje.
 *
 * `matchMedia` se consulta por evento, no por lectura: se crea un objeto nuevo
 * en cada llamada a `subscribe` y a `getSnapshot`. Es lo que hace el patrón
 * canónico de la documentación de React, así que la identidad no se cachea.
 */
const subscribe = (callback: () => void) => {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}

const getSnapshot = () => window.matchMedia(QUERY).matches

/**
 * ⚠️ `false` a propósito, no `getSnapshot()`.
 *
 * Antes el hook devolvía `!!isMobile` con `isMobile` inicialmente `undefined`,
 * así que el primer render ya devolvía `false` también en el cliente. Devolver
 * `false` en el servidor preserva ese primer render y mantiene la hidratación
 * intacta; React re-renderiza con el snapshot de cliente justo después, que es
 * el mismo intercambio que hacía el efecto. Devolver el valor real en el
 * servidor produciría HTML de escritorio en un móvil y una discrepancia de
 * hidratación en `sidebar.tsx:182`.
 */
const getServerSnapshot = () => false

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
