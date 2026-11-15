"use server";

// ⚠️ Esta acción NO va marcada `server-only`, por el mismo motivo que
// `get-all-users.action.ts`: la llama `useUpdateUserMutation`, que es un hook de
// cliente. Añadir `server-only` rompería el build. Lo que SÍ es una frontera real
// son dos cosas, y las dos están debajo: el sujeto se deriva siempre de la sesión,
// y lo que cruza de vuelta es un mensaje, no una fila.
//
// ⚠️ Una server action es POSTeable directamente y NO hereda el guard de la
// página. Este archivo es el único punto donde se decide si la llamada prospera, y
// usa el MISMO `hasRequiredRole` con la MISMA constante `ADMIN_USERS_ROLES` que la
// página, el listado y los dos toggles, para que las cinco reglas no puedan
// divergir.

import { eq } from "drizzle-orm";

import drizzleDB from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSessionDetails } from "@/lib/auth/session-details";
import { hasRequiredRole } from "@/lib/auth/role-guard";
import { consoleLogger } from "@/lib/logger/console-logger";
import { IGeneralResponse } from "@/features/shared/types";
import { isOwnCloudinaryUrl } from "@/lib/utils/upload-cloudinary";
import { ADMIN_USERS_ROLES } from "../components/grid";
import { UpdateUserSchema, type UpdateUserData } from "../validations";

type UpdateUserReason =
    | "invalid_input"
    | "no_session"
    | "unauthorized"
    | "foreign_image_host"
    | "target_not_found"
    | "email_taken"
    | "ok"
    | "unexpected_error";

/**
 * Registra el motivo de la llamada.
 *
 * ⚠️ Solo un código de motivo y, como mucho, el NOMBRE del error. Nunca el
 * `userId` del cuerpo, ni el email, ni el error completo: el `cause` de un error
 * de Drizzle puede arrastrar la consulta y sus valores (hallazgo F-03 de
 * 01-audit-exposed-secrets). Los motivos son distinguibles entre sí precisamente
 * porque no llevan datos.
 */
const logOutcome = (
    reason: UpdateUserReason,
    errorName?: string,
): void => {
    consoleLogger({ action: "update-user", reason, errorName });
};

/**
 * Traduce el primer problema de validación.
 *
 * El texto por defecto de Zod para una clave desconocida llega en inglés, y Zod 4
 * no deja sobrescribirlo de forma tipada desde el esquema, así que la traducción
 * vive aquí, en el borde de la API, donde está el resto del copy en español (mismo
 * motivo que en `updateProfile.action.ts`).
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

/**
 * Edita UNA cuenta del directorio.
 *
 * ── Por qué un `update` de Drizzle y no `auth.api.updateUser` ────────────────
 * `role` e `isActive` están declarados `input: false` en `auth.ts` y `banned`
 * pertenece al plugin admin, así que ninguno de los tres se puede escribir por la
 * capa de better-auth. Repartir la edición entre `updateUser` (nombre, email,
 * avatar) y un `update` propio (rol) dividiría un solo guardado visible en dos
 * mecanismos con dos superficies de error distintas; aquí una escritura, un
 * resultado (decisión D2).
 *
 * ── Por qué NO reescribe la contraseña ───────────────────────────────────────
 * `UpdateUserSchema` no tiene campo `password`, y esa ausencia —no un
 * `.optional()`— es lo que hace la operación imposible. La contraseña de una
 * cuenta existente es de su titular y se cambia desde su propio perfil: aceptar
 * aquí una contraseña sería una puerta por la que un super admin se adueñaría de
 * cualquier sesión.
 *
 * ── Por qué SÍ puede tener como objetivo la propia cuenta ───────────────────
 * A diferencia de los dos toggles, que rechazan el propio objetivo, aquí un
 * cambio de rol o de avatar no desactiva la cuenta de quien lo pide:
 * `getSessionDetails()` mantiene la sesión y el directorio para una cuenta activa
 * sea cual sea su rol. Los toggles rechazan el auto-objetivo porque desactivar la
 * propia cuenta deja al super admin encerrado y el fallo es SILENCIOSO; una
 * autodespromoción es visible de inmediato y la revierte otro admin.
 */
