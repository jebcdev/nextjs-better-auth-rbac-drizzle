import { z } from "zod";

export {
    ToggleUserActiveSchema,
    ToggleUserBanSchema,
} from "./toggle-user-state.schema";
export type {
    ToggleUserActiveData,
    ToggleUserBanData,
} from "./toggle-user-state.schema";
export { CreateUserSchema } from "./create-user.schema";
export type { CreateUserData } from "./create-user.schema";
export { UpdateUserSchema } from "./update-user.schema";
export type { UpdateUserData } from "./update-user.schema";

/**
 * Identificador de la cuenta que se quiere LEER — cuerpo de `getUserByIdAction`.
 *
 * ⚠️ Se declara aquí, y no dentro de `UpdateUserSchema`, aunque la forma sea la
 * misma. `getUserByIdAction` recibe el id como ARGUMENTO (`getUserByIdAction(id)`),
 * no dentro de un cuerpo, así que el esquema existe solo para validar ese
 * argumento: envolverlo en un objeto es lo que permite reutilizar el mismo
 * `invalidInputMessage` y el mismo motivo `invalid_input` sin duplicar la
 * validación en dos sitios.
 *
 * El campo se llama `userId` y no `id` para que el objeto que se valida sea
 * idéntico al que valida `UpdateUserSchema`: un `safeParse({ userId })` de este
 * esquema y un `safeParse(cuerpo)` de aquel se leen igual.
 */
export const GetUserByIdSchema = z
    .object({
        userId: z
            .string({ message: "El identificador de usuario es requerido" })
            .trim()
            .min(1, { message: "El identificador de usuario es requerido" }),
    })
    .strict();

export type GetUserByIdData = z.infer<typeof GetUserByIdSchema>;
