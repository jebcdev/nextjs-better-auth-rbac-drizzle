"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { useHydrated } from "@/hooks/use-hydrated";
import {
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/features/shared/components/ui";

export function ThemeSwitcher() {
    const { theme, setTheme } = useTheme();

    // Evita mismatch de hidratación: el tema de `next-themes` solo existe en el
    // cliente. La secuencia visual es la misma que antes — placeholder primero,
    // menú después.
    const mounted = useHydrated();

    if (!mounted) {
        return (
            <Button variant="ghost" size="icon" className="h-9 w-9">
                <Monitor className="h-5 w-5" />
            </Button>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        aria-label="Cambiar tema"
                    />
                }
            >
                {theme === "dark" ? (
                    <Moon className="h-5 w-5" />
                ) : theme === "light" ? (
                    <Sun className="h-5 w-5" />
                ) : (
                    <Monitor className="h-5 w-5" />
                )}
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                    onClick={() => setTheme("light")}
                    className="cursor-pointer"
                >
                    <Sun className="mr-2 h-4 w-4" />
                    Claro
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => setTheme("dark")}
                    className="cursor-pointer"
                >
                    <Moon className="mr-2 h-4 w-4" />
                    Oscuro
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => setTheme("system")}
                    className="cursor-pointer"
                >
                    <Monitor className="mr-2 h-4 w-4" />
                    Sistema
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}