/**
 * Costura de envío de correo — el ÚNICO punto por donde saldría un mensaje.
 *
 * ⚠️ Este módulo **no** lleva `import "server-only"` a propósito. Ese marcador
 * solo lo resuelve el bundler de Next, y el paquete `server-only` no está en
 * `package.json` a propósito (mantenerlo fuera evita una dependencia que solo
 * aporta un guardia). Pero `pnpm seed` ejecuta el seeder con `tsx` bajo Node
 * plano, y ese mismo grafo de módulos (`seeders/index.ts` → `auth.ts` → este
 * archivo) reventaba con `Cannot find module 'server-only'`, dejando el comando
 * de siembra inservible. El archivo es de servidor por construcción: su único
 * importador es `auth.ts`, y nada de lo que exporta es un secreto —el
 * destinatario y el token viajan como argumentos en el servidor, no como
 * literales de módulo—.
 *
 * ⚠️ Hoy **no hay proveedor de correo transaccional configurado**, así que esta
 * función no entrega nada. Existe para que el día que se conecte un proveedor
 * (Resend, SES, SMTP…) se haga aquí, sin tocar los flujos que la llaman:
 * `sendResetPassword` y `sendVerificationEmail` de `auth.ts`.
 *
 * ⚠️ Nunca se registra el destinatario, el asunto ni el cuerpo. Los enlaces que
 * viajan en `url` llevan tokens de un solo uso: registrarlos los publicaría.
 * Ver el hallazgo F-03 de openspec/changes/01-audit-exposed-secrets/ y las
 * notas de `login.action.ts` / `change-password.action.ts`.
 */

export interface OutgoingEmail {
    /** Dirección destino. NO se registra. */
    to: string;
    subject: string;
    /** Enlace de acción; puede incluir un token. NO se registra. */
    url: string;
}

/**
 * Entrega un correo. Sin proveedor, es un no-op deliberado.
 *
 * El parámetro es parte del contrato con los llamadores y lo consumirá el
 * proveedor cuando exista; hoy no se usa. La configuración de
 * `eslint.config.mjs` no declara `argsIgnorePattern`, así que el prefijo `_`
 * no silencia la regla y este archivo sumaba una quinta advertencia sobre las
 * cuatro de la línea base: la desactivación va aquí, con su motivo, y no en la
 * firma ni en un cuerpo de relleno.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- el cuerpo real usará el mensaje; ver la nota de cabecera
export const sendEmail = async (_message: OutgoingEmail): Promise<void> => {
    // Sin proveedor configurado. Ver la nota de cabecera.
};
