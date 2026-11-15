import { z } from "zod";

// ============================================
// ESQUEMA PARA RESTABLECER CONTRASEÑA
// ============================================
//
// ⚠️ Sin `.trim()` en ningún campo: la contraseña se guarda y se verifica
// exactamente como se envía. Ver decisión D6 de
// openspec/changes/04-harden-authentication/.
export const ForgotPasswordSchema = z.object({
  email: z
    .string({ message: "El email es requerido" })
    .trim()
    .email({ message: "Formato de email inválido" })
    .toLowerCase(),
});

export type ForgotPasswordData = z.infer<typeof ForgotPasswordSchema>;
