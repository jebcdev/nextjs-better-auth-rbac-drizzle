"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import {
    ForgotPasswordSchema,
    type ForgotPasswordData,
} from "@/features/public/auth/validations";
import {
    clearAttempts,
    getClientRateLimitKey,
    isRateLimited,
    recordFailedAttempt,
} from "@/lib/auth/rate-limit";
import { consoleLogger } from "@/lib/logger/console-logger";
import type { IGeneralResponse } from "@/features/shared/types";

/**
 * Recuperación de contraseña — petición del enlace (decisión D5 de
 * openspec/changes/04-harden-authentication/).
 *
 * Este es el oráculo de enumeración más directo del sistema: acepta un
 * email arbitrario de un llamador anónimo. Por eso la respuesta es UNA sola,
 * idéntica en los cuatro casos posibles — dirección inexistente, dirección
 * existente, cuenta desactivada y límite de intentos agotado — y no dice nada
 * sobre si se creó un token.
 *
 * La no divulgación no depende solo del mensaje: `requestPasswordReset` de
 * better-auth tampoco ramifica (devuelve lo mismo y hace una búsqueda señuelo
 * para que tampoco se distinga por tiempo), y aquí el límite se comprueba antes
 * de tocar la base de datos para que el sondeo tampoco quede ilimitado.
 */

/** Página donde el usuario escribe la contraseña nueva. */
const RESET_PASSWORD_PATH = "/restablecer-contrasena";

/**
 * Único texto que ve el llamador. No dice si la cuenta existe, si está activa,
 * ni si se generó un token.
 */
const UNIFORM_MESSAGE =
    "Si el correo está registrado en el sistema, te enviaremos un enlace para restablecer tu contraseña.";

const uniformSuccess = (message: string): IGeneralResponse<null> => ({
    success: true,
    error: false,
    message,
    data: null,
});

const uniformFailure = (message: string): IGeneralResponse<null> => ({
    success: false,
    error: true,
    message,
});

export const requestPasswordResetAction = async (
    userData: ForgotPasswordData,
): Promise<IGeneralResponse<null>> => {
    // Un formato de email inválido no dice nada sobre ninguna cuenta, así que
    // este mensaje sí puede ser propio: no es información sobre la existencia
    // de un usuario.
    const validatedData = ForgotPasswordSchema.safeParse(userData);
    if (!validatedData.success) {
        consoleLogger({ action: "request-password-reset", reason: "invalid_input" });
        return uniformFailure(
            validatedData.error.issues[0]?.message ??
                "La información proporcionada no es válida",
        );
    }

    const rateLimitKey = await getClientRateLimitKey();
    if (isRateLimited("password-recovery", rateLimitKey)) {
        // Mismo texto que el éxito: un throttled no puede distinguirse de un
        // correo enviado.
        consoleLogger({ action: "request-password-reset", reason: "rate_limited" });
        return uniformSuccess(UNIFORM_MESSAGE);
    }

    const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "";
    const redirectTo = `${appUrl.replace(/\/+$/, "")}${RESET_PASSWORD_PATH}`;

    try {
        await auth.api.requestPasswordReset({
            body: {
                email: validatedData.data.email,
                redirectTo,
            },
            headers: await headers(),
        });

        clearAttempts("password-recovery", rateLimitKey);
        consoleLogger({ action: "request-password-reset", reason: "ok" });
    } catch (error) {
        // Se registra el motivo sin datos y se responde con el texto uniforme:
        // un fallo interno tampoco puede convertirse en una señal.
        consoleLogger({
            action: "request-password-reset",
            reason: "unexpected_error",
            errorName: error instanceof Error ? error.name : "unknown",
        });
        recordFailedAttempt("password-recovery", rateLimitKey);
    }

    return uniformSuccess(UNIFORM_MESSAGE);
};
