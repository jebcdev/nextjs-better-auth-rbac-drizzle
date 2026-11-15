"use server";

// ⚠️ Esta acción NO va marcada `server-only`, por el mismo motivo que
// `get-all-users.action.ts` y que `toggle-user-active.action.ts`: la llama
// `useToggleUserBanMutation`, que es un hook de cliente. Lo que SÍ es una
// frontera real es que el sujeto sale de la sesión y no del cuerpo.
//
// ⚠️ Una server action es POSTeable directamente y NO hereda el guard de la
// página. Este es el único punto donde se decide si la llamada prospera, con el
// MISMO `hasRequiredRole` y la MISMA constante `ADMIN_USERS_ROLES` que la
// página, que el listado y que la acción de activar.

import { headers } from "next/headers";

import { auth } from "@/lib/auth/auth";
import drizzleDB from "@/lib/db";
import { getSessionDetails } from "@/lib/auth/session-details";
import { hasRequiredRole } from "@/lib/auth/role-guard";
import { consoleLogger } from "@/lib/logger/console-logger";
import { IGeneralResponse } from "@/features/shared/types";
import { ADMIN_USERS_ROLES } from "../components/grid";
import { ToggleUserBanSchema, type ToggleUserBanData } from "../validations";

type ToggleBanReason =
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
 * cuerpo, ni el id, ni el error completo (hallazgo F-03 de
 * 01-audit-exposed-secrets). El `cause` de un `APIError` de better-auth puede
 * arrastrar la petición que lo Rechazó, y esta acción tiene acceso a ids de
 * cuenta.
 */
const logOutcome = (reason: ToggleBanReason, errorName?: string): void => {
    consoleLogger({ action: "toggle-user-ban", reason, errorName });
};

/** Traduce el primer problema de validación, como en la acción de activar. */
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
 * Veta o levanta el veto de UNA cuenta del directorio.
 *
 * ── Por qué aquí SÍ se usa better-auth ──────────────────────────────────────
 * `banned` la posee el plugin admin: la escribe junto a `ban_reason` y
 * `ban_expires`, y además revoca las sesiones vivas del vetado. Escribir la
 * columna con Drizzle daría un veto que no cierra ninguna sesión, es decir, un
 * veto aparente: la cuenta seguiría operando hasta que su sesión expirara. Por
 * eso esta acción va por `auth.api.banUser` / `auth.api.unbanUser` y
 * `toggle-user-active.action.ts` va por Drizzle. Son caminos distintos porque
 * las columnas lo son.
 *
 * Consecuencia asumida y especificada: quitar el veto NO restituye las sesiones
 * que el veto borró, así que esa cuenta tiene que volver a iniciar sesión. No es
 * un efecto colateral, es lo correcto —restaurar una sesión por el backdoor
 * sería devolver acceso sin haberlo pedido— y es lo que el plugin hace.
 *
 * ── Por qué la cadena de guard está duplicada y no en un helper ─────────────
 * La cadena es la MISMA regla en dos archivos, y es una tentación real
 * convertirla en `requireDirectoryAdmin()`. No se hace a propósito: ese helper
 * devolvería un «sí/no» y escondería que ha hecho una lectura de sesión y una de
 * rol — dos consultas cuyo nombre no dice cuáles son. Con la cadena escrita
 * aquí, esta acción se lee de arriba abajo y se ve exactamente qué se comprueba y
 * en qué orden. El coste es que un cambio futuro en la regla toca dos archivos;
 * a cambio, ninguno de los dos puede parecer que tiene una comprobación que no
 * tiene. Si alguna vez se extrae, el helper tiene que devolver la sesión, no un
 * booleano, para que la lectura siga siendo visible en la firma.
 *
 * ⚠️ better-auth exige SU PROPIO permiso además del nuestro: el plugin admin
 * comprueba `adminRoles: ["admin"]` (declarado en `auth.ts`), mientras que este
 * guard lee `SUPER_ADMIN_ROLE` del entorno. Con un entorno mal configurado —por
 * ejemplo el `SUPER_ADMIN_ROLE="super_admin"` que trae `.env.example`, que no
 * está en la unión `UserRole` y que nadie asigna— el guard de aquí puede pasar y
 * el plugin rechazar después. No se intenta silenciar: la diferencia es un
 * `catch` que devuelve un fallo y anota `unexpected_error`, porque un rechazo de
 * better-auth aquí significa configuración, no un fallo recuperable de la
 * petición.
 */
export const toggleUserBanAction = async (
    body: ToggleUserBanData,
): Promise<IGeneralResponse<null>> => {
    // ⚠️ Fuera del `try` y antes de tocar nada: un cuerpo mal formado es una
    // petición inválida, no un error inesperado, y merece su propio motivo.
    const parsed = ToggleUserBanSchema.safeParse(body);

    if (!parsed.success) {
        logOutcome("invalid_input");
        return {
            success: false,
            error: true,
            message: invalidInputMessage(parsed.error.issues),
        };
    }

    const { userId, banned } = parsed.data;

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

        if (!hasRequiredRole(userRole, ADMIN_USERS_ROLES)) {
            logOutcome("unauthorized");
            return {
                success: false,
                error: true,
                message:
                    "No tienes permisos para modificar los usuarios.",
            };
        }

        // El propio plugin rechaza vetarse a uno mismo con
        // `YOU_CANNOT_BAN_YOURSELF`, pero llegar a ese error significaría haber
        // dejado que el plugin empezara su trabajo. Se corta antes, en el mismo
        // sitio y por el mismo motivo que en la acción de activar, para que las
        // dos se comporten igual desde la interfaz.
        if (userId === currentUser.id) {
            logOutcome("self_target");
            return {
                success: false,
                error: true,
                message: "No puedes vetar tu propia cuenta",
            };
        }

        // Se comprueba la existencia ANTES de llamar al plugin, para que un id
        // inexistente se reporte como el motivo que es y no como el
        // `USER_NOT_FOUND` que el plugin devolvería. Misma comprobación, mismo
        // `columns`, misma razón que en la acción de activar.
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

        const headersList = await headers();

        // ⚠️ Aquí no hay ninguna escritura con Drizzle. La columna `banned` y sus
        // columnas hermanas, y la revocación de sesiones, son del plugin.
        // `set({ banned })` a mano sería exactamente el veto aparente que explica
        // el comentario de cabecera de este archivo.
        if (banned) {
            await auth.api.banUser({
                headers: headersList,
                body: { userId },
            });
        } else {
            await auth.api.unbanUser({
                headers: headersList,
                body: { userId },
            });
        }

        logOutcome("ok");

        return {
            success: true,
            error: false,
            message: banned
                ? "La cuenta fue vetada exitosamente."
                : "El veto de la cuenta fue levantado exitosamente.",
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
