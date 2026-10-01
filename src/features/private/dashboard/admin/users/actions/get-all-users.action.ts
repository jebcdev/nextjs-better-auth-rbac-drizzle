"use server";

// ⚠️ Esta acción NO va marcada `server-only`, y la diferencia con
// `getFullUserInformation` es intencionada: aquella no la importa nadie del
// cliente, ésta la llama `useAdminUsersQuery`. Añadir `server-only` aquí
// rompería el build. Lo que SÍ es una frontera real es el DTO de la fila: se
// proyecta campo por campo (decisión D4) y `UsersSelect` nunca se devuelve.
//
// ⚠️ Una server action es POSTeable directamente y NO hereda el guard de la
// página. Por eso esta acción vuelve a derivar su sujeto desde la sesión y a
// comprobar el rol ella misma, con la MISMA función que la página, para que las
// dos reglas no puedan divergir.

import {
    and,
    asc,
    count,
    eq,
    ilike,
    isNull,
    like,
    or,
    type SQL,
} from "drizzle-orm";

import drizzleDB from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSessionDetails } from "@/lib/auth/session-details";
import { hasRequiredCsvRole } from "@/lib/auth/role-guard";
import { consoleLogger } from "@/lib/logger/console-logger";
import { IGeneralResponse } from "@/features/shared/types";
import {
    clampPage,
    normalizePaginationParams,
    resolvePageSize,
    type PaginatedData,
} from "@/features/shared/components/ui";
import {
    ADMIN_USERS_ROLES,
    type AdminUserListItem,
    type AdminUsersListParams,
} from "../components/grid";

/**
 * Proyecta la fila cruda al DTO, campo por campo.
 *
 * Se construye desde cero, explícitamente, en vez de con spread de la fila y
 * borrado posterior: un spread olvidaría una columna nueva el día que se añada,
 * que es justo la clase de fuga que esto previene.
 */
