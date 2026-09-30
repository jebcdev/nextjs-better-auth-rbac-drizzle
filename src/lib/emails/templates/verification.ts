/**
 * Plantilla del correo de verificación de dirección.
 *
 * Es COMPARTIDA entre el alta (activación de cuenta) y el cambio de correo:
 * mejor-auth no entrega un discriminador de flujo en `sendVerificationEmail`
 * (decisión D4), así que asunto y cuerpo son comunes, y el enlace apunta a la
 * ruta real `/perfil/confirmar-email` en ambos casos.
 *
 * Función pura: recibe el enlace y devuelve asunto y cuerpo en texto plano, en
 * español, con el enlace incluido. El día que haya HTML se agrega por plantilla
 * sin tocar el transporte.
 */
export const verificationTemplate = ({
    url,
}: {
    url: string;
}): { subject: string; text: string } => ({
    subject: "Confirma tu dirección de correo electrónico",
    text:
        "Recibimos una solicitud para confirmar (o cambiar) la dirección de " +
        "correo de tu cuenta.\n\n" +
        `Para completar el proceso, abre este enlace:\n\n${url}\n\n` +
        "Si no pediste este mensaje, ignóralo. El enlace caduca por sí solo.",
});