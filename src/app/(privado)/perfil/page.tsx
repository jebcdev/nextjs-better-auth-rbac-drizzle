import { ProfileSkeleton } from "@/features/private/profile/components";
import {
    generateAsyncDescription,
    generateAsyncTitle,
    MetadataGeneratorProps,
} from "@/lib/seo";
import type { Metadata } from "next";
import { Suspense } from "react";

const pageData: MetadataGeneratorProps = {
    title: "Perfil de Usuario",
    description: "Consulta y actualiza tu información personal.",
};

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: await generateAsyncTitle(pageData.title),
        description: await generateAsyncDescription(
            pageData.description,
        ),
    };
}

export default function ProfilePage() {
    return (
        <>
        <Suspense fallback={<ProfileSkeleton />}>
            <main>
                <h1>Perfil de Usuario</h1>
            </main>
        </Suspense>
        </>
    );
}
