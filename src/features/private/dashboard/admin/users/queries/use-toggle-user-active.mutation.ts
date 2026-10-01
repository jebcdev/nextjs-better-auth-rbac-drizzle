"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toggleUserActiveAction } from "../actions";
import { adminUsersKeys } from "./admin-users.keys";

/**
 * Alterna `isActive` de UNA cuenta del directorio.
 *
 * ⚠️ La invalidación va contra `adminUsersKeys.all`, que es la raíz de la que
 * cuelgan `lists()` y `list(params)`. Invalidar solo la lista que se está
 * viendo parecería suficiente y no lo es: el requisito es que un cambio se
 * refleje en el listado, y un listado no es solo el de la pantalla. Con el filtro
 * *Activos* puesto, vetar una cuenta la saca de la lista, y con el filtro
 * *Todos* la misma cuenta sigue estando pero con otra insignia. Un
 * `invalidateQueries` por la clave exacta de la vista actual resolvería la
 * segunda y no la primera; invalidar la raíz resuelve las dos, y el refetch es
 * una consulta paginada de 10 filas, no un recargado de la tabla.
 *
 * ⚠️ `onSuccess` solo, nunca `onSettled`: invalidar también tras un fallo
 * dispararía una consulta que no puede cambiar nada, porque el fallo significa
 * que no se escribió. Y con `placeholderData: (prev) => prev` en el listado, la
 * invalidación no vacía la cuadrícula: la página anterior sigue visible hasta
 * que llega la nueva (decisión D3 del listado).
 *
 * ⚠️ Sin actualización optimista a propósito. El requisito dice que la tarjeta
 * NO muestra el estado nuevo antes de que el cambio se haya confirmado, y que
 * tras un fallo siga mostrando lo que hay almacenado. Un parche optimista deja
 * que haya que revertir un icono y un color, y ese desajuste entre lo que se ve
 * y lo que está almacenado es exactamente lo que el requisito prohíbe.
 *
 * ⚠️ `mutationFn` lanza cuando la acción devuelve `success: false`. La
 * distinción que hace la acción —cuerpo inválido, sin sesión, sin rol, objetivo
 * inexistente, error inesperado— se pierde a este nivel, y es correcto que se
 * pierda: el mensaje de la acción es lo que se muestra, y `error.message` es lo
 * que acaba en el toast de error.
 */
export function useToggleUserActiveMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            userId,
            isActive,
        }: {
            userId: string;
            isActive: boolean;
        }) => {
            const response = await toggleUserActiveAction({
                userId,
                isActive,
            });

            if (!response.success) {
                throw new Error(
                    response.message ??
                        "No se pudo actualizar el estado de la cuenta",
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
