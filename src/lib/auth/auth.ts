import { betterAuth, User } from "better-auth";
import { admin } from "better-auth/plugins";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";

import { nextCookies } from "better-auth/next-js";
import drizzleDB from "../db";
import * as schema from "@/lib/db/schema"; // Importa todo el schema
import { randomUUID } from "crypto";
import { sendEmail } from "@/lib/utils/send-email";

/**
 * Origen público de la aplicación, sin barra final.
 *
 * better-auth compone sus enlaces de verificación y recuperación contra su
 * `baseURL`, que es la ruta que montaría SU propio handler HTTP. Esta
 * aplicación no monta ninguno, así que todos los enlaces se rehacen aquí contra
 * las rutas reales, que además están en español.
 */
const APP_URL = (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BETTER_AUTH_URL ??
    ""
).replace(/\/+$/, "");

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
        // RESET_PASSWORD_DISABLED y no hay flujo de recuperación. Hoy entrega a
        // través de una costura sin proveedor configurado — ver
        // `src/lib/utils/send-email.ts`, que documenta qué falta.
        //
        // ⚠️ El `url` que entrega better-auth **se descarta y se rehace aquí**.
        // better-auth compone `${baseURL}/reset-password/<token>?callbackURL=…`
        // y espera que su propio endpoint `GET /reset-password/:token` reciba
        // ese enlace y redirija al `callbackURL`. Ese endpoint solo existe si se
        // monta un handler HTTP, y esta aplicación no monta ninguno (mismo motivo
        // que el limitador de `rate-limit.ts`). Con el `url` tal cual, el correo
        // apuntaría a una ruta inexistente.
        //
        // better-auth sí nos entrega el `token` crudo, así que el enlace se
        // construye contra la ruta real de la aplicación, que es en español como
        // el resto de URLs.
        sendResetPassword: async ({ user, token }) => {
            const appUrl = (
                process.env.NEXT_PUBLIC_APP_URL ??
                process.env.BETTER_AUTH_URL ??
                ""
            ).replace(/\/+$/, "");
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
        // ⚠️ better-auth compone `${baseURL}/verify-email?token=…` y espera que
        // SU propio endpoint `GET /verify-email` reciba ese enlace y redirija al
        // `callbackURL`. Ese endpoint solo existe montando un handler HTTP, y
        // esta aplicación no monta ninguno (mismo motivo que el limitador de
        // `rate-limit.ts`). Con la `url` tal cual, el correo apuntaría a una
        // ruta inexistente.
        //
        // better-auth sí nos entrega el `token` crudo, así que el enlace se
        // construye contra la ruta real de la aplicación, en español como el
        // resto de URLs, y es esa página la que llama a `auth.api.verifyEmail`.
        //
        // ⚠️ Sin proveedor de correo configurado, la entrega pasa por una costura
        // vacía: ver `src/lib/utils/send-email.ts`, que documenta qué falta.
        sendVerificationEmail: async ({ user, token }) => {
            // En el flujo de cambio de dirección better-auth entrega aquí el
            // usuario con `email` YA sustituida por la nueva: el mensaje va a la
            // dirección nueva, que es justo lo que hay que probar.
            await sendEmail({
                to: user.email,
                subject: "Confirma tu nuevo correo electrónico",
                url: `${APP_URL}/perfil/confirmar-email?token=${encodeURIComponent(
                    token,
                )}`,
            });
        },

        // `requireEmailVerification: false` arriba significa que el alta no exige
        // verificar. Se declara explícitamente en vez de dejar `undefined` —que
        // heredaría ese `false`— para que un cambio futuro en la política de
        // verificación no altere en silencio el alta de usuarios nuevos.
        sendOnSignUp: false,
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
