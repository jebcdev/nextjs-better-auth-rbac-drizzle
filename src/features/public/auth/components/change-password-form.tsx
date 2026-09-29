"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    ChangePasswordSchema,
    type ChangePasswordData,
} from "@/features/public/auth/validations";
import { changePasswordAction } from "@/features/public/auth/actions/";
import { Input } from "@/features/shared/components/ui/input";
import { Label } from "@/features/shared/components/ui/label";
import { Button } from "@/features/shared/components/ui/button";
import { SingleFormError } from "@/features/shared/components/ui/form-error";

/**
 * Formulario de cambio de contraseña para un usuario autenticado.
 *
 * Exige la contraseña actual. Tras el cambio, better-auth cierra el resto de
 * sesiones de la cuenta y emite una nueva para esta: el usuario sigue dentro,
 * pero cualquier otro dispositivo queda fuera.
 */
export const ChangePasswordForm = () => {
    const router = useRouter();
    const [serverError, setServerError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<ChangePasswordData>({
        resolver: zodResolver(ChangePasswordSchema as never),
        mode: "onBlur",
    });

    const onSubmit = async (data: ChangePasswordData) => {
        setServerError(null);

        const result = await changePasswordAction(data);

        if (!result.success) {
            setServerError(result.message);
            return;
        }

        reset();
        toast.success(result.message, {
            description:
                "Se cerraron las sesiones abiertas en otros dispositivos.",
        });
        router.refresh();
    };

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="grid gap-4"
        >
            <div className="grid gap-2">
                <Label htmlFor="currentPassword">
                    Contraseña actual
                </Label>
                <Input
                    id="currentPassword"
                    type="password"
                    placeholder="Tu contraseña actual"
                    autoComplete="current-password"
                    {...register("currentPassword")}
                />
                <SingleFormError message={errors.currentPassword?.message} />
            </div>

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
                {isSubmitting ? "Actualizando..." : "Cambiar contraseña"}
            </Button>
        </form>
    );
};
