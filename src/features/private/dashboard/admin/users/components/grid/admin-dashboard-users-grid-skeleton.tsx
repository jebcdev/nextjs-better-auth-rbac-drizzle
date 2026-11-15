import { Skeleton } from "@/features/shared/components/ui/skeleton";

/**
 * Marcador de carga de la cuadrícula de usuarios.
 *
 * ⚠️ Va dentro del feature y no en `ui/`: solo esta cuadrícula lo usa, y el
 * proyecto ya guarda `profile-skeleton.tsx` junto a la vista que sirve. Lo
 * compartido es el PRIMITIVO (`ui/skeleton.tsx`), no la forma. El nombre del
 * proyecto de referencia, `PublicGridSkeleton`, además sería incorrecto: «public»
 * es lo contrario de una cuadrícula solo de administración.
 *
 * ⚠️ Reproduce la silueta de la vista real —barra de filtros, tarjetas, fila de
 * paginación— para que al sustituirlo por los resultados la página no dé un
 * salto. No contiene texto de cuenta, ni enlaces, ni nada enfocable: el
 * placeholder no puede confundirse con contenido.
 */
export const AdminDashboardUsersGridSkeleton = () => {
    return (
        <div className="space-y-4" aria-hidden="true">
            <div className="flex flex-wrap items-center gap-3">
                <Skeleton className="h-9 w-full max-w-sm" />
                <Skeleton className="h-9 w-48 rounded-4xl" />
                <Skeleton className="h-9 w-56 rounded-4xl" />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {Array.from({ length: 10 }).map((_, index) => (
                    <div
                        key={index}
                        className="rounded-2xl border border-border bg-card p-4 shadow-sm"
                    >
                        <div className="flex items-start gap-3">
                            <Skeleton className="size-10 rounded-full" />
                            <div className="flex-1 min-w-0 space-y-2">
                                <Skeleton className="h-5 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                            <Skeleton className="h-5 w-20 rounded-4xl" />
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2">
                            <Skeleton className="h-5 w-16 rounded-4xl" />
                            <Skeleton className="h-3 w-24" />
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 px-5">
                <Skeleton className="h-9 w-36 rounded-4xl" />
                <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, index) => (
                        <Skeleton key={index} className="size-9 rounded-4xl" />
                    ))}
                </div>
            </div>
        </div>
    );
};
