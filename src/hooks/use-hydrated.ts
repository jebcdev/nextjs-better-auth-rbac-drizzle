import * as React from "react"

/**
 * Barrera de hidratación para lo que depende del navegador.
 *
 * `next-themes` resuelve el tema en el cliente, así que en el servidor no hay
 * tema que renderizar. Este hook devuelve `false` durante el render de servidor
 * y en el primer render del cliente, y `true` a partir de ahí.
 *
 * Sustituye a `useState(false)` + `useEffect(() => setMounted(true), [])`: ese
 * patrón deriva estado dentro de un efecto, que es exactamente lo que la regla
 * `react-hooks/set-state-in-effect` prohíbe, y paga un render extra en cada
 * montaje.
 *
 * ⚠️ Los snapshots son **primitivos**. `useSyncExternalStore` compara el valor
 * nuevo con el anterior y re-renderiza si cambió: `() => ({ hydrated: true })`
 * devolvería un objeto nuevo en cada llamada y entraría en bucle infinito de
 * render. Con `true`/`false` no hay bucle.
 */
const subscribe = () => () => {}

const getSnapshot = () => true

const getServerSnapshot = () => false

export function useHydrated() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
