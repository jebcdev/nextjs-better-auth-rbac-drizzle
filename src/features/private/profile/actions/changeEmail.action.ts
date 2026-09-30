"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import drizzleDB from "@/lib/db";
import { getBetterAuthErrorCode } from "@/lib/auth/better-auth-error";
import { consoleLogger } from "@/lib/logger/console-logger";
import type { IGeneralResponse } from "@/features/shared/types";
import {
    ChangeEmailSchema,
    type ChangeEmailData,
} from "@/features/private/profile/validations";

/**
 * Solicita el cambio de dirección de correo del usuario autenticado.
 *
 * ── Por qué es un flujo aparte y no un campo del parche (decisión D16) ───────
 * Un parche es sincrónico: el valor queda guardado cuando la llamada devuelve.
 * Un cambio de correo es asíncrono y su resultado no es observable en ese
 * momento. Meterlo en el parche significaría devolver un éxito con la dirección
 * antigua todavía en la base de datos, y el editor enseñaría un valor que no es
 * el vigente. Aquí la respuesta honesta es "te enviamos un correo para
 * confirmar", y la escritura ocurre después, desde la dirección nueva.
 *
 * ── Por qué NO acepta un id de usuario ─────────────────────────────────────
 * Igual que `updateProfileAction`: la subject se deriva de la propia sesión
 * (decisión D5). Una server action es alcanzable por POST directo y no hereda
 * el guardia del layout.
 *
 * ── Por qué no se comprueba si la dirección nueva ya pertenece a OTRA cuenta ─
 * Sería un oráculo de enumeración: bastaría con probar direcciones ajenas y
 * observar si la respuesta cambia. better-auth lo resuelve por dentro, sin
 * ramificar: si la dirección está en uso devuelve el mismo `status: true` sin
 * enviar nada, y si no lo está envía el correo. El mensaje que ve el usuario es
 * el mismo en ambos casos.
 */

/** Texto de éxito: no promete nada que el sistema no sepa. */
const VERIFICATION_SENT_MESSAGE =
    "Si esa dirección está disponible, recibirás un correo para confirmar el cambio.";

type ChangeEmailReason =
    | "invalid_input"
    | "unauthenticated"
    | "inactive_account"
    | "same_email"
    | "ok"
    | "unexpected_error";

const logChangeEmailOutcome = (
    reason: ChangeEmailReason,
    errorName?: string,
): void => {
    consoleLogger({ action: "change-email", reason, errorName });
};

export const changeEmailAction = async (
    data: ChangeEmailData,
): Promise<IGeneralResponse<null>> => {
    const parsed = ChangeEmailSchema.safeParse(data);
    if (!parsed.success) {
        logChangeEmailOutcome("invalid_input");
        return {
            success: false,
            error: true,
            message:
                parsed.error.issues[0]?.message ??
                "La información proporcionada no es válida",
        };
    }

    const headersList = await headers();

    try {
        const session = await auth.api.getSession({ headers: headersList });
        if (!session) {
            logChangeEmailOutcome("unauthenticated");
            return {
                success: false,
                error: true,
                message:
                    "Debes iniciar sesión para cambiar tu correo electrónico",
            };
        }

        // Una sola lectura revalida la cuenta (el guardia del layout no protege
        // a la action) y trae la dirección almacenada, contra la que se compara
        // la nueva.
        const current = await drizzleDB.query.users.findFirst({
            where: { id: { eq: session.user.id } },
            columns: { email: true, isActive: true, banned: true },
        });

        if (!current || !current.isActive || current.banned) {
            logChangeEmailOutcome("inactive_account");
            return {
                success: false,
                error: true,
                message: "Tu cuenta no está disponible en este momento",
            };
        }

        // better-auth también lo rechaza, pero con un texto en inglés y sin el
        // matiz que el spec pide. Se comprueba aquí, en español, contra la fila
        // recién leída: la comparación no puede hacerse en el esquema porque el
        // valor actual vive en la base de datos.
        if (parsed.data.newEmail === current.email.toLowerCase()) {
            logChangeEmailOutcome("same_email");
            return {
                success: false,
                error: true,
                message: "Esta dirección ya es la que usa tu cuenta",
            };
        }

        // better-auth genera el token y llama a `sendVerificationEmail` de
        // `auth.ts`. NO se escribe `users.email` aquí: hasta que el titular
        // confirme desde la dirección nueva, la almacenada sigue siendo la
        // antigua.
        await auth.api.changeEmail({
            body: { newEmail: parsed.data.newEmail },
            headers: headersList,
        });

        logChangeEmailOutcome("ok");
        return {
            success: true,
            error: false,
            message: VERIFICATION_SENT_MESSAGE,
            data: null,
        };
    } catch (error) {
        // ⚠️ Solo código y nombre. El `cause` de un APIError de better-auth
        // puede arrastrar el cuerpo de la petición, con la dirección dentro.
        const code = getBetterAuthErrorCode(error);

        consoleLogger({
            action: "change-email",
            reason:
                code === "UNAUTHORIZED"
                    ? "unauthenticated"
                    : "unexpected_error",
            errorName: error instanceof Error ? error.name : "unknown",
        });

        return {
            success: false,
            error: true,
            message:
                code === "UNAUTHORIZED"
                    ? "Debes iniciar sesión para cambiar tu correo electrónico"
                    : "No fue posible solicitar el cambio, intenta nuevamente",
        };
    }
};
