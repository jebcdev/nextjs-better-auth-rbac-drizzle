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