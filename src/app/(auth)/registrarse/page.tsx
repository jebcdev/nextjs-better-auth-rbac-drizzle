import type { Metadata } from "next";

import {
    generateAsyncDescription,
    generateAsyncTitle,
} from "@/lib/seo";

import { RegisterForm } from "@/features/public/auth/components";

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: await generateAsyncTitle("Registro de Usuario"),
        description: await generateAsyncDescription(
            "Registra un nuevo usuario en El Sistema",
        ),
    };
}

export default function RegisterPage() {
    return (
        <>
            <main>
                <RegisterForm />
            </main>
        </>
    );
}
