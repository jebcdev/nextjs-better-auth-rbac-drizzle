import { z } from "zod";

/**
 * EDICIÓN DE UNA CUENTA DESDE EL PANEL — cuerpo de `updateUserAction`.
 *
 * ⚠️ A diferencia de `CreateUserSchema`, aquí NO hay `password`. Editar una cuenta
 * NO cambia su contraseña: la contraseña de una cuenta existente es de su titular
 * y se cambia desde su propio perfil. Aceptarla aquí abriría una puerta por la
 * que un super admin se adueñaría de la sesión de cualquiera, y no es lo que el
 * formulario ofrece. La ausencia del campo, y no su `.optional()`, es lo que
 * hace imposible esa operación.
 *
 * ⚠️ `.strict()` por el mismo motivo que en el esquema de alta: un cuerpo con
 * `isActive` o `banned` de más es material privilegiado que tiene que ser un
 * ERROR visible, no un descarte silencioso. Aquí es todavía más importante,
 * porque las dos banderas son las que las dos acciones `toggle-*` ya escriben:
 * si esta acción las aceptara, el mismo control de la tarjeta tendría dos
 * caminos de escritura que podrían discrepar.
 *
 * ⚠️ `userId` se valida solo como cadena no vacía, y NO como UUID, aunque la
 * columna lo sea. Motivo idéntico al ya documentado en
 * `toggle-user-state.schema.ts`: el id nunca se interpola en SQL —Drizzle lo
 * parametriza—, así que un formato inválido no aporta nada, y la acción lo
 * rechaza igual por la comprobación de existencia, con un motivo
 * (`target_not_found`) más útil para diagnosticar. Lo que sí importa es que no
 * esté vacío: un id ausente sería un `where` que casa con todas las filas.
 *
 * El `userId` del cuerpo dice QUÉ cuenta se escribe; nunca QUIÉN escribe. El
 * sujeto lo deriva la acción de su propia sesión.
 */
const userIdField = z
    .string({ message: "El identificador de usuario es requerido" })
    .trim()
    .min(1, { message: "El identificador de usuario es requerido" });

export const UpdateUserSchema = z
    .object({
        userId: userIdField,

        name: z
            .string({ message: "El nombre es requerido" })
            .trim()
            .min(2, { message: "El nombre debe tener al menos 2 caracteres" })
            .max(50, { message: "El nombre no puede exceder los 50 caracteres" })
            .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, {
                message: "El nombre solo puede contener letras y espacios",
            }),

        // ⚠️ `.toLowerCase()` por el motivo del esquema de alta: el valor que sale
        // de aquí es el que se usa TANTO para detectar que otra cuenta ya tiene
        // esa dirección COMO para escribirla. Sin normalizar, el chequeo
        // compararía contra una forma y la escritura contra otra, y un duplicado
        // con distinta capitalización se colaría por el hueco.
        email: z
            .string({ message: "El email es requerido" })
            .trim()
            .email({ message: "Formato de email inválido" })
            .toLowerCase()
            .max(255, { message: "El email no puede exceder los 255 caracteres" }),

        // `null` es un valor válido: es la forma canónica de «quitar el avatar».
        // La comprobación de que la URL pertenece al host de imágenes del
        // proyecto vive en la acción, no aquí.
        image: z
            .string({ message: "La imagen debe ser una dirección válida" })
            .url({ message: "La imagen debe ser una dirección válida" })
            .nullable()
            .optional(),

        role: z.enum(["admin", "user", "guest"], {
            message: "Debes indicar un rol válido",
        }),
    })
    .strict();

export type UpdateUserData = z.infer<typeof UpdateUserSchema>;
