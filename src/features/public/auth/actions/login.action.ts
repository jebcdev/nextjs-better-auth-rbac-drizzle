"use server";

import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import {
    LoginSchema,
    LoginData,
} from "@/features/public/auth/validations";
import {
    clearAttempts,
    getClientRateLimitKey,
    isRateLimited,
    recordFailedAttempt,
} from "@/lib/auth/rate-limit";

import { consoleLogger } from "@/lib/logger/console-logger";
import { IGeneralResponse } from "@/features/shared/types/";
import { User } from "@/lib/auth/auth";
import drizzleDB from "@/lib/db";

/**
 * Códigos de motivo del desenlace de `loginAction`.
 *
 * Son diagnósticos internos: permiten que soporte sepa por qué falló un inicio
 * de sesión sin que quien llama pueda deducir si la dirección existe. El mensaje
 * que ve el usuario es SIEMPRE el mismo, el motivo se queda en el log.
 *
 * ⚠️ Nunca añada el payload, el email ni la contraseña a un log. Ver
 * openspec/changes/01-audit-exposed-secrets/ (hallazgo F-03) y
 * openspec/changes/04-harden-authentication/.
 */
type LoginReason =
    | "invalid_input"
    | "rate_limited"
    | "unknown_user"
    | "inactive_account"
    | "invalid_credentials"
    | "unexpected_error"
    | "ok";

/**
 * Único mensaje de fallo que ve el llamador. Dirección inexistente, contraseña
 * incorrecta, cuenta desactivada, cuenta vetada y límite de intentos agotado
 * devuelven exactamente esta misma cadena y la misma forma de respuesta
 * (decisión D1). Cualquier diferenciación abriría un oráculo de enumeración.
 */
const CREDENTIAL_ERROR_MESSAGE = "El email o la contraseña son incorrectos";

const credentialError = (): IGeneralResponse<User> => ({
    success: false,
    error: true,
    message: CREDENTIAL_ERROR_MESSAGE,
});

/**
 * Hash señuelo con la forma que espera better-auth (`salt:key`, scrypt con
 * N=16384, r=16, p=1, dkLen=64). No corresponde a ninguna contraseña: existe
 * solo para que `verify` haga el mismo trabajo caro que habría hecho con un
 * hash real.
 */
const DUMMY_PASSWORD_HASH =
    "0f1e2d3c4b5a69788796a5b4c3d2e1f0:" +
    "9c8b7a69594837261504f3e2d1c0b9a8" +
    "7f6e5d4c3b2a1908172635445362718f" +
    "6e5d4c3b2a1908f7e6d5c4b3a2918007" +
    "6f5e4d3c2b1a0918273645546372819a" +
    "0b1c2d3e4f5a69788796a5b4c3d2e1f00";

/**
 * Ejecuta una verificación de contraseña real y descarta el resultado.
 *
 * Es la mitad del anti-timing de D1: sin ella, la rama de "dirección
 * desconocida" (o la de "cuenta desactivada") salía después de un único índice
 * indexado, mientras que la de "contraseña incorrecta" salía después de un
 * scrypt (~90 ms). Con 100 requests ese hueco separa las poblaciones sin
 * esfuerzo. Igualar el paso caro es lo que cierra el canal de verdad.
 *
 * Se descarta el resultado a propósito: en estas ramas el fallo ya está
 * decidido y no hay nada que validar.
 */
const spendVerificationTime = async (password: string): Promise<void> => {
    try {
        const context = await auth.$context;
        await context.password.verify({
            hash: DUMMY_PASSWORD_HASH,
            password,
        });
    } catch {
        // Silencioso a propósito: un fallo aquí solo significa que el señuelo no
        // se verificó. Alterar la respuesta por eso reintroduciría el oráculo
        // que este archivo existe para cerrar.
    }
};

/**
 * Registra el desenlace del intento. Deliberadamente no acepta ningún dato
 * enviado por el usuario: solo un código de motivo.
 */
const logLoginOutcome = (reason: LoginReason): void => {
    consoleLogger({ action: "login", reason });
};

export const loginAction = async (
    userData: LoginData,
): Promise<IGeneralResponse<User>> => {
    try {
        const validatedData = LoginSchema.safeParse(userData);

        if (!validatedData.success) {
            logLoginOutcome("invalid_input");
            return {
                success: false,
                error: true,
                message: "La información proporcionada no es válida",
            };
        }

        const { email, password } = validatedData.data;

        // El límite se comprueba ANTES de tocar la base de datos a propósito
        // (D4): si se comprobara después, la búsqueda de la cuenta quedaría
        // sin acotar y se podría sondear qué direcciones existen ilimitadamente.
        // El rechazo usa el mismo error genérico, así que un intento throttled
        // es indistinguible de uno con credenciales malas.
        const rateLimitKey = await getClientRateLimitKey();
        if (isRateLimited("login", rateLimitKey)) {
            logLoginOutcome("rate_limited");
            return credentialError();
        }

        const userExists = await drizzleDB.query.users.findFirst({
            where: { email },
        });

        // Dirección no registrada. Se paga el mismo scrypt que la rama de
        // contraseña incorrecta y se devuelve el mismo mensaje.
        if (!userExists) {
            logLoginOutcome("unknown_user");
            await spendVerificationTime(password);
            recordFailedAttempt("login", rateLimitKey);
            return credentialError();
        }

        // Cuenta desactivada o vetada. La comprobación se conserva porque una
        // cuenta desactivada no debe poder entrar, pero no puede ser
        // distinguible de una dirección inexistente: mismo mensaje, mismo coste.
        if (!userExists.isActive || userExists.banned) {
            logLoginOutcome("inactive_account");
            await spendVerificationTime(password);
            recordFailedAttempt("login", rateLimitKey);
            return credentialError();
        }

        const response = await auth.api.signInEmail({
            body: {
                email,
                password,
                callbackURL: process.env.NEXT_PUBLIC_APP_URL!,
            },
            headers: await headers(),
        });

        // ⚠️ No descomentar tal cual: `response` contiene `token`, la
        // credencial de sesión viva. Si necesitas diagnosticar, loguea solo
        // campos de `response.user` (hallazgo F-03).
        logLoginOutcome("ok");

        // Acierto: la ventana se descarta para que un usuario que se equivocó un
        // par de veces y luego entra bien no quede bloqueado.
        clearAttempts("login", rateLimitKey);

        return {
            success: true,
            error: false,
            message: "Usuario iniciado sesión exitosamente",
            data: response.user,
        };
    } catch (error) {
        // Solo el nombre del error: su `cause` puede arrastrar el body de la
        // petición de better-auth, incluido el campo `password`.
        consoleLogger({
            action: "login",
            errorName: error instanceof Error ? error.name : "unknown",
        });
        return {
            success: false,
            error: true,
            message: "Error al iniciar sesión, intenta nuevamente",
        };
    }
};
