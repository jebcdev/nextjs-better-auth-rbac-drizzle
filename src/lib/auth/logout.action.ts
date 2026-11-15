"use server";

import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";

/**
 * Revoca la sesión en el servidor y borra la cookie.
 *
 * ⚠️ Aquí NO se purga el caché de TanStack Query. Este archivo es
 * `"use server"`, así que cualquier QueryClient que se cree dentro corre en el
 * servidor y no contiene nada del navegador. El purge real lo hace
 * `useLogout()` (código de cliente), que sí vive en la pestaña que tiene los
 * datos. Ver decisión D3 de openspec/changes/04-harden-authentication/.
 *
 * `signOut` borra la fila de `sessions` y emite la cookie con `max-age=0`, así
 * que un reintento con la cookie anterior no resuelve sesión.
 */
export const logoutAction = async (): Promise<{
    success: boolean;
}> => {
    try {
        await auth.api.signOut({
            headers: await headers(),
        });

        return { success: true };
    } catch {
        return { success: false };
    }
};
