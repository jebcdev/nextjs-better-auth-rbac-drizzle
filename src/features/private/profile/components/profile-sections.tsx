"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
    updateProfileAction,
    changeEmailAction,
} from "@/features/private/profile/actions";
import {
    UpdateProfileSchema,
    ChangeEmailSchema,
    type UpdateProfileData,
    type ChangeEmailData,
} from "@/features/private/profile/validations";
import { ChangePasswordForm } from "@/features/public/auth/components";
import {
    uploadToCloudinary,
    UploadError,
} from "@/lib/utils/upload-cloudinary";
import { Button } from "@/features/shared/components/ui/button";
import { Input } from "@/features/shared/components/ui/input";
import { Label } from "@/features/shared/components/ui/label";
import { SingleFormError } from "@/features/shared/components/ui/form-error";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/features/shared/components/ui/card";

/**
 * Editores de perfil: **un `<form>` y un `useForm` por detalle** (decisión D12).
 *
 * ⚠️ Por qué no un solo formulario para los tres datos. `useForm` sostiene UN
 * objeto `errors`, UNA bandera `isSubmitting` y UN conjunto de campos sucios.
 * Compartirlo entre tres campos es exactamente lo que produce el fallo que el
 * spec prohíbe: una subida de avatar fallida dejando el `isSubmitting` del
 * nombre en `true`, o un error de validación del nombre apareciendo junto al
 * avatar. Con una instancia por campo, los editores son independientes por
 * construcción, y no por cortesía de la lógica del componente.
 *
 * El patrón (`react-hook-form` + `zodResolver`, `mode: "onBlur"`,
 * `SingleFormError`, `disabled={isSubmitting}`, `toast` y `router.refresh()`) es
 * el de `features/public/auth/components/login-form.tsx`.
 *
 * ⚠️ `router.refresh()` tras cada escritura (decisión D10). Sin él, el `defaultValues`
 * del formulario solo se leen al montar, así que la tarjeta de identidad
 * seguiría mostrando el valor viejo hasta una recarga dura. El efecto
 * secundario aceptado es que el esqueleto parpadee un instante tras cada
 * guardado; se prefiere eso a que el payload RSC y la base de datos discrepen.
 */

type SectionProps = {
    title: string;
    description: string;
    children: React.ReactNode;
};

const Section = ({ title, description, children }: SectionProps) => (
    <Card>
        <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
    </Card>
);

/** Cierre común de un guardado correcto: aviso y refresco del servidor. */
const announceSuccess = (
    router: ReturnType<typeof useRouter>,
    message: string,
    description?: string,
) => {
    toast.success(message, {
        description,
        action: {
            label: "Cerrar",
            onClick: () => toast.dismiss(),
        },
    });
    router.refresh();
};

const announceError = (message: string) => {
    toast.error("No se pudo guardar el cambio", {
        description: message,
        action: {
            label: "Cerrar",
            onClick: () => toast.dismiss(),
        },
    });
};

// ══════════════════════════════════════════════════════════════════════════════
// NOMBRE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * ⚠️ El único esquema con el que se valida aquí es el de PARCHE, y por eso el
 * envío es `{ name }` y nada más. El superRefine del esquema rechaza un parche
 * sin ninguna clave reconocida, de modo que la propia action ni siquiera puede
 * registrar un "guardar" sobre un editor intacto. Aun así, el botón queda `disabled` mientras
 * el campo no esté sucio: no se ofrece como acción posible algo que no cambia
 * nada.
 */
