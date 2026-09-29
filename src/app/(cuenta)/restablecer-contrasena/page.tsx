import type { Metadata } from "next";

import {
    generateAsyncDescription,
    generateAsyncTitle,
} from "@/lib/seo";
import { ResetPasswordForm } from "@/features/public/auth/components";

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: await generateAsyncTitle("Restablecer Contraseña"),
        description: await generateAsyncDescription(
            "Elige una nueva contraseña para tu cuenta",
        ),
    };
}

/**
 * Página que consume el token de recuperación.
 *
 * El token llega en `?token=`. La validación real (de un solo uso y caducidad)
 * la hace `resetPasswordAction` al enviar el formulario; aquí solo se decide
 * qué mostrar. Comprobar aquí la existencia del token se descartaría
 * deliberadamente: hacerlo convertiría esta URL en un oráculo que confirma qué
 * tokens se emitieron.
 */
export default async function ResetPasswordPage({
    searchParams,
}: {
    searchParams: Promise<{ token?: string }>;
}) {
    const { token } = await searchParams;

    if (!token) {
        return (
            <div className="space-y-2 text-center">
                <h2 className="text-lg font-semibold">
                    Enlace incompleto
                </h2>
                <p className="text-sm text-muted-foreground">
                    Este enlace no trae el token de recuperación. Solicita uno
                    nuevo desde la página de recuperación de contraseña.
                </p>
            </div>
        );
    }

    return (
        <>
            <main>
                <ResetPasswordForm token={token} />
            </main>
        </>
    );
}
