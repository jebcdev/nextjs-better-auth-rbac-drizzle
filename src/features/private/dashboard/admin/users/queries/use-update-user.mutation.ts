"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateUserAction } from "../actions";
import { adminUsersKeys } from "./admin-users.keys";
import type { UpdateUserData } from "../validations";

/**
 * Edita UNA cuenta del directorio.
 *
 * ⚠️ La invalidación va contra `adminUsersKeys.all`, la raíz, y NO contra
 * `detail(userId)`. Una edición puede cambiar el rol, con lo que la cuenta puede
 * ENTRAR en un listado filtrado por rol o SALIR de él, y eso solo lo resuelven
 * las claves de `lists()`. Invalidar la raíz cubre las dos ramas —el detalle y el
 * listado— de una vez, que es justo lo que se necesita aquí.
 *
 * ⚠️ `onSuccess` solo, nunca `onSettled`: invalidar tras un fallo dispararía una
 * consulta que no puede cambiar nada, porque el fallo significa que no se escribió.
 *
 * ⚠️ Sin actualización optimista a propósito. Un cambio de rol optimista tendría
 * que inventarse la etiqueta nueva en la insignia de la tarjeta ANTES de que el
 * servidor confirme la escritura, y el requisito es que la tarjeta no muestre un
 * valor que no esté almacenado. Con `placeholderData: (prev) => prev`, la
 * invalidación tampoco vacía la cuadrícula: la página anterior sigue visible
 * hasta que llega la nueva.
 */
export function useUpdateUserMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: UpdateUserData) => {
            const response = await updateUserAction(data);

            if (!response.success) {
                throw new Error(
                    response.message ??
                        "No se pudo actualizar la cuenta",
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
