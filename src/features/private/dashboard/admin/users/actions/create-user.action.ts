"use server";

// ⚠️ Esta acción NO va marcada `server-only`, por el mismo motivo que
// `get-all-users.action.ts`: la llama `useCreateUserMutation`, que es un hook de
// cliente. Añadir `server-only` rompería el build. Lo que SÍ es una frontera real
// son dos cosas, y las dos están debajo: el sujeto se deriva siempre de la sesión,
// y lo que cruza de vuelta es un mensaje, no una fila.
//
// ⚠️ Una server action es POSTeable directamente y NO hereda el guard de la
// página. Este archivo es el único punto donde se decide si la llamada prospera, y
// usa el MISMO `hasRequiredRole` con la MISMA constante `ADMIN_USERS_ROLES` que la
// página, el listado y los dos toggles, para que las cinco reglas no puedan
// divergir.
//
// ⚠️ El alta es de DOS escrituras y no es atómica (decisión D1). better-auth
// contabiliza la contraseña y su ciclo de vida de cuenta, y es lo que hay que usar
// para eso; pero su `user.create.before` —y el `databaseHooks` del propio
// `auth.ts`— fuerzan `role: "user"` en CUALQUIER alta, así que el rol elegido en el
// formulario no puede viajar en esa llamada. Se escribe después, con un `update`
// propio. El peor caso —que ese segundo `update` falle— es una cuenta existente
// con el rol por defecto, no una cuenta invisible, y la acción lo reporta como
// FALLO para que el super admin la vuelva a editar.

import { eq } from "drizzle-orm";

import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import drizzleDB from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSessionDetails } from "@/lib/auth/session-details";
import { hasRequiredRole } from "@/lib/auth/role-guard";
import { getBetterAuthErrorCode } from "@/lib/auth/better-auth-error";
import { consoleLogger } from "@/lib/logger/console-logger";
import { IGeneralResponse } from "@/features/shared/types";
import { isOwnCloudinaryUrl } from "@/lib/utils/upload-cloudinary";
import { ADMIN_USERS_ROLES } from "../components/grid";
import { CreateUserSchema, type CreateUserData } from "../validations";

type CreateUserReason =
    | "invalid_input"
    | "no_session"
    | "unauthorized"
    | "email_taken"
    | "foreign_image_host"
    | "role_write_failed"
    | "ok"
    | "unexpected_error";

/**
 * Registra el motivo de la llamada.
 *
 * ⚠️ Solo un código de motivo y, como mucho, el NOMBRE del error. Nunca el
 * cuerpo, ni el email, ni la contraseña, ni la respuesta de better-auth: esta
 * acción maneja las dos cosas que el proyecto tiene prohibido registrar (hallazgo
 * F-03 de 01-audit-exposed-secrets, y las notas de `login.action.ts`). El
 * `cause` de un `APIError` de better-auth puede arrastrar el cuerpo de la
 * petición, con la contraseña dentro.
 */
