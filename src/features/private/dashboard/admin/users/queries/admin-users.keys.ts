import type { AdminUsersListParams } from "../components/grid";

/**
 * Fábrica de claves de caché del módulo de usuarios del panel.
 *
 * ⚠️ La clave de listado incluye los params NORMALIZADOS. Si incluidos los
 * crudos, `?search=` y la ausencia de `search` serían dos entradas de caché
 * distintas para exactamente el mismo resultado, y una navegación atrás/adelante
 * entre ellas dispararía una petición que no cambia ni una fila (decisión D19).
 *
 * La forma `all` / `lists()` / `list()` es la del proyecto de referencia y lo que
 * permite invalidar el grupo entero más adelante sin reescribir las claves.
 */
export const adminUsersKeys = {
    all: ["admin-users"] as const,
    lists: () => [...adminUsersKeys.all, "list"] as const,
    list: (params: AdminUsersListParams) =>
        [...adminUsersKeys.lists(), params] as const,

    // ⚠️ `detail` cuelga de `all`, NO de `lists()`. Una cuenta individual no es
    // «una página del listado con un filtro más»: no lleva paginación, ni `search`,
    // ni filtros de rol o estado, y meterla bajo `lists()` haría que una
    // invalidación del listado —que es lo que dispara cada alta y cada edición—
    // provocara además un refetch de una ficha que no ha cambiado.
    //
    // ⚠️ Y sin embargo las tres mutaciones SÍ invalidan `all` y no `detail()`: el
    // motivo es que `all` es la raíz de la que cuelgan las dos ramas, e invalidar
    // la raíz invalida las dos. La clave existe hoy para que el día en que la
    // ficha se lea desde el cliente sea una clave ya derivada de la raíz, y no un
    // `["admin-users-detail", id]` suelto que compila pero no es hijo de nada.
    detail: (userId: string) =>
        [...adminUsersKeys.all, "detail", userId] as const,

    // ⚠️ `mutations` NO invalida nada: las mutaciones no son una clave de caché,
    // son un espacio de nombres futuro para invalidar por acción cuando haya
    // alguna que afecte a una sola cuenta sin tocar el listado. Declararlo aquí,
    // derivado de `all` como el resto, evita el día en que aparezca un
    // `["admin-users-mutations"]` suelto que compila pero no es hijo de la raíz.
    mutations: () => [...adminUsersKeys.all, "mutation"] as const,
};
