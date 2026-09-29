import { userRoleEnum } from "@/lib/db/schema";

// Drizzle no expone los enums como objetos TS (Role.ADMIN, etc.), solo
// como arrays de strings vía `.enumValues`. Por eso los tipos se derivan
// así en vez de importarse como enum.

type UserRole = (typeof userRoleEnum.enumValues)[number];

// ─── ROL DE USUARIO ───────────────────────────────────────────────────────────

const USER_ROLE_LABELS: Record<UserRole, string> = {
    admin: "Administrador",
    user: "Usuario",
    guest: "Invitado",
};

export function getUserRoleLabel(role: UserRole): string {
    return USER_ROLE_LABELS[role];
}
