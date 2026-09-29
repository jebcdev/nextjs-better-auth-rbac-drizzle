"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
    LoginSchema,
    type LoginData,
} from "@/features/public/auth/validations";
import { loginAction } from "@/features/public/auth/actions/";
import { Input } from "@/features/shared/components/ui/input";
import { Label } from "@/features/shared/components/ui/label";
import { Button } from "@/features/shared/components/ui/button";
import { SingleFormError } from "@/features/shared/components/ui/form-error";
import { toast } from "sonner";

export const LoginForm = () => {
    const router = useRouter();
    const [serverError, setServerError] = useState<string | null>(
        null,
    );

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<LoginData>({
        resolver: zodResolver(LoginSchema as never),
        mode: "onBlur",
    });

    const onSubmit = async (data: LoginData) => {
        setServerError(null);

        const result = await loginAction(data);

        if (!result.success) {
            toast.error("Error al iniciar sesión", {
                description: result.message,
                action: {
                    label: "Cerrar",
                    onClick: () => toast.dismiss(),
                },
            });
            setServerError(result.message);
            return;
        }

        reset();
        toast.success("¡Has iniciado sesión correctamente!", {
            description: "Redirigiendo a la página principal...",
            action: {
                label: "Cerrar",
                onClick: () => toast.dismiss(),
            },
        });
        router.push("/");
        router.refresh();
    };

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
                    {...register("email")}
                />
                <SingleFormError message={errors.email?.message} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                    id="password"
                    type="password"
                    placeholder="Tu contraseña"
                    {...register("password")}
                />
                <SingleFormError message={errors.password?.message} />
            </div>

            {serverError && (
                <span className="text-sm text-red-500 text-center">
                    {serverError}
                </span>
            )}

            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                    ? "Iniciando sesión..."
                    : "Iniciar sesión"}
            </Button>

            <p className="text-sm text-center text-muted-foreground">
                <Link
                    href="/recuperar-contrasena"
                    className="underline hover:text-primary"
                >
                    ¿Olvidaste tu contraseña?
                </Link>
            </p>

            <p className="text-sm text-center text-muted-foreground">
                ¿No tienes cuenta?{" "}
                <Link
                    href="/registro"
                    className="underline hover:text-primary"
                >
                    Créala aquí
                </Link>
            </p>
        </form>
    );
};
