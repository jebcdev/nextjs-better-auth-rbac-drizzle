import { ProfileDetails, ProfileSkeleton } from "@/features/private/profile/components";
import { getFullUserInformation } from "@/features/private/profile/actions";
import {
    generateAsyncDescription,
    generateAsyncTitle,
    MetadataGeneratorProps,
} from "@/lib/seo";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

const pageData: MetadataGeneratorProps = {
    title: "Perfil de Usuario",
    description: "Consulta y actualiza tu información personal.",
};

/**
 * Esta ruta lee la sesión en el servidor y por tanto es dinámica siempre.
 *
 * Se declara explícitamente porque `getFullUserInformation` devuelve
 * `IGeneralResponse` y su `catch` se traga el error `DYNAMIC_SERVER_USAGE` que
 * Next lanza al leer `headers()` durante un intento de prerenderizado. Sin esta
 * declaración, el prerenderizado se abandona por el `redirect()` de la rama de
 * fallo —que sí marca la ruta como dinámica, pero solo de rebote y tras ensuciar
 * la salida del build con un error que no es un error—. Declararlo dice la
 * verdad por adelantado: esta página se renderiza bajo demanda, siempre.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: await generateAsyncTitle(pageData.title),
        description: await generateAsyncDescription(
            pageData.description,
        ),
    };
}

/**
 * Cuerpo asíncrono que resuelve el perfil.
 *
 * ⚠️ Vive en un componente HIJO a propósito (decisión D8). Si la página
 * hiciera `await getFullUserInformation()` en su propio cuerpo, suspendería
 * ANTES de devolver JSX y el `<Suspense fallback={<ProfileSkeleton />}>` de
 * abajo nunca llegaría a renderizarse: el usuario vería una página en blanco
 * en lugar del marcador de carga. Aquí el `<h1>` y el esqueleto salen
 * inmediatamente y el perfil llena el hueco cuando la consulta resuelve.
 *
 * ⚠️ `redirect()` lanza, así que va después de la llamada y fuera de cualquier
 * `try/catch`: envolverlo convertiría la redirección en un error de render.
 */
const ProfileContent = async () => {
    const { success, message, data } = await getFullUserInformation();

    // Coincide con el guardia del layout `(privado)`, que ya redirige a
    // /iniciar-sesion cuando no hay `currentUser` (decisión D9).
    if (!success || !data) {
        console.error("Perfil no disponible:", message);
        redirect("/iniciar-sesion");
    }

    return <ProfileDetails profile={data} />;
};

/**
 * Página de perfil del usuario autenticado.
 *
 * El contenedor y el `<h1>` viven FUERA del `<Suspense>` (decisión D8), de modo
 * que el encabezado está presente tanto mientras carga como cuando ya está.
 *
 * ⚠️ Envuelve en un `<div>`, no en otro `<main>`: el layout `(privado)` ya
 * aporta el landmark, y dos `<main>` en la misma página es un error de
 * estructura (decisión D18).
 */
export default function ProfilePage() {
    return (
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Perfil de Usuario
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
                Consulta tu información y mantén cada dato por separado.
            </p>

            <div className="mt-6">
                <Suspense fallback={<ProfileSkeleton />}>
                    <ProfileContent />
                </Suspense>
            </div>
        </div>
    );
}
