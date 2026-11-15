// src/actions/user.actions.ts
"use server";

// ⚠️ Este módulo devuelve datos de la tabla `users` con sus relaciones
// `accounts` y `sessions`, y está marcado `server-only` a propósito: la fila
// cruda lleva `accounts.password`, `accounts.accessToken`,
// `accounts.refreshToken`, `accounts.idToken` y `sessions.token`. Que la
// proyección a `ProfileViewModel` ocurra AQUÍ, y no en la página, es la única
// razón por la que esos valores dejan de existir antes de llegar al cliente
// (decisión D1 de openspec/changes/render-profile-details).
//
// La guía de seguridad de datos de Next.js 16 pide exactamente esto: la fila
// cruda no se propaga, la vista recibe un DTO con lo mínimo, y `server-only`
// convierte en error de build cualquier `import` futuro de esta acción desde
// un Client Component. Ver `types/profile-view-model.ts` para el contrato.
import "server-only";

import { auth } from "@/lib/auth/auth";
import drizzleDB from "@/lib/db";
import { IGeneralResponse } from "@/features/shared/types";
import { headers } from "next/headers";
import { FullUser } from "@/lib/db/schema";
import type {
    ProfileViewModel,
    ProfileAccountSummary,
    ProfileSessionEntry,
} from "@/features/private/profile/types";

async function getRawFullUser(userId: string) {
    return drizzleDB.query.users.findFirst({
        where: { id: { eq: userId } },
        with: {
            sessions: true,
            accounts: true,
        },
    });
}

/**
 * Proyecta la fila cruda al DTO, campo por campo.
 *
 * Se construye el objeto desde cero, explícitamente, en vez de hacer spread
 * con `...user` y borrar después: un spread olvidaría una columna nueva el día
 * que se añada, que es exactamente la clase de fuga que esto previene. Aquí una
 * columna que no esté en la lista no puede propagarse, porque no hay de dónde
 * copiarla.
 */
function toProfileViewModel(
    fullUser: FullUser,
    currentSessionId: string,
): ProfileViewModel {
    const accounts: ProfileAccountSummary[] = fullUser.accounts.map(
        (account) => ({
            providerId: account.providerId,
            accountId: account.accountId,
            createdAt: account.createdAt.toISOString(),
            updatedAt: account.updatedAt.toISOString(),
        }),
    );

    const entries: ProfileSessionEntry[] = fullUser.sessions.map(
        (session) => ({
            id: session.id,
            expiresAt: session.expiresAt.toISOString(),
            ipAddress: session.ipAddress,
            userAgent: session.userAgent,
            isCurrent: session.id === currentSessionId,
        }),
    );

    return {
        id: fullUser.id,
        name: fullUser.name,
        email: fullUser.email,
        image: fullUser.image,
        role: fullUser.role,
        emailVerified: fullUser.emailVerified,
        // `is_active` y `banned` son nullable en el esquema (no llevan
        // `.notNull()` como `email_verified`). El resto de la aplicación ya los
        // interpreta por veracidad — `!userExists.isActive || userExists.banned`
        // en `login.action.ts`, `!!userRow.isActive && !userRow.banned` en
        // `session-details.ts` —, así que `null` significa "cuenta no usable".
        // Se normaliza aquí, una vez, para que el DTO sea `boolean` y no obligue
        // al cliente a repetir esa regla.
        isActive: fullUser.isActive ?? false,
        banned: fullUser.banned ?? false,
        createdAt: fullUser.createdAt.toISOString(),
        updatedAt: fullUser.updatedAt.toISOString(),

        accounts,
        sessions: {
            total: fullUser.sessions.length,
            currentSessionExpiresAt: fullUser.sessions.find(
                (session) => session.id === currentSessionId,
            )?.expiresAt.toISOString() ?? null,
            entries,
        },
    };
}

export async function getFullUserInformation(): Promise<
    IGeneralResponse<ProfileViewModel>
> {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session) {
            return {
                success: false,
                error: true,
                message:
                    "No hay una sesión activa. Por favor, inicia sesión.",
            };
        }

        const fullUser = await getRawFullUser(session.user.id);

        if (!fullUser) {
            return {
                success: false,
                error: true,
                message: "Usuario no encontrado.",
            };
        }

        return {
            success: true,
            message: "Información de usuario obtenida exitosamente.",
            data: toProfileViewModel(fullUser, session.session.id),
        };
    } catch (error) {
        console.error(
            "Error al obtener la información completa del usuario:",
            error,
        );
        return {
            success: false,
            error: true,
            message:
                "Ocurrió un error inesperado al obtener la información del usuario.",
        };
    }
}
