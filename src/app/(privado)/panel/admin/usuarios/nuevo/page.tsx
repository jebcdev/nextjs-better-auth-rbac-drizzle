import { getSessionDetails } from "@/lib/auth/session-details";
import {
    generateAsyncTitle,
    generateAsyncDescription,
} from "@/lib/seo";
import type { Metadata } from "next";
import { redirect } from "next/navigation"; // 👈 Corrección de importación recomendada
import { hasRequiredRole } from "@/lib/auth/role-guard";
import { PrivateDashboardHeader } from "@/features/private/dashboard/components";
import {
    DashboardAdminUsersForm,
    ADMIN_USERS_ROLES,
} from "@/features/private/dashboard/admin/users/components";

import { ArrowLeftIcon } from "lucide-react";

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
    //
    // Los roles permitidos vienen de la MISMA constante compartida que usan
    // las otras dos páginas del directorio y sus tres actions. Un array
    // declarado aquí sería una segunda copia de la regla de autorización a
    // un archivo de distancia.
    if (!hasRequiredRole(userRole, ADMIN_USERS_ROLES)) {
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

            {/* ⚠️ La página NO pasa ningún DTO: en alta no hay cuenta previa, así
                que `user` se omite y el formulario arranca vacío con el rol por
                defecto. La propia action vuelve a comprobar sesión y rol, porque
                este guard de la página no se hereda en un POST directo. */}
            <div className="w-full">
                <DashboardAdminUsersForm mode="create" />
            </div>
        </main>
    );
}
