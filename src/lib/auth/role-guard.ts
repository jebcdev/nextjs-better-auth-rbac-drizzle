import type { UserRole } from "@/lib/db/schema";

/**
 * Valida si el rol del usuario actual está incluido en los roles permitidos.
 * Soporta "*" como comodín para permitir acceso a cualquier usuario con sesión.
 */
export function hasRequiredRole(userRole?: UserRole, allowedRoles?: (UserRole | "*")[]): boolean {
    if (!allowedRoles || allowedRoles.length === 0) return true;
    
    // Si incluye "*", permite el acceso a cualquier usuario que tenga un rol definido
    if (allowedRoles.includes("*")) return true;

    if (!userRole) return false;
    
    return allowedRoles.includes(userRole);
}

/**
 * Valida si el rol del usuario está incluido en los roles permitidos, teniendo en
 * cuenta que la columna `users.role` almacena multi-rol como CSV.
 *
 * ⚠️ `hasRequiredRole` NO se modifica. Este es su complementario, y se adopta de
 * forma opt-in: el valor crudo que produce
 * `getSessionDetails()` (`session.user.role as UserRole`) es la cadena CSV
 * completa, así que para una cuenta con `role = "user,admin"` la comparación
 * entera contra `allowedRoles.includes("user,admin")` da `false`. Sin este
 * helper, un super admin multi-rol es rechazado por la página y por la action
 * mientras el listado de abajo de esa misma página lo muestra como
 * «Usuario, Administrador»: un usuario que el directorio presenta como admin no
 * puede abrir el directorio (decisión D20).
 *
 * Se comparan TOKENS completos, no subcadenas: `"user"` no debe coincidir dentro
 * de un rol `"poweruser"`. Cada token se recorta porque una fila importada a
 * mano podría traer espacios.
 *
 * No se normaliza el rol en `getSessionDetails()`: eso cambiaría en silencio lo
 * que compara cada guard existente, en un módulo que este cambio no es dueño.
 */
export function hasRequiredCsvRole(
    userRole?: string,
    allowedRoles?: (UserRole | "*")[],
): boolean {
    if (!allowedRoles || allowedRoles.length === 0) return true;

    // Mismo comodín que `hasRequiredRole`.
    if (allowedRoles.includes("*")) return true;

    if (!userRole) return false;

    const tokens = userRole
        .split(",")
        .map((token) => token.trim())
        .filter(Boolean);

    return tokens.some((token) => allowedRoles.includes(token as UserRole));
}
