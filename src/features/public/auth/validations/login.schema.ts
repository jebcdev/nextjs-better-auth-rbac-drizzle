import { z } from "zod";

// ============================================
// ESQUEMA DE LOGIN
// ============================================
export const LoginSchema = z.object({
  email: z
    .string({ message: "El email es requerido" })
    .trim()
    .email({ message: "Formato de email inválido" })
    .toLowerCase()
    .max(255, { message: "El email no puede exceder los 255 caracteres" }),

  // ⚠️ Sin `.trim()`: si el login recortara, una contraseña guardada con
  // espacios en los extremos nunca podría autenticarse. Debe validarse el mismo
  // valor que el registro guardó. Ver
  // openspec/changes/04-harden-authentication/ (decisión D6).
  password: z
    .string({ message: "La contraseña es requerida" })
    .min(1, { message: "La contraseña es requerida" }),
});

export type LoginData = z.infer<typeof LoginSchema>;