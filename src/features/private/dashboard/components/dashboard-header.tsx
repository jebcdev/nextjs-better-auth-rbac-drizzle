"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/features/shared/components/ui";
import { cn } from "@/lib/utils";

interface HeaderAction {
    path?: string;
    onClick?: () => void;
    icon?: ReactNode;
    label: string;
    variant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
}

interface DashboardHeaderProps {
    title: string;
    subtitle?: string;
    action?: HeaderAction;
    children?: ReactNode;
    as?: "h1" | "h2" | "h3";
    className?: string;
}

export const PrivateDashboardHeader = ({
    title,
    subtitle,
    action,
    children,
    as: Heading = "h1",
    className,
}: DashboardHeaderProps) => {
    return (
        <header
            className={cn("mb-6 border-b border-border pb-4 p-2", className)}
        >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                    <Heading className="text-2xl font-semibold tracking-tight text-foreground">
                        {title}
                    </Heading>
                    {subtitle && (
                        <p className="mt-1 text-sm text-muted-foreground">
                            {subtitle}
                        </p>
                    )}
                </div>

                {action && (
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {action.path ? (
                            <Button
                                
                                variant={action.variant ?? "default"}
                                size="sm"
                            >
                                <Link
                                    href={action.path}
                                    className="inline-flex items-center gap-2"
                                >
                                    {action.icon}
                                    <span>{action.label}</span>
                                </Link>
                            </Button>
                        ) : (
                            <Button
                                variant={action.variant ?? "default"}
                                size="sm"
                                onClick={action.onClick}
                                className="gap-2"
                            >
                                {action.icon}
                                <span>{action.label}</span>
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {children && <div className="mt-4">{children}</div>}
        </header>
    );
};