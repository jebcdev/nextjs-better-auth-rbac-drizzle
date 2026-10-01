/**
 * Formas del módulo de paginación: estructuras con campos cuyo tipo varía.
 *
 * ⚠️ `PaginationParams` NO lleva los filtros de la feature que la consume. El
 * proyecto de referencia declara aquí `type?: string` e `isActive?: boolean`,
 * que no son paginación sino filtros de *categorías*: un tipo compartido que
 * acumula un campo por feature deja de ser compartido, y la segunda cuadricula
 * tendría que añadir un tercer campo ajeno. Los filtros de usuarios viven en
 * `AdminUsersListParams`, que extiende esta interfaz (decisión D1).
 *
 * ⚠️ `pageSize` es `number`, no `PageSizeOption`, y esa asimetría es
 * deliberada: de una URL puede llegar cualquier cosa, así que este tipo
 * describe la entrada NO confiable y `resolvePageSize()` es quien la estrecha.
 * Tiparlo como la unión obligaría a un cast en cada llamador y escondería el
 * paso de acotar (decisiones D1 y D18).
 */

/** Los parámetros que el módulo de paginación entiende. */
export interface PaginationParams {
    page?: number;
    pageSize?: number;
    /** Búsqueda de texto libre. Es el único texto que el control compartido toca. */
    search?: string;
}

/**
 * Una página de resultados más lo necesario para dibuja la paginación.
 *
 * `total` cuenta las filas que pasan los filtros, no el tamaño de `items`: un
 * listado que devuelve 10 filas de un total de 240 necesita los dos números, y
 * confundirlos es lo que hace que el control salte de página.
 */
export interface PaginatedData<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

/** Props de `GeneralPagination`. */
export interface GeneralPaginationProps {
    /** Páginas que existen. El control nunca ofrece una por encima de este valor. */
    totalPages: number;
    /** Inutiliza todos los controles (paginación y tamaño de página). */
    disabled?: boolean;
}