export const updateUserAction = async (
    body: UpdateUserData,
): Promise<IGeneralResponse<null>> => {
    // ⚠️ Antes de tocar la base de datos, y fuera del `try`: un cuerpo mal
    // formado no es un error inesperado sino una petición inválida, y merece su
    // propio motivo en el log.
    const parsed = UpdateUserSchema.safeParse(body);

    if (!parsed.success) {
        logOutcome("invalid_input");
        return {
            success: false,
            error: true,
            message: invalidInputMessage(parsed.error.issues),
        };
    }

    const { userId, name, email, role, image } = parsed.data;

    try {
        const { isAuthenticated, userRole } = await getSessionDetails();

        if (!isAuthenticated) {
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

        // Una sola lectura cubre dos preguntas: que la cuenta exista y cuál es su
        // email ACTUAL. Se acotan las columnas porque aquí no se necesita nada
        // más, y pedir menos columnas es pedir menos datos que puedan colarse en
        // un log por accidente.
        const target = await drizzleDB.query.users.findFirst({
            where: { id: userId },
            columns: { id: true, email: true },
        });

        if (!target) {
            logOutcome("target_not_found");
            return {
                success: false,
                error: true,
                message: "La cuenta indicada no existe",
            };
        }

        // ⚠️ Misma comprobación de procedencia que en el perfil: la subida va
        // navegador→Cloudinary, así que la URL es lo que el llamador AFIRMA que
        // es. Una URL de otro host no se guarda. Sin `api_secret` en el bundle, un
        // avatar ajeno sería contenido que el atacante controla.
        if (
            image !== null &&
            image !== undefined &&
            !isOwnCloudinaryUrl(
                image,
                process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "",
            )
        ) {
            logOutcome("foreign_image_host");
            return {
                success: false,
                error: true,
                message:
                    "La imagen debe ser una imagen subida a nuestro servicio",
            };
        }

        // El email es UNIQUE en el esquema, así que una colisión revienta el
        // `update` con una violación de restricción y el super admin vería un
        // error genérico. Se comprueba antes para darle un motivo propio.
        //
        // ⚠️ `ne(users.id, userId)` es lo que hace que ESTA cuenta no choque
        // consigo misma: sin ese brazo, reenviar el mismo email que ya tiene
        // sería «duplicado» y una edición sin cambios sería imposible, cuando el
        // requisito la declara un éxito, no un fallo.
        //
        // La comparación es contra el email YA NORMALIZADO por el esquema
        // (minúsculas, sin espacios), que es exactamente el valor que se va a
        // escribir, así que no hay forma de que se esquive variando las mayúsculas.
        //
        // El filtro va en la FORMA de objeto de la API relacional de Drizzle
        // (`email` como igualdad e `id` con el operador `ne`) y no como
        // `and(eq(...), ne(...))`: esa combinación devuelve `SQL | undefined`, que
        // la firma de `findFirst` rechaza. La forma de objeto dice lo mismo sin el
        // `undefined`.
        const conflicting = await drizzleDB.query.users.findFirst({
            where: { email, id: { ne: userId } },
            columns: { id: true },
        });

        if (conflicting) {
            logOutcome("email_taken");
            return {
                success: false,
                error: true,
                message:
                    "Ya existe otra cuenta con ese correo electrónico",
            };
        }

        // ⚠️ El `set` nombra CUATRO columnas: nombre, email, avatar y rol. Ni
        // `isActive`, ni `banned`, ni `password`, ni un spread de la fila: el
        // requisito es que esta edición no mueva ninguna otra cosa, y la forma más
        // barata de cumplirlo es que el objeto no tenga de dónde copiar el resto.
        // Esas dos banderas ya las escriben las acciones `toggle-*`, y tener dos
        // caminos de escritura para la misma columna es exactamente lo que
        // acabaría divergiendo.
        //
        // Poner los valores que ya estaban se reporta como éxito, no como error:
        // el requisito lo pide así, y la operación es idempotente por
        // construcción.
        await drizzleDB
            .update(users)
            .set({ name, email, role, image: image ?? null })
            .where(eq(users.id, userId));

        logOutcome("ok");

        return {
            success: true,
            error: false,
            message: "La cuenta fue actualizada exitosamente",
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