function toAdminUserListItem(
    row: typeof users.$inferSelect,
): AdminUserListItem {
    return {
        id: row.id,
        name: row.name,
        email: row.email,
        image: row.image,
        role: row.role,
        // `is_active` y `banned` son nullable en el esquema. El resto de la app
        // ya los lee por veracidad (`!!userRow.isActive && !userRow.banned` en
        // `session-details.ts`), así que `null` significa "no usable". Se
        // normaliza aquí, una vez, para que la tarjeta no repita la regla.
        isActive: row.isActive ?? false,
        banned: row.banned ?? false,
        // Fechas como ISO 8601: ninguna instancia de `Date` cruza al navegador.
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

/**
 * Predicado CSV-aware: ¿la cuenta tiene el rol R como token completo?
 *
 * Cuatro Arms porque un `eq` a secas descarta el multi-rol y un `%R%` a secas
 * produce falsos positivos (`user` dentro de `poweruser`):
 *
 *   `R` | `R,...` | `...,R` | `...,R,...`
 *
 * `setRole` une con `","` y sin espacio, así que el plugin nunca escribe
 * `"user, admin"`. Una fila importada a mano podría, y entonces no coincidiría —
 *ver Riesgos del design. Arreglarlo en SQL con `replace(role, ' ', '')`
 * corrompería cualquier nombre de rol legítimo con espacios, que es un peor
 * trueque (decisión D5).
 */
const roleCondition = (role: string): SQL | undefined =>
    or(
        eq(users.role, role),
        like(users.role, `${role},%`),
        like(users.role, `%,${role}`),
        like(users.role, `%,${role},%`),
    );

/**
 * Predicados de estado.
 *
 * ⚠️ El brazo `isNull` del caso `inactive` es el que carga el peso. En SQL,
 * `NULL = false` es `NULL`, no `true`, así que un `eq(users.isActive, false)` a
 * secas descarta de *Inactivos* toda cuenta con la bandera sin valor —y
 * `is_active` ES nullable en este esquema. `banned` NO se mezcla con
 * `isActive`: son columnas independientes (decisión D6).
 */
const statusCondition = (
    status: AdminUsersListParams["status"],
): SQL | undefined => {
    switch (status) {
        case "active":
            return eq(users.isActive, true);
        case "inactive":
            return or(
                eq(users.isActive, false),
                isNull(users.isActive),
            );
        case "banned":
            return eq(users.banned, true);
        default:
            // `all` y ausente: sin restricción.
            return undefined;
    }
};

export const getAllUsersAction = async (
    params: AdminUsersListParams = {},
): Promise<
    IGeneralResponse<PaginatedData<AdminUserListItem> | null>
> => {
    try {
        // ⚠️ Sujeto derivado de la sesión, nunca de un parámetro. Una server
        // action es alcanzable por POST sin pasar por la página, así que este
        // es el único punto donde se decide si la llamada prospera.
        // `getSessionDetails()` ya devuelve `isAuthenticated: false` cuando no hay
        // sesión, no hay fila de usuario, o la cuenta está inactiva o vetada.
        const { isAuthenticated, userRole } =
            await getSessionDetails();

        if (
            !isAuthenticated ||
            !hasRequiredCsvRole(userRole, ADMIN_USERS_ROLES)
        ) {
            consoleLogger({
                action: "getAllUsersAction",
                reason: isAuthenticated
                    ? "unauthorized"
                    : "no_session",
            });

            return {
                success: false,
                error: true,
                message:
                    "No tienes permisos para consultar los usuarios.",
            };
        }

        const { page, pageSize, search, role, status } =
            normalizePaginationParams(params);

        // El acotado vive en el módulo de paginación, no aquí: el control del
        // cliente llama a las MISMAS funciones, así que los dos no pueden
        // discrepar sobre qué es un tamaño de página válido (decisión D19).
        const safePageSize = resolvePageSize(pageSize);
        const conditions: SQL[] = [];

        // Búsqueda: un solo `or` sobre nombre y email. Un término puede
        // coincidir con cualquiera de los dos, y dos usuarios distintos pueden
        // coincidir con el mismo término por campos distintos.
        // ⚠️ `or()` de Drizzle está tipada como `SQL | undefined` porque ignora
        // los argumentos `undefined`. Aquí nunca se le pasa ninguno, así que el
        // filtro de verdad mantiene `conditions` como `SQL[]` en vez de
        // arrastrar un `undefined` que `and()` descartaría en silencio.
        const push = (condition: SQL | undefined): void => {
            if (condition) conditions.push(condition);
        };

        const term = search?.trim();
        if (term) {
            const pattern = `%${term}%`;
            push(
                or(
                    ilike(users.name, pattern),
                    ilike(users.email, pattern),
                ),
            );
        }

        if (role) {
            push(roleCondition(role));
        }

        // `all` y ausente no imponen ninguna condición, así que `push` descarta
        // el `undefined` que devuelve `statusCondition` en ese caso.
        push(statusCondition(status));

        const whereClause =
            conditions.length > 0 ? and(...conditions) : undefined;

        // ⚠️ Un único `whereClause` para las DOS consultas. El total debe contar
        // las filas filtradas; con dos juegos de predicados distintos, el total
        // y la página contarían historias diferentes (decisión D9).
        const [totalResult, rows] = await Promise.all([
            drizzleDB
                .select({ value: count() })
                .from(users)
                .where(whereClause),
            drizzleDB
                .select()
                .from(users)
                .where(whereClause)
                // Orden TOTAL: `name` no es único, y paginar sobre un orden no
                // total duplica y pierde filas entre páginas. El `id` es el
                // desempate. El proyecto de referencia ordena solo por nombre y
                // ese es el defecto que aquí no se importa (decisión D8).
                .orderBy(asc(users.name), asc(users.id))
                .limit(safePageSize)
                .offset((clampPage(page) - 1) * safePageSize),
        ]);

        const total = Number(totalResult[0]?.value ?? 0);
        // `|| 1`: un total de 0 informa UNA página, no cero, para que el control
        // tenga un límite válido contra el que dibujarse.
        const totalPages = Math.ceil(total / safePageSize) || 1;
        const currentPage = clampPage(page, totalPages);

        return {
            success: true,
            error: false,
            message: "Usuarios obtenidos exitosamente.",
            data: {
                items: rows.map(toAdminUserListItem),
                total,
                page: currentPage,
                pageSize: safePageSize,
                totalPages,
                hasNextPage: currentPage < totalPages,
                hasPreviousPage: currentPage > 1,
            },
        };
    } catch (error) {
        // ⚠️ Solo el NOMBRE del error y un código de motivo. Su `cause` puede
        // arrastrar la consulta y los valores, y esta acción tiene acceso a
        // emails y a roles. Nunca el payload de params ni el error completo
        // (hallazgo F-03 de 01-audit-exposed-secrets).
        consoleLogger({
            action: "getAllUsersAction",
            reason: "unexpected_error",
            errorName:
                error instanceof Error ? error.name : "unknown",
        });

        return {
            success: false,
            error: true,
            message:
                "Ocurrió un error inesperado al consultar los usuarios. Intenta nuevamente.",
        };
    }
};
