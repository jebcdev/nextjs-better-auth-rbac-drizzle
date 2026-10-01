---
# Guía de uso del módulo de paginación

Este módulo está pensado para que cualquier listado en el proyecto use **una sola
fuente de verdad** para la paginación. Todo lo que le pertenece vive en una única
carpeta: `features/shared/components/ui/pagination/`. No se creó una carpeta de
constantes en `features/shared`, ni sus tipos se han añadido al
barrel de `features/shared/types/`.

## 1. Estructura de archivos

```text
src/features/shared/components/ui/pagination/
├── pagination.constants.ts      # Constantes y nombres de parámetros URL
├── pagination.types.ts          # Uniones derivadas de las constantes
├── pagination.interfaces.ts     # Formas (PaginationParams, PaginatedData...)
├── pagination.utils.ts          # Helpers isomórficos (resolve/clamp/normalize)
├── general-pagination.tsx       # Componente cliente <GeneralPagination />
├── pagination-usage-guide.md    # Esta guía
└── index.ts                     # Barrel explícito del módulo (sin export *)
```

Además, el barrel del módulo se reexporta desde:

```text
src/features/shared/components/ui/index.ts
```

De ese modo un feature puede importar cualquier símbolo de paginación a través
del barrel `ui/` o directamente desde `ui/pagination`.

## 2. Exports públicos

**Desde `features/shared/components/ui/pagination` (barrel):**

- `PAGE_SIZE_OPTIONS` (`as const`): `[10, 25, 50]`.
- `DEFAULT_PAGE` (número), `DEFAULT_PAGE_SIZE` (número), `MAX_PAGE_SIZE` (número).
- `PAGINATION_PARAM_PAGE`, `PAGINATION_PARAM_PAGE_SIZE`, `PAGINATION_PARAM_SEARCH`.
- `PAGINATION_PARAM_NAMES` (`as const`).
- `GeneralPagination` (componente cliente).
- `resolvePageSize(value: unknown): PageSizeOption`
- `clampPage(value: unknown, totalPages?: number): number`
- `normalizePaginationParams<T extends PaginationParams>(params: T)`

**Tipos:**

- `PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number]`
- `PaginationParamName = (typeof PAGINATION_PARAM_NAMES)[number]`
- `PaginationParams` (`page?`, `pageSize?` como `number`, `search?`)
- `PaginatedData<T>` (respuesta paginada estándar)
- `GeneralPaginationProps` (`{ totalPages, disabled? }`)

## 3. Contrato de URL

El módulo lee y escribe **solo** estos tres parámetros de query:

- `page` — número de página, 1-based.
- `pageSize` — tamaño de página. Solo se acepta uno de `PAGE_SIZE_OPTIONS`.
- `search` — término de búsqueda de texto libre (trimmeado).

> **Por qué los filtros del feature no van aquí:** `status`, `role`, `type`, `isActive` son específicos del listado. Ponerlos en el tipo compartido haría que el módulo deje de ser reutilizable (decisión D1). Cada feature declara sus propios filtros en su `params` y extiende `PaginationParams` si lo necesita.

## 4. Reglas clave para no introducir bugs

Hay cuatro reglas que el módulo obliga a respetar. No ignorarlas al escribir la action o el hook de tu listado:

1. **Paginar en SQL con un orden total (más un tiebreaker único).** No ordenes solo por `asc(name)` cuando `name` no es único: añade `asc(id)` (o un campo único). En caso contrario, las filas se duplican o desaparecen entre páginas.
2. **Usar una única `conditions: SQL[]` para el `count` y para las filas.** Tanto el `SELECT count()` como el `SELECT` de la página deben construirse con la misma `whereClause` (`and(...conditions)`). Así el total cuenta exactamente las filas que pasan los filtros.
3. **Para flags nullable (como `isActive`/`banned`), incluir un brazo `isNull`.** En SQL, `eq(col, false)` **no** coincide con `NULL`. Para un filtro `inactive` debe existir `or(eq(col, false), isNull(col))`. Esto es lo que evita que las filas con `NULL` desaparezcan de los listados.
4. **El `pageSize` fuera del conjunto ofrecido cae al valor por defecto.** Nunca hagas `parseInt` a secas para el valor de la URL. Usa `resolvePageSize()` (o `normalizePaginationParams()`). Así el componente y la action siempre están de acuerdo con el acotado.

## 5. Cómo wirear un nuevo listado

Sigue estos pasos, en este orden:

### 5.1 Declara los params del feature

En `features/private/tu-feature/types/` crea algo como:

```ts
import type { PaginationParams } from "@/features/shared/components/ui/pagination";

export type AdminUserStatusFilter = "all" | "active" | "inactive" | "banned";

export interface AdminUsersListParams extends PaginationParams {
    role?: UserRole;
    status?: AdminUserStatusFilter;
}
```

> **No** añadas `type` ni `isActive` a `PaginationParams`. Esos son filtros, no paginación.

### 5.2 Escribe la server action

En `actions/get-all-tu-feature.action.ts`:

- Usa `"use server"` **solo** (no `server-only` si lo llamas desde un hook cliente).
- Revalida al llamador con tu guard (por ejemplo `getSessionDetails()` + `hasRequiredRole`).
- Acepta **solo** parámetros —nunca un id de cuenta para "desviar" qué cuentas devuelve.
- Normaliza y acota con el módulo:

