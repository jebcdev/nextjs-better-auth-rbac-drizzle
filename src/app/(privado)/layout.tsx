import type { Metadata } from "next";
import { getSessionDetails } from "@/lib/auth/session-details";
import {
    generateAsyncTitle,
    generateAsyncDescription,
    MetadataGeneratorProps,
} from "@/lib/seo";

import { redirect } from "next/navigation";

const pageData: MetadataGeneratorProps = {
    title: "Inicio",
    description: "Inicio de el Sistema",
};

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: await generateAsyncTitle(pageData.title),
        description: await generateAsyncDescription(
            pageData.description,
        ),
    };
}

export default async function PrivateLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { currentUser, userRole } = await getSessionDetails();
    if (!currentUser) {
        return redirect("/iniciar-sesion");
    }

    // Redirect customer role away from the private panel

    return (
        <>
            <main>{children}</main>
        </>
    );
}
