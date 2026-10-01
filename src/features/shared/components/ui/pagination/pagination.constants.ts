/**
 * Constantes del módulo de paginación.
 *
 * ⚠️ `PAGE_SIZE_OPTIONS` se declara `as const` a propósito: eso convierte la
 * lista en una tupla de literales y de ahí se deriva el tipo `PageSizeOption`
 * (`pagination.types.ts`). Si pierde el `as const`, el tipo degrada a `number`,
 * el `Select` deja de estar tipado por la lista que lo dibuja, y
 * `resolvePageSize()` devuelve `number` en vez de una opción concreta.
 *
 * La lista vive AQUÍ y solo aquí. El proyecto de referencia la declara dos
 * veces —una en `pagination.constants.ts` y otra dentro del propio
 * componente— y esa duplicación es exactamente lo que este módulo consolidation
 * evita (decisión D13).
 */

/** Tamaños de página que el control ofrece. `DEFAULT_PAGE_SIZE` va incluido. */
export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

/** Primera página. Toda página se acota por abajo a este valor. */
export const DEFAULT_PAGE = 1;

/** Tamaño de página cuando la URL no trae uno, o trae uno no válido. */
export const DEFAULT_PAGE_SIZE = 10;

/**
 * Techo duro del tamaño de página.
 *
 * No es el valor que se usa: `resolvePageSize()` estrecha más y solo acepta un
 * valor de `PAGE_SIZE_OPTIONS`. Es el límite documentado del módulo, y la razón
 * por la que un `?pageSize=99999` de la URL no se respeta.
 */
export const MAX_PAGE_SIZE = 100;

/** Nombres de los parámetros de URL que el módulo lee y escribe. */
export const PAGINATION_PARAM_PAGE = "page";
export const PAGINATION_PARAM_PAGE_SIZE = "pageSize";
export const PAGINATION_PARAM_SEARCH = "search";

/**
 * Los tres nombres juntos, para derivar `PaginationParamName` sin repetir
 * ningún literal.
 */
export const PAGINATION_PARAM_NAMES = [
    PAGINATION_PARAM_PAGE,
    PAGINATION_PARAM_PAGE_SIZE,
    PAGINATION_PARAM_SEARCH,
] as const;
