"use client";

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/features/shared/components/ui/avatar";
import { Badge } from "@/features/shared/components/ui/badge";
import { getUserRoleLabel } from "@/lib/utils/enums-labels";

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
 *
 * ⚠️ El rol se pinta como UNA sola insignia, resuelta directamente contra
 * `USER_ROLE_LABELS`: `user.role` es `UserRole` y el mapa es
 * `Record<UserRole, string>`, así que no hace falta una guarda de pertenencia ni
 * un respaldo al valor crudo —un rol fuera del conjunto es un valor que la
 * columna no puede contener. Esta tarjeta tampoco lleva su propia copia del
 * conjunto de roles: añadir uno al mapa lo hace aparecer aquí sin tocar este
 * archivo (decisiones D4 y D6).
 */
export const AdminDashboardUsersGridCard = ({
    user,
    viewerId,
}: Props) => {
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
                <Badge variant="secondary">
                    {getUserRoleLabel(user.role)}
                </Badge>
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
