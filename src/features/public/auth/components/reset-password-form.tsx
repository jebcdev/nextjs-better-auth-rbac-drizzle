"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    ResetPasswordSchema,
    type ResetPasswordData,
} from "@/features/public/auth/validations";
import { resetPasswordAction } from "@/features/public/auth/actions/";
import { Input } from "@/features/shared/components/ui/input";
import { Label } from "@/features/shared/components/ui/label";
import { Button } from "@/features/shared/components/ui/button";
import { SingleFormError } from "@/features/shared/components/ui/form-error";

/**
 * Formulario para elegir la contraseña nueva con un token de recuperación.
 *
 * `token` viene de la URL. No se persiste en ningún sitio: viaja en cada
 * envío de la server action y better-auth lo consume (una sola vez). El campo
 * no es editable porque el enlace es la prueba de que quien llega tiene acceso
 * al buzón.
 */
export const ResetPasswordForm = ({ token }: { token: string }) => {
    const router = useRouter();
    const [serverError, setServerError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ResetPasswordData>({
        resolver: zodResolver(ResetPasswordSchema as never),
        mode: "onBlur",
    });

    const onSubmit = async (data: ResetPasswordData) => {
        setServerError(null);

        const result = await resetPasswordAction({ ...data, token });

        if (!result.success) {
            setServerError(result.message);
            return;
        }

        toast.success(result.message, {
            description:
                "Se cerraron todas las sesiones abiertas. Inicia sesión con la nueva contraseña.",
        });
        router.push("/iniciar-sesion");
        router.refresh();
    };

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="grid gap-4"
        >
            <div className="grid gap-2">
                <Label htmlFor="newPassword">Nueva contraseña</Label>
                <Input
                    id="newPassword"
                    type="password"
                    placeholder="Tu nueva contraseña"
                    autoComplete="new-password"
                    {...register("newPassword")}
                />
                <SingleFormError message={errors.newPassword?.message} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="confirmNewPassword">
                    Confirma tu nueva contraseña
                </Label>
                <Input
                    id="confirmNewPassword"
                    type="password"
                    placeholder="Repite tu nueva contraseña"
                    autoComplete="new-password"
                    {...register("confirmNewPassword")}
                />
                <SingleFormError
                    message={errors.confirmNewPassword?.message}
                />
            </div>

            {serverError && (
                <span className="text-sm text-red-500 text-center">
                    {serverError}
                </span>
            )}

            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Actualizando..." : "Actualizar contraseña"}
            </Button>

            <p className="text-sm text-center text-muted-foreground">
                <Link
                    href="/iniciar-sesion"
                    className="underline hover:text-primary"
                >
                    Volver al inicio de sesión
                </Link>
            </p>
        </form>
    );
};
