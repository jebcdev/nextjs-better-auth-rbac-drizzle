import { headers } from "next/headers";

/**
 * Limitador de intentos de autenticación por ventana fija, en memoria.
 *
 * ⚠️ POR QUÉ NO SE CONFIGURA `rateLimit` EN `auth.ts`
 *
 * better-auth trae su propio limitador, pero vive en la capa de handlers HTTP
 * (`dist/api/rate-limiter/`). Esta aplicación **no monta ningún handler**: no
 * hay `route.ts` ni `toNextJsHandler`, y todas las llamadas son
 * `auth.api.signInEmail(...)` desde server actions. Ese limitador nunca se
 * ejecuta, sin importar cómo se configure la opción. Poner `rateLimit` en la
 * config daría la *apariencia* de protección sin ninguna: el peor resultado
 * posible aquí. Si algún día se monta un handler HTTP y se pasa a llamar a la
 * API por HTTP, entonces sí aplica la opción de la librería y este archivo
 * puede retirarse.
 *
 * Decisión D4 de openspec/changes/04-harden-authentication/.
 *
 * ── Limitaciones aceptadas, declaradas y no escondidas ──
 *
 * - **Por proceso.** El estado vive en el `Map` de este módulo. Con varias
 *   instancias el límite efectivo se multiplica por el número de instancias y
 *   se reinicia al reiniciar el proceso. El seguimiento natural es un almacén
 *   compartido (Redis o tabla). Se acepta ahora porque es una mejora muy grande
 *   frente a *no tener límite*.
 * - **La IP viene de una cabecera.** `x-forwarded-for` la escribe el proxy, no
 *   el cliente... salvo que la aplicación se exponga directamente, en cuyo caso
 *   cualquiera puede enviar la cabecera que quiera y evadir el límite por IP.
 *   Si el despliegue no tiene un proxy inverso delante, esto es una protección
 *   parcial y la mitigación correcta es configurar el proxy para *sobrescribir*
 *   la cabecera. Ver `advanced.trustedProxyHeaders` de better-auth.
 */

/** Intentos fallidos tolerados por ventana. */
const MAX_ATTEMPTS = 5;

/** Longitud de la ventana. */
const WINDOW_MS = 15 * 60 * 1000;

/** Clave usada cuando no hay ninguna IP disponible (p. ej. `pnpm dev`). */
const UNKNOWN_CLIENT_KEY = "unknown-client";

type Window = { failures: number; resetAt: number };

/**
 * `Map` a nivel de módulo: sobrevive entre peticiones mientras el proceso viva.
 * Es lo que hace que el límite sea real en lugar de decorativo.
 */
const windows = new Map<string, Window>();

/** Poda las ventanas vencidas para que el `Map` no crezca sin límite. */
const prune = (now: number): void => {
    for (const [key, window] of windows) {
        if (window.resetAt <= now) windows.delete(key);
    }
};

/**
 * Identifica al cliente por IP.
 *
 * Detrás de un proxy, `x-forwarded-for` es una lista y la primera entrada es la
 * del cliente real. `x-real-ip` es el fallback habitual. Sin ninguna de las dos
 * (desarrollo local) todas las peticiones comparten una ventana: aceptable en
 * local, insuficiente en producción sin proxy.
 */
export const getClientRateLimitKey = async (): Promise<string> => {
    const requestHeaders = await headers();
    const forwardedFor = requestHeaders.get("x-forwarded-for");
    const ip =
        forwardedFor?.split(",")[0]?.trim() ||
        requestHeaders.get("x-real-ip")?.trim() ||
        "";
    return ip || UNKNOWN_CLIENT_KEY;
};

export type RateLimitBucket = "login" | "password-recovery";

/**
 * Compone la clave final. El cubo va dentro de la clave a propósito: el login y
 * la recuperación de contraseña son superficies de ataque distintas y no deben
 * compartir cuota. Sin esta separación, un usuario que fallara el login cinco
 * veces no podría ni pedir su recuperación durante 15 minutos.
 */
const scopedKey = (bucket: RateLimitBucket, clientKey: string): string =>
    `${bucket}:${clientKey}`;

/** `true` si este cliente ya agotó los intentos de la ventana en curso. */
export const isRateLimited = (
    bucket: RateLimitBucket,
    clientKey: string,
    now = Date.now(),
): boolean => {
    prune(now);
    const window = windows.get(scopedKey(bucket, clientKey));
    return window !== undefined && window.failures >= MAX_ATTEMPTS;
};

/** Suma un intento fallido a la ventana del cliente. */
export const recordFailedAttempt = (
    bucket: RateLimitBucket,
    clientKey: string,
    now = Date.now(),
): void => {
    prune(now);
    const key = scopedKey(bucket, clientKey);
    const current = windows.get(key);
    if (current === undefined || current.resetAt <= now) {
        windows.set(key, { failures: 1, resetAt: now + WINDOW_MS });
        return;
    }
    current.failures += 1;
};

/**
 * Descarta la ventana del cliente tras un acierto, para que un usuario legítimo
 * que se equivoca un par de veces y luego entra bien no quede bloqueado.
 */
export const clearAttempts = (
    bucket: RateLimitBucket,
    clientKey: string,
): void => {
    windows.delete(scopedKey(bucket, clientKey));
};
