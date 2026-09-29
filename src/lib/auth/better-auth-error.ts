/**
 * Lectura del código de error de better-auth.
 *
 * better-auth lanza `APIError` (de better-call), cuyos campos son
 * `status`, `statusCode`, `headers` y **`body`**. El código de negocio
 * (`INVALID_TOKEN`, `PASSWORD_TOO_SHORT`, `UNAUTHORIZED`…) vive DENTRO de
 * `body.code`; la clase no expone un `code` de primer nivel.
 *
 * Leer `error.code` devuelve siempre `undefined`, y el后果ado silencioso es
 * grave: todas las ramas específicas se convierten en la genérica, así que el
 * usuario nunca ve "La contraseña actual es incorrecta" ni "el enlace expiró", y
 * el log marca siempre `unexpected_error`. Por eso la lectura vive aquí, en un
 * solo sitio, y no repetida en cada action.
 */

/** Forma mínima de un `APIError` de better-auth, sin importar el tipo. */
interface BetterAuthErrorShape {
    /** Presente en algunas versiones / capas; no se descarta. */
    code?: unknown;
    body?: { code?: unknown } | unknown;
}

/**
 * Devuelve el código del error, o `""` si no es un error de better-auth o no
 * trae código. Nunca lanza: un error sin clasificar debe degradarse al mensaje
 * genérico, no romper el `catch` que lo está manejando.
 */
export const getBetterAuthErrorCode = (error: unknown): string => {
    if (error === null || typeof error !== "object") return "";

    const candidate = error as BetterAuthErrorShape;

    // Ruta principal: `APIError.body.code`.
    if (typeof candidate.body === "object" && candidate.body !== null) {
        const bodyCode = (candidate.body as { code?: unknown }).code;
        if (typeof bodyCode === "string" && bodyCode.length > 0) return bodyCode;
        if (typeof bodyCode === "number") return String(bodyCode);
    }

    // Fallback por si una capa intermediaria aplana el error.
    if (typeof candidate.code === "string" && candidate.code.length > 0) {
        return candidate.code;
    }

    return "";
};
