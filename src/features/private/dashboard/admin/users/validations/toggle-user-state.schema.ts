import { z } from "zod";

/**
 * CAMBIOS DE ESTADO DE UNA CUENTA — cuerpo de los dos toggles de la tarjeta.
 *
 * ⚠️ El booleano es OBLIGATORIO y con nombre. Un toggle no «da la vuelta» a lo
 * que haya: dice el valor que se va a escribir. Invertir exigiría leer la fila,
 * decidir y escribir, y entre la lectura y la escritura otro toggle —o el
 * propio seeder— podría cambiar el valor, con lo que la escritura aplicaría una
 * inversión sobre un estado que ya no era el que se leyó. Enviando el valor
 * deseado la operación es idempotente y dos clics con la misma intención
 * producen el mismo resultado.
 *
 * ⚠️ `.strict()` por la misma razón que en `UpdateProfileSchema`: una clave
 * inesperada es un ERROR de validación, no un descarte silencioso. Aquí importa
 * más que en el perfil, porque un cuerpo con `role` o `banned` de más sería
 * material privilegiado que la acción tiene que rechazar de forma visible.
 *
 * ⚠️ `userId` se valida solo como cadena no vacía, y NO como UUID, aunque la
 * columna lo sea. El id nunca se interpola en SQL —Drizzle lo parametriza—, así
 * que un formato inválido no aporta nada: la acción lo rechaza igual por la
 * comprobación de existencia, con un motivo (`target_not_found`) más útil para
 * diagnosticar que un error de formato. Lo que sí importa es que
 * no esté vacío: un id ausente sería un `where` que casa con todas las filas.
 */
const userIdField = z
    .string({ message: "El identificador de usuario es requerido" })
    .trim()
    .min(1, { message: "El identificador de usuario es requerido" });

/** Activa o desactiva una cuenta. */
export const ToggleUserActiveSchema = z
    .object({
        userId: userIdField,
        isActive: z.boolean({
            message: "Debes indicar el estado de la cuenta",
        }),
    })
    .strict();

/**
 * Veta o levanta el veto de una cuenta.
 *
 * ⚠️ El nombre de la clave es `banned` y no `isBanned` porque así se llama la
 * columna y el campo que expone el plugin admin de better-auth. El nombre de la
 * capa de aplicación no tiene por qué coincidir con el de la base de datos, y
 * renombrarlo aquí solo añadiría una traducción que alguien tendría que
 * deshacer.
 */
export const ToggleUserBanSchema = z
    .object({
        userId: userIdField,
        banned: z.boolean({
            message: "Debes indicar el estado del veto",
        }),
    })
    .strict();

export type ToggleUserActiveData = z.infer<typeof ToggleUserActiveSchema>;
export type ToggleUserBanData = z.infer<typeof ToggleUserBanSchema>;
