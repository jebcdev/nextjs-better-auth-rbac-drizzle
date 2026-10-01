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
 * - `role` es `string`, no `UserRole`. La columna es `text` y el plugin admin de
 *   better-auth guarda multi-rol como CSV (`setRole` acepta `string[]`), así que
 *   un valor como `"user,admin"` es legal. `UserRole` es el conjunto *conocido*
 *   en la app, no el dominio de la columna; tipar aquí como `UserRole` sería una
 *   mentira que la tarjeta tendría que deshacer en runtime.
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
    /** CSV de roles, tal y como lo almacena el plugin admin. Ver la nota de cabecera. */
    role: string;
    isActive: boolean;
    banned: boolean;
    /** ISO 8601. */
    createdAt: string;
    /** ISO 8601. */
    updatedAt: string;
}
