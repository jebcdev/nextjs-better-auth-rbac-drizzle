"use client";

import type { ProfileViewModel } from "@/features/private/profile/types";
import { getUserRoleLabel } from "@/lib/utils/enums-labels";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/features/shared/components/ui/avatar";
import { Badge } from "@/features/shared/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/features/shared/components/ui/card";
import {
    NameSection,
    AvatarSection,
    /*EmailSection,-*/ PasswordSection,
} from "./profile-sections";

/**
 * Tarjeta de identidad + resúmenes de solo lectura.
 *
 * ⚠️ Las props se tipan contra `ProfileViewModel`, NUNCA contra `FullUser`. El
 * tipo de la fila cruda lleva `accounts.password`, `accessToken`,
 * `refreshToken`, `idToken` y `sessions.token`; que este componente no pueda
 * ni siquiera nombrarlos es lo que impide que la fuga vuelva por la puerta de
 * atrás cuando se añada una columna nueva al esquema.
 *
 * ⚠️ El rol se pinta directamente contra el mapa de etiquetas, sin guarda y
 * sin respaldo al valor crudo: `profile.role` es `UserRole` y
 * `USER_ROLE_LABELS` es `Record<UserRole, string>`, así que todo rol del enum
 * tiene etiqueta por definición. El predicado de pertenencia y la lista
 * literal que existían aquí eran una segunda copia del conjunto de roles, y
 * una defensa contra un valor que la columna ya no puede contener. Sin esa
 * copia, añadir un rol al mapa lo hace aparecer aquí sin editar este archivo.
 */
type Props = {
    profile: ProfileViewModel;
};

/**
 * Iniciales para el `AvatarFallback` cuando no hay avatar.
 *
 * El spec exige un marcador «derivado del nombre del usuario» en lugar de una
 * imagen rota o vacía. Se toman de las dos primeras palabras, que es lo que
 * distingue a una persona de otra en la lista de un equipo.
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
    new Intl.DateTimeFormat("es-ES", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(iso));

/** Una fila etiqueta/valor de solo lectura. Nunca un input. */
const DetailRow = ({
    label,
    value,
}: {
    label: string;
    value: string;
}) => (
    <div className="flex flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm wrap-break-word">{value}</span>
    </div>
);

export const ProfileDetails = ({ profile }: Props) => {
    return (
        <div className="grid w-full content-start gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
            {/* ══════════════════════════════════════════════════════════════
                Columna de identidad: avatar, nombre, correo, rol, verificación
                ══════════════════════════════════════════════════════════════ */}
            <div className="grid content-start gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Identidad</CardTitle>
                        <CardDescription>
                            Estos datos identifican tu cuenta. El rol
                            no se edita desde aquí.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <div className="flex items-center gap-4">
                            <Avatar size="lg">
                                {/* `src={null}` mantiene el `AvatarFallback`
                                    como contenido, en vez de dejar la imagen
                                    rota del spec. */}
                                {profile.image && (
                                    <AvatarImage
                                        src={profile.image}
                                        alt=""
                                    />
                                )}
                                <AvatarFallback>
                                    {initialsOf(profile.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="grid gap-1">
                                <span className="font-heading text-base font-medium wrap-break-word">
                                    {profile.name}
                                </span>
                                <span className="text-sm text-muted-foreground wrap-break-word">
                                    {profile.email}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {/* El rol es una ETIQUETA, nunca un input: un
                                input deshabilitado sigue siendo enfocable y
                                anuncia «campo editable» (decisión D20). */}
                            <Badge
                                variant="secondary"
                                data-slot="role-badge"
                            >
                                {getUserRoleLabel(profile.role)}
                            </Badge>
                            <Badge
                                variant={
                                    profile.emailVerified
                                        ? "default"
                                        : "destructive"
                                }
                            >
                                {profile.emailVerified
                                    ? "Correo verificado"
                                    : "Correo sin verificar"}
                            </Badge>
                            {profile.banned && (
                                <Badge variant="destructive">
                                    Cuenta bloqueada
                                </Badge>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* ── Resumen de cuentas: texto plano (decisión D20) ───── */}
                <Card>
                    <CardHeader>
                        <CardTitle>Cuentas vinculadas</CardTitle>
                        <CardDescription>
                            Solo lectura: las cuentas se vinculan al
                            autenticarte con un proveedor.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                        {profile.accounts.length === 0 ? (
                            <span className="text-sm text-muted-foreground">
                                No hay cuentas vinculadas.
                            </span>
                        ) : (
                            profile.accounts.map((account) => (
                                <div
                                    key={`${account.providerId}-${account.accountId}`}
                                    className="grid gap-2 border-t pt-3 first:border-t-0 first:pt-0"
                                >
                                    <DetailRow
                                        label="Proveedor"
                                        value={account.providerId}
                                    />
                                    <DetailRow
                                        label="Identificador"
                                        value={account.accountId}
                                    />
                                    <DetailRow
                                        label="Vinculada el"
                                        value={formatDate(
                                            account.createdAt,
                                        )}
                                    />
                                    <DetailRow
                                        label="Actualizada el"
                                        value={formatDate(
                                            account.updatedAt,
                                        )}
                                    />
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* ── Resumen de sesiones: texto plano (decisión D20) ──── */}
                <Card>
                    <CardHeader>
                        <CardTitle>Sesiones</CardTitle>
                        <CardDescription>
                            Solo lectura. Cerrar sesiones no se hace
                            desde aquí.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                        <DetailRow
                            label="Sesiones abiertas"
                            value={String(profile.sessions.total)}
                        />
                        {profile.sessions.currentSessionExpiresAt && (
                            <DetailRow
                                label="Esta sesión caduca el"
                                value={formatDate(
                                    profile.sessions
                                        .currentSessionExpiresAt,
                                )}
                            />
                        )}

                        {profile.sessions.entries.length > 0 && (
                            <ul className="grid gap-2 border-t pt-3">
                                {profile.sessions.entries.map(
                                    (entry) => (
                                        <li
                                            key={entry.id}
                                            className="grid gap-0.5"
                                        >
                                            <span className="text-sm wrap-break-word">
                                                {entry.userAgent ??
                                                    "Dispositivo desconocido"}
                                                {entry.isCurrent && (
                                                    <Badge
                                                        variant="outline"
                                                        className="ml-2"
                                                    >
                                                        Esta
                                                    </Badge>
                                                )}
                                            </span>
                                            <span className="text-xs text-muted-foreground break-all">
                                                {entry.ipAddress ??
                                                    "IP desconocida"}{" "}
                                                · caduca el{" "}
                                                {formatDate(
                                                    entry.expiresAt,
                                                )}
                                            </span>
                                        </li>
                                    ),
                                )}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                Columna de detalle: un editor independiente por dato (D12)
                ══════════════════════════════════════════════════════════════ */}
            <div className="grid content-start gap-4">
                <NameSection name={profile.name} />
                <AvatarSection hasImage={Boolean(profile.image)} />
                {/* <EmailSection email={profile.email} /> */}
                <PasswordSection />
            </div>
        </div>
    );
};