export const NameSection = ({ name }: { name: string }) => {
    const router = useRouter();

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting, isDirty },
    } = useForm<UpdateProfileData>({
        resolver: zodResolver(UpdateProfileSchema as never),
        mode: "onBlur",
        defaultValues: { name },
    });

    const onSubmit = async (data: UpdateProfileData) => {
        const result = await updateProfileAction({ name: data.name });

        if (!result.success) {
            announceError(result.message);
            return;
        }

        // ⚠️ `reset` es lo que devuelve el formulario a "intacto". Sin él,
        // `defaultValues` conserva para siempre el nombre que tenía al montar,
        // así que `isDirty` sigue en `true` tras guardar y el botón queda
        // habilitado, invitando a un segundo guardado que no cambia nada — y la
        // acción lo aceptaría, porque la clave `name` sí está presente.
        //
        // La línea base nueva es el nombre ya recortado por el esquema (enviar
        // "  Ana  " guarda "Ana"). `data.name` es opcional en el tipo del parche
        // —el esquema es un patch, no un objeto completo—, así que el `??` no es
        // decorativo: `onSubmit` solo se alcanza con la clave `name` presente.
        reset({ name: data.name?.trim() ?? name });
        announceSuccess(router, result.message);
    };

    return (
        <Section
            title="Nombre"
            description="Es el nombre que ven los demás usuarios de tu cuenta."
        >
            <form
                onSubmit={handleSubmit(onSubmit)}
                className="grid gap-4"
            >
                <div className="grid gap-2">
                    <Label htmlFor="profile-name">Nombre</Label>
                    <Input
                        id="profile-name"
                        placeholder="Tu nombre"
                        autoComplete="name"
                        {...register("name")}
                    />
                    <SingleFormError message={errors.name?.message} />
                </div>

                <Button
                    type="submit"
                    disabled={isSubmitting || !isDirty}
                    className="w-full sm:w-auto sm:self-start"
                >
                    {isSubmitting ? "Guardando..." : "Guardar nombre"}
                </Button>
            </form>
        </Section>
    );
};

// ══════════════════════════════════════════════════════════════════════════════
// AVATAR
// ══════════════════════════════════════════════════════════════════════════════

/**
 * `UploadError.code` → mensaje en español.
 *
 * Se decide por `code`, nunca por `message`: `code` es el contrato estable del
 * helper y `message` es texto para personas, que puede cambiar sin aviso.
 */
const UPLOAD_ERROR_MESSAGES: Record<string, string> = {
    INVALID_FILE:
        "Esa imagen no es válida. Usa un JPG, PNG, WEBP o GIF de hasta 10 MB.",
    TIMEOUT: "La subida tardó demasiado. Inténtalo de nuevo.",
    NETWORK: "No se pudo conectar con el servicio de imágenes.",
    SERVER: "El servicio de imágenes rechazó la subida. Inténtalo más tarde.",
};

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

/**
 * Editor de avatar: **subida en el navegador** (decisión D13).
 *
 * El archivo nunca pasa por la server action. El navegador lo sube
 * directamente a Cloudinary con el preset unsigned y entrega a la action una
 * URL corta, no un fichero de varios megabytes. Así el límite de 1 MB de
 * `serverActions.bodySizeLimit` —que el proyecto no toca— no llega a
 * aplicarse, y el `api_secret` jamás se publica.
 *
 * El progreso y el estado de subida viven AQUÍ, no en el formulario del
 * nombre: una subida lenta no debe poner el formulario del nombre en estado
 * "enviando" (decisión D12).
 */
export const AvatarSection = ({ hasImage }: { hasImage: boolean }) => {
    const router = useRouter();

    const [progress, setProgress] = useState<number | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [pendingUrl, setPendingUrl] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const isUploading = progress !== null;

    /** Sube el archivo elegido y guarda la URL resultante como candidata. */
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
        setPendingUrl(null);
        setProgress(0);

        try {
            const uploaded = await uploadToCloudinary(file, {
                onProgress: (percent) => setProgress(percent),
            });
            setPendingUrl(uploaded.secure_url);
            toast.success("Imagen subida", {
                description:
                    "Pulsa «Guardar avatar» para usarla como tu imagen de perfil.",
            });
        } catch (error) {
            // ⚠️ La URL candidata se descarta: una subida fallida NO debe
            // cambiar el avatar almacenado (escenario del spec). El valor
            // anterior en la base de datos sigue intacto.
            setPendingUrl(null);
            if (error instanceof UploadError) {
                setUploadError(
                    UPLOAD_ERROR_MESSAGES[error.code] ??
                        "No se pudo subir la imagen.",
                );
            } else {
                setUploadError("No se pudo subir la imagen.");
            }
        } finally {
            setProgress(null);
        }
    };

    /** Persiste la URL ya subida. El borrado del activo anterior lo hace la action. */
    const onSave = async () => {
        if (!pendingUrl) return;

        setSaving(true);
        const result = await updateProfileAction({ image: pendingUrl });
        setSaving(false);

        if (!result.success) {
            announceError(result.message);
            return;
        }

        setPendingUrl(null);
        announceSuccess(router, result.message);
    };

    /** Quita el avatar. `{ image: null }` es un borrado explícito, no una omisión. */
    const onRemove = async () => {
        setSaving(true);
        const result = await updateProfileAction({ image: null });
        setSaving(false);

        if (!result.success) {
            announceError(result.message);
            return;
        }

        setPendingUrl(null);
        announceSuccess(router, result.message);
    };

    const busy = isUploading || saving;

    return (
        <Section
            title="Imagen de perfil"
            description="Se sube directamente al servicio de imágenes y sustituye a la anterior."
        >
            <div className="grid gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="profile-avatar">
                        Elige una imagen
                    </Label>
                    <Input
                        id="profile-avatar"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        disabled={busy}
                        onChange={onFileChange}
                    />
                    <span className="text-xs text-muted-foreground">
                        JPG, PNG, WEBP o GIF. Hasta 10 MB.
                    </span>
                </div>

                {isUploading && (
                    <ProgressBar percent={progress} />
                )}

                {uploadError && (
                    <span className="text-sm text-red-500">
                        {uploadError}
                    </span>
                )}

                <div className="flex flex-wrap gap-2">
                    <Button
                        type="button"
                        onClick={onSave}
                        disabled={!pendingUrl || busy}
                    >
                        {saving ? "Guardando..." : "Guardar avatar"}
                    </Button>

                    {hasImage && (
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={onRemove}
                            disabled={busy}
                        >
                            Quitar avatar
                        </Button>
                    )}
                </div>
            </div>
        </Section>
    );
};

