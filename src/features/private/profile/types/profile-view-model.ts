/**
 * `ProfileViewModel` — la ÚNICA forma del perfil que puede cruzar la frontera
 * servidor/cliente.
 *
 * ⚠️ Este tipo se escribe a mano, campo por campo, y NO se deriva de `FullUser`
 * con `Pick`/`Omit`. Un `Pick` es una lista negra encubierta: añadir una columna
 * sensible al esquema y ampliar el `Pick` es una edición de una palabra, sin
 * error de compilación. Una interfaz explícita no compila hasta que alguien
 * añade el campo a propósito — y como este tipo es además el `props` de
 * `ProfileDetails`, el error cae justo sobre el componente que habría Filtrado.
 *
 * ⚠️ Consecuencia: cada detalle nuevo que la vista necesite mostrar cuesta
 * además un viaje deliberado hasta aquí. Es el modo de fallo previsto.
 *
 * Reglas que este tipo respeta:
 * - Ninguna credencial (`accounts.password`, `accessToken`, `refreshToken`,
 *   `idToken`, `sessions.token`) se nombra aquí. No es que se omitan al
 *   projecting: es que no hay dónde escribirlas.
 * - Todas las fechas son cadenas ISO 8601. Los `timestamp(..., { mode: "date" })`
 *   del esquema son instancias de `Date`; el payload RSC admite `Date`, pero el
 *   componente receptor recibiría un valor cuyo tipo ya no corresponde a su
 *   representación en runtime, y formatearlo en el cliente exigiría decidir
 *   locale y zona horaria. Emitir ISO una vez, en el servidor, mantiene honesto
 *   el tipo del cliente.
 * - `role` es `string`, no `UserRole`. La columna es `text` a propósito: el plugin
 *   admin escribe multi-rol como CSV (`setRole` acepta `string[]`) y los roles
 *   registrados con `ac.newRole()` son abiertos. `UserRole` es el conjunto
 *   *conocido en la app*, no el dominio cerrado de la base de datos; tipar aquí
 *   como `UserRole` sería una mentira que la vista tendría que deshacer en
 *   runtime (ver `getUserRoleLabel` y su respaldo al valor crudo).
 */

/** Cuenta vinculada, sin ningún secreto. */
export interface ProfileAccountSummary {
    /** `accounts.provider_id`: "credential", "github", … */
    providerId: string;
    /** `accounts.account_id`: el identifico del usuario en ese proveedor. */
    accountId: string;
    /** ISO 8601. */
    createdAt: string;
    /** ISO 8601. */
    updatedAt: string;
}

/** Una sesión, sin su token. */
export interface ProfileSessionEntry {
    id: string;
    /** ISO 8601. */
    expiresAt: string;
    ipAddress: string | null;
    userAgent: string | null;
    /** `true` para la sesión que respalda esta misma petición. */
    isCurrent: boolean;
}

/** Resumen agregado de `sessions`. Nunca incluye `sessions.token`. */
export interface ProfileSessionSummary {
    total: number;
    /** ISO 8601. `null` si la fila de la sesión actual no está entre las de la consulta. */
    currentSessionExpiresAt: string | null;
    entries: ProfileSessionEntry[];
}

export interface ProfileViewModel {
    id: string;
    name: string;
    email: string;
    image: string | null;
    /** Ver la nota de cabecera: `text` + CSV del plugin admin ⇒ `string`. */
    role: string;
    emailVerified: boolean;
    isActive: boolean;
    banned: boolean;
    /** ISO 8601. */
    createdAt: string;
    /** ISO 8601. */
    updatedAt: string;

    accounts: ProfileAccountSummary[];
    sessions: ProfileSessionSummary;
}
