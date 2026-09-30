import type { Metadata } from "next";
import { getSessionDetails } from "@/lib/auth/session-details";
import {
    generateAsyncTitle,
    generateAsyncDescription,
    type MetadataGeneratorProps,
} from "@/lib/seo";
import { PrivateDashboardSidebar } from "@/features/private/dashboard/components";
import { redirect } from "next/navigation";

const pageData: MetadataGeneratorProps = {
    title: "Panel",
    description: "Panel del Sistema",
};

export async function generateMetadata(): Promise<Metadata> {
    const dynamicTitle = await generateAsyncTitle(pageData.title);
    const dynamicDescription = await generateAsyncDescription(pageData.description);

    return {
        title: dynamicTitle,
        description: dynamicDescription,
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

    return (
        <div className="flex flex-1 min-h-[calc(100vh-4rem)] bg-background text-foreground">
            <PrivateDashboardSidebar userRole={userRole} />
            {/* Margen izquierdo responsivo para dejar espacio al sidebar fijo (md:pl-64) */}
            <main className="flex-1 md:pl-64 transition-all duration-300 flex flex-col">
                <div className="p-6 md:p-8 flex-1">
                    {children}
                </div>
            </main>
        </div>
    );
}