"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { logoutAction } from "@/lib/auth/logout.action";

/**
 * Cierre de sesión completo (decisión D3 de
 * openspec/changes/04-harden-authentication/).
 *
 * El orden importa:
 *
 * 1. `logoutAction()` revoca la sesión en el servidor y borra la cookie.
 * 2. `queryClient.clear()` purga el caché de **este navegador**.
 * 3. `router.replace("/")` saca al usuario del área privada.
 *
 * Por qué el purge va aquí y no en la server action: `logoutAction` es un
 * archivo `"use server"`, así que allí `getQueryClient()` creaba y vaciaba un
 * QueryClient *del servidor*, que no contiene nada del navegador. El caché que
 * importa (ventas, precios, inventario, con `staleTime` 5 min y `gcTime` 10 min)
 * es estado por pestaña y ninguna llamada al servidor puede alcanzarlo.
 *
 * Por qué navegar: el header se renderiza en el servidor, así que sin una
 * navegación el usuario seguiría viendo el estado "sesión iniciada" y la ruta
 * privada en la que ya no puede estar.
 */
export const useLogout = () => {
    const queryClient = useQueryClient();
    const router = useRouter();
    const [isPending, setIsPending] = useState(false);

    const logout = async () => {
        if (isPending) return;
        setIsPending(true);

        try {
            await logoutAction();
        } catch {
            // Un fallo al revocar en el servidor no debe impedir el cierre de
            // sesión en el cliente: si el usuario no puede cerrar sesión, se
            // queda dentro, que es justo lo contrario de lo que se pidió.
        } finally {
            // Siempre, éxito o fallo: tras cerrar sesión estos datos ya no le
            // pertenecen a nadie en este navegador.
            queryClient.clear();
            setIsPending(false);
            router.replace("/");
            router.refresh();
        }
    };

    return { logout, isPending };
};
