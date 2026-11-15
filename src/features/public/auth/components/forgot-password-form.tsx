"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { toast } from "sonner";
import {
    ForgotPasswordSchema,
    type ForgotPasswordData,
} from "@/features/public/auth/validations";
import { requestPasswordResetAction } from "@/features/public/auth/actions/";
import { Input } from "@/features/shared/components/ui/input";
import { Label } from "@/features/shared/components/ui/label";
import { Button } from "@/features/shared/components/ui/button";
import { SingleFormError } from "@/features/shared/components/ui/form-error";

/**
 * Formulario para pedir el enlace de recuperación.
 *
 * El mensaje de éxito es el mismo exista o no la cuenta: no se puede confirmar
 * aquí si una dirección está registrada, porque eso sería el oráculo de
 * enumeración que la decisión D5 elimina. El formulario no guarda ni envía el
 * email a ninguna parte: la acción lo consume y descarta.
 */
export const ForgotPasswordForm = () => {
    const [serverError, setServerError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ForgotPasswordData>({
        resolver: zodResolver(ForgotPasswordSchema as never),
        mode: "onBlur",
    });

    const onSubmit = async (data: ForgotPasswordData) => {
        setServerError(null);

        const result = await requestPasswordResetAction(data);

        if (!result.success) {
            setServerError(result.message);
            return;
        }

        setSubmitted(true);
        toast.success(result.message);
    };

    if (submitted) {
        return (
            <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                    Revisa tu bandeja de entrada (y la carpeta de spam). Si la
                    dirección está registrada, recibirás un enlace válido por una
                    hora.
                </p>
                <Button
                    variant="outline"
                    nativeButton={false}
                    render={<Link href="/iniciar-sesion" />}
                    className="w-full"
                >
                    Volver al inicio de sesión
                </Button>
            </div>
        );
    }

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="grid gap-4"
        >
            <div className="grid gap-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                    id="email"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    autoComplete="email"
                    {...register("email")}
                />
                <SingleFormError message={errors.email?.message} />
            </div>

            {serverError && (
                <span className="text-sm text-red-500 text-center">
                    {serverError}
                </span>
            )}

            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Enviando..." : "Enviar enlace"}
            </Button>

            <p className="text-sm text-center text-muted-foreground">
                ¿Recordaste tu contraseña?{" "}
                <Link
                    href="/iniciar-sesion"
                    className="underline hover:text-primary"
                >
                    Inicia sesión
                </Link>
            </p>
        </form>
    );
};