// ══════════════════════════════════════════════════════════════════════════════
// CORREO ELECTRÓNICO
// ══════════════════════════════════════════════════════════════════════════════

/**
 * El cambio de correo es un flujo aparte y asíncrono (decisión D16).
 *
 * Guardar aquí NO cambia la dirección: better-auth envía la
 * verificación a la nueva, y la almacenada no se toca hasta que quien la
 * controla confirma desde ella. Por eso el mensaje de éxito no promete un
 * cambio ya aplicado.
 *
 * El `router.refresh()` del cierre común SÍ se ejecuta, pero aquí es un
 * refresco sin cambios: hasta la confirmación no hay nada nuevo que el servidor
 * pueda renderizar, así que repinta lo mismo. Se conserva por uniformidad con
 * los otros dos editores, que sí escriben, y porque el aviso de D10 —un
 * parpadeo del esqueleto— ya está aceptado como precio de la corrección.
 */
export const EmailSection = ({ email }: { email: string }) => {
    const router = useRouter();

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<ChangeEmailData>({
        resolver: zodResolver(ChangeEmailSchema as never),
        mode: "onBlur",
        defaultValues: { newEmail: "" },
    });

    const onSubmit = async (data: ChangeEmailData) => {
        const result = await changeEmailAction(data);

        if (!result.success) {
            announceError(result.message);
            return;
        }

        reset();
        announceSuccess(router, result.message, `Ahora usas ${email}.`);
    };

    return (
        <Section
            title="Correo electrónico"
            description="El cambio se aplica solo después de confirmar desde la nueva dirección."
        >
            <form
                onSubmit={handleSubmit(onSubmit)}
                className="grid gap-4"
            >
                <div className="grid gap-2">
                    <Label htmlFor="profile-new-email">
                        Nueva dirección
                    </Label>
                    <Input
                        id="profile-new-email"
                        type="email"
                        placeholder="correo@ejemplo.com"
                        autoComplete="email"
                        {...register("newEmail")}
                    />
                    <SingleFormError message={errors.newEmail?.message} />
                </div>

                <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto sm:self-start"
                >
                    {isSubmitting
                        ? "Enviando..."
                        : "Solicitar cambio de correo"}
                </Button>
            </form>
        </Section>
    );
};

// ══════════════════════════════════════════════════════════════════════════════
// CONTRASEÑA
// ══════════════════════════════════════════════════════════════════════════════

/**
 * El formulario de contraseña ya existía, ya era correcto y no lo renderizaba
 * ninguna ruta (decisión D15). Este cambio le da su sitio y NO lo reescribe:
 * su esquema, su action y su `revokeOtherSessions: true` ya cumplen lo que el
 * spec pide de la política de contraseñas y del cierre de sesiones.
 */
export const PasswordSection = () => (
    <Section
        title="Contraseña"
        description="Al cambiarla se cerrarán las sesiones abiertas en otros dispositivos; esta seguirá activa."
    >
        <ChangePasswordForm />
    </Section>
);
