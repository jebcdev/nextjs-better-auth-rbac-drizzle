import { resetPasswordTemplate, verificationTemplate } from "./templates";
import { sendEmail } from "./transport";
import type { OutgoingEmail } from "./types";

/**
 * Callbacks de mejor-auth, ya cableados contra las rutas reales de la
 * aplicación. `auth.ts` solo los referencia; aquí vive toda la decisión de
 * "qué correo se envía y hacia dónde apunta su enlace".
 *
 * ⚠️ El `url` que entrega mejor-auth **se descarta y se rehace aquí**. Mejor-auth
 * compone sus enlaces contra su `baseURL` —la ruta que montaría SU propio
 * handler HTTP (`GET /verify-email`, `GET /reset-password/:token`)— y espera
 * que ese endpoint redirija al `callbackURL`. Esa aplicación no monta ningún
 * handler (mismo motivo que el limitador de `rate-limit.ts`), así que el `url`
 * crudo apuntaría a rutas inexistentes. Mejor-auth sí entrega el `token`
 * crudo, y con él se construye el enlace contra la página real.
 */
const APP_URL = (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BETTER_AUTH_URL ??
    ""
).replace(/\/+$/, "");

/** Forma mínima del usuario que consume un handler: solo la dirección. */
export interface EmailUser {
    email: string;
}

/**
 * Envío del correo de verificación de dirección.
 *
 * Se dispara para el alta (activación), el reenvío manual y el cambio de
 * correo. En el flujo de cambio de dirección mejor-auth entrega aquí el
 * usuario con `email` YA sustituida por la nueva: el mensaje va a la dirección
 * nueva, que es justo lo que hay que probar.
 */
export const sendVerificationEmail = async ({
    user,
    token,
}: {
    user: EmailUser;
    token: string;
}): Promise<void> => {
    const url = `${APP_URL}/perfil/confirmar-email?token=${encodeURIComponent(
        token,
    )}`;
    const { subject, text } = verificationTemplate({ url });
    const message: OutgoingEmail = { to: user.email, subject, text, url };
    await sendEmail(message);
};

/**
 * Envío del correo de recuperación de contraseña.
 *
 * El enlace apunta a `/restablecer-contrasena`, la página real que consume el
 * token (decisión D5).
 */
export const sendResetPassword = async ({
    user,
    token,
}: {
    user: EmailUser;
    token: string;
}): Promise<void> => {
    const url = `${APP_URL}/restablecer-contrasena?token=${encodeURIComponent(
        token,
    )}`;
    const { subject, text } = resetPasswordTemplate({ url });
    const message: OutgoingEmail = { to: user.email, subject, text, url };
    await sendEmail(message);
};