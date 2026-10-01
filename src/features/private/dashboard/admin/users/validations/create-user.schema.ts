import { z } from "zod";

/**
 * ALTA DE UNA CUENTA DESDE EL PANEL — cuerpo de `createUserAction`.
 *
 * ⚠️ `.strict()` es funcionalmente crítico, no cosmético. Es lo que convierte un
 * envío que incluya `isActive`, `banned` o `tenantId` en un ERROR de validación,
 * en vez de en un descarte silencioso. Aquí importa más que en el perfil o que en
 * los toggles, porque el cuerpo de un alta es el más privilegiado de todos: el
 * `set` que acaba en la base de datos escribe el rol, y un rol colado en el
 * envío sería material privilegiado que la acción tiene que rechazar de forma
 * visible.
 *
 * ⚠️ `role` es `z.enum` sobre los TRES valores de `userRoleEnum`, no `z.string()`.
 * La columna es un `pgEnum` (`admin` | `user` | `guest`), así que un string
 * libre no solo sería una cuenta con un rol raro: sería un `500` de Postgres al
 * escribir. El enum de Zod devuelve además el tipo `UserRole`, que es
 * precisamente lo que la action necesita para la columna.
 *
 * ⚠️ Las reglas de contraseña están COPIADAS de
 * `features/public/auth/validations/register.schema.ts`, no importadas de ahí.
 * El motivo es el mismo que ya documenta
 * `features/private/profile/validations/update-profile.schema.ts` (su decisión
 * D7): los esquemas de `public/auth` viven en la feature pública, y que una
 * feature privada importe hacia dentro de esa frontera invierte la dirección de
 * dependencia del resto del proyecto.
 *
 * El coste de esa decisión —que una política cambiada haya que aplicarse en dos
 * sitios— es real y está anotado en el design (riesgo "The password policy is
 * duplicated as text, not shared"). Lo que SÍ es obligatorio es que las reglas
 * sean IDÉNTICAS a las del registro público: si el panel acepta una contraseña
 * que el registro rechaza (o al revés), la política deja de ser una política.
 * Extraer una constante compartida entre features es un refactor que este
 * cambio no debe absorber.
 */
export const CreateUserSchema = z
    .object({
        name: z
            .string({ message: "El nombre es requerido" })
            .trim()
            .min(2, { message: "El nombre debe tener al menos 2 caracteres" })
            .max(50, { message: "El nombre no puede exceder los 50 caracteres" })
            .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, {
                message: "El nombre solo puede contener letras y espacios",
            }),

        // `.toLowerCase()` ANTES de que el valor salga del esquema, y por eso el
        // mismo esquema sirve para la comprobación de duplicados y para la
        // escritura: `Ana@X.com` y `ana@x.com` tienen que ser la misma dirección
        // en las dos consultas, o el chequeo previo se dejaría pasar el duplicado
        // que la base de datos después rechazaría.
        email: z
            .string({ message: "El email es requerido" })
            .trim()
            .email({ message: "Formato de email inválido" })
            .toLowerCase()
            .max(255, { message: "El email no puede exceder los 255 caracteres" }),

        // ⚠️ Sin `.trim()`, y sin confirmación. Recortar en silencio cambia el
        // secreto elegido y reduce el espacio de claves efectivo (motivo
        // documentado en `register.schema.ts` y en `change-password.schema.ts`).
        // La confirmación se omite a propósito: quien rellena este formulario es
        // un super admin eligiendo la contraseña inicial de OTRA cuenta, y el
        // campo de confirmación solo añadiría una segunda barrera de tipeo sobre
        // un valor que el operador ve en pantalla mientras lo escribe.
        password: z
            .string({ message: "La contraseña es requerida" })
            .min(8, { message: "La contraseña debe tener al menos 8 caracteres" })
            .max(72, {
                message: "La contraseña no puede exceder los 72 caracteres",
            })
            .regex(/[A-Z]/, {
                message: "La contraseña debe contener al menos una mayúscula",
            })
            .regex(/[a-z]/, {
                message: "La contraseña debe contener al menos una minúscula",
            })
            .regex(/[0-9]/, {
                message: "La contraseña debe contener al menos un número",
            })
            .regex(/[^A-Za-z0-9]/, {
                message:
                    "La contraseña debe contener al menos un carácter especial",
            }),

        // ⚠️ El avatar es OPCIONAL y `null` es un valor válido, no una ausencia:
        // una cuenta recién creada puede no tener imagen. Se valida la FORMA
        // (que sea una URL) aquí; que la URL pertenezca al host de imágenes del
        // proyecto lo comprueba la acción con `isOwnCloudinaryUrl`, porque el
        // esquema valida forma y la acción valida procedencia (misma división que
        // en `UpdateProfileSchema`).
        image: z
            .string({ message: "La imagen debe ser una dirección válida" })
            .url({ message: "La imagen debe ser una dirección válida" })
            .nullable()
            .optional(),

        role: z.enum(["admin", "user", "guest"], {
            message: "Debes indicar un rol válido",
        }),
    })
    .strict();

export type CreateUserData = z.infer<typeof CreateUserSchema>;
