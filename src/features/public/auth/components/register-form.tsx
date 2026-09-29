"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { RegisterSchema, type RegisterData } from "@/features/public/auth/validations";
import { registerAction } from "@/features/public/auth/actions/";
import { Input } from "@/features/shared/components/ui/input";
import { Label } from "@/features/shared/components/ui/label";
import { Button } from "@/features/shared/components/ui/button";
import { SingleFormError } from "@/features/shared/components/ui/form-error";
import { toast } from "sonner";

export const RegisterForm = () => {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<RegisterData>({
    resolver: zodResolver(RegisterSchema as never),
    mode: "all",
  });

  const onSubmit = async (data: RegisterData) => {
    setServerError(null);

    const result = await registerAction(data);

    if (!result.success) {
      toast.error("Error al registrar", {
        description: result.message,
      });
      setServerError(result.message);
      return;
    }

    reset();
    toast.success("¡Cuenta creada exitosamente!", {
      description: `Bienvenido ${data.name}`,
    });
    router.push("/");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          placeholder="Juan Pérez"
          {...register("name")}
        />
        <SingleFormError message={errors.name?.message} />
      </div>

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
          placeholder="Mínimo 8 caracteres"
          {...register("password")}
        />
        <SingleFormError message={errors.password?.message} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="passwordConfirmation">Confirmar contraseña</Label>
        <Input
          id="passwordConfirmation"
          type="password"
          placeholder="Repite la contraseña"
          {...register("passwordConfirmation")}
        />
        <SingleFormError message={errors.passwordConfirmation?.message} />
      </div>

      {serverError && (
        <span className="text-sm text-red-500 text-center">
          {serverError}
        </span>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Registrando..." : "Registrarse"}
      </Button>

      <p className="text-sm text-center text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link href="/inicio" className="underline hover:text-primary">
          Inicia aquí
        </Link>
      </p>
    </form>
  );
};
