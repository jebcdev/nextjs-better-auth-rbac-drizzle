import type { UserRole } from "@/lib/db/schema";

/**
 * Los roles con los que se entra al directorio de usuarios.
 *
 * ⚠️ Esta constante se declara UNA vez y la importan las TRES páginas del
 * directorio (`usuarios`, `usuarios/nuevo`, `usuarios/[userId]`) y sus tres
 * server actions. Antes cada una declaraba su propio array inline, que son
 * copias de la regla de autorización a un archivo de distancia: exactamente el
 * tipo de duplicación que permite que la página y la action se desincronicen
 * (decisiones D10 y D8).
 *
 * ⚠️ Este es el ÚNICO módulo del feature que lee `process.env`, y por eso tiene
 * su propio archivo separado del resto de constantes. Next.js solo inlinea las
 * `NEXT_PUBLIC_*` en el bundle del navegador, así que en el cliente
 * `ADMIN_USERS_ROLES` vale `[undefined]`: **nunca lo importes desde un Client
 * Component**. La barra de filtros lo recibe como prop `roles` desde la página,
 * que es el único sitio donde el valor es real (decisión D22).
 *
 * ⚠️ Que valga `[undefined]` en el navegador no es solo un defecto de render: si
 * alguien lo filtra para "limpiar" el valor falsy, el array quedaría vacío y
 * `hasRequiredRole` entraría por su rama `allowedRoles.length === 0`, que
 * **permite el paso a cualquiera**. Un env sin definir debe seguir fallando
 * cerrado.
 *
 * ⚠️ `SUPER_ADMIN_ROLE` es un `as UserRole` sin verificar. `.env.example` trae
 * `SUPER_ADMIN_ROLE="super_admin"`, que NO está en la unión `UserRole` y que ni
 * `auth.ts` (`adminRoles: ["admin"]`) ni el seeder asignan nunca. Quien copie
 * `.env.example` a `.env` tal cual obtiene un rol que no coincide con nadie y las
 * tres páginas redirigen a `/panel`. Corregir el valor por defecto queda fuera de
 * este cambio; declararlo aquí es lo que hace visible el problema en vez de
 * dejarlo enterrado en un `.env`.
 */
export const ADMIN_USERS_ROLES: UserRole[] = [
    process.env.SUPER_ADMIN_ROLE as UserRole,
];
