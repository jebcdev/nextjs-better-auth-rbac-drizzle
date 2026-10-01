import { USER_ROLES, USER_ROLE_LABELS } from "@/lib/utils/enums-labels";
import type {
    AdminUserRoleFilter,
    AdminUserStatusFilter,
} from "./admin-users-list-params";

/**
 * Constantes de ESTE módulo.
 *
 * ⚠️ Todo lo que hay aquí lo consume la barra de filtros, que es un Client
 * Component, así que este archivo está en el grafo del navegador y **no** puede
 * leer `process.env`: Next.js solo inlinea las `NEXT_PUBLIC_*`. La constante de
 * autorización vive en `admin-users-roles.constants.ts` y la usan solo la página
 * y la server action.
 */

/**
 * Opciones del `Select` de rol.
 *
 * ⚠️ Se ofrecen TODOS los roles conocidos, no `ADMIN_USERS_ROLES`. Esa constante
 * responde a «quién puede abrir este directorio»; esta responde a «qué roles
 * puedo buscar dentro». Confundirlas fue el error que dejó el filtro con una
 * única opción, *Administrador*, y por tanto inútil.
 */
export const ADMIN_USERS_ROLE_OPTIONS: AdminUserRoleFilter[] = [
    "all",
    ...USER_ROLES,
];

/** Etiquetas del `Select` de rol, incluidas las de `all`. */
export const ADMIN_USERS_ROLE_LABELS: Record<AdminUserRoleFilter, string> = {
    all: "Todos los roles",
    ...USER_ROLE_LABELS,
};

/**
 * Los mismos roles como pares valor/etiqueta, para el `items` del `Select`.
 *
 * ⚠️ No es opcional. `SelectValue` saca la etiqueta del `SelectItem` que
 * corresponde, y los items viven dentro de `SelectContent`, que está en un portal
 * y **solo se monta cuando el desplegable está abierto**. Con el popup cerrado no
 * hay ningún item en el DOM, así que base-ui cae al VALOR crudo y el disparador
 * escribe literalmente `all` o `admin` en vez de *Todos los roles*. Al abrir el
 * desplegable se ve bien porque ahí sí están montados; al seleccionar, se vuelve
 * a mostrar el valor crudo. Pasar `items` le da el mapa valor→etiqueta sin
 * depender de que el popup esté abierto.
 *
 * Se deriva de las dos constantes de arriba, así que no puede desincronizarse.
 */
export const ADMIN_USERS_ROLE_ITEMS = ADMIN_USERS_ROLE_OPTIONS.map((role) => ({
    value: role,
    label: ADMIN_USERS_ROLE_LABELS[role],
}));

/** Etiquetas del grupo de estado, en el orden en que se muestran. */
export const ADMIN_USERS_STATUS_LABELS: Record<AdminUserStatusFilter, string> =
    {
        all: "Todos",
        active: "Activos",
        inactive: "Inactivos",
        banned: "Baneados",
    };

/** Opciones del grupo segmentado de estado. */
export const ADMIN_USERS_STATUS_OPTIONS: AdminUserStatusFilter[] = [
    "all",
    "active",
    "inactive",
    "banned",
];

/** Parámetro de URL del filtro de rol. Propio de ESTE feature, no del módulo de paginación. */
export const ADMIN_USERS_ROLE_PARAM = "role";

/** Parámetro de URL del filtro de estado. Propio de ESTE feature. */
export const ADMIN_USERS_STATUS_PARAM = "status";

/** Ruta de edición de un usuario. Ya existe; la tarjeta solo navega ahí. */
export const ADMIN_USERS_DETAIL_PATH = "/panel/admin/usuarios";
