import { MailtrapClient } from "mailtrap";

/**
 * Cliente de Mailtrap, creado de forma perezosa y cacheado.
 *
 * Se configura desde `MAILTRAP_API_TOKEN` y, opcionalmente, `MAILTRAP_TEST_INBOX_ID`.
 * Sin token, el cliente existe igual (no lanza al construirse), pero el
 * transporte nunca llega a enviar — ver `transport.ts`. Así los flujos de
 * autenticación completan su respuesta normal sin entregar correo (mismo
 * comportamiento de seguridad que la antigua costura no-op que este cambio
 * elimina).
 *
 * Modo sandbox (Email Testing)
 * ----------------------------
 * Si `MAILTRAP_TEST_INBOX_ID` está definido (id de un buzón de Email Testing),
 * el cliente se crea con `sandbox: true` + `testInboxId` y el SDK envía a
 * `sandbox.api.mailtrap.io/api/send/{inboxId}`, por lo que el correo cae en el
 * buzón de test. Motivo: un token de Email Testing NO sirve contra
 * `send.api.mailtrap.io` (Email Sending) — Mailtrap responde 401 —, así que el
 * stream se decide por esta variable. Sin ella, el cliente conserva el default
 * de Email Sending. El id se normaliza recortando espacios; vacío equivale a
 * "sin variable".
 *
 * ⚠️ A propósito NO lleva `import "server-only"` (misma política que la costura
 * que reemplaza): ese marcador solo lo resuelve el bundler de Next, y `pnpm
 * seed` ejecuta el mismo grafo de módulos bajo Node plano vía `tsx`, que
 * reventaría con `Cannot find module 'server-only'`. Es código de servidor por
 * construcción: su único consumidor es `transport.ts`, y el token viaja como
 * variable de entorno, no como literal expuesto al navegador.
 */
let client: MailtrapClient | null = null;

/** Id del buzón de Email Testing, o `undefined` si no está configurado. */
const readTestInboxId = (): number | undefined => {
    const raw = process.env.MAILTRAP_TEST_INBOX_ID?.trim();
    if (!raw) {
        return undefined;
    }
    const id = Number(raw);
    return Number.isInteger(id) && id > 0 ? id : undefined;
};

export const getMailtrapClient = (): MailtrapClient => {
    if (client === null) {
        const testInboxId = readTestInboxId();
        client = new MailtrapClient({
            token: process.env.MAILTRAP_API_TOKEN ?? "",
            sandbox: testInboxId !== undefined,
            ...(testInboxId !== undefined ? { testInboxId } : {}),
        });
    }
    return client;
};