"use client";

import Link from "next/link";

export default function ErrorPage() {
    return (
        <main className="grid min-h-screen place-items-center px-6 py-24 sm:py-32 lg:px-8 bg-white dark:bg-slate-950 transition-colors">
            <div className="text-center">
                {/* Código de estado o Icono */}
                <p className="text-base font-semibold text-blue-600 dark:text-blue-400">
                    Error
                </p>

                {/* Título en ambos idiomas */}
                <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl">
                    Algo salió mal / Something went wrong
                </h1>

                {/* Descripción técnica o amigable */}
                <p className="mt-6 text-base leading-7 text-slate-600 dark:text-slate-400">
                    Lo sentimos, ha ocurrido un error inesperado.{" "}
                    <br />
                    <span className="italic text-sm">
                        Sorry, an unexpected error has occurred.
                    </span>
                </p>

                {/* Botón de acción */}
                <div className="mt-10 flex items-center justify-center gap-x-6">
                    <Link
                        href="/"
                        className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all active:scale-95"
                    >
                        Volver al inicio / Go back home
                    </Link>
                </div>
            </div>
        </main>
    );
}
