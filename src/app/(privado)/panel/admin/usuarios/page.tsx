import { Suspense } from "react";
import { getSessionDetails } from "@/lib/auth/session-details";
import {
    generateAsyncTitle,
    generateAsyncDescription,
} from "@/lib/seo";
import type { Metadata } from "next";
import { redirect } from "next/navigation"; // 👈 Corrección de importación recomendada
import { hasRequiredCsvRole } from "@/lib/auth/role-guard";
import { PrivateDashboardHeader } from "@/features/private/dashboard/components";
import {
    ADMIN_USERS_ROLES,
    AdminDashboardUsersGrid,
    AdminDashboardUsersGridSkeleton,
} from "@/features/private/dashboard/admin/users/components/grid";
import { PlusIcon } from "lucide-react";


// ⚠️ Sin anotación `MetadataGeneratorProps` a propósito: sus campos son
// opcionales, y `pageData.title` quedaría como `string | undefined`, que no es
// lo que `PrivateDashboardHeader` acepta (de ahí la cadena opcional con
// aserción de no-nulidad que había antes). El literal de aquí tiene ambos campos
// siempre, y dejarlo inferir es lo que hace que el compilador lo compruebe.
const pageData = {
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
    //
    // ⚠️ `hasRequiredCsvRole` y no `hasRequiredRole`: `userRole` es la cadena CSV
    // cruda que `getSessionDetails()` castea, así que una cuenta con
    // `role = "user,admin"` sería rechazada por la comparación entera. Es el
    // MISMO helper que usa la action del listado, y esa es la única forma de que
    // la regla de la página y la de la action no se desincronicen (decisión D20).
    // Los roles permitidos vienen de la constante compartida, no de un array
    // declarado aquí: dos copias de la regla de autorización, a un archivo de
    // distancia, es exactamente lo que se quiere evitar (decisión D10).
    if (!hasRequiredCsvRole(userRole, ADMIN_USERS_ROLES)) {
        return redirect("/panel"); // O a una página de acceso denegado
    }

    return (
        <main>
            <PrivateDashboardHeader
            title={pageData.title}
            subtitle={pageData.description}
             action={{
                        icon: <PlusIcon />,
                        label: "Nuevo",
                        path: "/panel/admin/usuarios/nuevo",
                    }}
            />

            {/* ⚠️ NO se espera nada en el cuerpo de la página. En Next.js 16,
                hacer `await` aquí suspende antes de que se devuelva JSX, así que
                el skeleton nunca llega a verse. La cuadrícula es un Client
                Component que gestiona su propio estado de carga, y este límite
                existe para el `useSearchParams` y para que el marcador tenga una
                única definición visual (decisión D3).

                `viewerId` sale del `getSessionDetails()` que esta página YA
                llamó para su propio guard: ni una segunda resolución de sesión
                ni un campo nuevo en el DTO del listado. Solo viaja el id de quien
                mira, que la tarjeta usa para no ofrecerle cambiar su propia
                cuenta. */}
            <Suspense fallback={<AdminDashboardUsersGridSkeleton />}>
                <AdminDashboardUsersGrid viewerId={currentUser.id} />
            </Suspense>
        </main>
    );
}
