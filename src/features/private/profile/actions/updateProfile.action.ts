"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import drizzleDB from "@/lib/db";
import { getBetterAuthErrorCode } from "@/lib/auth/better-auth-error";
import { consoleLogger } from "@/lib/logger/console-logger";
import type { IGeneralResponse } from "@/features/shared/types";
import {
    UpdateProfileSchema,
    type UpdateProfileData,
} from "@/features/private/profile/validations";
import {
    deleteFromCloudinary,
    isOwnCloudinaryUrl,
    publicIdFromSecureUrl,
} from "@/lib/utils/upload-cloudinary";

/**
 * Actualiza el perfil del usuario autenticado, **campo por campo**.
 *
 * El argumento es un parche: cada clave presente es un detalle que el usuario
 * guardó desde su propio editor. Enviar `{ name }` escribe solo el nombre;
 * enviar `{ image: null }` quita el avatar; enviar `{ image: url }` lo fija. El
 * resto de columnas queda intacto porque el cuerpo saliente se construye
 * enumerando las claves presentes (decisión D11).
 *
 * ── Por qué NO acepta un id de usuario ─────────────────────────────────────
 * Una server action es alcanzable por POST directo y NO hereda el guardia del
 * layout (guía de server actions de Next.js 16: "trata cada action como un punto
 * de entrada no confiable"). Por eso el sujeto se vuelve a derivar aquí, de la
 * propia sesión, y jamás del payload: no existe un parámetro que un atacante
 * pueda apuntar al id de otra cuenta (decisión D5).
 *
 * ── Las tres barreras contra la escalada de privilegios (decisión D6) ───────
 * 1. El esquema es `.strict()`: `role`, `isActive` o cualquier campo fuera del
 *    conjunto editable es un ERROR de validación, no un descarte silencioso.
 * 2. El cuerpo que se le pasa a better-auth se construye enumerando claves, sin
 *    spread: solo viaja aquello que el usuario realmente envió.
 * 3. better-auth declara `input: false` en `role` e `isActive`, así que aunque
 *    algo llegara a su capa de entrada, los descarta al actualizar.
 *
 * Ninguna de las tres depende de las otras dos: la garantía no se apoya en un
 * flag de configuración de una librería que podría cambiar.
 *
 * ⚠️ Nunca se registra el payload, el nombre ni la dirección de correo. Solo un
 * código de motivo y, como mucho, el nombre del error. Ver las notas de
 * `login.action.ts` y `change-password.action.ts`, y el hallazgo F-03 de
 * openspec/changes/01-audit-exposed-secrets/.
 */

type UpdateProfileReason =
    | "invalid_input"
    | "unauthenticated"
    | "inactive_account"
    | "foreign_image_host"
    | "no_changes"
    | "asset_delete_ok"
    | "asset_delete_failed"
    | "asset_delete_skipped"
    | "ok"
    | "unexpected_error";

const logUpdateOutcome = (
    reason: UpdateProfileReason,
    errorName?: string,
): void => {
    consoleLogger({ action: "update-profile", reason, errorName });
};

/**
 * Mensaje del primer problema de validación, traducido cuando hace falta.
 *
 * Zod 4 no permite tipar un mensaje propio para las claves desconocidas —
 * `.strict(mensaje)` funciona en runtime pero no está en la firma—, así que el
 * texto por defecto llega en inglés. Se traduce aquí, en el borde de la API,
 * donde vive el resto del copy en español.
 */
const invalidInputMessage = (
    issues: readonly { code: string; message: string }[],
): string => {
    const first = issues[0];
    if (first?.code === "unrecognized_keys") {
        return "El envío contiene campos que no se pueden modificar";
    }
    return first?.message ?? "La información proporcionada no es válida";
};

