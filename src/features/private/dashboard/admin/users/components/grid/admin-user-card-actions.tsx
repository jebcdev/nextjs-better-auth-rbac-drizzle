"use client";

import Link from "next/link";
import {
    BanIcon,
    CircleCheckIcon,
    CircleXIcon,
    LoaderCircleIcon,
    PencilIcon,
    UnlockIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/features/shared/components/ui/button";
import {
    useToggleUserActiveMutation,
    useToggleUserBanMutation,
} from "../../queries";
import { ADMIN_USERS_DETAIL_PATH, type AdminUserListItem } from ".";

interface Props {
    user: AdminUserListItem;
    /** Id de quien mira la lista. Se usa para bloquear la auto-modificación. */
    viewerId: string;
}

/**
 * Los tres controles de la tarjeta.
 *
 * ⚠️ Ninguno lleva texto visible. Un botón sin etiqueta necesita un nombre
 * accesible, y por eso cada `aria-label` nombra la cuenta Y el efecto
 * ("Desactivar a Ana"), no solo la acción: en una cuadrícula de veinte
 * tarjetas, veinte botones que dicen "Desactivar" no dicen sobre quién.
 *
 * ⚠️ El estado actual decide el icono y el color, no al revés. Un botón rojo
 * con el icono de *vetar* es un botón rojo que veta; uno verde con el icono de
 * *desvetar* es uno que levanta el veto. La acción ofrecida y el estado
 * guardado son el mismo dato leído una vez, y por eso el componente calcula
 * ambos desde `user.isActive` / `user.banned` en el mismo punto del render.
 *
 * ⚠️ `nativeButton={false}` + `render={<Link />}` para el botón de editar, y no
 * un `<Link>` envolviendo un `<Button>`: eso produce un `<a>` dentro de un
 * `<button>`, un elemento interactivo anidado dentro de otro. El `render` de
 * base-ui deja que sea UN elemento `<a>` con la apariencia de botón, que es lo
 * que corresponde. Es el mismo patrón que usa `forgot-password-form.tsx`.
 */
export const AdminUserCardActions = ({ user, viewerId }: Props) => {
    const toggleActive = useToggleUserActiveMutation();
    const toggleBan = useToggleUserBanMutation();

    const isSelf = user.id === viewerId;
    // Un solo flag para las dos mutaciones: mientras cualquiera de las dos esté
    // en vuelo, esa tarjeta no acepta más cambios. Con dos flags separados, un
    // veto en curso dejaría el botón de activar pulsable.
    const isPending = toggleActive.isPending || toggleBan.isPending;
    // Deshabilitar por "propio" y por "en vuelo" a la vez: un admin que se
    // deshabilite a sí mismo ve el botón apagado y no entiende por qué, así que
    // el motivo vive en el `title` de cada botón, no solo en el color.
    const disabledAll = isSelf || isPending;

    const handleToggleActive = () => {
        const nextIsActive = !user.isActive;
        // ⚠️ El texto del toast sale SIEMPRE de la acción, sin alternativa
        // escrita aquí. `IGeneralResponse` tipa `message` como `string`
        // obligatoria en la rama `success`, y el `mutationFn` lanza un `Error`
        // con el mensaje de la acción en la rama `error`, así que los dos
        // mensajes existen siempre y una frase de reserva en el componente solo
        // sería una segunda copia del copy que puede quedarse vieja. Este archivo
        // no contiene copy de resultado: los únicos textos que tiene son los
        // nombres accesibles de los botones.
        toggleActive.mutate(
            { userId: user.id, isActive: nextIsActive },
            {
                onSuccess: (response) =>
                    toast.success(response.message),
                onError: (error) => toast.error(error.message),
            },
        );
    };

    const handleToggleBan = () => {
        const nextBanned = !user.banned;

        toggleBan.mutate(
            { userId: user.id, banned: nextBanned },
            {
                onSuccess: (response) =>
                    toast.success(response.message),
                onError: (error) => toast.error(error.message),
            },
        );
    };

    return (
        // ⚠️ `mt-auto`, no `mt-4`: dentro del `flex-col` de la tarjeta, esto
        // empuja la fila de controles al pie. Las tarjetas de una misma fila se
        // estiran a la misma altura, así que sin esto los botones quedarían a
        // alturas distintas según cuánto ocupe el nombre de cada cuenta. El
        // mínimo lo pone el `mb-4` de la fila de arriba, no un `mt-4` aquí: los
        // dos propiedades `mt` no se pueden combinar, y el espacio sobrante tiene
        // que poder crecer, que es justo lo que `mt-auto` permite.
        <div className="mt-auto flex items-center justify-end gap-1 border-t border-border pt-3">
            {/* Activo: verde cuando está inactiva (se puede activar) y rojo
                cuando está activa (se puede desactivar). El icono acompaña al
                color para que no dependa solo del color. */}
            <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                disabled={disabledAll}
                aria-label={
                    user.isActive
                        ? `Desactivar a ${user.name}`
                        : `Activar a ${user.name}`
                }
                title={
                    user.isActive
                        ? `Desactivar a ${user.name}`
                        : `Activar a ${user.name}`
                }
                onClick={handleToggleActive}
            >
                {toggleActive.isPending ? (
                    <LoaderCircleIcon className="size-4 animate-spin" />
                ) : user.isActive ? (
                    <CircleXIcon className="size-4 text-destructive" />
                ) : (
                    <CircleCheckIcon className="size-4 text-green-600 dark:text-green-500" />
                )}
            </Button>

            {/* Veto: la misma polaridad. Vetada es roja, sin vetar es verde. */}
            <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                disabled={disabledAll}
                aria-label={
                    user.banned
                        ? `Quitar el veto a ${user.name}`
                        : `Vetar a ${user.name}`
                }
                title={
                    user.banned
                        ? `Quitar el veto a ${user.name}`
                        : `Vetar a ${user.name}`
                }
                onClick={handleToggleBan}
            >
                {toggleBan.isPending ? (
                    <LoaderCircleIcon className="size-4 animate-spin" />
                ) : user.banned ? (
                    <UnlockIcon className="size-4 text-green-600 dark:text-green-500" />
                ) : (
                    <BanIcon className="size-4 text-destructive" />
                )}
            </Button>

            <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                // ⚠️ Se deshabilita por `isPending` pero NO por `isSelf`. Son dos
                // cosas distintas y confundirlas rompería una de las dos reglas:
                // — `isSelf` solo apaga los controles de ESTADO, porque un admin
                //   sí puede abrir su propia ficha. Lo que no puede es cambiar su
                //   propio estado.
                // — `isPending` apaga los TRES, incluido este, porque mientras la
                //   escritura de esa tarjeta no ha terminado el requisito dice
                //   que sus controles no son activables. Navegar mientras se
                //   escribe dejaría la fila a la que se vuelve sin el estado que
                //   se acaba de confirmar.
                disabled={isPending}
                nativeButton={false}
                render={
                    <Link
                        href={`${ADMIN_USERS_DETAIL_PATH}/${user.id}`}
                        aria-label={`Editar a ${user.name}`}
                        title={`Editar a ${user.name}`}
                    />
                }
            >
                <PencilIcon className="size-4" />
            </Button>
        </div>
    );
};
