import { getMailtrapClient } from "./mailtrap-client";
import { consoleLogger } from "@/lib/logger/console-logger";
import type { OutgoingEmail } from "./types";

/**
 * Único punto de red del módulo de correo.
 *
 * Adapta `OutgoingEmail` al payload de `client.send` del SDK de Mailtrap y
 * aplica el remitente configurado (`MAILTRAP_FROM_EMAIL` / `MAILTRAP_FROM_NAME`).
 * La categoría fija "Auth" agrupa los correos transaccionales de autenticación
 * en el panel de Mailtrap.
 *
 * ⚠️ Nunca lanza hacia el llamador: captura cualquier fallo, registra solo
 * `{ action, reason, errorName }` vía `consoleLogger` — jamás destinatario,
 * asunto, texto ni token (hallazgo F-03) — y termina. Así un fallo de Mailtrap
 * no rompe el registro, el cambio de correo ni la recuperación de contraseña:
 * mejor-auth ya corre estos callbacks en segundo plano y el transporte nunca
 * rechaza hacia él.
 *
 * Sin `MAILTRAP_API_TOKEN` (o sin remitente configurado), la entrega es un
 * no-op silencioso: los flujos de autenticación completan su resultado normal
 * sin enviar nada — mismo comportamiento de seguridad que la antigua costura.
 * Igual si `MAILTRAP_TEST_INBOX_ID` está definido pero no es un id entero
 * válido (config de sandbox rota ≈ sin sandbox).
 */
export const sendEmail = async (message: OutgoingEmail): Promise<void> => {
    const token = process.env.MAILTRAP_API_TOKEN;
    if (!token) {
        consoleLogger({ action: "email-send", reason: "no_provider_configured" });
        return;
    }

    const fromEmail = process.env.MAILTRAP_FROM_EMAIL;
    if (!fromEmail) {
        consoleLogger({ action: "email-send", reason: "no_from_configured" });
        return;
    }

    const testInboxIdRaw = process.env.MAILTRAP_TEST_INBOX_ID?.trim();
    if (testInboxIdRaw !== undefined && testInboxIdRaw !== "") {
        const inboxId = Number(testInboxIdRaw);
        if (!Number.isInteger(inboxId) || inboxId <= 0) {
            consoleLogger({ action: "email-send", reason: "no_inbox_configured" });
            return;
        }
    }

    const fromName = process.env.MAILTRAP_FROM_NAME;

    try {
        await getMailtrapClient().send({
            from: {
                email: fromEmail,
                ...(fromName ? { name: fromName } : {}),
            },
            to: [{ email: message.to }],
            subject: message.subject,
            text: message.text,
            category: "Auth",
        });
        consoleLogger({ action: "email-send", reason: "ok" });
    } catch (error) {
        consoleLogger({
            action: "email-send",
            reason: "delivery_failed",
            errorName: error instanceof Error ? error.name : "UnknownError",
        });
    }
};