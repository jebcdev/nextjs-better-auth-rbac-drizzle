import { z } from "zod";

// ============================================
// PARCHE DE PERFIL (edición por campo)
// ============================================
//
// Esquema de **parche**, no de objeto completo: cada clave es opcional y su
// presencia —no su veracidad— decide qué se escribe. Enviar `{ name }` cambia
// solo el nombre; enviar `{ image: null }` borra el avatar; enviar `{}` no es un
// cambio (lo rechaza el `superRefine` de abajo).
//
// ⚠️ `.strict()` es funcionalmente crítico, no cosmético. Es lo que convierte un
// envío que incluya `role`, `isActive` o cualquier otro campo privilegiado en un
// ERROR de validación, en vez de en un descarte silencioso: al llamador se le
// dice que su envío fue inválido, nunca se le muestra un éxito. Es una de las
// tres barreras independientes de la decisión D6; las otras dos son la
// enumeración explícita del cuerpo saliente y `input: false` de better-auth.
//
// El texto por defecto de Zod para una clave desconocida está en inglés, y Zod 4
// no permite sobrescribirlo de forma tipada desde aquí (`.strict(mensaje)`
// funciona en runtime pero no está en la firma). La traducción de ese código a
// español vive en `updateProfile.action.ts`, junto al resto del copy de la API.
//
// ⚠️ NO se reutiliza `features/public/auth/validations/update-profile.schema.ts`
// (decisión D7): no tiene regla de `image`, no es `.strict()` —de lo que depende
// D6— y vive en `public/auth`, así que importarlo desde una feature del área
// privada invertiría la dirección de dependencia del resto del proyecto.
export const UpdateProfileSchema = z
    .object({
        name: z
            .string({ message: "El nombre es requerido" })
            .trim()
            .min(2, {
                message: "El nombre debe tener al menos 2 caracteres",
            })
            .max(50, {
                message:
                    "El nombre no puede exceder los 50 caracteres",
            })
            .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, {
                message:
                    "El nombre solo puede contener letras y espacios",
            })
            .optional(),

        // `null` es un valor válido: es la forma canónica de "quitar el avatar".
        // La comprobación de que la URL pertenece al host de Cloudinary del
        // proyecto vive en la acción (decisión D21), no aquí: el esquema valida
        // forma, la acción valida procedencia.
        image: z
            .string({ message: "La imagen debe ser una dirección válida" })
            .url({ message: "La imagen debe ser una dirección válida" })
            .nullable()
            .optional(),
    })
    .strict()
    .superRefine((value, ctx) => {
        // ⚠️ Presencia, nunca veracidad. `if (value.image)` haría que
        // `{ image: null }` —quitar el avatar— fuese indistinguible de "no toqué
        // el avatar", y la eliminación del usuario no haría nada en silencio.
        const hasName = Object.hasOwn(value, "name") && value.name !== undefined;
        const hasImage =
            Object.hasOwn(value, "image") && value.image !== undefined;

        if (!hasName && !hasImage) {
            ctx.addIssue({
                code: "custom",
                message: "No hay cambios que guardar",
            });
        }
    });

export type UpdateProfileData = z.infer<typeof UpdateProfileSchema>;