const logOutcome = (
    reason: CreateUserReason,
    errorName?: string,
): void => {
    consoleLogger({ action: "create-user", reason, errorName });
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
 * Alta de UNA cuenta del directorio.
 *
 * ── Por qué el email se comprueba ANTES de llamar a better-auth ──────────────
 * better-auth también rechaza un email duplicado, pero lo hace con su propio
 * `APIError`, cuyo mensaje está en inglés y cuyo código no distingue este caso del
 * resto de fallos de la librería. Comprobarlo aquí, contra la base de datos y con
 * el MISMO valor normalizado que después se escribe, da un motivo `email_taken`
 * propio y un mensaje en español, y además cierra una ventana: entre la
 * comprobación y el `createUser` no hay ninguna transacción, así que la
 * comprobación sirve para dar un mensaje claro, no para garantizar la unicidad.
 * La garantía real la sigue dando el índice único de `users.email`.
 *
 * ── Por qué NO acepta ningún identificador de usuario ───────────────────────
 * El sujeto sale de `getSessionDetails()`. No hay ningún campo en el cuerpo que
 * pueda apuntar a otra cuenta, porque en un alta no hay cuenta previa a la que
 * apuntar (decisión D15).
 */
export const createUserAction = async (
    body: CreateUserData,
): Promise<IGeneralResponse<null>> => {
    // ⚠️ Antes de tocar la base de datos, y fuera del `try`: un cuerpo mal
    // formado no es un error inesperado sino una petición inválida, y merece su
    // propio motivo en el log.
    const parsed = CreateUserSchema.safeParse(body);

    if (!parsed.success) {
        logOutcome("invalid_input");
        return {
            success: false,
            error: true,
            message: invalidInputMessage(parsed.error.issues),
        };
    }

    const { name, email, password, role, image } = parsed.data;

    try {
        const { isAuthenticated, userRole } = await getSessionDetails();

        if (!isAuthenticated) {
            logOutcome("no_session");
            return {
                success: false,
                error: true,
                message: "Debes iniciar sesión para crear una cuenta",
            };
        }

        if (!hasRequiredRole(userRole, ADMIN_USERS_ROLES)) {
            logOutcome("unauthorized");
            return {
                success: false,
                error: true,
                message: "No tienes permisos para crear usuarios.",
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

        const existing = await drizzleDB.query.users.findFirst({
            where: { email },
            columns: { id: true },
        });

        if (existing) {
            logOutcome("email_taken");
            return {
                success: false,
                error: true,
                message: "Ya existe una cuenta con ese correo electrónico",
            };
        }

        const headersList = await headers();

        // better-auth se encarga de la contraseña y del ciclo de vida de la
        // cuenta. `role` NO viaja aquí: sus hooks de creación lo fuerzan a
        // `"user"` pase lo que pase, así que mandarlo sería ignorado (decisión
        // D1). El `image` tampoco viaja en `data` por la misma razón de `input:
        // false` en `auth.ts`; se escribe en el mismo `update` que el rol.
        const created = await auth.api.createUser({
            body: { name, email, password },
            headers: headersList,
        });

        const createdId = created?.user?.id;

        if (!createdId) {
            // Sin id no hay nada que actualizar. No se inventa un éxito: la
            // cuenta puede haberse creado, así que el mensaje dice dónde mirar.
            logOutcome("unexpected_error");
            return {
                success: false,
                error: true,
                message:
                    "La cuenta se creó pero no fue posible asignarle el rol. Revisa el directorio.",
            };
        }

        // ⚠️ Un solo `update` con DOS columnas: el rol elegido y el avatar. La
        // contraseña y el email ya están escrito por better-auth y no se tocan.
        // `isActive` y `banned` no aparecen, así que el alta no puede activar ni
        // vetar nada por accidente.
        await drizzleDB
            .update(users)
            .set({ role, image: image ?? null })
            .where(eq(users.id, createdId));

        logOutcome("ok");

        return {
            success: true,
            error: false,
            message: "La cuenta fue creada exitosamente",
            data: null,
        };
    } catch (error) {
        // ⚠️ Solo el código y el nombre. El `cause` de un `APIError` de
        // better-auth puede arrastrar el cuerpo de la petición, con la contraseña
        // dentro.
        const code = getBetterAuthErrorCode(error);

        // better-auth también detecta el email duplicado, con su propio código
        // (`USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`, que es el que emite
        // `admin/routes.mjs` en su `createUser`). La comprobación previa y esta
        // deben llegar al super admin como el mismo motivo y el mismo mensaje, y
        // no como un fallo genérico de la librería en inglés.
        if (code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
            logOutcome("email_taken");
            return {
                success: false,
                error: true,
                message: "Ya existe una cuenta con ese correo electrónico",
            };
        }

        logOutcome(
            code === "UNAUTHORIZED" ? "no_session" : "unexpected_error",
            error instanceof Error ? error.name : "unknown",
        );

        return {
            success: false,
            error: true,
            message:
                code === "UNAUTHORIZED"
                    ? "Debes iniciar sesión para crear una cuenta"
                    : "Ocurrió un error inesperado al crear la cuenta. Intenta nuevamente.",
        };
    }
};
