import { Role, Plan, LessonType, EnrollmentStatus } from "@/generated/prisma/enums";

// ─── ROLE ─────────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<Role, string> = {
    [Role.SUPER_ADMIN]: "Super Admin",
    [Role.ADMIN]: "Institución",
    [Role.INSTRUCTOR]: "Instructor",
    [Role.STUDENT]: "Estudiante",
};

export function getRoleLabel(role: Role): string {
    return ROLE_LABELS[role];
}

// ─── PLAN ─────────────────────────────────────────────────────────────────────

const PLAN_LABELS: Record<Plan, string> = {
    [Plan.FREE]: "Gratis",
    [Plan.STARTER]: "Starter",
    [Plan.PRO]: "Pro",
    [Plan.ENTERPRISE]: "Enterprise",
};

export function getPlanLabel(plan: Plan): string {
    return PLAN_LABELS[plan];
}

// ─── LESSON TYPE ──────────────────────────────────────────────────────────────

const LESSON_TYPE_LABELS: Record<LessonType, string> = {
    [LessonType.TEXT]: "Texto",
    [LessonType.VIDEO]: "Video",
    [LessonType.QUIZ]: "Quiz",
};

export function getLessonTypeLabel(type: LessonType): string {
    return LESSON_TYPE_LABELS[type];
}

// ─── ENROLLMENT STATUS ────────────────────────────────────────────────────────

const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
    [EnrollmentStatus.ACTIVE]: "Activo",
    [EnrollmentStatus.COMPLETED]: "Completado",
    [EnrollmentStatus.CANCELLED]: "Cancelado",
};

export function getEnrollmentStatusLabel(status: EnrollmentStatus): string {
    return ENROLLMENT_STATUS_LABELS[status];
}