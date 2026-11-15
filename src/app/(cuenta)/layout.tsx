import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
    generateAsyncDescription,
    generateAsyncTitle,
} from "@/lib/seo";
import { getSessionDetails } from "@/lib/auth/session-details";

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: await generateAsyncTitle("Acceso a la Plataforma"),
        description: await generateAsyncDescription(
            "Inicia sesión o crea tu cuenta para acceder al sistema.",
        ),
    };
}

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const sessionDetails = await getSessionDetails();
    if (sessionDetails.isAuthenticated) return redirect("/");

    return (
        <main className="flex min-h-[calc(100dvh-4rem)] w-full flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-12 lg:px-8 antialiased">
            <div className="w-full max-w-md space-y-6 sm:space-y-8 lg:max-w-lg">
                {/* Mensaje Informativo */}
                <header className="space-y-2 text-center sm:space-y-3">
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                        Acceso a la Plataforma
                    </h1>
                    <p className="mx-auto max-w-prose text-sm text-balance sm:text-base">
                        Inicia sesión o crea tu cuenta para acceder.
                    </p>
                </header>

                {/* Tarjeta donde se renderiza el formulario */}
                <div className="rounded-xl border p-6 shadow-sm sm:p-8">
                    {children}
                </div>
            </div>
        </main>
    );
}