"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { getBetterAuthErrorCode } from "@/lib/auth/better-auth-error";
import {
    ResetPasswordSchema,
    type ResetPasswordData,
} from "@/features/public/auth/validations";
import { consoleLogger } from "@/lib/logger/console-logger";
import type { IGeneralResponse } from "@/features/shared/types";

/**
 * Recuperación de contraseña — consumo del token y elección de la nueva.
 *
 * El token es de un solo uso y con caducidad, y ambas Garantías las da la tabla
 * `verifications` a través de better-auth: `consumeVerificationValue` borra la
 * fila dentro de una transacción y rechaza las que ya expiraron. Por eso un
 * enlace reutilizado o vencido deja la contraseña intacta.
 *
 * `revokeSessionsOnPasswordReset` (ver `auth.ts`) termina el resto de sesiones
 * de la cuenta: la recuperación existe porque la contraseña se perdió o
 * posiblemente se filtró, y si las sesiones antigas sobrevivieran, quien
 * hubiera robado una sesión la conservaría.
 *
 * ⚠️ El token no se registra en ningún log: es una credencial.
 */

const INVALID_TOKEN_MESSAGE =
    "El enlace de restablecimiento es inválido o ya expiró. Solicita uno nuevo.";

export const resetPasswordAction = async (
    payload: ResetPasswordData & { token: string },
): Promise<IGeneralResponse<null>> => {
    const { token, ...rest } = payload;

    if (typeof token !== "string" || token.trim().length === 0) {
        return {
            success: false,
            error: true,
            message: INVALID_TOKEN_MESSAGE,
        };
    }

    const validatedData = ResetPasswordSchema.safeParse(rest);
    if (!validatedData.success) {
        // La política se responde con el mensaje exacto de la regla que falló.
        return {
            success: false,
            error: true,
            message:
                validatedData.error.issues[0]?.message ??
                "La información proporcionada no es válida",
        };
    }

    try {
        await auth.api.resetPassword({
            body: {
                token,
                newPassword: validatedData.data.newPassword,
            },
            headers: await headers(),
        });

        consoleLogger({ action: "reset-password", reason: "ok" });
        return {
            success: true,
            error: false,
            message: "Tu contraseña fue actualizada exitosamente",
            data: null,
        };
    } catch (error) {
        // better-auth lanza INVALID_TOKEN tanto si el token no existe, ya se usó
        // como si expiró. Los tres casos reciben el mismo mensaje a propósito: no
        // distinguirlos tampoco ayuda a nadie y evita confirmar que un token
        // existió alguna vez.
        //
        // ⚠️ El código vive en `error.body.code`, NO en `error.code` — ver
        // `getBetterAuthErrorCode`.
        const code = getBetterAuthErrorCode(error);

        consoleLogger({
            action: "reset-password",
            reason: code === "INVALID_TOKEN" ? "invalid_token" : "unexpected_error",
            errorName: error instanceof Error ? error.name : "unknown",
        });

        if (code === "INVALID_TOKEN") {
            return {
                success: false,
                error: true,
                message: INVALID_TOKEN_MESSAGE,
            };
        }

        if (code === "PASSWORD_TOO_SHORT" || code === "PASSWORD_TOO_LONG") {
            return {
                success: false,
                error: true,
                message:
                    code === "PASSWORD_TOO_SHORT"
                        ? "La contraseña debe tener al menos 8 caracteres"
                        : "La contraseña no puede exceder los 72 caracteres",
            };
        }

        return {
            success: false,
            error: true,
            message: "No fue posible actualizar tu contraseña, intenta nuevamente",
        };
    }
};
