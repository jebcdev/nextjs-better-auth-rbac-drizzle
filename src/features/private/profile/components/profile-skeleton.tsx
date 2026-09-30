/**
 * Marcador de carga del perfil.
 *
 * Es un **Server Component**: es un árbol estático, sin estado, sin manejadores
 * y sin hooks, así que no necesita `"use client"`. Como componente de servidor
 * se serializa una sola vez dentro del `fallback` del `<Suspense>` y no puede
 * adquirir por accidente una dependencia de cliente (decisión D19).
 *
 * ── Por qué Tailwind a pelo y no un componente `Skeleton` ────────────────────
 * `animate-pulse` es una utilidad de Tailwind v4, que es lo que usa este
 * proyecto (`tailwindcss: ^4`, `@import "tailwindcss"` en `globals.css`). Lo que
 * aportaría un `<Skeleton>` del UI kit es exactamente un envoltorio de
 * `animate-pulse`, y `src/features/shared/components/ui/` no tiene ninguno.
 * Envolver una clase de utilidad en un componente nuevo no es un intercambio
 * que merezca la pena, y el usuario pidió el esqueleto en Tailwind.
 *
 * ── Por qué replica la rejilla final ────────────────────────────────────────
 * El esqueleto se dispose sobre la **misma rejilla** que la vista resuelta
 * (decisión D18: una columna por defecto, dos desde `lg`, identidad a la
 * izquierda y secciones a la derecha). Las regiones donde caerán los datos ya
 * están ocupadas, así que la página no salta cuando llegan. No es un espejo 1:1
 * de cada control: es un marcador de las *regiones*, que es lo que afirma el
 * escenario del spec.
 *
 * ⚠️ No contiene ningún dato del perfil: ni nombre, ni correo, ni rol, ni
 * cuenta. Solo bloques `bg-muted` / `bg-card`, y ninguno es enfocable ni
 * pulsable (`div` sin `tabIndex` ni `onClick`).
 *
 * ⚠️ El `<h1>` que antes vivía aquí ("CARGANDO EL PERFIL") desaparece: la
 * página real mantiene su `<h1>` FUERA del `<Suspense>` (decisión D8), así que
 * el encabezado está presente tanto en el estado de carga como en el resuelto.
 */

/**
 * Bloque pulsante con el token de superficie de las tarjetas.
 *
 * `div` puro: sin `tabIndex`, sin `onClick`, sin texto. Nada de esto es
 * enfocable ni pulsable, que es lo que pide el escenario del spec.
 */
const SurfaceBlock = ({ className }: { className: string }) => (
    <div
        className={`animate-pulse rounded-4xl bg-card ${className}`}
    />
);

export const ProfileSkeleton = () => {
    return (
        <div
            aria-hidden="true"
            className="grid w-full gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]"
        >
            {/* ── Columna de identidad (izquierda) ─────────────────────── */}
            <div className="grid content-start gap-4">
                <SurfaceBlock className="h-56 w-full" />
                <SurfaceBlock className="h-28 w-full" />
                <SurfaceBlock className="h-40 w-full" />
            </div>

            {/* ── Secciones de detalle (derecha) ──────────────────────── */}
            <div className="grid content-start gap-4">
                <SurfaceBlock className="h-44 w-full" />
                <SurfaceBlock className="h-52 w-full" />
                <SurfaceBlock className="h-40 w-full" />
                <SurfaceBlock className="h-72 w-full" />
            </div>
        </div>
    );
};
