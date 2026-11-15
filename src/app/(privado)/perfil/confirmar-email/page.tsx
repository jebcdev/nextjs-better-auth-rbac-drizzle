import { auth } from "@/lib/auth/auth";
import { getBetterAuthErrorCode } from "@/lib/auth/better-auth-error";
import { consoleLogger } from "@/lib/logger/console-logger";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Callback del cambio de dirección de correo.
 *
 * ⚠️ Es una PÁGINA, no un endpoint. Este repositorio no monta ningún
 * `route.ts` ni usa `toNextJsHandler`: todas las llamadas a better-auth son
 * `auth.api.*` desde el servidor. Además, mejor-auth compone sus enlaces de
 * verificación como `${baseURL}/verify-email?token=…`, que apunta a SU propio
 * endpoint HTTP —inexistente aquí—, así que `sendVerificationEmail` en `auth.ts`
 * descarta ese `url` y rehace el enlace contra esta ruta, en español como el
 * resto de URLs de la aplicación.
 *
 * ── Por qué NO se escribe `users.email` aquí ─────────────────────────────────
 * El token que llega en `?token=` es un JWT firmado por better-auth que
 * transporta la dirección actual, la nueva y el tipo de petición. Quien lo
 * presenta demuestra controlar el buzón NUEVO. `auth.api.verifyEmail` valida la
 * firma, la caducidad y el `requestType` antes de escribir, y es el único
 * punto donde el cambio se aplica. Este archivo solo cablea: pide la
 * verificación, registra el resultado con un código de motivo y devuelve al
 * usuario a su perfil.
 *
 * ⚠️ El token NO se registra. Es una credencial de un solo uso; anotarlo en un
 * log lo publicaría (hallazgo F-03 de openspec/changes/01-audit-exposed-secrets).
 */
export default async function ConfirmEmailPage({
    searchParams,
}: {
    searchParams: Promise<{ token?: string | string[] }>;
}) {
    const { token } = await searchParams;

    // Un enlace sin token no se distingue de uno manipulado: la misma respuesta,
    // sin decir qué faltó.
    if (!token || typeof token !== "string" || token.trim().length === 0) {
        consoleLogger({ action: "confirm-email", reason: "missing_token" });
        redirect("/perfil");
    }

    try {
        // `headers` para que better-auth resuelva la sesión: sin ella crearía
        // una sesión nueva y, al no poder plantear cookies desde una página,
        // el usuario perdería la que ya tenía.
        await auth.api.verifyEmail({
            query: { token },
            headers: await headers(),
        });

        consoleLogger({ action: "confirm-email", reason: "ok" });
    } catch (error) {
        // better-auth lanza INVALID_TOKEN tanto si el token no existe, ya se usó
        // como si expiró. Los tres casos reciben el mismo tratamiento y no se
        // distinguen entre sí: confirmar cuál fue no ayuda a nadie y evita
        // confirmar que un token existió alguna vez.
        //
        // ⚠️ Solo código y nombre de error: el `cause` de un `APIError` puede
        // arrastrar el cuerpo de la petición.
        const code = getBetterAuthErrorCode(error);

        consoleLogger({
            action: "confirm-email",
            reason: code === "INVALID_TOKEN" ? "invalid_token" : "unexpected_error",
            errorName: error instanceof Error ? error.name : "unknown",
        });
    }

    // En ambos casos se vuelve al perfil. El usuario ve allí si el cambio se
    // aplicó —la dirección mostrada es la nueva— o si no, y solo puede pedir
    // otro enlace desde el propio editor.
    redirect("/perfil");
}
