import { z } from "zod";

// ============================================
// ESQUEMA PARA ELEGIR LA NUEVA CONTRASEÑA
// (consumiendo un token de recuperación)
// ============================================
//
// La política es la misma que en el registro y que en el cambio de contraseña:
// aquí solo se elige el valor nuevo, sin contraseña actual.
//
// ⚠️ Sin `.trim()`: la contraseña se guarda y se verifica exactamente como se
// envía. Ver decisión D6 de openspec/changes/04-harden-authentication/.
export const ResetPasswordSchema = z
  .object({
    newPassword: z
      .string({ message: "La nueva contraseña es requerida" })
      .min(8, { message: "La contraseña debe tener al menos 8 caracteres" })
      .max(72, { message: "La contraseña no puede exceder los 72 caracteres" })
      .regex(/[A-Z]/, {
        message: "La contraseña debe contener al menos una mayúscula",
      })
      .regex(/[a-z]/, {
        message: "La contraseña debe contener al menos una minúscula",
      })
      .regex(/[0-9]/, {
        message: "La contraseña debe contener al menos un número",
      })
      .regex(/[^A-Za-z0-9]/, {
        message: "La contraseña debe contener al menos un carácter especial",
      }),

    confirmNewPassword: z
      .string({ message: "Debes confirmar tu nueva contraseña" })
      .min(1, { message: "La confirmación de contraseña es requerida" }),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmNewPassword"],
  });

export type ResetPasswordData = z.infer<typeof ResetPasswordSchema>;
