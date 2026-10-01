"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/features/shared/components/ui/button";
import { Input } from "@/features/shared/components/ui/input";
import { Label } from "@/features/shared/components/ui/label";
import { SingleFormError } from "@/features/shared/components/ui/form-error";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/features/shared/components/ui/avatar";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/features/shared/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/features/shared/components/ui/select";
import {
    uploadToCloudinary,
    UploadError,
} from "@/lib/utils/upload-cloudinary";
import type { UserRole } from "@/lib/db/schema";

import { useCreateUserMutation, useUpdateUserMutation } from "../../queries";
import { CreateUserSchema, UpdateUserSchema } from "../../validations";
import { initialsOf } from "../grid";
import { USER_ROLE_LABELS, USER_ROLES } from "@/lib/utils/enums-labels";

const ADMIN_USERS_FORM_ROLE_ITEMS = USER_ROLES.map((role) => ({
    value: role,
    label: USER_ROLE_LABELS[role],
}));

const ADMIN_USERS_FORM_DEFAULT_ROLE: UserRole = "user";
const ADMIN_USERS_LIST_PATH = "/panel/admin/usuarios";

 interface AdminUserEditItem {
    id: string;
    name: string;
    email: string;
    image: string | null;
    /** Un solo rol, tal y como lo declara el enum de la columna. */
    role: UserRole;
    isActive: boolean;
    banned: boolean;
    /** ISO 8601. */
    createdAt: string;
    /** ISO 8601. */
    updatedAt: string;
}
/**
 * UN formulario para las dos operaciones del directorio (decisión D5).
 *
 * ⚠️ `mode` es una unión literal explícita, y NO se deduce de «¿viene `user`?».
 * Un `mode` deducido hace que la ausencia de cuenta —un estado que un llamador
 * puede equivocarse al tener— decida por el formulario si aparece el campo de
 * contraseña. Y esa es exactamente la diferencia que no puede ser cosmética: el
 * campo de contraseña en edición significaría que la action acepta una contraseña
 * nueva. La unión hace que ese estado sea un error de tipos, no un formulario
 * que se abre en el modo equivocado.
 *
 * ⚠️ Un solo componente y no un contenedor compartido con dos envoltorios porque
 * los dos modos se diferencian en exactamente una cosa —el campo de contraseña—
 * más el rótulo del botón y la mutation que se dispara. Un esqueleto común con
 * dos variantes tendría dos fuentes de verdad para el mismo formulario.
 *
 * ⚠️ El avatar viaja como un CAMPO del formulario (`image`), no como estado
 * suelto del componente. Así el payload de la escritura y lo que se previsualiza
 * son la misma variable por construcción: no cabe el estado en que la tarjeta
 * muestre una imagen y el envío lleve otra. Y «quitar el avatar» es
 * `setValue("image", null)`, un `null` explícito, no la ausencia de la clave:
 * `null` es lo que `UpdateUserSchema` valida como «sin avatar».
 *
 * ⚠️ El envío NUNCA reenvía lo que el formulario no nombra. En modo edición el
 * cuerpo se construye a mano con cuatro campos —nombre, email, rol y avatar— y
 * nada más, de modo que ni la contraseña, ni `isActive`, ni `banned` pueden
 * viajar aunque un `defaultValues` los trajera.
 */

/** Los valores que sostiene `useForm`, no el cuerpo de ninguna action. */
interface AdminUsersFormValues {
    name: string;
    email: string;
    role: UserRole;
    image: string | null;
    /**
     * Solo existe en modo edición, y no se renderiza ni se edita: la siembra la
     * página desde la cuenta que nombró la URL.
     *
     * ⚠️ Tiene que estar en los valores del formulario aunque no haya ningún
     * `<input>` detrás. El `resolver` de este componente valida los valores del
     * formulario —no el cuerpo que se envía—, y `UpdateUserSchema` exige
     * `userId`. Sin esta clave, el resolver rechazaría TODOS los envíos en modo
     * edición con «El identificador de usuario es requerido» y el formulario
     * nunca llegaría a la action. Y no puede sembrarse siempre, porque
     * `CreateUserSchema` es `.strict()` y rechazaría un `userId` de más: la
     * clave se siembra solo en el modo que la necesita, igual que `password`.
     *
     * Es también la razón de que el envío use `values.userId` y no una variable
     * suelta: lo que se valida, lo que se muestra y lo que se envía son la
     * misma clave.
     */
    userId?: string;
    /**
     * Solo existe en modo alta.
     *
     * Opcional, y no `string`: en modo edición la clave no aparece NI en los
     * valores por defecto NI registrada en el DOM, porque `UpdateUserSchema` es
     * `.strict()` y rechazaría una contraseña de más como clave desconocida.
     */
    password?: string;
}

