"use server";

// ⚠️ Esta acción NO va marcada `server-only`, por el mismo motivo que
// `get-all-users.action.ts`: la llama `useToggleUserActiveMutation`, que es un
// hook de cliente. Añadir `server-only` rompería el build. Lo que SÍ es una
// frontera real son dos cosas, y las dos están debajo: el sujeto se deriva
// siempre de la sesión, y lo que cruza de vuelta es un mensaje, no una fila.
//
// ⚠️ Una server action es POSTeable directamente y NO hereda el guard de la
// página. Este archivo es el único punto donde se decide si la llamada
// prospera, y usa el MISMO `hasRequiredCsvRole` con la MISMA constante
// `ADMIN_USERS_ROLES` que la página y que el listado, para que las tres reglas
// no puedan divergir.

import { eq } from "drizzle-orm";

import drizzleDB from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSessionDetails } from "@/lib/auth/session-details";
import { hasRequiredCsvRole } from "@/lib/auth/role-guard";
import { consoleLogger } from "@/lib/logger/console-logger";
import { IGeneralResponse } from "@/features/shared/types";
import { ADMIN_USERS_ROLES } from "../components/grid";
import {
    ToggleUserActiveSchema,
    type ToggleUserActiveData,
} from "../validations";

type ToggleActiveReason =
    | "invalid_input"
    | "no_session"
    | "unauthorized"
    | "self_target"
    | "target_not_found"
    | "ok"
    | "unexpected_error";

/**
 * Registra el motivo de la llamada.
 *
 * ⚠️ Solo un código de motivo y, como mucho, el NOMBRE del error. Nunca el
 * cuerpo, ni el id, ni el error completo: esta acción tiene acceso a ids de
 * cuenta y el `cause` de un error de Drizzle puede arrastrar la consulta y sus
 * valores (hallazgo F-03 de 01-audit-exposed-secrets). Los motivos son
 * distinguibles entre sí precisamente porque no llevan datos: el diagnostico va
 * en el código, no en la carga útil.
 */
const logOutcome = (
    reason: ToggleActiveReason,
    errorName?: string,
): void => {
    consoleLogger({ action: "toggle-user-active", reason, errorName });
};

/**
 * Traduce el primer problema de validación.
 *
 * El texto por defecto de Zod para una clave desconocida llega en inglés, y
 * Zod 4 no deja sobrescribirlo de forma tipada desde el esquema, así que la
 * traducción vive aquí, en el borde de la API, donde está el resto del copy en
 * español (mismo motivo que en `updateProfile.action.ts`).
 */
const invalidInputMessage = (
    issues: readonly { code: string; message: string }[],
): string => {
    const first = issues[0];

    if (first?.code === "unrecognized_keys") {
        return "El envío contiene campos que no se pueden modificar";
    }

    return first?.message ?? "La solicitud no es válida";
};

/**
 * Activa o desactiva UNA cuenta del directorio.
 *
 * ── Por qué `isActive` y no `banned` ────────────────────────────────────────
 * `is_active` se declara en `auth.ts` como campo adicional con `input: false`,
 * así que better-auth no expone ningún endpoint que lo escriba, y su API de
 * admin tampoco lo toca. La única vía es una escritura directa. `banned` es lo
 * contrario: la columna la posee el plugin admin, que además revoca las
 * sesiones del vetado, y por eso la otra acción del par sí pasa por
 * `auth.api.banUser`.
 *
 * ── Por qué el sujeto sale de la sesión y el id del cuerpo no ──────────────
 * El `userId` del cuerpo dice QUÉ cuenta se escribe; nunca QUIÉN escribe. Si el
 * sujeto se derivara del cuerpo, un POST directo podría apuntar a cualquier
 * cuenta. Aquí el sujeto sale de `getSessionDetails()`, que además ya trata como
 * «sin sesión» una cuenta inactiva o vetada.
 *
 * ── Por qué se rechaza el propio objetivo ──────────────────────────────────
 * `getSessionDetails()` trata una cuenta inactiva como no autenticada, así que
 * un super admin que se desactivara a sí mismo perdería el directorio en la
 * siguiente resolución de sesión, sin vuelta atrás. La tarjeta desactiva los
 * controles de su propia fila, pero eso es solo interfaz: esta es la barrera.
 */
export const toggleUserActiveAction = async (
    body: ToggleUserActiveData,
): Promise<IGeneralResponse<null>> => {
    // ⚠️ Antes de tocar la base de datos, y fuera del `try`: un cuerpo mal
    // formado no es un error inesperado sino una petición inválida, y merece su
    // propio motivo en el log.
    const parsed = ToggleUserActiveSchema.safeParse(body);

    if (!parsed.success) {
        logOutcome("invalid_input");
        return {
            success: false,
            error: true,
            message: invalidInputMessage(parsed.error.issues),
        };
    }

    const { userId, isActive } = parsed.data;

    try {
        const { isAuthenticated, userRole, currentUser } =
            await getSessionDetails();

        if (!isAuthenticated || !currentUser) {
            logOutcome("no_session");
            return {
                success: false,
                error: true,
                message: "Debes iniciar sesión para modificar una cuenta",
            };
        }

        if (!hasRequiredCsvRole(userRole, ADMIN_USERS_ROLES)) {
            logOutcome("unauthorized");
            return {
                success: false,
                error: true,
                message:
                    "No tienes permisos para modificar los usuarios.",
            };
        }

        if (userId === currentUser.id) {
            logOutcome("self_target");
            return {
                success: false,
                error: true,
                message:
                    "No puedes cambiar el estado de tu propia cuenta",
            };
        }

        // Una sola lectura para las dos preguntas que quedan. Sin `columns` se
        // trae la fila entera, así que se acota: aquí no se necesita nada más
        // que su existencia, y pedir menos columnas es pedir menos datos que
        // puedan colarse en un log por accidente.
        const target = await drizzleDB.query.users.findFirst({
            where: { id: userId },
            columns: { id: true },
        });

        if (!target) {
            logOutcome("target_not_found");
            return {
                success: false,
                error: true,
                message: "La cuenta indicada no existe",
            };
        }

        // ⚠️ El `set` nombra UNA columna. Ni el rol, ni `banned`, ni un spread de
        // la fila: el requisito es que cambiar esta bandera no mueva ninguna
        // otra, y la forma más barata de cumplirlo es que el objeto no tenga de
        // dónde copiar el resto.
        //
        // `is_active` es nullable en el esquema y aquí llega un `boolean` ya
        // normalizado por el esquema de validación, así que esta escritura nunca
        // produce un `NULL` nuevo.
        //
        // Poner el valor que ya estaba se reporta como éxito, no como error: el
        // requisito lo pide así, y la operación es idempotente por construcción.
        await drizzleDB
            .update(users)
            .set({ isActive })
            .where(eq(users.id, userId));

        logOutcome("ok");

        return {
            success: true,
            error: false,
            message: isActive
                ? "La cuenta fue activada exitosamente."
                : "La cuenta fue desactivada exitosamente.",
            data: null,
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
                "Ocurrió un error inesperado al modificar la cuenta. Intenta nuevamente.",
        };
    }
};
