import type { PaginationParams } from "@/features/shared/components/ui";
import type { UserRole } from "@/lib/db/schema";

/**
 * Filtro de estado del listado de usuarios.
 *
 * ⚠️ Es un enum ÚNICO, no dos booleanos, porque la interfaz ofrece un solo grupo
 * de botones segmentados. Dos booleanos en la URL permitirían estados
 * (`inactive` Y `banned` a la vez) que el control no puede expresar, y el spec
 * acabaría describiendo una UI inalcanzable (decisión D2).
 *
 * ⚠️ `banned` NO se dobla dentro de `inactive`. Son banderas independientes: una
 * cuenta baneada que sigue marcada como activa pertenece a *Baneados* y no a
 * *Inactivos*. Mezclarlas trataría dos columnas distintas como una sola.
 */
export type AdminUserStatusFilter = "all" | "active" | "inactive" | "banned";

/**
 * Valor que puede mostrar el `Select` de rol.
 *
 * ⚠️ `all` es la opción «sin filtro» del desplegable y NUNCA viaja en la URL:
 * `updateParam` borra la clave cuando recibe `null`, de modo que «Todos los
 * roles» y «sin parámetro `role`» son la misma URL y la misma clave de caché. Por
 * eso `AdminUsersListParams.role` es `UserRole | undefined` y no este tipo.
 *
 * Y no es `UserRole` a secas porque el filtro ofrece **todos** los roles
 * conocidos, no solo `ADMIN_USERS_ROLES`: aquellos son los roles con los que se
 * entra al directorio, estos son los roles que se pueden buscar dentro.
 */
export type AdminUserRoleFilter = UserRole | "all";

/**
 * Parámetros del listado de usuarios.
 *
 * Extiende `PaginationParams` en vez de repetir sus campos: `page`, `pageSize` y
 * `search` son la parte compartida, y `role`/`status` son de ESTE feature. El
 * tipo compartido no se ensancha con un campo por listado.
 */
export interface AdminUsersListParams extends PaginationParams {
    /**
     * Rol a filtrar. Ausente = sin restricción.
     *
     * ⚠️ El tipo es `UserRole` y por eso el comentario no dice «vacío»: es el
     * mismo enum que declara la columna, así que no existe un rol vacío ni un
     * rol fuera del conjunto. La opción «sin filtro» se representa por la
     * AUSENCIA de la clave —o por `all` en el `Select`, que `updateParam`
     * borra al recibir `null`—, nunca por una cadena que haya que interpretar.
     */
    role?: UserRole;
    /** Estado a filtrar. `all` y ausente significan ambos «sin restricción». */
    status?: AdminUserStatusFilter;
}