```ts
import {
    normalizePaginationParams,
    clampPage,
    resolvePageSize,
} from "@/features/shared/components/ui/pagination";
import { DEFAULT_PAGE_SIZE } from "@/features/shared/components/ui/pagination";
import type { PaginatedData } from "@/features/shared/components/ui/pagination";

const normalized = normalizePaginationParams(params);
const page = clampPage(normalized.page);
const pageSize = resolvePageSize(normalized.pageSize);
const offset = (page - 1) * pageSize;
```

- Construye **un único** `conditions: SQL[]` y pásalo a ambos queries (`count` y filas) con `Promise.all`.
- Aplica filtros del feature: `search` va como `or(ilike(...), ilike(...))` y solo cuando el término trimmeado no esté vacío. Para flags nullable, no olvides `isNull` en el caso `inactive`.
- Ordena determinista: `orderBy(asc(table.campo), asc(table.id))`.
- Proyecta **clave por clave** (DTO a mano), nunca con `spread` de la fila cruda. Convierte fechas a ISO 8601 (`.toISOString()`).
- Devuelve `IGeneralResponse<PaginatedData<T> | null>`. En error loguea solo `error.name` + un reason code, nunca params, emails ni el error completo.

### 5.3 Crea query keys y hook

En `queries/tu-feature.keys.ts`:

```ts
import type { TuFeatureListParams } from "../components/grid";

export const tuFeatureKeys = {
    all: ["tu-feature"] as const,
    lists: () => [...tuFeatureKeys.all, "list"] as const,
    list: (params: TuFeatureListParams) =>
        [...tuFeatureKeys.lists(), params] as const,
};
```

En `queries/use-tu-feature.query.ts` (cliente):

```ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { tuFeatureKeys } from "./tu-feature.keys";
import { getAllTuFeatureAction } from "../actions";

export function useTuFeatureQuery({ params, enabled = true }: Options) {
    // Normaliza ANTES de construir la key (trim search, drop vacíos, defaults)
    const normalizedParams = {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
        search: params.search?.trim() || undefined,
        role: params.role || undefined,
        status: params.status === "all" ? undefined : params.status,
    } satisfies TuFeatureListParams;

    return useQuery({
        queryKey: tuFeatureKeys.list(normalizedParams),
        queryFn: async () => {
            const response = await getAllTuFeatureAction(normalizedParams);
            if (!response.success || !response.data) {
                throw new Error(response.message ?? "Error al consultar");
            }
            return response.data;
        },
        enabled,
        placeholderData: (prev) => prev,
    });
}
```

> **Importante:** `placeholderData: (prev) => prev` mantiene visible la página anterior durante un cambio de página/filtros. Por eso los controles deben estar `disabled={isLoading}` y **NO** `disabled={isFetching}` (decisión D3).

### 5.4 Filtros + Grid + Paginación (cliente)

El grid cliente lee `useSearchParams()` para los params de URL. Al actualizar filtros o tamaño de página, **siempre resetea `page` a `1`**.

- Filtros: un único `updateParam(key, value)` que borra la clave si `value` es `""` o `null`, y hace `params.set("page", "1")` antes de `router.push`. Usa las constantes `PAGINATION_PARAM_PAGE`, etc., nunca literales si quieres mantener el contrato centralizado.
- Búsqueda: debounce 300ms, `lastAppliedSearchRef` para evitar push en mount, y un effect que resynca el input con la URL cuando el término aplicado cambia (back/forward).
- Grid: renderiza **en este orden** — placeholder (`isLoading`), bloque de error con `refetch()`, `<NoData />` si `data.items.length === 0`, else cards. **No** importes `src/app/error.tsx` (toma 0 props y renderiza otro `<main>`).
- Paginación: renderiza `<GeneralPagination totalPages={data.totalPages} disabled={isLoading} />` justo debajo del grid.

## 6. Cómo verificar

- Typecheck: `pnpm tsc --noEmit` sin nuevos errores.
- Lint: `pnpm lint` (objetivo: **0 errores**, warnings solo en `profile-sections.tsx` tal como está en baseline).
- Build: `pnpm build` (no debe añadir errores de ruta nuevos).
- En el navegador: deep link con `page`, `pageSize`, `search`, `role`, `status` reproduce el estado; reload lo conserva; back/forward revierte tanto grid como input; un `pageSize` inválido cae al por defecto.

## 7. Notas sobre este módulo

- **Self-contained:** cualquier símbolo se resuelve a través de `features/shared/components/ui` (el barrel `ui/` reexporta el barrel `pagination/`). `features/shared/types/index.ts` **no** fue modificado, y `features/shared/` no ganó ninguna carpeta nueva.
- **Sin `export *`:** el barrel es explícito. Eso evita que la extensión `export-all` de VS Code (que no mira dentro de este subfolder) borre o complete de forma inesperada.
- **Derivación de tipos:** `PageSizeOption` se deriva de `PAGE_SIZE_OPTIONS` (`as const`). Si añades un tamaño, el tipo crece solo.
- **Isomórfico por diseño:** `pagination.utils.ts` no toca React ni Next, para que cliente y servidor compartan la misma lógica de acotado.

¿Tienes dudas sobre un paso en concreto? Sigue este orden y usa las funciones de los `.utils.ts` en lugar de rederivar los límites inline.
