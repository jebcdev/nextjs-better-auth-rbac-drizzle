/**
 * Plantilla del correo de recuperación de contraseña.
 *
 * Función pura: recibe el enlace y devuelve asunto y cuerpo en texto plano, en
 * español, con el enlace incluido. El enlace apunta a la ruta real
 * `/restablecer-contrasena`, que es la página que consume el token. El día que
 * haya HTML se agrega por plantilla sin tocar el transporte.
 */
export const resetPasswordTemplate = ({
    url,
}: {
    url: string;
}): { subject: string; text: string } => ({
    subject: "Restablece tu contraseña",
    text:
        "Recibimos una solicitud para restablecer la contraseña de tu cuenta.\n\n" +
        `Para continuar, abre este enlace:\n\n${url}\n\n` +
        "El enlace caduca en 1 hora y solo puede usarse una vez. Si no pediste " +
        "este mensaje, ignóralo.",
});