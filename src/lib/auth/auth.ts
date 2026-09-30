import { betterAuth, User } from "better-auth";
import { admin } from "better-auth/plugins";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";

import { nextCookies } from "better-auth/next-js";
import drizzleDB from "../db";
import * as schema from "@/lib/db/schema"; // Importa todo el schema
import { randomUUID } from "crypto";
import {
    sendResetPassword as sendResetPasswordMessage,
    sendVerificationEmail as sendVerificationEmailMessage,
} from "@/lib/emails";

const auth = betterAuth({
    database: drizzleAdapter(drizzleDB, {
        provider: "pg", // or "mysql", "sqlite"
        // usePlural: true, // Use plural table names (e.g., "users" instead of "user")
        schema: {
            user: schema.users,
            session: schema.sessions,
            account: schema.accounts,
            verification: schema.verifications,
        },
    }),
    advanced: {
        database: {
            generateId: () => randomUUID(),
            // joins: true, // Habilita joins para relaciones entre tablas
        },
    },

    emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
        autoSignIn: true,

        // ── Recuperación de contraseña (decisión D5) ──────────────────────
        //
        // better-auth ya cubre lo importante: el token es de un solo uso, se
        // guarda en la tabla `verifications` que ya existe en el esquema,
        // expira por sí solo, y `requestPasswordReset` devuelve SIEMPRE el
        // mismo mensaje exista o no la dirección (además hace una búsqueda
        // señuelo para que tampoco se distinga por tiempo).
        //
        // ⚠️ `sendResetPassword` es obligatorio: sin él better-auth lanza
        // RESET_PASSWORD_DISABLED y no hay flujo de recuperación. La entrega
        // delega en `src/lib/emails/`; sin `MAILTRAP_API_TOKEN` el transporte
        // es un no-op silencioso y el flujo completa igual.
        //
        // ⚠️ El `url` que entrega better-auth **se descarta y se rehace en
        // `src/lib/emails/auth-handlers.ts`** contra `/restablecer-contrasena`,
        // la página real que consume el token (mismo motivo documentado allí
        // que para la verificación: esta app no monta handler HTTP).
        sendResetPassword: async ({ user, token }) => {
            await sendResetPasswordMessage({ user, token });
        },

        // El enlace de recuperación puede llegar por un canal comprometido. Si
        // las sesiones anteriores sobrevivieran, la recuperación no le
        // devolvería el control al dueño: quien hubiera robado una sesión la
        // conservaría. Por eso restablecer la contraseña termina TODAS las
        // sesiones de la cuenta.
        revokeSessionsOnPasswordReset: true,

        // 1 hora. Si el correo lleva horas sin abrirse, el token ya no sirve de
        // nada y solo queda como ventana de ataque.
        resetPasswordTokenExpiresIn: 60 * 60,
    },

    // ── Verificación de correo (decisión D16) ───────────────────────────────
    //
    // better-auth solo emite un token de verificación si este bloque está
    // declarado: sin `sendVerificationEmail` NO existe la función, y por tanto
    // tampoco existe `auth.api.changeEmail` utilizable. Es la razón por la que
    // el flujo de cambio de dirección no puede construirse sin esta línea.
    emailVerification: {
        // ⚠️ El `url` que entrega better-auth **se descarta y se rehace en
        // `src/lib/emails/auth-handlers.ts`** contra la ruta real
        // `/perfil/confirmar-email` —la página que llama a
        // `auth.api.verifyEmail`—, en español como el resto de URLs. El `url`
        // crudo apuntaría al endpoint que esta aplicación no monta (mismo
        // motivo que el limitador de `rate-limit.ts`).
        //
        // La entrega la hace `src/lib/emails/`: sin `MAILTRAP_API_TOKEN` el
        // transporte es un no-op silencioso y el flujo de auth completa igual.
        sendVerificationEmail: async ({ user, token }) => {
            // En el flujo de cambio de dirección better-auth entrega aquí el
            // usuario con `email` YA sustituida por la nueva: el mensaje va a la
            // dirección nueva, que es justo lo que hay que probar.
            await sendVerificationEmailMessage({ user, token });
        },

        // `sendOnSignUp: true` con `requireEmailVerification: false` (decisión
        // D16, actualizada): mejor-auth decide la emisión al alta con
        // `sendOnSignUp ?? requireEmailVerification`, así que el correo de
        // activación SÍ sale al registrarse, pero la verificación sigue sin ser
        // requisito para operar. El `false` de `requireEmailVerification` se
        // mantiene declarado arriba para que un cambio futuro en la política de
        // verificación no altere en silencio el alta de usuarios nuevos.
        sendOnSignUp: true,
    },

    // ── Vida de la sesión, explícita y no el default de la librería ────────
    // Decisión D7 de openspec/changes/04-harden-authentication/.
    //
    // better-auth usa 7 días para `expiresIn` y 24 h para `updateAge` cuando la
    // opción no se escribe. Ese 7 días nunca fue una decisión de nadie: es
    // simplemente lo que hace la librería cuando falta el valor. Declararlo lo
    // hace revisable y evita que derive con las actualizaciones de la librería.
    session: {
        // Cota ABSOLUTA de 8 horas, la duración de una jornada. Pasadas las 8
        // horas la sesión deja de aceptarse y hay que autenticarse de nuevo.
        //
        // No se añadió renovación automática. Con `updateAge` por debajo de
        // `expiresIn`, better-auth extiende la sesión con la actividad; para una
        // herramienta interna una cota absoluta es la opción más segura. Si el
        // rozamiento llegara a ser real, alargar este valor es cambiar una línea.
        expiresIn: 60 * 60 * 8,

        // Con actividad, la sesión se extiende como máximo hasta `expiresIn`.
        // 1 h evita que un único clic renueve la sesión indefinidamente.
        updateAge: 60 * 60,

        // ⚠️ `cookieCache` se deja APAGADO a propósito. Cachear la validez de la
        // sesión durante minutos choca con la revocación en el mismo request de
        // la decisión D2: una cuenta desactivada seguiría operando hasta que la
        // caché expirara. Al estar apagado, resolver la sesión siempre lee la
        // base de datos y la comprobación de `getSessionDetails` es inmediata.
        // Cuesta una lectura por petición; la corrección gana.
    },

    user: {
        additionalFields: {
            role: {
                type: "string",
                required: false,
                defaultValue: "user",
                input: false, // No permitir que el cliente lo setee directamente
            },
            isActive: {
                type: "boolean",
                required: false,
                defaultValue: true,
                input: false,
            },
            tenantId: {
                type: "string",
                required: false,
                defaultValue: null,
                input: true, // Permitir asignarlo al registrar
            },
        },

        // ── Cambio de dirección (decisión D16) ─────────────────────────────
        //
        // Es un flujo aparte y con verificación, NO un campo más del parche de
        // perfil: la dirección nueva no se guarda al solicitarla, sino cuando
        // quien la controla confirma desde ella. Escribirla de inmediato sería
        // tomar el control de la identidad de la cuenta sin prueba de nada.
        //
        // ⚠️ `sendChangeEmailConfirmation` se deja APAGADO a propósito. Con él
        // activado, better-auth envía el primer correo a la dirección VIEJA para
        // pedir permiso, y solo después el de verificación a la nueva. Eso es la
        // política de un producto donde el titular puede perder la cuenta por un
        // cambio malicioso; aquí el escenario es el contrario —el propio titular
        // mueve su correo—, así que el mensaje debe llegar a la dirección
        // nueva, que es la que hay que probar. Con la opción apagada,
        // `changeEmail` entrega el `user` con `email` ya sustituida y ese es el
        // destinatario real (ver `sendVerificationEmail` más arriba).
        //
        // `updateEmailWithoutVerification` se queda en su default (`false`) por la
        // misma razón: sin verificación no hay cambio de dirección.
        changeEmail: { enabled: true },
    },

    databaseHooks: {
        user: {
            create: {
                before: async (user) => {
                    return {
                        data: {
                            ...user,
                            role: "user", // Siempre forzar rol por defecto
                            isActive: true,
                        },
                    };
                },
            },
        },
    },

    plugins: [
        admin({
            defaultRole: "user",
            // Roles con acceso al panel de admin. La opción se llama
            // `adminRoles`; `adminUserRoles` no existe y se ignoraba en
            // silencio, dejando el default ["admin"].
            adminRoles: ["admin"],
        }),
        nextCookies(),
    ],
});

export { auth, type User };
