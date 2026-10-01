"use client";

import Link from "next/link";

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/features/shared/components/ui/avatar";
import { Badge } from "@/features/shared/components/ui/badge";
import {
    getUserRoleLabel,
    USER_ROLES,
} from "@/lib/utils/enums-labels";
import type { UserRole } from "@/lib/db/schema";

import {
    ADMIN_USERS_DETAIL_PATH,
    type AdminUserListItem,
} from ".";

interface Props {
    user: AdminUserListItem;
}

/**
 * Iniciales para el `AvatarFallback` cuando no hay avatar.
 *
 * El spec pide un marcador «derivado del nombre del usuario» en vez de una
 * imagen rota o vacía. Se toman de las dos primeras palabras, que es lo que
 * distingue a una persona de otra en un listado de equipo.
 */
const initialsOf = (name: string): string => {
    const words = name.trim().split(/\s+/).filter(Boolean);
    const letters = words
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase() ?? "");
    const initials = letters.join("");

    // Un nombre de un solo carácter, o de solo espacios, no produce iniciales
    // utilizables: se cae al primer carácter real del nombre.
    return initials || name.trim().charAt(0).toUpperCase() || "?";
};

/**
 * Distingue «rol con etiqueta» de «valor suelto».
 *
 * ⚠️ Prueba de pertenencia a `USER_ROLES`, que se deriva de las claves del mapa
 * de etiquetas: no es una segunda copia de ese conjunto. Con un
 * `["admin","user","guest"]` literal aquí, añadir un rol al mapa dejaba esta
 * tarjeta sin reconocerlo y el distintivo caía al valor crudo.
 */
const isKnownRole = (role: string): role is UserRole =>
    (USER_ROLES as readonly string[]).includes(role);

/**
 * Etiquetas de los roles de una cuenta, token a token.
 *
 * ⚠️ `users.role` es `text` y el plugin admin de better-auth guarda multi-rol
 * como CSV, así que `"user,admin"` es un valor almacenado legal. Pasar la
 * cadena ENTERA a `getUserRoleLabel` devolvería `undefined` en runtime y el
 * distintivo saldría vacío. Por eso se divide, se recorta cada token y se
 * renderiza el valor crudo cuando no hay etiqueta conocida —una cuenta con un
 * rol que la app no conoce debe seguir mostrando algo legible (decisión D5).
 */
const roleLabelsOf = (role: string): string[] =>
    role
        .split(",")
        .map((token) => token.trim())
        .filter(Boolean)
        .map((token) =>
            isKnownRole(token) ? getUserRoleLabel(token) : token,
        );

/** Formatea una fecha ISO en texto legible. */
const formatDate = (iso: string): string =>
    new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(
        new Date(iso),
    );

/**
 * Tarjeta de SOLO LECTURA.
 *
 * ⚠️ No hay ningún control que escriba en la cuenta: ni botones, ni formulario,
 * ni mutación. La tarjeta entera es un enlace a la página de edición, que ya
 * existe. Activarla navega y no cambia ningún valor almacenado.
 *
 * ⚠️ El enlace envuelve a la tarjeta en vez de usar `Button` con `action.path`
 * como hace `dashboard-header.tsx`: un `<a>` dentro de un `<button>` produce un
 * elemento interactivo anidado dentro de otro, que es un fallo de accesibilidad
 * y de HTML válido. Aquí no hay nada anidado.
 */
export const AdminDashboardUsersGridCard = ({ user }: Props) => {
    const roleLabels = roleLabelsOf(user.role);

    return (
        <Link
            href={`${ADMIN_USERS_DETAIL_PATH}/${user.id}`}
            className="block rounded-2xl transition-shadow focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
            <article className="h-full rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-start gap-3">
                    <Avatar size="lg">
                        {/* `src={null}` mantiene el `AvatarFallback` como
                            contenido en vez de dejar la imagen rota. */}
                        {user.image && (
                            <AvatarImage src={user.image} alt="" />
                        )}
                        <AvatarFallback>
                            {initialsOf(user.name)}
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground truncate">
                            {user.name}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate">
                            {user.email}
                        </p>
                    </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                    {roleLabels.map((label) => (
                        <Badge key={label} variant="secondary">
                            {label}
                        </Badge>
                    ))}
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge
                            variant={
                                user.isActive
                                    ? "default"
                                    : "destructive"
                            }
                        >
                            {user.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                        {user.banned && (
                            <Badge variant="destructive">
                                Baneado
                            </Badge>
                        )}
                    </div>

                    <span className="text-xs text-muted-foreground">
                        Creado el {formatDate(user.createdAt)}
                    </span>
                </div>
            </article>
        </Link>
    );
};
