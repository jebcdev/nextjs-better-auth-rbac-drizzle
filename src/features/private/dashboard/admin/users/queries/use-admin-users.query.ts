"use client";

import { useQuery } from "@tanstack/react-query";

import {
    DEFAULT_PAGE,
    DEFAULT_PAGE_SIZE,
    resolvePageSize,
    type PaginatedData,
} from "@/features/shared/components/ui";
import { getAllUsersAction } from "../actions";
import type {
    AdminUserListItem,
    AdminUsersListParams,
} from "../components/grid";
import { adminUsersKeys } from "./admin-users.keys";

interface Options {
    params: AdminUsersListParams;
    enabled?: boolean;
}

/**
 * Normaliza los params ANTES de construir la clave de caché.
 *
 * ⚠️ El orden importa: si la clave se construyera con los params crudos,
 * `?search=` (valor vacío) y la ausencia de `search` darían dos claves
 * distintas para el mismo listado. Se recorta el término, se descartan el rol
 * vacío y el estado `all`, y `page`/`pageSize` caen al valor por defecto o al
 * conjunto ofrecido. Lo que sale de aquí es a la vez la clave y el argumento de
 * la action, así que el control de cliente y la consulta no pueden discrepar.
 */
const normalizeParams = (
    params: AdminUsersListParams,
): AdminUsersListParams => ({
    page: params.page ?? DEFAULT_PAGE,
    pageSize: resolvePageSize(params.pageSize ?? DEFAULT_PAGE_SIZE),
    ...(params.search?.trim() ? { search: params.search.trim() } : {}),
    ...(params.role ? { role: params.role } : {}),
    ...(params.status && params.status !== "all"
        ? { status: params.status }
        : {}),
});

export function useAdminUsersQuery({ params, enabled = true }: Options) {
    const normalizedParams = normalizeParams(params);

    return useQuery<PaginatedData<AdminUserListItem>, Error>({
        queryKey: adminUsersKeys.list(normalizedParams),
        queryFn: async () => {
            const response = await getAllUsersAction(normalizedParams);

            if (!response.success || !response.data) {
                throw new Error(
                    response.message ?? "Error al consultar los usuarios",
                );
            }

            return response.data;
        },
        enabled,
        // ⚠️ Mantiene visibles las tarjetas de la página anterior mientras llega
        // la nueva. Sin esto, cambiar de página vaciaría la cuadrícula y el
        // `isLoading` del grid volvería a ser `true` en cada navegación, que es
        // justo lo que el skeleton no debe hacer.
        placeholderData: (prev) => prev,
    });
}
