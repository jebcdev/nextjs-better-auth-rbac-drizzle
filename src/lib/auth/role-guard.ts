import type { UserRole } from "@/lib/db/schema";

/**
 * Valida si el rol del usuario actual está incluido en los roles permitidos.
 * Soporta "*" como comodín para permitir acceso a cualquier usuario con sesión.
 *
 * ⚠️ La comparación es una igualdad sobre el rol ENTERO. `users.role` es un
 * `pgEnum` (`userRoleEnum`), así que una cuenta no puede llevar varios roles a la
 * vez ni un valor fuera del conjunto: no hay nada que normalizar, ni tokens que
 * recortar, ni subcadenas que puedan coincidir por accidente (`user` dentro de
 * `poweruser` tampoco puede existir, porque `poweruser` no es un valor del enum).
 * Por eso este es el ÚNICO guard de rol del proyecto: un helper paralelo que
 * partiera la cadena separaría dos reglas para un caso que la base de datos ya
 * impide.
 *
 * Una lista vacía o ausente permite el paso (ninguna restricción declarada); un
 * entorno sin `SUPER_ADMIN_ROLE` produce `[undefined]`, que es una lista NO
 * vacía, así que falla cerrado. Ese detalle es la razón de no filtrar los valores
 * falsy de `ADMIN_USERS_ROLES` antes de pasarlos aquí.
 */
export function hasRequiredRole(userRole?: UserRole, allowedRoles?: (UserRole | "*")[]): boolean {
    if (!allowedRoles || allowedRoles.length === 0) return true;
    
    // Si incluye "*", permite el acceso a cualquier usuario que tenga un rol definido
    if (allowedRoles.includes("*")) return true;

    if (!userRole) return false;
    
    return allowedRoles.includes(userRole);
}
