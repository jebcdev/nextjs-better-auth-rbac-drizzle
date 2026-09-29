import type { Metadata } from "next";

import {
    generateAsyncDescription,
    generateAsyncTitle,
} from "@/lib/seo";
import { LoginForm } from "@/features/public/auth/components";

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: await generateAsyncTitle("Inicio de Sesión"),
        description: await generateAsyncDescription(
            "Inicia Sesión en El Sistema",
        ),
    };
}

export default function LoginPage() {
    return (
        <>
            <main>
                <LoginForm />
            </main>
        </>
    );
}