interface Props {
    mode: "create" | "edit";
    /**
     * La cuenta a editar, ya proyectada por `getUserByIdAction`.
     *
     * Opcional porque en modo alta no hay ninguna previa; irrelevante en ese modo.
     */
    user?: AdminUserEditItem | null;
}

/**
 * `UploadError.code` → mensaje en español.
 *
 * Copiado de `profile-sections.tsx`, y copiado a propósito en lugar de
 * importado: son dos superficies de subida independientes (la del perfil y la del
 * directorio) y el texto que ve una persona no es parte del contrato entre
 * features. Se decide por `code` y nunca por `message`, porque `code` es el
 * contrato estable del helper.
 */
const UPLOAD_ERROR_MESSAGES: Record<string, string> = {
    INVALID_FILE:
        "Esa imagen no es válida. Usa un JPG, PNG, WEBP o GIF de hasta 10 MB.",
    TIMEOUT: "La subida tardó demasiado. Inténtalo de nuevo.",
    NETWORK: "No se pudo conectar con el servicio de imágenes.",
    SERVER: "El servicio de imágenes rechazó la subida. Inténtalo más tarde.",
};

/** Texto de ayuda de la política de contraseñas, junto al campo. */
const PASSWORD_POLICY_HINT =
    "Entre 8 y 72 caracteres, con al menos una mayúscula, una minúscula, un número y un carácter especial.";

/** Porcentaje de la barra: 0 es "sin progreso visible", 100 "completa". */
const ProgressBar = ({ percent }: { percent: number }) => (
    <div
        role="progressbar"
        aria-label="Progreso de la subida"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-2 w-full overflow-hidden rounded-4xl bg-muted"
    >
        <div
            className="h-full rounded-4xl bg-primary transition-[width] duration-200"
            style={{ width: `${percent}%` }}
        />
    </div>
);

