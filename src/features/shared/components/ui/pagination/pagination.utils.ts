/**
 * Reglas de acotado del módulo de paginación.
 *
 * ⚠️ Este archivo es ISOMÓRFICO a propósito: no importa React, ni
 * `next/navigation`, ni la base de datos. Por eso el MISMO código acota la
 * página en el control del cliente y en la server action, y los dos no pueden
 * discrepar sobre qué es un tamaño de página válido (decisión D19).
 *
 * Antes de este archivo la regla estaba escrita dos veces —en el componente y en
 * la acción—, sin fuente común. Dos copias de una regla son exactamente el fallo
 * que el proyecto de referencia ya comete —`PAGE_SIZE_OPTIONS` declarado dos
 * veces—, así que aquí hay una sola y se llama.
 */
import {
    DEFAULT_PAGE,
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    PAGE_SIZE_OPTIONS,
} from "./pagination.constants";
import type { PageSizeOption } from "./pagination.types";
import type { PaginationParams } from "./pagination.interfaces";

/**
 * Lee un valor numérico que puede venir de la URL (siempre `string`) o de un
 * parámetro ya tipado. Devuelve `null` cuando no hay número utilizable, para que
 * quien llama decida el sustituto en vez de recibir un `NaN` disfrazado.
 */
const toFiniteNumber = (value: unknown): number | null => {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }

    if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed === "") return null;

        const parsed = Number(trimmed);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
};

/**
 * Acota el tamaño de página al conjunto que el control sabe ofrecer.
 *
 * ⚠️ Un `?pageSize=99999` o un `?pageSize=abc` NO se respetan: caen al
 * `DEFAULT_PAGE_SIZE`. Honrarlos deja el `Select` sin nada seleccionado, que es
 * la razón por la que el proyecto de referencia renderiza un desplegable vacío
 * con `?pageSize=99999` en la barra de direcciones.
 */
export function resolvePageSize(value: unknown): PageSizeOption {
    const parsed = toFiniteNumber(value);

    if (parsed === null) return DEFAULT_PAGE_SIZE;

    // Fuera del rango utilizable (por debajo de 1 o por encima del techo duro) no
    // hay ningún valor cercano que ofrecer, así que se sustituye entero.
    if (parsed < 1 || parsed > MAX_PAGE_SIZE) return DEFAULT_PAGE_SIZE;

    // Dentro del rango solo vale un tamaño que el control dibuja de verdad.
    const offered = PAGE_SIZE_OPTIONS.find((size) => size === parsed);
    return offered ?? DEFAULT_PAGE_SIZE;
}

/**
 * Acota el número de página.
 *
 * Por abajo nunca baja de `DEFAULT_PAGE`. Si se conoce `totalPages`, por arriba
 * tampoco la supera: pedir la página 9 de un listado de 3 devuelve la 3, no un
 * hueco vacío, y el control nunca ofrece un botón por encima del último.
 */
export function clampPage(value: unknown, totalPages?: number): number {
    const parsed = toFiniteNumber(value);
    const atLeastFirst = Math.max(
        DEFAULT_PAGE,
        Math.trunc(parsed ?? DEFAULT_PAGE),
    );

    if (typeof totalPages !== "number" || !Number.isFinite(totalPages)) {
        return atLeastFirst;
    }

    const lastPage = Math.max(DEFAULT_PAGE, Math.trunc(totalPages));
    return Math.min(atLeastFirst, lastPage);
}

/**
 * Normaliza los parámetros de paginación a una forma estable.
 *
 * ⚠️ Este es el motivo de que exista: `?search=` (valor vacío) y la ausencia de
 * `search` describen el mismo listado, así que deben producir los MISMOS
 * parámetros y por tanto la MISMA clave de caché. Si la normalización viviera en
 * el hook y en la acción por separado, dos URLs equivalentes dispararían dos
 * peticiones y la caché se fragmentaría por una diferencia que no cambia ni un
 * resultado (decisión D19, tarea 5.3).
 *
 * El genérico preserva los filtros propios de la feature: normalizar la
 * paginación no debe borrar `role` ni `status`.
 */
export function normalizePaginationParams<T extends PaginationParams>(
    params: T,
): Omit<T, "page" | "pageSize" | "search"> & {
    page: number;
    pageSize: PageSizeOption;
    search?: string;
} {
    const search = params.search?.trim();

    return {
        ...params,
        page: clampPage(params.page),
        pageSize: resolvePageSize(params.pageSize),
        ...(search ? { search } : { search: undefined }),
    };
}
