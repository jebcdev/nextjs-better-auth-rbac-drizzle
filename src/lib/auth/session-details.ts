"use server";

import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import drizzleDB from "../db";

export async function getSessionDetails() {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id;

    // Una sola lectura de la fila de usuario cubre dos necesidades: los datos
    // que se devuelven y el re-chequeo de estado de la cuenta (decisión D2 de
    // openspec/changes/04-harden-authentication/).
    //
    // Sin `with: { sessions: true, accounts: true }`: este es el camino
    // caliente de resolución de sesión y esas relaciones no las consume nadie.
    // La verificación de cuenta solo necesita `isActive` y `banned`.
    const userRow = userId
        ? await drizzleDB.query.users.findFirst({ where: { id: userId } })
        : null;

    // La fila de `sessions` es la única señal de "sesión viva" y sobrevive a
    // una desactivación de la cuenta, así que el estado se revalida en cada
    // resolución: sin esto, `isActive = false` deja una sesión válida hasta que
    // expire. `cookieCache` está apagado (ver `auth.ts`), así que resolver la
    // sesión ya lee la base de datos y esta comprobación no añade coste.
    //
    // La condición replica exactamente la del login (`!isActive || banned`), y
    // cubre los dos interruptores: `banned` es de better-auth y su plugin solo
    // borra sesiones al *escribir* el campo, no al leer la sesión; `isActive`
    // es propio del proyecto y fuera del login no lo consultaba nadie.
    const isAccountUsable = !!userRow && !!userRow.isActive && !userRow.banned;

    if (!session || !userRow || !isAccountUsable) {
        // Sin fila de usuario, o con la cuenta desactivada o vetada, la sesión
        // se trata como ausente. No se emite ninguna sesión nueva: el
        // llamador recibe exactamente lo que recibiría un visitante anónimo.
        return {
            isAuthenticated: false,
            userRole: undefined,
            currentUser: null,
            currentSession: null,
            fullUserDetails: null,
        };
    }

    return {
        isAuthenticated: true,
        // ⚠️ El rol sale de `userRow`, NO de `session.user.role`. La fila de
        // `users` lo trae tipado como `UserRole` porque la columna es un
        // `pgEnum`, así que el valor fluye sin `as`. `session.user.role` llega
        // como `string` —better-auth declara `additionalFields.role.type:
        // "string"`— y usarlo obligaría a devolver un cast otra vez (decisión D7).
        // Es el mismo rol de la misma fila que esta función ya leía para decidir
        // si la cuenta es usable, así que nada observable cambia.
        userRole: userRow.role,
        currentUser: session.user,
        currentSession: session.session,
        fullUserDetails: userRow,
    };
}
