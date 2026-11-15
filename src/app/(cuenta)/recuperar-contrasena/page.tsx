import type { Metadata } from "next";

import {
    generateAsyncDescription,
    generateAsyncTitle,
} from "@/lib/seo";
import { ForgotPasswordForm } from "@/features/public/auth/components";

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: await generateAsyncTitle("Recuperar Contraseña"),
        description: await generateAsyncDescription(
            "Solicita un enlace para restablecer tu contraseña",
        ),
    };
}

export default function ForgotPasswordPage() {
    return (
        <>
            <main>
                <ForgotPasswordForm />
            </main>
        </>
    );
}
