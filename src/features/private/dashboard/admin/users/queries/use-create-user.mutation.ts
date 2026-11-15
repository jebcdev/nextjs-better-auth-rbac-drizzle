"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createUserAction } from "../actions";
import { adminUsersKeys } from "./admin-users.keys";
import type { CreateUserData } from "../validations";

/**
 * Crea UNA cuenta del directorio.
 *
 * ⚠️ La invalidación va contra `adminUsersKeys.all`, la RAÍZ de la que cuelgan
 * `lists()` y `list(params)`, y no contra la clave exacta de la vista que se está
 * viendo. Aquí el motivo es aún más fuerte que en los toggles: un alta no cambia
 * una fila, AÑADE una. Con el filtro *Administradores* puesto, la cuenta recién
 * creada con ese rol no aparecería hasta cambiar de página; con el filtro por
 * estado, una cuenta creada desactivada ni siquiera estaría en la vista actual.
 * Invalidar la raíz resuelve todos los casos, y el refetch es una consulta
 * paginada, no un recargado de la tabla.
 *
 * ⚠️ `onSuccess` solo, nunca `onSettled`: invalidar también tras un fallo
 * dispararía una consulta que no puede cambiar nada, porque el fallo significa
 * que no se escribió.
 *
 * ⚠️ Sin actualización optimista a propósito. El requisito es que el listado no
 * muestre un estado que no está almacenado, y un alta optimista tendría que
 * inventarse un id, un `createdAt` y una posición en el orden `name, id` para
 * colocar la fila — datos que el servidor no ha confirmado. Con
 * `placeholderData: (prev) => prev`, la invalidación tampoco vacía la cuadrícula:
 * la página anterior sigue visible hasta que llega la nueva.
 */
export function useCreateUserMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateUserData) => {
            const response = await createUserAction(data);

            if (!response.success) {
                throw new Error(
                    response.message ??
                        "No se pudo crear la cuenta",
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
