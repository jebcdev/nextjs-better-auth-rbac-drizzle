"use client";

import { useState } from "react";
import {
    Settings,
    Users,
    PanelLeftClose,
    PanelLeftOpen,
    Menu,
    X,
    LogOut,
    UserIcon,
} from "lucide-react";
import { PrivateDashboardSidebarItem } from "./";
import { useLogout } from "@/lib/auth/use-logout";
import { hasRequiredRole } from "@/lib/auth/role-guard";
import type { PrivateDashboardSidebarItemInterface } from "../../types";
import type { UserRole } from "@/lib/db/schema";
import Link from "next/link";

interface SidebarProps {
    userRole?: UserRole;
}

export const PrivateDashboardSidebar = ({
    userRole,
}: SidebarProps) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const { logout, isPending } = useLogout();

    const menuItems: PrivateDashboardSidebarItemInterface[] = [
        {
            title: "Configuración",
            description: "Ajustes del sistema",
            icon: Settings,
            href: "/panel/configuracion", // Soporta href en el padre
            allowedRoles: ["admin" as UserRole],
            subitems: [
                {
                    title: "Usuarios",
                    description: "Gestión de usuarios del sistema",
                    href: "/panel/admin/usuarios",
                    icon: Users,
                    allowedRoles: ["admin" as UserRole],
                },
            ],
        },
        {
            title: "Mi Perfil",
            description: "Configuración de tu cuenta",
            icon: UserIcon,
            href: "/perfil",
            allowedRoles: ["*"], // 👈 Accesible para cualquier rol autenticado
        },
    ];

    // Opcional pero recomendado: Filtrar ítems principales usando el helper
    const filteredMenuItems = menuItems.filter((item) =>
        hasRequiredRole(userRole, item.allowedRoles),
    );

    return (
        <>
            {/* Botón flotante para móvil */}
            <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden fixed top-20 left-4 z-40 p-2 rounded-md bg-background border border-border shadow-sm text-foreground"
                aria-label="Abrir menú"
            >
                <Menu className="w-5 h-5" />
            </button>

            {/* Backdrop para móviles */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar fijo debajo del PublicHeader */}
            <aside
                className={`fixed top-16 bottom-0 left-0 z-40 flex flex-col bg-card border-r border-border transition-all duration-300 ease-in-out shadow-lg md:shadow-none
          ${isCollapsed ? "w-16" : "w-64"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
            >
                {/* Cabecera interna del Sidebar */}
                <div className="flex items-center justify-between p-4 border-b border-border h-14 shrink-0">
                    {!isCollapsed && (
                        <Link
                            className="font-semibold text-sm text-foreground tracking-tight truncate"
                            href="/panel"
                        >
                            Menú Principal
                        </Link>
                    )}

                    <div className="flex items-center gap-1 ml-auto">
                        <button
                            onClick={() =>
                                setIsCollapsed(!isCollapsed)
                            }
                            title="Colapsar menú"
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors hidden md:flex"
                        >
                            {isCollapsed ? (
                                <PanelLeftOpen className="w-4 h-4" />
                            ) : (
                                <PanelLeftClose className="w-4 h-4" />
                            )}
                        </button>

                        <button
                            onClick={() => setMobileOpen(false)}
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors md:hidden"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Listado de Opciones (Con scroll interno) */}
                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
                    {filteredMenuItems.map((item, index) => (
                        <PrivateDashboardSidebarItem
                            key={index}
                            item={item}
                            userRole={userRole}
                            isCollapsed={isCollapsed}
                        />
                    ))}
                </div>

                {/* Botón de Cerrar Sesión anclado al Bottom-Left */}
                <div className="p-3 border-t border-border mt-auto shrink-0 bg-card">
                    <button
                        onClick={logout}
                        disabled={isPending}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-destructive hover:bg-destructive/10 disabled:opacity-50`}
                        title="Cerrar sesión"
                    >
                        <LogOut className="w-5 h-5 shrink-0" />
                        {!isCollapsed && (
                            <span className="truncate">
                                {isPending
                                    ? "Cerrando..."
                                    : "Cerrar sesión"}
                            </span>
                        )}
                    </button>
                </div>
            </aside>
        </>
    );
};
