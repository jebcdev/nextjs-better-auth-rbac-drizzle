"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/features/shared/components/ui/button";
import { GeneralPagination, NoData } from "@/features/shared/components/ui";
import {
    PAGINATION_PARAM_PAGE,
    PAGINATION_PARAM_PAGE_SIZE,
    PAGINATION_PARAM_SEARCH,
} from "@/features/shared/components/ui";
import {
    ADMIN_USERS_ROLE_PARAM,
    ADMIN_USERS_STATUS_PARAM,
} from ".";
import type {
    AdminUserStatusFilter,
    AdminUsersListParams,
} from ".";
import { useAdminUsersQuery } from "../../queries";
import { AdminDashboardUsersGridCard } from "./admin-dashboard-users-grid-card";
import { AdminDashboardUsersFilters } from "./admin-dashboard-users-filters";
import { AdminDashboardUsersGridSkeleton } from "./admin-dashboard-users-grid-skeleton";
import type { UserRole } from "@/lib/db/schema";

/**
 * Lee los params del listado desde la URL.
 *
 * ⚠️ La URL es la única fuente de verdad (decisión D2). Un param que el listado
 * no reconoce se ignora solo: aquí no se lee, así que no puede afectar a qué
 * usuarios se muestran.
 */
const useListingParams = (): AdminUsersListParams => {
    const searchParams = useSearchParams();

    return useMemo(() => {
        const role = searchParams.get(ADMIN_USERS_ROLE_PARAM);
        const status = searchParams.get(
            ADMIN_USERS_STATUS_PARAM,
        ) as AdminUserStatusFilter | null;

        return {
            page: Number(searchParams.get(PAGINATION_PARAM_PAGE) ?? "") || 1,
            pageSize:
                Number(
                    searchParams.get(PAGINATION_PARAM_PAGE_SIZE) ?? "",
                ) || undefined,
            search: searchParams.get(PAGINATION_PARAM_SEARCH) ?? undefined,
            ...(role ? { role: role as UserRole } : {}),
            ...(status ? { status } : {}),
        };
    }, [searchParams]);
};

export const AdminDashboardUsersGrid = ({
    viewerId,
}: {
    /** Id de quien mira la lista. Solo se reenvía: la tarjeta decide. */
    viewerId: string;
}) => {
    const params = useListingParams();
    const { data, isLoading, isError, refetch } = useAdminUsersQuery({
        params,
    });

    // ⚠️ `isLoading`, NO `isFetching`. Con `placeholderData: (prev) => prev` la
    // página anterior sigue visible durante cada refresco en segundo plano, y
    // `isFetching` está activo en cada uno de ellos —incluida la ventana de
    // `staleTime` y cualquier refetch por foco—, así que enlazar el `disabled`
    // a él dejaría los controles permanentemente grises sobre una cuadrícula que
    // funciona. `isLoading` es `true` solo cuando aún no hay datos, que es
    // exactamente cuando se muestra el marcador y cuando el spec exige que los
    // controles estén inertes (decisión D3).
    const controlsDisabled = isLoading;

    const items = data?.items ?? [];

    return (
        <div className="space-y-4">
            {/* ⚠️ La barra de filtros se dibuja SIEMPRE, también sobre el
                placeholder y sobre el error. Devolverla antes tenía dos costes:
                el placeholder ocupaba de más y violaba el spec, que dice que
                ocupa «la región donde aparecerán los resultados»; y, sobre todo,
                un fallo de listado dejaba al super admin encerrado, sin forma
                de quitar el filtro que lo provocó —solo podía reintentar lo
                mismo—. El spec pide que los controles «no sean activables» con el
                marcador, no que desaparezcan. */}
            <AdminDashboardUsersFilters disabled={controlsDisabled} />

            {isLoading ? (
                <AdminDashboardUsersGridSkeleton />
            ) : isError ? (
                // ⚠️ Bloque de error EN LÍNEA, deliberadamente. `src/app/error.tsx`
                // no es reutilizable aquí: no acepta props —el mensaje se
                // perdería— y renderiza su propio `<main>` a pantalla completa,
                // lo que anidaría un segundo landmark `main` dentro del de la
                // página (decisión D14). Mantener el encabezado visible es,
                // además, lo que hace posible reintentar.
                <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-card p-10 text-center">
                    <h2 className="text-lg font-semibold">
                        No se pudieron cargar los usuarios
                    </h2>
                    <p className="max-w-sm text-sm text-muted-foreground">
                        Ocurrió un error al obtener el listado. Puedes volver a
                        intentarlo o cambiar los filtros.
                    </p>
                    <Button variant="outline" onClick={() => refetch()}>
                        Reintentar
                    </Button>
                </div>
            ) : items.length === 0 ? (
                // Listado vacío ≠ fallo: el spec distingue ambos, y el error ya
                // se ha resuelto en la rama de arriba.
                <NoData />
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {items.map((user) => (
                        <AdminDashboardUsersGridCard
                            key={user.id}
                            user={user}
                            viewerId={viewerId}
                        />
                    ))}
                </div>
            )}

            {/* La paginación permanece operativa aunque el listado esté vacío: el
                spec exige que siga siendo manejable. `totalPages` mínimo de 1
                porque un total de 0 informa una página, no cero. */}
            <GeneralPagination
                totalPages={data?.totalPages ?? 1}
                disabled={controlsDisabled}
            />
        </div>
    );
};
