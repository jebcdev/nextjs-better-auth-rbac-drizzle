import { getSessionDetails } from "@/lib/auth/session-details";
import {
    generateAsyncTitle,
    generateAsyncDescription,
} from "@/lib/seo";
import type { Metadata } from "next";
import { redirect } from "next/navigation"; // 👈 Corrección de importación recomendada
import { hasRequiredRole } from "@/lib/auth/role-guard";
import type { UserRole } from "@/lib/db/schema";
import { PrivateDashboardHeader } from "@/features/private/dashboard/components";

import { ArrowLeftIcon } from "lucide-react";

const allowedPageRoles: UserRole[] = [process.env.SUPER_ADMIN_ROLE as UserRole];

// Sin anotación `MetadataGeneratorProps`: sus campos son opcionales y
// `pageData.title` quedaría como `string | undefined`, que `PrivateDashboardHeader`
// no acepta (de ahí el `pageData?.title!` previous).
const pageData = {
    title: "Usuarios",
    description: "Registra un nuevo usuario en el sistema",
};

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: await generateAsyncTitle(pageData.title),
        description: await generateAsyncDescription(
            pageData.description,
        ),
    };
}

export default async function PrivateDashboardNewUserPage() {
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
            <PrivateDashboardHeader
                title={pageData.title}
                subtitle={pageData.description}
                action={{
                    icon: <ArrowLeftIcon />,
                    label: "Volver",
                    path: "/panel/admin/usuarios",
                }}
            />
        </main>
    );
}