export const DashboardAdminUsersForm = ({ mode, user }: Props) => {
    const router = useRouter();

    const [progress, setProgress] = useState<number | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const isUploading = progress !== null;

    const createMutation = useCreateUserMutation();
    const updateMutation = useUpdateUserMutation();

    // ⚠️ Sin cuenta en modo edición el id queda vacío, y `UpdateUserSchema` lo
    // rechaza con «El identificador de usuario es requerido»: un fallo de
    // validación visible en el formulario, en vez de una excepción al escribir.
    // La página es la que resuelve antes el caso de una cuenta inexistente y no
    // monta este formulario, así que no hace falta un segundo aviso por la misma
    // causa.
    const targetId = user?.id ?? "";

    // ⚠️ El esquema se elige por `mode`, no se usa un único esquema con campos
    // opcionales. Un esquema único tendría que aceptar la contraseña en edición
    // o el `userId` en alta, y cada atajo sería una operación que el formulario
    // no ofrece pero que el esquema ya valida.
    const resolverSchema =
        mode === "create" ? CreateUserSchema : UpdateUserSchema;

    const {
        register,
        handleSubmit,
        setValue,
        control,
        formState: { errors, isSubmitting },
    } = useForm<AdminUsersFormValues>({
        // El `as never` es el mismo que ya usa `profile-sections.tsx`: el
        // `resolver` se selecciona en runtime entre dos esquemas y TypeScript no
        // puede estrechar esa unión contra un `Resolver<...>` único. El typeado
        // real de los valores no se pierde: es el de `AdminUsersFormValues`, y la
        // action vuelve a validar el cuerpo con el esquema que le corresponde.
        resolver: zodResolver(resolverSchema as never),
        mode: "onBlur",
        defaultValues:
            mode === "create"
                ? {
                      name: "",
                      email: "",
                      password: "",
                      role: ADMIN_USERS_FORM_DEFAULT_ROLE,
                      image: null,
                  }
                : {
                      // ⚠️ `userId` se siembra AQUÍ y no en el envío: el
                      // `resolver` valida los valores del formulario, y sin esta
                      // clave `UpdateUserSchema` rechazaría todos los envíos.
                      userId: targetId,
                      name: user?.name ?? "",
                      email: user?.email ?? "",
                      role: user?.role ?? ADMIN_USERS_FORM_DEFAULT_ROLE,
                      image: user?.image ?? null,
                  },
    });

    // ⚠️ Se lee con `useWatch` y NO con el `watch()` que devuelve `useForm`.
    // Hay dos motivos y los dos importan. Uno es la regla
    // `react-hooks/incompatible-library`: el `watch()` de `useForm` no se puede
    // memoizar sin arriesgar UI obsoleta, así que el compilador de React deja
    // este componente sin memoizar y avisa. El otro es que `image` no está ligada
    // a ningún `<input>` —el selector de archivo no es un campo de formulario— y
    // a pesar de eso `useForm` la conserva en su estado; `useWatch` es la vía
    // pensada para observar un campo suelto, y así lo que se previsualiza y lo
    // que se envía son la misma variable por construcción.
    const avatarPreview = useWatch({ control, name: "image" }) ?? null;
    const avatarName = useWatch({ control, name: "name" }) || user?.name || "";

    /** Sube el archivo elegido y lo deja como avatar PENDIENTE. */
    const onFileChange = async (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = event.target.files?.[0];
        // Se limpia el valor para que volver a elegir el MISMO archivo dispare
        // `change` otra vez: sin esto, quitar y volver a marcar la misma
        // imagen no haría nada y parecería un fallo del servicio.
        event.target.value = "";
        if (!file) return;

        setUploadError(null);
        setProgress(0);

        try {
            const uploaded = await uploadToCloudinary(file, {
                onProgress: (percent) => setProgress(percent),
            });

            // La URL queda como candidata DENTRO del formulario. No se escribe
            // nada todavía: el avatar se almacena cuando el formulario se envía
            // y la operación prospera.
            setValue("image", uploaded.secure_url, { shouldDirty: true });

            toast.success("Imagen subida", {
                description:
                    "Se usará como avatar cuando guardes los cambios.",
            });
        } catch (error) {
            // ⚠️ La candidata se descarta y el avatar vuelve al que la cuenta
            // tenía almacenado. Como el archivo nunca pasa por la action, un
            // fallo aquí no ha escrito nada, así que lo único que había que
            // deshacer es lo que este formulario acababa de poner de
            // candidato. Y lo hace SIN bloquear el formulario: el resto de los
            // campos sigue siendo enviable (decisión D11).
            setValue("image", user?.image ?? null);
            setUploadError(
                error instanceof UploadError
                    ? (UPLOAD_ERROR_MESSAGES[error.code] ??
                      "No se pudo subir la imagen.")
                    : "No se pudo subir la imagen.",
            );
        } finally {
            setProgress(null);
        }
    };

    /** Quita el avatar: `{ image: null }` es un borrado explícito (decisión D11). */
    const onRemoveAvatar = () => {
        setValue("image", null, { shouldDirty: true });
    };

    const onSubmit = async (values: AdminUsersFormValues) => {
        try {
            // ⚠️ Cada cuerpo se construye a mano, campo por campo. Es lo que
            // impide que una clave que el formulario no ofrece —la contraseña en
            // edición, `isActive`, `banned`— llegue a la action, y de paso
            // hace que la forma del envío sea legible en un solo sitio.
            const result =
                mode === "create"
                    ? await createMutation.mutateAsync({
                          name: values.name,
                          email: values.email,
                          password: values.password ?? "",
                          role: values.role,
                          image: values.image,
                      })
                    : await updateMutation.mutateAsync({
                          // Del valor validado, no de una variable suelta: el
                          // esquema acaba de comprobar que no está vacío.
                          userId: values.userId ?? targetId,
                          name: values.name,
                          email: values.email,
                          role: values.role,
                          image: values.image,
                      });

            toast.success(result.message, {
                action: {
                    label: "Cerrar",
                    onClick: () => toast.dismiss(),
                },
            });

            // ⚠️ `push`, no `refresh`: la escritura ya invalidado la raíz de las
            // claves de caché, así que la navegación monta el directorio con la
            // consulta nueva. Un `refresh` antes solo añadiría un refetch de la
            // ruta que se va a abandonar (decisión D13).
            router.push(ADMIN_USERS_LIST_PATH);
        } catch (error) {
            // ⚠️ Sin `reset` y sin navegar: el requisito es que un fallo conserve
            // lo que el super admin escribió, y un `reset` devolvería el
            // formulario al estado previo —en alta, a vacío— obligando a
            // reescribirlo entero por un fallo de red.
            toast.error(
                error instanceof Error
                    ? error.message
                    : "No se pudo guardar la cuenta",
                {
                    action: {
                        label: "Cerrar",
                        onClick: () => toast.dismiss(),
                    },
                },
            );
        }
    };

    const isEdit = mode === "edit";
    const submitLabel = isSubmitting
        ? "Guardando..."
        : isEdit
          ? "Guardar cambios"
          : "Crear usuario";

    return (
        // ⚠️ `w-full` en el `Card`: el requisito de layout es que el formulario
        // ocupe TODO el ancho disponible en cualquier tamaño de pantalla, y sin
        // esto el `Card` se encogería al contenido. El `p-6 md:p-8` del
        // `CardContent` sustituye el `px-(--card-spacing)` de la primitiva
        // (`cn` fusiona las utilidades y la última gana) y es explícito a
        // propósito: el aire entre el borde y el primer campo no puede depender
        // de una variable de espaciado de la primitiva.
        <Card className="w-full">
            <CardHeader>
                <CardTitle>
                    {isEdit ? "Editar usuario" : "Nuevo usuario"}
                </CardTitle>
                <CardDescription>
                    {isEdit
                        ? "Los cambios se aplican a la cuenta y se reflejan en el directorio."
                        : "La cuenta queda creada con el rol que elijas y usable para iniciar sesión."}
                </CardDescription>
            </CardHeader>

            <CardContent className="p-6 md:p-8">
                {/* `grid` con `gap` en vez de campos con margen propio: el
                    espacio entre campos queda en un solo sitio y no hay que
                    compensarlo campo a campo. */}
                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="grid w-full gap-6 md:gap-8"
                >
                    {/* ── NOMBRE ── */}
                    <div className="grid gap-2">
                        <Label htmlFor="admin-user-name">Nombre</Label>
                        <Input
                            id="admin-user-name"
                            placeholder="Nombre de la cuenta"
                            autoComplete="off"
                            {...register("name")}
                        />
                        <SingleFormError message={errors.name?.message} />
                    </div>

                    {/* ── EMAIL ── */}
                    <div className="grid gap-2">
                        <Label htmlFor="admin-user-email">
                            Correo electrónico
                        </Label>
                        <Input
                            id="admin-user-email"
                            type="email"
                            placeholder="correo@ejemplo.com"
                            autoComplete="off"
                            {...register("email")}
                        />
                        <SingleFormError message={errors.email?.message} />
                    </div>

                    {/* ── CONTRASEÑA, solo en alta ── */}
                    {mode === "create" && (
                        <div className="grid gap-2">
                            <Label htmlFor="admin-user-password">
                                Contraseña
                            </Label>
                            <Input
                                id="admin-user-password"
                                type="password"
                                autoComplete="new-password"
                                {...register("password")}
                            />
                            <span className="text-xs text-muted-foreground">
                                {PASSWORD_POLICY_HINT}
                            </span>
                            <SingleFormError
                                message={errors.password?.message}
                            />
                        </div>
                    )}

                    {/* ── ROL ──
                        ⚠️ Va con `Controller` y no con `register` porque el
                        `Select` de base-ui es una raíz CONTROLADA, no un
                        `<select>` nativo: no existe un atributo al que
                        engancharse. `field.value` es el valor observado del
                        campo, así que el disparador refleja siempre lo
                        seleccionado sin un segundo `watch("role")`.

                        ⚠️ `items` es OBLIGATORIO y la razón está documentada en la
                        barra de filtros: `SelectValue` saca la etiqueta del
                        `SelectItem` correspondiente, y los items viven en un
                        portal que solo se monta con el desplegable abierto. Sin
                        `items`, el disparador escribiría el valor crudo —`admin`
                        en lugar de *Administrador*— mientras está cerrado. */}
                    <div className="grid gap-2">
                        <Label htmlFor="admin-user-role">Rol</Label>
                        <Controller
                            control={control}
                            name="role"
                            render={({ field }) => (
                                <Select
                                    items={ADMIN_USERS_FORM_ROLE_ITEMS}
                                    value={field.value}
                                    onValueChange={(value) =>
                                        field.onChange(
                                            (value ??
                                                ADMIN_USERS_FORM_DEFAULT_ROLE) as UserRole,
                                        )
                                    }
                                    disabled={isSubmitting}
                                >
                                    <SelectTrigger
                                        id="admin-user-role"
                                        className="h-9 w-full rounded-4xl"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ADMIN_USERS_FORM_ROLE_ITEMS.map(
                                            (item) => (
                                                <SelectItem
                                                    key={item.value}
                                                    value={item.value}
                                                >
                                                    {item.label}
                                                </SelectItem>
                                            ),
                                        )}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        <SingleFormError message={errors.role?.message} />
                    </div>

                    {/* ── AVATAR ──
                        ⚠️ El `<input type="file">` NO es un campo del formulario:
                        su valor es una ruta local que el navegador no deja
                        leer y que no sirve para nada más que déclenche la subida.
                        Por eso vive fuera de `register` y su resultado entra en el
                        formulario por `setValue("image", …)` (decisión D11). */}
                    <div className="grid gap-3">
                        <Label>Imagen de la cuenta</Label>

                        <div className="flex flex-wrap items-center gap-4">
                            <Avatar size="lg">
                                {/* `src={null}` mantiene el `AvatarFallback` como
                                    contenido en vez de dejar la imagen rota. */}
                                {avatarPreview && (
                                    <AvatarImage
                                        src={avatarPreview}
                                        alt=""
                                    />
                                )}
                                <AvatarFallback>
                                    {initialsOf(avatarName)}
                                </AvatarFallback>
                            </Avatar>

                            <div className="grid flex-1 gap-2">
                                <Input
                                    id="admin-user-avatar"
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    // Se deshabilita durante la subida y durante el
                                    // envío para que no pueda empezar una segunda
                                    // subida que compita con la primera por el mismo
                                    // campo.
                                    //
                                    // ⚠️ El botón de guardar NO se bloquea por una
                                    // subida en curso, a propósito. El requisito es
                                    // que un fallo de subida NO impida enviar el
                                    // resto del formulario, y una subida a medias no
                                    // es un fallo: guardar en ese momento guardaría
                                    // el avatar ANTERIOR y descartaría en silencio
                                    // la imagen recién subida. Es una esquina
                                    // deliberadamente abierta, no un descuido.
                                    disabled={isUploading || isSubmitting}
                                    onChange={onFileChange}
                                />
                                <span className="text-xs text-muted-foreground">
                                    JPG, PNG, WEBP o GIF. Hasta 10 MB. Se sube
                                    directamente al servicio de imágenes.
                                </span>
                            </div>
                        </div>

                        {isUploading && <ProgressBar percent={progress} />}

                        {uploadError && (
                            <span className="text-sm text-red-500">
                                {uploadError}
                            </span>
                        )}

                        {/* El botón solo existe cuando hay algo que quitar: sin
                            avatar no hay nada que retirar, y un «Quitar avatar»
                            permanente sería ruido. */}
                        {avatarPreview && (
                            <div>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={onRemoveAvatar}
                                    disabled={isSubmitting}
                                >
                                    Quitar avatar
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* ⚠️ Solo un botón. No hay «Cancelar»: la acción «Volver» del
                        encabezado que ya montan las dos páginas hace lo mismo, y un
                        segundo botón que repite esa salida en otra esquina es ruido
                        que además obliga a decidir cuál de los dos desactiva el
                        formulario. */}
                    <div>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full sm:w-auto"
                        >
                            {submitLabel}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
};
