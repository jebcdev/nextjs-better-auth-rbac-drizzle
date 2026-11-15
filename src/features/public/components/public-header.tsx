"use client";

import { UserRole } from "@/lib/db/schema";
import Image from "next/image";
import Link from "next/link";
import { useLogout } from "@/lib/auth/use-logout";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    Avatar,
    AvatarFallback,
    AvatarImage,
    Button,
    ThemeSwitcher,
} from "@/features/shared/components/ui";
import { getUserRoleLabel } from "@/lib/utils/enums-labels";

interface PublicHeaderProps {
    currentUser?: {
        id: string;
        name: string;
        email: string;
        image?: string | null;
        role?: string | null;
    } | null;
    role?: UserRole | null;
}

export const PublicHeader = ({
    currentUser,
    role,
}: PublicHeaderProps) => {
    // Cierra sesión en el servidor, purga el caché del navegador y navega
    // fuera del área privada. Antes este `onClick` descartaba el resultado de
    // `logoutAction()` y no navegaba, así que el header seguía mostrando la
    // sesión iniciada. Ver decisión D3 de
    // openspec/changes/04-harden-authentication/.
    const { logout, isPending } = useLogout();

    // Obtener iniciales para el Avatar en caso de que no tenga imagen
    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .substring(0, 2);
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
            <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-8">
                {/* 1. Logo a toda la izquierda */}
                <div className="flex items-center gap-6">
                    <Link
                        href="/"
                        className="flex items-center space-x-2"
                    >
                        <Image
                            src="/logo.png"
                            alt="Logo"
                            width={40}
                            height={40}
                            className="h-10 w-auto object-contain rounded-full"
                            priority
                        />
                    </Link>
                </div>

                {/* 2. Espacio central para otros links */}
                <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                    {/* Espacio para otros links centralizados */}
                    <span className="text-muted-foreground">
                        Espacio para otros links
                    </span>
                </nav>

                {/* 3. Derecha: Todo lo demás (Autenticación / Menú Desplegable) */}
                <div className="flex items-center gap-4">
                        <ThemeSwitcher /> {/* 👈 aquí */}

                    {currentUser ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <Button
                                        variant="ghost"
                                        className="flex items-center gap-2 px-2 py-1.5 h-auto focus-visible:ring-0"
                                    />
                                }
                            >
                                <Avatar className="h-8 w-8">
                                    <AvatarImage
                                        src={
                                            currentUser.image ||
                                            undefined
                                        }
                                        alt={currentUser.name}
                                    />
                                    <AvatarFallback>
                                        {getInitials(
                                            currentUser.name,
                                        )}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="hidden sm:inline-block text-sm font-medium text-left">
                                    {currentUser.name}
                                </span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="end"
                                className="w-56"
                            >
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel className="font-normal">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium leading-none">
                                                {currentUser.name}
                                            </p>
                                            <p className="text-xs leading-none text-muted-foreground">
                                                {currentUser.email}
                                            </p>
                                        </div>
                                    </DropdownMenuLabel>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    render={
                                        <Link
                                            href="/panel"
                                            className="w-full cursor-pointer"
                                        />
                                    }
                                >
                                    Panel |{" "}
                                    {role
                                        ? getUserRoleLabel(role)
                                        : "Rol desconocido"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    nativeButton={false}
                                    render={
                                        <Link
                                            href="/perfil"
                                            className="w-full cursor-pointer"
                                        />
                                    }
                                >
                                    Mi cuenta
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    nativeButton
                                    render={
                                        <button
                                            type="button"
                                            onClick={logout}
                                            disabled={isPending}
                                            className="w-full text-destructive focus:text-destructive cursor-pointer flex items-center disabled:opacity-50"
                                        />
                                    }
                                >
                                    {isPending
                                        ? "Cerrando sesión..."
                                        : "Cerrar sesión"}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                nativeButton={false}
                                render={
                                    <Link href="/iniciar-sesion" />
                                }
                            >
                                Iniciar sesión
                            </Button>
                            <Button
                                nativeButton={false}
                                render={<Link href="/registrarse" />}
                            >
                                Registrarse
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Opcional para móviles: Barra inferior o secundaria para enlaces si el espacio central se oculta */}
            <div className="md:hidden flex items-center justify-center border-t py-2 px-4 text-xs text-muted-foreground">
                Espacio para otros links
            </div>
        </header>
    );
};
