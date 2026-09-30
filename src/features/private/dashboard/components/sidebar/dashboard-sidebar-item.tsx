"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { hasRequiredRole } from "@/lib/auth/role-guard";
import type { PrivateDashboardSidebarItemInterface } from "../../types";
import type { UserRole } from "@/lib/db/schema";

interface SidebarItemProps {
    item: PrivateDashboardSidebarItemInterface;
    userRole?: UserRole;
    isCollapsed: boolean;
}

export const PrivateDashboardSidebarItem = ({
    item,
    userRole,
    isCollapsed,
}: SidebarItemProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    // 🛡️ Usamos el helper para validar si el usuario puede ver este ítem padre
    if (!hasRequiredRole(userRole, item.allowedRoles)) {
        return null;
    }

    const hasSubitems = item.subitems && item.subitems.length > 0;
    const isActive = item.href ? pathname === item.href : false;

    const itemClasses = `flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium w-full ${
        isActive
            ? "bg-accent text-accent-foreground"
            : "hover:bg-muted text-muted-foreground hover:text-foreground"
    }`;

    return (
        <div className="w-full flex flex-col gap-1">
            <div className="flex items-center">
                {item.href ? (
                    <Link
                        href={item.href}
                        className={`flex-1 truncate ${itemClasses}`}
                    >
                        <item.icon className="w-5 h-5 shrink-0" />
                        {!isCollapsed && (
                            <span className="flex-1 truncate">
                                {item.title}
                            </span>
                        )}
                    </Link>
                ) : (
                    <div className={itemClasses}>
                        <item.icon className="w-5 h-5 shrink-0" />
                        {!isCollapsed && (
                            <span className="flex-1 truncate">
                                {item.title}
                            </span>
                        )}
                    </div>
                )}

                {hasSubitems && !isCollapsed && (
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsOpen(!isOpen);
                        }}
                        className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors ml-1"
                        aria-label="Desplegar submenú"
                    >
                        <ChevronDown
                            className={`w-4 h-4 transition-transform ${
                                isOpen ? "rotate-180" : ""
                            }`}
                        />
                    </button>
                )}
            </div>

            {/* Submenús desplegables */}
            {hasSubitems && isOpen && !isCollapsed && (
                <div className="flex flex-col pl-6 gap-1 border-l border-border ml-4 my-1">
                    {item.subitems?.map((sub, index) => {
                        // 🛡️ Usamos el helper también para validar cada subítem individualmente
                        if (
                            !hasRequiredRole(
                                userRole,
                                sub.allowedRoles,
                            )
                        )
                            return null;

                        const isSubActive = pathname === sub.href;

                        return (
                            <Link
                                key={index}
                                href={sub.href}
                                className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                                    isSubActive
                                        ? "bg-accent text-accent-foreground"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                }`}
                            >
                                <sub.icon className="w-4 h-4 shrink-0" />
                                <span className="truncate">
                                    {sub.title}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
