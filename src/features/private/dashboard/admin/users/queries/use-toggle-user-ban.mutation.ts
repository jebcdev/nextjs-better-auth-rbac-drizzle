"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toggleUserBanAction } from "../actions";
import { adminUsersKeys } from "./admin-users.keys";

/**
 * Veta o levanta el veto de UNA cuenta del directorio.
 *
 * ⚠️ Se comporta exactamente igual que el mutation de `isActive` en cuanto a
 * invalidación: invalida `adminUsersKeys.all`, no la vista actual. El requisito
 * es que el cambio se refleje en el listado, incluyendo cuando el filtro deja de
 * contener la cuenta. La invalidación en raíz cubre todas las páginas y todos
 * los filtros (design D3).
 *
 * ⚠️ Sin optimista: tras un fallo, la tarjeta tiene que seguir mostrando el
 * valor almacenado. Con `banUser`/`unbanUser` la escritura pasa por el plugin
 * admin, así que el éxito se resuelve en el mismo orden (plugin escribe y
 * devuelve), pero el principio es el mismo: el estado visible no diverge de lo
 * almacenado hasta que la escritura se confirma.
 *
 * ⚠️ `mutationFn` lanza cuando la acción devuelve `success: false`, para que
 * el `onError` de este mutation pueda ejecutarse con el mensaje de la acción en
 * `error.message` (es lo que el componente de acciones usa para el toast de
 * error). El desglose de motivos vive solo en la acción y así debe seguir.
 */
export function useToggleUserBanMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            userId,
            banned,
        }: {
            userId: string;
            banned: boolean;
        }) => {
            const response = await toggleUserBanAction({
                userId,
                banned,
            });

            if (!response.success) {
                throw new Error(
                    response.message ??
                        "No se pudo actualizar el estado del veto",
                );
            }

            return response;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: adminUsersKeys.all,
            });
        },
    });
}