export const updateProfileAction = async (
    patch: UpdateProfileData,
): Promise<IGeneralResponse<null>> => {
    const parsed = UpdateProfileSchema.safeParse(patch);
    if (!parsed.success) {
        logUpdateOutcome("invalid_input");
        return {
            success: false,
            error: true,
            message: invalidInputMessage(parsed.error.issues),
        };
    }

    const headersList = await headers();

    try {
        const session = await auth.api.getSession({ headers: headersList });
        if (!session) {
            logUpdateOutcome("unauthenticated");
            return {
                success: false,
                error: true,
                message: "Debes iniciar sesión para actualizar tu perfil",
            };
        }

        // Una sola lectura cubre las dos necesidades: re-verificar el estado de
        // la cuenta (el guardia del layout no protege a la action) y obtener la
        // imagen **actual** de la base de datos, que es el único origen válido
        // del objetivo de borrado (decisión D14).
        const current = await drizzleDB.query.users.findFirst({
            where: { id: { eq: session.user.id } },
            columns: { image: true, isActive: true, banned: true },
        });

        if (!current || !current.isActive || current.banned) {
            logUpdateOutcome("inactive_account");
            return {
                success: false,
                error: true,
                message: "Tu cuenta no está disponible en este momento",
            };
        }

        const p = parsed.data;
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";

        // ⚠️ Presencia, no veracidad: `image: null` es "quitar el avatar" y debe
        // llegar a better-auth. `if (p.image)` lo confundiría con "no lo toqué".
        const body: { name?: string; image?: string | null } = {};

        if (Object.hasOwn(p, "name") && p.name !== undefined) {
            body.name = p.name;
        }

        if (Object.hasOwn(p, "image") && p.image !== undefined) {
            // La subida va navegador→Cloudinary, así que la URL es lo que el
            // llamador afirma. Se restringe al host del Cloudinary del proyecto
            // (decisión D21); una URL ajena no se guarda.
            if (p.image !== null && !isOwnCloudinaryUrl(p.image, cloudName)) {
                logUpdateOutcome("foreign_image_host");
                return {
                    success: false,
                    error: true,
                    message:
                        "La imagen debe ser una imagen subida a nuestro servicio",
                };
            }
            body.image = p.image;
        }

        // Defensa en profundidad: el esquema ya rechaza un parche vacío, pero si
        // la forma del cuerpo llegara aquí sin claves, better-auth lanzaría
        // "No fields to update" y el usuario vería un error genérico.
        if (Object.keys(body).length === 0) {
            logUpdateOutcome("no_changes");
            return {
                success: false,
                error: true,
                message: "No hay cambios que guardar",
            };
        }

        await auth.api.updateUser({ body, headers: headersList });

        // ── Disposición del activo anterior (decisión D13) ─────────────────
        // Se ejecuta DESPUÉS de que la escritura haya funcionado: borrar antes
        // destruiría el avatar viejo y luego podría fallar el guardado del
        // nuevo, dejando al usuario sin ninguno. En este orden, lo peor que
        // puede pasar es un activo huérfano.
        //
        // El objetivo sale de `current.image` —la fila que se acaba de leer del
        // usuario autenticado—, NUNCA de `p.image` ni de ningún otro dato de la
        // petición: un llamador no puede elegir qué activo se destruye.
        if (body.image !== undefined) {
            const previousImage = current.image;

            if (previousImage && previousImage !== body.image) {
                const publicId = publicIdFromSecureUrl(
                    previousImage,
                    cloudName,
                );

                if (!publicId) {
                    logUpdateOutcome("asset_delete_skipped");
                } else if (await deleteFromCloudinary(publicId)) {
                    logUpdateOutcome("asset_delete_ok");
                } else {
                    // Un borrado fallido no falla la petición: el usuario pidió
                    // un avatar nuevo y lo tiene; un activo huérfano es una
                    // molestia operativa, no una edición fallida.
                    logUpdateOutcome("asset_delete_failed");
                }
            }
        }

        logUpdateOutcome("ok");
        return {
            success: true,
            error: false,
            message: "Tu perfil fue actualizado exitosamente",
            data: null,
        };
    } catch (error) {
        // ⚠️ Solo código y nombre. El `cause` de un APIError de better-auth
        // puede arrastrar el cuerpo de la petición.
        const code = getBetterAuthErrorCode(error);

        consoleLogger({
            action: "update-profile",
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
                    ? "Debes iniciar sesión para actualizar tu perfil"
                    : "No fue posible actualizar tu perfil, intenta nuevamente",
        };
    }
};
