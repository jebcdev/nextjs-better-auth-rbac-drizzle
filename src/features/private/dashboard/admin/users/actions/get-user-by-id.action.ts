"use server";

// ⚠️ Esta acción NO va marcada `server-only`, por el mismo motivo que
// `get-all-users.action.ts`: la consume la página de edición, que es un Server
// Component, pero vive en el mismo grafo que el formulario cliente y añadir
// `server-only` la rompe. Lo que SÍ es una frontera real es el DTO: se proyecta
// campo por campo y la fila cruda nunca sale de aquí.
//
// ⚠️ Una server action es POSTeable directamente y NO hereda el guard de la
// página. Este archivo vuelve a derivar su sujeto desde la sesión y a comprobar
// el rol él mismo, con el MISMO `hasRequiredRole` y la MISMA constante
// `ADMIN_USERS_ROLES` que la página, el listado y los dos toggles, para que las
// cuatro reglas no puedan divergir.
//
// ⚠️ Y no es una lectura inocua: sin el guard, esta acción sería una forma de
// leer el nombre, el correo, el avatar y el ROL de cualquier cuenta conocida por
// su id, saltándose el directorio. El DTO que devuelve es el mismo que ya expone
// la cuadrícula, así que la condición para devolverlo tiene que ser la misma.

import drizzleDB from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSessionDetails } from "@/lib/auth/session-details";
import { hasRequiredRole } from "@/lib/auth/role-guard";
import { consoleLogger } from "@/lib/logger/console-logger";
import { IGeneralResponse } from "@/features/shared/types";
import { ADMIN_USERS_ROLES } from "../components/grid";
import type { AdminUserEditItem } from "../components/form";
import { GetUserByIdSchema } from "../validations";

type GetUserByIdReason =
    | "invalid_input"
    | "no_session"
    | "unauthorized"
    | "target_not_found"
    | "ok"
    | "unexpected_error";

/**
 * Registra el motivo de la llamada.
 *
 * ⚠️ Solo un código de motivo y, como mucho, el NOMBRE del error. Nunca el
 * `userId`, ni el cuerpo, ni el error completo: esta acción maneja datos de
 * identidad de terceros y el `cause` de un error de Drizzle puede arrastrar la
 * consulta y sus valores (hallazgo F-03 de 01-audit-exposed-secrets). Los motivos
 * son distinguibles entre sí precisamente porque no llevan datos.
 */
const logOutcome = (
    reason: GetUserByIdReason,
    errorName?: string,
): void => {
    consoleLogger({ action: "get-user-by-id", reason, errorName });
};

/**
 * Traduce el primer problema de validación.
 *
 * El texto por defecto de Zod para una clave desconocida llega en inglés, y Zod 4
 * no deja sobrescribirlo de forma tipada desde el esquema, así que la traducción
 * vive aquí, en el borde de la API, donde está el resto del copy en español
 * (mismo motivo que en `updateProfile.action.ts`).
 */
const invalidInputMessage = (
    issues: readonly { code: string; message: string }[],
): string => {
    const first = issues[0];

    if (first?.code === "unrecognized_keys") {
        return "La solicitud contiene campos que no se pueden consultar";
    }

    return first?.message ?? "La solicitud no es válida";
};

/**
 * Proyecta la fila cruda al DTO, campo por campo.
 *
 * Se construye desde cero, explícitamente, en vez de con spread de la fila: un
 * spread olvidaría una columna nueva el día que se añada, que es justo la clase de
 * fuga que esto previene. Las fechas salen como ISO 8601, así que ninguna
 * instancia de `Date` cruza hacia el navegador.
 */
function toAdminUserEditItem(
    row: typeof users.$inferSelect,
): AdminUserEditItem {
    return {
        id: row.id,
        name: row.name,
        email: row.email,
        image: row.image,
        role: row.role,
        // `is_active` y `banned` son nullable en el esquema. El resto de la app
        // ya los lee por veracidad, así que `null` significa "no usable". Se
        // normaliza aquí, una vez, con `?? false`, y el formulario no repite la
        // regla.
        isActive: row.isActive ?? false,
        banned: row.banned ?? false,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

/**
 * Devuelve UNA cuenta para editarla.
 *
 * ── Por qué el id es un parámetro y el sujeto no ─────────────────────────────
 * El `userId` dice QUÉ cuenta se lee; nunca QUIÉN lee. El sujeto se deriva de
 * `getSessionDetails()`, que además ya trata como «sin sesión» una cuenta inactiva
 * o vetada. Si el sujeto se derivara del payload, un POST directo podría pedir la
 * ficha de cualquier cuenta.
 */
export const getUserByIdAction = async (
    userId: string,
): Promise<IGeneralResponse<AdminUserEditItem | null>> => {
    // ⚠️ Antes de tocar la base de datos, y fuera del `try`: un id mal formado no
    // es un error inesperado sino una petición inválida, y merece su propio motivo
    // en el log.
    const parsed = GetUserByIdSchema.safeParse({ userId });

    if (!parsed.success) {
        logOutcome("invalid_input");
        return {
            success: false,
            error: true,
            message: invalidInputMessage(parsed.error.issues),
        };
    }

    try {
        const { isAuthenticated, userRole } = await getSessionDetails();

        if (!isAuthenticated) {
            logOutcome("no_session");
            return {
                success: false,
                error: true,
                message: "Debes iniciar sesión para consultar una cuenta",
            };
        }

        if (!hasRequiredRole(userRole, ADMIN_USERS_ROLES)) {
            logOutcome("unauthorized");
            return {
                success: false,
                error: true,
                message: "No tienes permisos para consultar los usuarios.",
            };
        }

        const { userId: targetId } = parsed.data;

        // Una cuenta inexistente se reporta como FALLO, no como un `data: null`
        // con éxito. Es la misma convención que ya siguen las dos acciones
        // `toggle-*` (`target_not_found` → `success: false`), y conviene no
        // inventar una tercera: la página recibe un único camino de error que
        // puede tratar sin distinguir "no encontrado" de "error de red"
        // comparando mensajes de texto.
        const target = await drizzleDB.query.users.findFirst({
            where: { id: targetId },
        });

        if (!target) {
            logOutcome("target_not_found");
            return {
                success: false,
                error: true,
                message: "La cuenta indicada no existe",
            };
        }

        logOutcome("ok");

        return {
            success: true,
            error: false,
            message: "Cuenta obtenida exitosamente",
            data: toAdminUserEditItem(target),
        };
    } catch (error) {
        logOutcome(
            "unexpected_error",
            error instanceof Error ? error.name : "unknown",
        );

        return {
            success: false,
            error: true,
            message:
                "Ocurrió un error inesperado al consultar la cuenta. Intenta nuevamente.",
        };
    }
};
