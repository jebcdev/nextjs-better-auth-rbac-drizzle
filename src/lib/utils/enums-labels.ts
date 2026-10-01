import type { UserRole } from "@/lib/db/schema";

// ─── ROL DE USUARIO ───────────────────────────────────────────────────────────

export const USER_ROLE_LABELS: Record<UserRole, string> = {
    admin: "Administrador",
    user: "Usuario",
    guest: "Invitado",
};

export function getUserRoleLabel(role: UserRole): string {
    return USER_ROLE_LABELS[role];
}

/**
 * Los roles conocidos, en el orden en que se ofrecen al usuario.
 *
 * ⚠️ `UserRole` es una unión de TypeScript: existe solo al compilar, así que no
 * hay nada que recorrer en runtime. Esta lista se deriva de las CLAVES de
 * `USER_ROLE_LABELS` porque ese mapa es el único lugar donde el conjunto de
 * roles es un dato y no una declaración de tipos. Declarar además un
 * `["admin", "user", "guest"]` suelto sería una segunda lista que se queda vieja
 * en silencio el día que se añada un rol: añadiría la variante a la unión y a las
 * etiquetas, y el filtro seguiría sin ofrecerlo.
 *
 * El filtro por rol NO debe construirse con `ADMIN_USERS_ROLES`, que es la lista
 * de roles con los que se **entra** al directorio y sale de `SUPER_ADMIN_ROLE`.
 * Son dos cosas distintas: con `SUPER_ADMIN_ROLE="admin"` solo se entra como
 * administrador, pero el listado muestra usuarios de todos los roles y hay que
 * poder filtrar por cualquiera de ellos.
 */
export const USER_ROLES = Object.keys(USER_ROLE_LABELS) as UserRole[];
