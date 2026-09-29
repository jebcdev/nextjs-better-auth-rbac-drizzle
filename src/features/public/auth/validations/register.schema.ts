import { z } from "zod";

// ============================================
// ESQUEMA DE REGISTRO
// ============================================
export const RegisterSchema = z
  .object({
    name: z
      .string({ message: "El nombre es requerido" })
      .trim()
      .min(2, { message: "El nombre debe tener al menos 2 caracteres" })
      .max(50, { message: "El nombre no puede exceder los 50 caracteres" })
      .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, {
        message: "El nombre solo puede contener letras y espacios",
      }),

    email: z
      .string({ message: "El email es requerido" })
      .trim()
      .email({ message: "Formato de email inválido" })
      .toLowerCase()
      .max(255, { message: "El email no puede exceder los 255 caracteres" }),

    // ⚠️ Sin `.trim()`: recortar la contraseña en silencio cambia el secreto que
    // el usuario eligió y reduce el espacio de claves efectivo. La contraseña
    // se guarda y se verifica exactamente como se envía. Ver
    // openspec/changes/04-harden-authentication/ (decisión D6).
    password: z
      .string({ message: "La contraseña es requerida" })
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

    // Tampoco se recorta: si `password` conserva los espacios, la comparación
    // de abajo solo cuadra si la confirmación los conserva igual.
    passwordConfirmation: z
      .string({ message: "Debes confirmar tu contraseña" })
      .min(1, { message: "La confirmación de contraseña es requerida" }),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "Las contraseñas no coinciden",
    path: ["passwordConfirmation"],
  });

  export type RegisterData = z.infer<typeof RegisterSchema>;