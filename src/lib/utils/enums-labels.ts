import type { UserRole } from "@/lib/db/schema";

// ─── ROL DE USUARIO ───────────────────────────────────────────────────────────

const USER_ROLE_LABELS: Record<UserRole, string> = {
    admin: "Administrador",
    user: "Usuario",
    guest: "Invitado",
};

export function getUserRoleLabel(role: UserRole): string {
    return USER_ROLE_LABELS[role];
}
