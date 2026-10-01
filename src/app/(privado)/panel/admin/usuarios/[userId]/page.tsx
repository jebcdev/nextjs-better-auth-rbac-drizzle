import { getSessionDetails } from "@/lib/auth/session-details";
import {
    generateAsyncTitle,
    generateAsyncDescription,
} from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { hasRequiredRole } from "@/lib/auth/role-guard";
import { PrivateDashboardHeader } from "@/features/private/dashboard/components";
import {
    DashboardAdminUsersForm,
    getUserByIdAction,
    ADMIN_USERS_ROLES,
} from "@/features/private/dashboard/admin/users";
import { Button } from "@/features/shared/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";

// Sin anotación `MetadataGeneratorProps`: sus campos son opcionales y
// `pageData.title` quedaría como `string | undefined`, que `PrivateDashboardHeader`
// no acepta (de ahí el `pageData?.title!` previous).
const pageData = {
    title: "Usuarios",
    description: "Edita la información de un usuario existente",
};

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: await generateAsyncTitle(pageData.title),
        description: await generateAsyncDescription(pageData.description),
    };
}

interface Props {
    params: Promise<{ userId: string }>;
}

export default async function PrivateDashboardEditViewUserPage({
    params,
}: Props) {
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

    const { userId } = await params;

    // ⚠️ Los params se resuelven ANTES de la consulta, no en el JSX. Este es un
    // Server Component que espera aquí su propia llamada, y no lleva `<Suspense>`:
    // el requisito del proyecto es que un `<Suspense>` solo se activa si el dato
    // se espera en un COMPONENTE HIJO, y esperar en el cuerpo de la página
    // suspende antes de devolver JSX, así que el esqueleto nunca se vería.
    //
    // El guard de rol ya ha pasado, y la action vuelve a comprobarlo por su
    // cuenta porque una server action es POSTeable directamente.
    const result = await getUserByIdAction(userId);

    // ⚠️ Una cuenta que no existe NO es un error de la página: es un dato
    // ausente, y por eso se resuelve AQUÍ, en línea, con su mensaje y su salida
    // al directorio. Deliberadamente NO se lanza a `src/app/error.tsx`, que es
    // una frontera de ruta completa y sin props que renderiza su propio
    // `<main>`: usarlo aquí anidaría un segundo `main` dentro de este y
    // descartaría el mensaje concreto que sí sabe decir qué pasó (decisión D16).
    if (!result.success || !result.data) {
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

                {/* Ni `NoData` ni `error.tsx`: su texto es genérico y el
                    requisito es que se diga que ESA cuenta no existe, no que no
                    hay datos. */}
                <div className="grid gap-4 rounded-2xl border border-border bg-card p-6 md:p-8">
                    <h2 className="font-heading text-base font-medium">
                        {result.success
                            ? "Cuenta no encontrada"
                            : result.message}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {result.success
                            ? "La cuenta indicada no existe o ha sido eliminada."
                            : "No se pudo consultar la cuenta. Vuelve al directorio e inténtalo de nuevo."}
                    </p>
                    <div>
                        {/* ⚠️ `render={<Link />}` y no `<Link>` dentro de un
                            `<button>`: base-ui compone con `render`, y un `<a>`
                            anidado en un `<button>` es un elemento interactivo
                            dentro de otro. Es el mismo error que arrastra
                            `dashboard-header.tsx`. */}
                        <Button
                            variant="outline"
                            render={
                                <Link href="/panel/admin/usuarios" />
                            }
                        >
                            Volver al directorio
                        </Button>
                    </div>
                </div>
            </main>
        );
    }

    const user = result.data;

    return (
        <main>
            <PrivateDashboardHeader
                title={pageData.title}
                // El nombre de la cuenta que se está editando, como pedía el
                // TODO que este archivo arrastraba. Se interpola el DTO ya
                // saneado, nunca una fila cruda: es el único dato de la cuenta
                // que esta página muestra.
                subtitle={`Editando a ${user.name}`}
                action={{
                    icon: <ArrowLeftIcon />,
                    label: "Volver",
                    path: "/panel/admin/usuarios",
                }}
            />

            {/* El DTO viaja entero, con sus fechas ya como ISO 8601, y el
                formulario decide qué campos son editables a partir de él. */}
            <div className="w-full">
                <DashboardAdminUsersForm mode="edit" user={user} />
            </div>
        </main>
    );
}
