"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { getBetterAuthErrorCode } from "@/lib/auth/better-auth-error";
import {
    ChangePasswordSchema,
    type ChangePasswordData,
} from "@/features/public/auth/validations";
import { consoleLogger } from "@/lib/logger/console-logger";
import type { IGeneralResponse } from "@/features/shared/types";

/**
 * Cambio de contraseña para un usuario ya autenticado.
 *
 * Exige la contraseña actual, así que no hay riesgo de enumeración y el mensaje
 * "la contraseña actual es incorrecta" sí puede ser específico: el spec lo pide
 * explícitamente para que el usuario sepa qué corregir.
 *
 * `revokeOtherSessions: true` termina las sesiones de la cuenta. Una rotación
 * de contraseña se hace porque se sospecha de una filtración; si las sesiones
 * anteriores sobrevivieran, la rotación no expulsaría a nadie.
 *
 * ⚠️ El nombre de la opción engaña: better-auth NO conserva la sesión actual.
 * Borra TODAS las filas de `sessions` —incluida la de esta petición— y a
 * continuación emite una sesión nueva con un token distinto. Aquí no se rompe
 * nada porque `nextCookies()` (plugin de `auth.ts`) escribe esa cookie nueva en
 * la respuesta de Next.js y el navegador sigue dentro. Pero significa que el
 * token de sesión cambia con cada rotación: nada debe cachearlo.
 *
 * La contraseña se envía tal cual la escribió el usuario: los esquemas no la
 * recortan (decisión D6).
 */

export const changePasswordAction = async (
    userData: ChangePasswordData,
): Promise<IGeneralResponse<null>> => {
    const validatedData = ChangePasswordSchema.safeParse(userData);
    if (!validatedData.success) {
        return {
            success: false,
            error: true,
            message:
                validatedData.error.issues[0]?.message ??
                "La información proporcionada no es válida",
        };
    }

    try {
        await auth.api.changePassword({
            body: {
                currentPassword: validatedData.data.currentPassword,
                newPassword: validatedData.data.newPassword,
                revokeOtherSessions: true,
            },
            headers: await headers(),
        });

        consoleLogger({ action: "change-password", reason: "ok" });
        return {
            success: true,
            error: false,
            message: "Tu contraseña fue actualizada exitosamente",
            data: null,
        };
    } catch (error) {
        // ⚠️ Solo el código y el nombre: el `cause` puede arrastrar el body de
        // la petición de better-auth, incluido el campo `password`.
        //
        // ⚠️ El código vive en `error.body.code`, NO en `error.code` — ver
        // `getBetterAuthErrorCode`.
        const code = getBetterAuthErrorCode(error);

        consoleLogger({
            action: "change-password",
            reason:
                code === "INVALID_PASSWORD"
                    ? "invalid_current_password"
                    : "unexpected_error",
            errorName: error instanceof Error ? error.name : "unknown",
        });

        if (code === "INVALID_PASSWORD") {
            return {
                success: false,
                error: true,
                message: "La contraseña actual es incorrecta",
            };
        }

        if (code === "UNAUTHORIZED") {
            return {
                success: false,
                error: true,
                message: "Debes iniciar sesión para cambiar tu contraseña",
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
            message: "No fue posible cambiar tu contraseña, intenta nuevamente",
        };
    }
};
