import type { UserRole } from "@/lib/db/schema";

/**
 * `AdminUserListItem` — la ÚNICA forma de una fila de usuario que puede cruzar
 * la frontera servidor/cliente desde el listado del panel de administración.
 *
 * ⚠️ Se escribe a mano, campo por campo, y NO se deriva de `UsersSelect` con
 * `Pick`/`Omit`. Un `Pick` es una lista negra encubierta: añadir una columna
 * sensible al esquema y ampliar el `Pick` es una edición de una palabra, sin
 * error de compilación. Aquí una columna nueva no puede propagarse porque no hay
 * de dónde copiarla (mismo motivo que `ProfileViewModel`, decisión D4).
 *
 * Reglas que este tipo respeta:
 * - Solo lo que la tarjeta dibuja. Ni `emailVerified`, ni `banReason`, ni
 *   `banExpires`, ni `tenantId`: son inventario que nadie pidió.
 * - `role` es `UserRole`, el dominio real de la columna. `users.role` es un
 *   `pgEnum` (`userRoleEnum`), así que una cuenta lleva UN valor del conjunto y
 *   nada fuera de él: tiparlo como `UserRole` dice la verdad y la tarjeta no
 *   tiene que deshacerla en runtime. Un rol es un dato, no texto libre que
 *   pueda venir en CSV o ser unrecognized.
 * - `isActive` y `banned` son `boolean` y no `boolean | null`: ambas columnas
 *   son nullable en el esquema y el resto de la app ya las lee por veracidad, así
 *   que la normalización ocurre UNA vez, aquí en el action con `?? false`. La
 *   tarjeta nunca vuelve a derivar esa regla.
 * - Todas las fechas son cadenas ISO 8601: ninguna instancia de `Date` cruza
 *   hacia el navegador.
 */
export interface AdminUserListItem {
    id: string;
    name: string;
    email: string;
    image: string | null;
    /** Un solo rol, tal y como lo declara el enum de la columna. */
    role: UserRole;
    isActive: boolean;
    banned: boolean;
    /** ISO 8601. */
    createdAt: string;
    /** ISO 8601. */
    updatedAt: string;
}
