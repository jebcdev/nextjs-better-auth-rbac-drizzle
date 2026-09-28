"use client";
/*
npm install thinking-orbs
pnpm install thinking-orbs

*/
import { ThinkingOrb } from "thinking-orbs";
import { cn } from "@/lib/utils";

interface LoadingProps {
    message?: string;
    className?: string;
}

export default function Loading({
    message = "Cargando",
    className,
}: LoadingProps) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center gap-6 py-20 w-full animate-pulse",
                className,
            )}
        >
            <ThinkingOrb
                state="working"
                theme="light"
                size={64}
                speed={10}
                paused={false}
            />

            <span>{message} ...</span>
        </div>
    );
}
