/**
 * Vocabulario del módulo de paginación: conjuntos cerrados de literales.
 *
 * ⚠️ Ninguna unión de este archivo repite un literal que ya declara
 * `pagination.constants.ts`: las dos se derivan de las constantes. Si alguien
 * añade un tamaño de página a `PAGE_SIZE_OPTIONS`, `PageSizeOption` lo hereda
 * solo; si alguien añade un parámetro a `PAGINATION_PARAM_NAMES`,
 * `PaginationParamName` también. Ese es el motivo de que estos tipos vivan
 * aparte de las formas (`pagination.interfaces.ts`).
 */

import type {
    PAGE_SIZE_OPTIONS,
    PAGINATION_PARAM_NAMES,
} from "./pagination.constants";

/** Un tamaño de página que el control sabe ofrecer. */
export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

/** Un parámetro de URL del que el módulo se ocupa. */
export type PaginationParamName = (typeof PAGINATION_PARAM_NAMES)[number];
