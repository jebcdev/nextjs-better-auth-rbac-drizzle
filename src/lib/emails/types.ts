/**
 * Contrato de un correo saliente.
 *
 * Lo construyen los handlers de autenticación (`auth-handlers.ts`, que
 * renderizan cada mensaje con su plantilla) y lo consume el transporte
 * (`transport.ts`), que lo adapta al payload de `client.send` del SDK de
 * Mailtrap.
 *
 * El campo `text` es el cuerpo en texto plano ya renderizado por la plantilla
 * correspondiente; `url` es el enlace de acción real (puede llevar un token).
 *
 * ⚠️ Ninguno de estos valores —destinatario, asunto, cuerpo ni enlace— se
 * registra jamás. Los enlaces llevan tokens de un solo uso: registrarlos los
 * publicaría. Ver el hallazgo F-03.
 */
export interface OutgoingEmail {
    /** Dirección destino. NO se registra. */
    to: string;
    /** Asunto del correo. NO se registra. */
    subject: string;
    /** Cuerpo en texto plano, renderizado por una plantilla. NO se registra. */
    text: string;
    /** Enlace de acción; puede incluir un token. NO se registra. */
    url: string;
}