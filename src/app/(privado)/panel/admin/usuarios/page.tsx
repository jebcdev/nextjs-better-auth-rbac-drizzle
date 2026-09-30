import { getSessionDetails } from "@/lib/auth/session-details";
import {
    MetadataGeneratorProps,
    generateAsyncTitle,
    generateAsyncDescription,
} from "@/lib/seo";
import type { Metadata } from "next";
import { redirect } from "next/navigation"; // 👈 Corrección de importación recomendada
import { hasRequiredRole } from "@/lib/auth/role-guard";
import type { UserRole } from "@/lib/db/schema";

const allowedPageRoles: UserRole[] = ["admin"];

const pageData: MetadataGeneratorProps = {
    title: "Usuarios",
    description: "Gestiona los Usuarios del Sistema",
};

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: await generateAsyncTitle(pageData.title),
        description: await generateAsyncDescription(
            pageData.description,
        ),
    };
}

export default async function PrivateDashboardUsersPage() {
    const { currentUser, userRole } = await getSessionDetails();

    // 1. Validar autenticación
    if (!currentUser) {
        return redirect("/iniciar-sesion");
    }

    // 2. Validar autorización por rol con el helper
    if (!hasRequiredRole(userRole, allowedPageRoles)) {
        return redirect("/panel"); // O a una página de acceso denegado
    }

    return (
        <main>
            <h1 className="text-2xl font-bold tracking-tight">
                Usuarios
            </h1>
            <p className="text-muted-foreground mt-1">
                Panel de administración de usuarios.
            </p>
        </main>
    );
}
