import type { AdminUsersListParams } from "../components/grid";

/**
 * Fábrica de claves de caché del listado de usuarios.
 *
 * ⚠️ La clave incluye los params NORMALIZADOS. Si incluidos los crudos,
 * `?search=` y la ausencia de `search` serían dos entradas de caché distintas
 * para exactamente el mismo resultado, y una navegación atrás/adelante entre
 * ellas dispararía una petición que no cambia ni una fila (decisión D19).
 *
 * La forma `all` / `lists()` / `list()` es la del proyecto de referencia y lo que
 * permite invalidar el grupo entero más adelante sin reescribir las claves.
 */
export const adminUsersKeys = {
    all: ["admin-users"] as const,
    lists: () => [...adminUsersKeys.all, "list"] as const,
    list: (params: AdminUsersListParams) =>
        [...adminUsersKeys.lists(), params] as const,
};
