// src/actions/user.actions.ts
"use server";

import { auth } from "@/lib/auth";
import drizzleDB from "@/lib/db";
import { IGeneralResponse } from "@/features/shared/types";
import { headers } from "next/headers";
import { FullUser } from "@/lib/db/schema";

async function getRawFullUser(userId: string) {
    return drizzleDB.query.users.findFirst({
        where: { id: { eq: userId } },
        with: {
            sessions: true,
            accounts: true,
        },
    });
}

export async function getFullUserInformation(): Promise<
    IGeneralResponse<FullUser>
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
            data: fullUser, // ✅ Ahora sí coincide
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
