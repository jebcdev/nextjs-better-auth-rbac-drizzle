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
 * - `role` es `UserRole`, no `string`. `users.role` es un `pgEnum`
 *   (`userRoleEnum`), así que el dominio de la columna es exactamente el
 *   conjunto de tres valores que el enum declara: una cuenta no puede llevar
 *   varios roles ni un valor fuera de él. Tiparlo como `UserRole` dice la
 *   verdad y deja de obligar a la vista a deshacerla en runtime —con
 *   `USER_ROLE_LABELS` siendo `Record<UserRole, string>`, resolver la etiqueta
 *   ya no necesita ni guarda ni respaldo al valor crudo (decisión D5).
 */

import type { UserRole } from "@/lib/db/schema";

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
    /** Un solo rol, tal y como lo declara el enum de la columna. */
    role: UserRole;
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
