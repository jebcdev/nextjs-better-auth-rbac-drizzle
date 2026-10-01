"use client";

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

import { AdminUserCardActions, type AdminUserListItem } from ".";

interface Props {
    user: AdminUserListItem;
    /** Id de quien mira la lista, para no ofrecer cambiar la cuenta propia. */
    viewerId: string;
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
 * Tarjeta de una cuenta del directorio.
 *
 * ⚠️ El elemento raíz es el `<article>`, y ya NO es un enlace. Antes lo era: la
 * tarjeta entera envolvía un `<Link>` y no llevaba ningún control. Ahora lleva
 * tres controles, y un `<button>` dentro de un `<a>` es un elemento interactivo
 * anidado dentro de otro, que es HTML inválido y un fallo de accesibilidad. Por
 * eso la navegación se movió al control de editar de
 * `admin-user-card-actions.tsx` y la tarjeta dejó de ser un destino. Es el
 * mismo motivo por el que `dashboard-header.tsx` sigue siendo un defecto: allí
 * el enlace se metió DENTRO del botón; aquí ocurre al revés y el arreglo es el
 * mismo, un `render` en vez de un anidamiento.
 *
 * ⚠️ El id de quien mira la lista llega por prop (`viewerId`) y NO se vuelve a
 * derivar aquí. La tarjeta no sabe de sesiones: solo sabe a quién pertenece la
 * fila que está dibujando. La decisión de si ese "alguien" puede o no tocar los
 * controles se toma una vez, en la página.
 */
export const AdminDashboardUsersGridCard = ({
    user,
    viewerId,
}: Props) => {
    const roleLabels = roleLabelsOf(user.role);

    return (
        <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-start gap-3">
                <Avatar size="lg">
                    {/* `src={null}` mantiene el `AvatarFallback` como
                        contenido en vez de dejar la imagen rota. */}
                    {user.image && <AvatarImage src={user.image} alt="" />}
                    <AvatarFallback>{initialsOf(user.name)}</AvatarFallback>
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

            {/* ⚠️ El `mb-4` de aquí es el MÍNIMO de espacio bajo la fila de
                insignias, y el `mt-auto` de la fila de controles se lleva el
                sobrante. Con las tarjetas estiradas a la misma altura en la
                cuadrícula, esa pareja es lo que deja los tres controles de todas
                las tarjetas de una fila a la misma altura, sin importar cuánto
                ocupe el nombre de cada cuenta. */}
            <div className="mt-3 mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge
                        variant={user.isActive ? "default" : "destructive"}
                    >
                        {user.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                    {user.banned && (
                        <Badge variant="destructive">Baneado</Badge>
                    )}
                </div>

                <span className="text-xs text-muted-foreground">
                    Creado el {formatDate(user.createdAt)}
                </span>
            </div>

            <AdminUserCardActions user={user} viewerId={viewerId} />
        </article>
    );
};
