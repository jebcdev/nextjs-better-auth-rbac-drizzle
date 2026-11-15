import { z } from "zod";

// ============================================
// ESQUEMA PARA ACTUALIZAR PERFIL
// ============================================
export const UpdateProfileSchema = z.object({
  name: z
    .string({ message: "El nombre es requerido" })
    .trim()
    .min(2, { message: "El nombre debe tener al menos 2 caracteres" })
    .max(50, { message: "El nombre no puede exceder los 50 caracteres" })
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, {
      message: "El nombre solo puede contener letras y espacios",
    })
    .optional(),

  email: z
    .string({ message: "El email es requerido" })
    .trim()
    .email({ message: "Formato de email inválido" })
    .toLowerCase()
    .max(255, { message: "El email no puede exceder los 255 caracteres" })
    .optional(),
});

export type UpdateProfileData = z.infer<typeof UpdateProfileSchema>;