import type { UserRole } from "@/lib/db/schema";
import type { LucideIcon } from "lucide-react";

export type SidebarPosition = "left" | "right";

export interface PrivateDashboardSidebarSubItemInterface {
    title: string;
    description: string;
    href: string;
    icon: LucideIcon;
    allowedRoles?: (UserRole | "*")[]; // 👈 También en los subítems
}

export interface PrivateDashboardSidebarItemInterface {
    title: string;
    description: string;
    href?: string;
    icon: LucideIcon;
    allowedRoles?: (UserRole | "*")[]; // 👈 También en los subítems
    subitems?: PrivateDashboardSidebarSubItemInterface[];
}
