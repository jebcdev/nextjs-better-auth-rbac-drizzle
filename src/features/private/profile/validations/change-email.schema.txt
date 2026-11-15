import { z } from "zod";

// ============================================
// SOLICITUD DE CAMBIO DE EMAIL
// ============================================
//
// Valida **forma** y **normalización** de la dirección nueva. La comparación
// contra la dirección que la cuenta ya tiene NO se codifica aquí: el esquema no
// recibe el valor actual, porque meterlo obligaría a construir el esquema por
// petición y ataría la validación a un dato de la base de datos. Esa comparación
// se resuelve en la acción, que sí tiene delante la fila del usuario
// (`changeEmail.action.ts`), y devuelve el mensaje específico que el spec pide.
//
// El cambio de dirección es un flujo aparte, con verificación por correo, y no
// forma parte del parche de `update-profile.schema.ts` (decisión D16): el valor
// no se guarda al llamar, sino cuando el destinatario confirma desde la
// dirección nueva.
export const ChangeEmailSchema = z
    .object({
        newEmail: z
            .string({ message: "El correo electrónico es requerido" })
            .trim()
            .toLowerCase()
            .email({ message: "Formato de email inválido" })
            .max(255, {
                message:
                    "El correo electrónico no puede exceder los 255 caracteres",
            }),
    })
    .strict();

export type ChangeEmailData = z.infer<typeof ChangeEmailSchema>;
