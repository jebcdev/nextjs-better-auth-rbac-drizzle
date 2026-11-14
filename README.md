# nextjs-better-auth-rbac-drizzle

Sistema full-stack de **autenticación, roles y gestión de usuarios** construido con Next.js 16, better-auth, Drizzle ORM y PostgreSQL. Incluye registro e inicio de sesión, recuperación de contraseña, perfil editable, avatares en Cloudinary, correos transaccionales con Mailtrap y un panel administrativo con listado paginado, búsqueda, filtros, alta, edición, activación/desactivación y veto de cuentas.

<p>
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16.3.6-black?logo=nextdotjs&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-19.2.8-149ECA?logo=react&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white" />
  <img alt="Drizzle ORM" src="https://img.shields.io/badge/Drizzle_ORM-1.0.0--rc.4-C5F74F?logo=drizzle&logoColor=black" />
  <img alt="better-auth" src="https://img.shields.io/badge/better--auth-1.7.6-000000" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-pg_8-4169E1?logo=postgresql&logoColor=white" />
  <img alt="pnpm" src="https://img.shields.io/badge/pnpm-12.6.0-F69220?logo=pnpm&logoColor=white" />
</p>

> **Documentación para agentes de IA:** este repositorio mantiene instrucciones específicas en [`AGENTS.md`](./AGENTS.md). Léelo antes de modificar código.

---

## Tabla de contenido

- [Descripción general](#descripción-general)
- [Características principales](#características-principales)
- [Stack tecnológico](#stack-tecnológico)
- [Paquetes instalados](#paquetes-instalados)
- [Requisitos previos](#requisitos-previos)
- [Puesta en marcha](#puesta-en-marcha)
- [Variables de entorno](#variables-de-entorno)
- [Scripts disponibles](#scripts-disponibles)
- [Credenciales de prueba](#credenciales-de-prueba)
- [Rutas de la aplicación](#rutas-de-la-aplicación)
- [Roles y permisos](#roles-y-permisos)
- [Funcionalidades en detalle](#funcionalidades-en-detalle)
- [Arquitectura](#arquitectura)
- [Estructura de carpetas](#estructura-de-carpetas)
- [Base de datos](#base-de-datos)
- [Seguridad](#seguridad)
- [Calidad y verificación](#calidad-y-verificación)
- [Estado actual y limitaciones](#estado-actual-y-limitaciones)
- [Solución de problemas](#solución-de-problemas)
- [Contribuir](#contribuir)
- [Recursos](#recursos)
- [Licencia](#licencia)

---

## Descripción general

Este proyecto es una base funcional para aplicaciones que necesitan:

- Autenticación con correo y contraseña.
- Roles de usuario con permisos diferenciados.
- Un directorio administrativo de cuentas.
- Perfil de usuario con edición por campos independientes.
- Sesiones controladas desde el servidor.
- Correos transaccionales de activación y recuperación.
- Subida de avatares a Cloudinary.
- Interfaz en español, con tema claro/oscuro/sistema.

La aplicación usa el **App Router de Next.js 16** y concentra la lógica de dominio en `src/features/`. Las mutaciones se ejecutan mediante **Server Actions**; no hay endpoints HTTP propios para better-auth ni un `route.ts` que monte su handler.

> **Estado:** las pantallas `/` (inicio) y `/panel` (dashboard) son marcadores de posición. Los flujos completos de autenticación, perfil y administración de usuarios sí están implementados.

---

## Características principales

### Autenticación

- Registro con nombre, correo y contraseña.
- Inicio de sesión con correo y contraseña.
- Cierre de sesión con revocación en servidor y limpieza del caché del navegador.
- Recuperación de contraseña por correo con token de un solo uso.
- Cambio de contraseña desde el perfil.
- Verificación de correo al registrarse (no obligatoria para iniciar sesión).
- Cambio de correo con verificación en la dirección nueva.
- Mensajes de error uniformes para no revelar si una cuenta existe.
- Limitador de intentos para login y recuperación de contraseña.

### Roles y administración

- Enum PostgreSQL `user_role` con tres valores: `admin`, `user`, `guest`.
- Panel administrativo protegido por rol.
- Listado paginado de usuarios.
- Búsqueda por nombre o correo.
- Filtros por rol y por estado (`active`, `inactive`, `banned`).
- Alta de usuarios con nombre, correo, contraseña, rol y avatar opcional.
- Edición de nombre, correo, rol y avatar.
- Activación y desactivación de cuentas.
- Veto y levantamiento de veto con el plugin admin de better-auth.
- Protección contra que un administrador se desactive o se vete a sí mismo.

### Perfil

- Vista de datos de la cuenta, rol, estado y verificación del correo.
- Resumen de cuentas vinculadas.
- Resumen de sesiones activas, incluida la sesión actual.
- Edición independiente del nombre.
- Edición independiente del avatar.
- Cambio de contraseña.
- Flujo de confirmación de correo mediante token.

### Interfaz

- Tailwind CSS v4 con tema definido en CSS.
- Componentes base-ui (no Radix).
- Tema claro, oscuro y del sistema con `next-themes`.
- Notificaciones con `sonner`.
- Formularios con `react-hook-form` + Zod.
- Skeletons, estados vacíos, paginación y diseño responsive.
- Barra lateral colapsable en el panel privado.

### Integraciones opcionales

- **Mailtrap** para correos de activación y recuperación.
- **Cloudinary** para subida y borrado de avatares.

Ambas integraciones son opcionales en desarrollo: sin Mailtrap no se envían correos (sin romper los flujos) y sin Cloudinary no se pueden subir ni eliminar avatares.

---

## Stack tecnológico

| Capa | Tecnología | Versión | Uso |
|---|---|---|---|
| Framework | Next.js | 16.3.6 | App Router, Turbopack, Server Actions, Server Components |
| UI | React | 19.2.8 | Componentes de interfaz |
| Lenguaje | TypeScript | 5 | Tipado estricto |
| Estilos | Tailwind CSS | 4 | Utilidades CSS, tema CSS-first |
| Componentes | base-ui (`@base-ui/react`) | 1.8 | Primitivas accesibles |
| Componentes | shadcn | 4.21 | Estilo `base-maia`, CLI y CSS |
| Autenticación | better-auth | 1.7.6 | Sesiones, credenciales, plugin admin |
| Adaptador | `@better-auth/drizzle-adapter` | 1.7.6 | Persistencia de better-auth en Drizzle |
| ORM | Drizzle ORM | 1.0.0-rc.4 | API v2, `defineRelations` |
| Migraciones | drizzle-kit | 1.0.0-rc.4 | Generación y aplicación de migraciones |
| Base de datos | PostgreSQL | — | Persistencia relacional |
| Driver | `pg` | 8.23 | Conexión a PostgreSQL |
| Validación | Zod | 4.6.5 | Esquemas y validación de fronteras |
| Formularios | react-hook-form | 7.89 | Estado y envío de formularios |
| Formularios | `@hookform/resolvers` | 5.9 | Integración RHF + Zod |
| Estado servidor | TanStack Query | 5.104 | Caché, mutaciones e invalidación |
| Estado UI | React state + `next-themes` | — | UI y tema |
| Notificaciones | sonner | 2.0.8 | Toasts |
| Iconos | lucide-react | 1.48 | Iconografía |
| Correo | mailtrap | 4.10 | Envío de correos transaccionales |
| Utilidades CSS | `cn`, `clsx`, `tailwind-merge` | 0.4 / 2.1 / 3.7 | Composición de clases |
| Variantes | class-variance-authority | 0.7 | Variantes de componentes |
| Animaciones | tw-animate-css | 1.4 | Utilidades de animación |
| Loader | thinking-orbs | 0.3 | Indicador de carga |
| Entorno | dotenv | 18.0 | Carga de `.env` en scripts |
| Scripts TS | tsx | 4.23 | Ejecución de seeders TypeScript |
| Lint | ESLint | 9 | Reglas de Next.js y TypeScript |
| Compilador | babel-plugin-react-compiler | 1.0 | React Compiler |

### Notas del stack

- **Next.js 16:** las props de ruta (`params`, `searchParams`) son promesas y deben resolverse con `await`.
- **Todas las rutas son dinámicas:** el layout raíz resuelve la sesión con `headers()`, por lo que el build no prerenderiza páginas.
- **React Compiler:** está activado en `next.config.ts` con `reactCompiler: true`.
- **Tailwind v4:** no existe `tailwind.config`; el tema vive en `src/app/globals.css`.
- **Drizzle v2:** `src/lib/db/index.ts` pasa `relations`, no `schema`, y las relaciones se declaran con `defineRelations`.
- **Sin Radix:** los componentes usan base-ui. Se compone con `render` y `nativeButton`, nunca con `asChild`.
- **Sin `route.ts`:** better-auth se invoca como `auth.api.*` desde Server Actions.

---

## Paquetes instalados

### Dependencias de ejecución

| Paquete | Versión | Para qué se usa |
|---|---|---|
| `next` | 16.3.6 | Framework principal |
| `react` | 19.2.8 | Interfaz |
| `react-dom` | 19.2.8 | Renderizado DOM |
| `@base-ui/react` | ^1.8.0 | Primitivas de UI accesibles |
| `better-auth` | ^1.7.6 | Autenticación y sesiones |
| `@better-auth/drizzle-adapter` | ^1.7.6 | Adaptador de better-auth para Drizzle |
| `drizzle-orm` | 1.0.0-rc.4 | ORM y consultas tipadas |
| `pg` | ^8.23.0 | Driver de PostgreSQL |
| `zod` | ^4.6.5 | Validación de datos |
| `react-hook-form` | ^7.89.0 | Formularios |
| `@hookform/resolvers` | ^5.9.1 | Resolución de esquemas Zod |
| `@tanstack/react-query` | ^5.104.0 | Estado del servidor |
| `@tanstack/react-query-devtools` | ^5.104.0 | Devtools de TanStack Query |
| `next-themes` | ^0.4.6 | Tema claro/oscuro/sistema |
| `sonner` | ^2.0.8 | Toasts |
| `lucide-react` | ^1.48.0 | Iconos |
| `class-variance-authority` | ^0.7.1 | Variantes de componentes |
| `cn` | ^0.4.0 | Utilidad de clases usada por los componentes |
| `clsx` | ^2.1.1 | Composición condicional de clases |
| `tailwind-merge` | ^3.7.0 | Fusión de clases Tailwind |
| `tw-animate-css` | ^1.4.0 | Animaciones CSS |
| `thinking-orbs` | ^0.3.2 | Indicador animado de carga |
| `mailtrap` | ^4.10.0 | SDK de correo |
| `dotenv` | ^18.0.4 | Variables de entorno en scripts |
| `shadcn` | ^4.21.0 | CLI, estilos y utilidades de shadcn |

### Dependencias de desarrollo

| Paquete | Versión | Para qué se usa |
|---|---|---|
| `typescript` | ^5 | Tipado y compilación |
| `drizzle-kit` | 1.0.0-rc.4 | Migraciones |
| `tsx` | ^4.23.15 | Ejecutar seeders TypeScript |
| `eslint` | ^9 | Linting |
| `eslint-config-next` | 16.3.6 | Reglas de Next.js |
| `tailwindcss` | ^4 | Motor de Tailwind |
| `@tailwindcss/postcss` | ^4 | Integración con PostCSS |
| `babel-plugin-react-compiler` | 1.0.0 | React Compiler |
| `@types/node` | ^20 | Tipos de Node |
| `@types/pg` | ^8.23.1 | Tipos de `pg` |
| `@types/react` | ^19 | Tipos de React |
| `@types/react-dom` | ^19 | Tipos de React DOM |

---

## Requisitos previos

Antes de empezar necesitas:

- **Node.js 20.9.0 o superior.** Es el requisito de Next.js 16 (declarado en `node_modules/next/package.json`).
- **pnpm 12.6.0.** El repositorio fija `packageManager: "pnpm@12.6.0"` y solo incluye `pnpm-lock.yaml`.
- **PostgreSQL** accesible por red. El repositorio no fija una versión concreta; el driver es `pg` 8.
- **OpenSSL** (o equivalente) para generar secretos.
- Opcional: una cuenta de **Mailtrap** si quieres recibir correos.
- Opcional: una cuenta de **Cloudinary** si quieres subir avatares.
- Opcional: **Docker** si prefieres levantar PostgreSQL con un contenedor.

> **Regla del proyecto:** usa siempre `pnpm`. No uses `npm` ni `yarn`; el repositorio no acepta `package-lock.json` ni `yarn.lock`.

### Instalar pnpm con Corepack

Corepack viene incluido con Node.js:

```bash
corepack enable
corepack prepare pnpm@12.6.0 --activate
pnpm --version
```

Si ya tienes pnpm instalado y coincide con la versión del proyecto, puedes saltarte este paso.

---

## Puesta en marcha

### 1. Clonar el repositorio

```bash
git clone https://github.com/jebcdev/nextjs-better-auth-rbac-drizzle.git
cd nextjs-better-auth-rbac-drizzle
```

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Crear el archivo de entorno

```bash
cp .env.example .env
```

En Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Abre `.env` y completa al menos `DATABASE_URL` y `BETTER_AUTH_SECRET`. El archivo `.env.example` está comentado en español y es la lista autoritativa de variables.

### 4. Crear la base de datos

Con una instalación local de PostgreSQL:

```bash
createdb -U postgres nextjs_rbac_drizzle
```

O desde `psql`:

```bash
psql -U postgres -c "CREATE DATABASE nextjs_rbac_drizzle;"
```

Ejemplo de `DATABASE_URL`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nextjs_rbac_drizzle"
```

#### Alternativa con Docker

Si no tienes PostgreSQL instalado, puedes levantar uno con Docker:

```bash
docker run --name rbac-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=nextjs_rbac_drizzle \
  -p 5432:5432 \
  -d postgres:16
```

Y usar la misma `DATABASE_URL` del ejemplo anterior.

### 5. Configurar el secreto de autenticación

Genera un secreto seguro:

```bash
openssl rand -base64 32
```

Copia el resultado en `.env`:

```env
BETTER_AUTH_SECRET="<el-valor-generado>"
```

### 6. Configurar las URLs

Para desarrollo local, estas dos variables deben apuntar a la misma URL:

```env
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 7. Definir la contraseña del seeder

Genera una contraseña para las cuentas de prueba:

```bash
openssl rand -base64 18
```

Añádela a `.env`:

```env
SEED_USERS_PASSWORD="<la-contraseña-generada>"
```

Requisitos que valida el seeder:

- Mínimo 16 caracteres.
- No puede ser solo dígitos.
- No puede contener `password`, `qwertyuiop`, `adminadmin` ni `secretsecre`.

### 8. Ejecutar migraciones y seed

```bash
pnpm seed
```

> ⚠️ **`pnpm seed` es destructivo.** El script hace, en este orden: `rm -rf drizzle` → `drizzle-kit generate` → `_reset-db.ts` (elimina y recrea el esquema `public`) → `drizzle-kit migrate` → seeder. **Nunca lo ejecutes contra una base de datos compartida o de producción.**

El seeder crea seis cuentas con correos ficticios. Todas usan la misma contraseña: el valor de `SEED_USERS_PASSWORD`.

### 9. Arrancar el servidor de desarrollo

```bash
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000).

### 10. Iniciar sesión como administrador

Usa:

```text
Correo: super@email.com
Contraseña: <SEED_USERS_PASSWORD>
```

Después de iniciar sesión, entra en **Panel → Configuración → Usuarios** para acceder al directorio administrativo.

---

## Variables de entorno

Todas las variables viven en `.env`. El archivo está en `.gitignore`; nunca lo subas al repositorio.

### Servidor

| Variable | Obligatoria | Descripción |
|---|---|---|
| `DATABASE_URL` | Sí | Cadena de conexión a PostgreSQL. |
| `BETTER_AUTH_SECRET` | Sí | Secreto de firma de sesiones. Genera con `openssl rand -base64 32`. |
| `BETTER_AUTH_URL` | Sí | URL base de la aplicación para better-auth, sin barra final. |
| `SEED_USERS_PASSWORD` | Solo para `pnpm seed` | Contraseña de las cuentas creadas por el seeder. |
| `SUPER_ADMIN_ROLE` | Sí para el panel admin | Rol que abre el directorio. Debe ser `admin`. |
| `MAILTRAP_API_TOKEN` | No | Token de Mailtrap. Sin él, el correo es un no-op silencioso. |
| `MAILTRAP_FROM_EMAIL` | No | Remitente de los correos. Necesario para que el envío funcione. |
| `MAILTRAP_FROM_NAME` | No | Nombre visible del remitente. |
| `MAILTRAP_TEST_INBOX_ID` | No | ID del buzón de Email Testing. Si se define, usa el sandbox. |
| `CLOUDINARY_API_KEY` | No | Clave para borrar avatares antiguos en Cloudinary. |
| `CLOUDINARY_API_SECRET` | No | Secreto para borrar avatares antiguos. **Nunca** debe llevar prefijo `NEXT_PUBLIC_`. |
| `LOG_LEVEL` | No | Documentada históricamente; **no controla** el logger de este repositorio. |

### Cliente

| Variable | Obligatoria | Descripción |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Sí | URL base usada por el cliente de better-auth y por los enlaces de los correos. |
| `NEXT_PUBLIC_ENVIRONMENT` | No | Si vale exactamente `development`, `consoleLogger` imprime. Cualquier otro valor lo silencia. |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | No | Nombre del cloud de Cloudinary. |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | No | Preset de subida. Debe ser **unsigned**. |

### Notas importantes

- Solo las variables con prefijo `NEXT_PUBLIC_` llegan al navegador. No pongas secretos ahí.
- `SUPER_ADMIN_ROLE` debe ser `admin` para que coincida con `adminRoles: ["admin"]` de `src/lib/auth/auth.ts` y con el rol que asigna el seeder.
- `BETTER_AUTH_SECRET` no debe cambiar en caliente: rotarlo invalida las sesiones activas y los tokens pendientes.
- Sin `MAILTRAP_API_TOKEN`, los flujos de autenticación terminan correctamente pero **no se envía ningún correo**.

---

## Scripts disponibles

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Arranca Next.js en modo desarrollo con Turbopack. |
| `pnpm build` | Compila la aplicación para producción. También ejecuta TypeScript. |
| `pnpm start` | Elimina `.next`, vuelve a compilar y arranca el servidor de producción. |
| `pnpm lint` | Ejecuta ESLint sobre todo el repositorio. |
| `pnpm seed` | Resetea y regenera migraciones, recrea el esquema `public` y carga las cuentas de prueba. |
| `pnpm tsc --noEmit` | Verifica tipos sin emitir archivos. No está definido como script, pero es el comando de verificación. |

> Los scripts `start` y `seed` usan `rm -rf`, propio de shells Unix. En Windows, ejecútalos desde WSL/Git Bash o reproduce los pasos manualmente.

### Verificación recomendada

Ejecuta siempre en este orden:

```bash
pnpm tsc --noEmit
pnpm lint
pnpm build
```

`pnpm build` no necesita una base de datos para completarse porque todas las páginas son dinámicas.

### Migraciones

No existen scripts `db:push` ni `db:studio`. Para cambios de esquema:

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

La fuente de verdad del esquema es `src/lib/db/schema.ts`. El directorio `drizzle/` está en `.gitignore`: las migraciones son locales y se regeneran; no se editan a mano.

### Reset completo

```bash
pnpm seed
```

Recuerda que este comando **elimina el esquema `public`** antes de volver a migrar.

---

## Credenciales de prueba

El seeder crea estas cuentas:

| Correo | Rol | Nombre |
|---|---|---|
| `super@email.com` | `admin` | Juan Esteban Benjumea Correa |
| `produccion@email.com` | `user` | Producción |
| `compras@email.com` | `user` | Compras |
| `ventas@email.com` | `user` | Ventas |
| `consultas@email.com` | `user` | Consultas |
| `cliente@email.com` | `guest` | Cliente |

Todas comparten la contraseña definida en `SEED_USERS_PASSWORD`. Los correos son ficticios y no tienen buzones reales asociados; si Mailtrap está configurado, el seeder puede intentar enviarles correos de verificación.

Solo `super@email.com` tiene rol `admin` y puede abrir `/panel/admin/usuarios`.

---

## Rutas de la aplicación

| Ruta | Grupo | Acceso | Descripción |
|---|---|---|---|
| `/` | `(publico)` | Público | Inicio. Actualmente es un marcador de posición. |
| `/iniciar-sesion` | `(cuenta)` | Solo visitantes | Inicio de sesión. Si ya hay sesión, redirige a `/`. |
| `/registrarse` | `(cuenta)` | Solo visitantes | Registro de cuenta. |
| `/recuperar-contrasena` | `(cuenta)` | Solo visitantes | Solicitud de recuperación. |
| `/restablecer-contrasena` | `(cuenta)` | Solo visitantes | Formulario con token para definir nueva contraseña. |
| `/panel` | `(privado)` | Autenticado | Dashboard. Actualmente es un marcador de posición. |
| `/perfil` | `(privado)` | Autenticado | Perfil del usuario. |
| `/perfil/confirmar-email` | `(privado)` | Autenticado | Confirmación de token de correo. |
| `/panel/admin/usuarios` | `(privado)` | Admin | Listado paginado de usuarios. |
| `/panel/admin/usuarios/nuevo` | `(privado)` | Admin | Alta de usuario. |
| `/panel/admin/usuarios/[userId]` | `(privado)` | Admin | Edición de usuario. |

### Comportamiento de los grupos de rutas

- `(cuenta)`: si el usuario ya está autenticado, redirige a `/`.
- `(privado)`: si no hay sesión, redirige a `/iniciar-sesion`.
- Las páginas de administración además comprueban el rol y redirigen a `/panel` si no está permitido.

---

## Roles y permisos

| Rol | Panel | Perfil | Directorio de usuarios | Crear/editar | Activar/desactivar | Vetar |
|---|---|---|---|---|---|---|
| `admin` | Sí | Sí | Sí | Sí | Sí | Sí |
| `user` | Sí | Sí | No | No | No | No |
| `guest` | Sí | Sí | No | No | No | No |

### Reglas

- Cada cuenta tiene **un solo rol**. La columna `users.role` es un `pgEnum`; no admite listas ni valores fuera del enum.
- El rol se compara por igualdad, nunca por subcadena.
- El acceso al directorio se decide con `ADMIN_USERS_ROLES`, que se deriva de `SUPER_ADMIN_ROLE`.
- Un administrador no puede desactivarse ni vetarse a sí mismo desde el directorio.
- Las acciones del servidor vuelven a comprobar sesión y rol; no confían en el guardia de la página.

---

## Funcionalidades en detalle

### Registro

- Campos: nombre, correo, contraseña y confirmación.
- El nombre solo admite letras y espacios (incluye acentos y `ñ`).
- La contraseña debe tener entre 8 y 72 caracteres, al menos una mayúscula, una minúscula, un número y un carácter especial.
- Se valida con Zod antes de llamar a better-auth.
- Se envía un correo de verificación si Mailtrap está configurado.
- La verificación **no es obligatoria** para iniciar sesión (`requireEmailVerification: false`).
- Si Mailtrap no está configurado, el alta termina igual y no se envía correo.

### Inicio de sesión

- Campos: correo y contraseña.
- Limitador de intentos: 5 fallos por ventana de 15 minutos por IP.
- Todos los fallos devuelven el mismo mensaje: `El email o la contraseña son incorrectos`.
- El limitador es en memoria y por proceso; se reinicia al reiniciar el servidor.
- La IP se obtiene de `x-forwarded-for`, por lo que en producción conviene tener un proxy que sobrescriba esa cabecera.

### Cierre de sesión

1. La Server Action revoca la sesión en el servidor y borra la cookie.
2. El cliente limpia el caché de TanStack Query.
3. El cliente navega a `/` y refresca.

### Recuperación de contraseña

- Se solicita desde `/recuperar-contrasena`.
- La respuesta es uniforme exista o no la cuenta.
- Si Mailtrap está configurado, se envía un enlace a `/restablecer-contrasena?token=...`.
- El token es de un solo uso y expira en 1 hora.
- Al restablecer, se revocan todas las sesiones de la cuenta.
- Sin Mailtrap, el flujo responde correctamente pero no llega ningún correo.

### Cambio de contraseña

- Disponible desde el perfil.
- Requiere la contraseña actual.
- Aplica la misma política de contraseñas.
- Revoca las demás sesiones de la cuenta.

### Verificación y cambio de correo

- Al registrarse se puede enviar un correo de verificación.
- El enlace apunta a `/perfil/confirmar-email?token=...`.
- El backend de cambio de correo está habilitado en better-auth y exige verificación en la dirección nueva.
- **Nota:** el editor de correo del perfil está deshabilitado en la interfaz actual; el backend y la página de confirmación existen.

### Gestión administrativa de usuarios

#### Listado

- Paginación con `page`, `pageSize` y `search`.
- Tamaños de página: 10, 25 y 50. Por defecto, 10.
- Búsqueda por nombre o correo.
- Filtro por rol: todos, `admin`, `user`, `guest`.
- Filtro por estado: todos, activos, inactivos, baneados.
- Orden total por `name` y `id` para evitar filas duplicadas o pérdidas entre páginas.
- El total y la página usan el mismo `whereClause`.

#### Alta

- Campos: nombre, correo, contraseña, rol y avatar opcional.
- El correo debe ser único.
- El rol se elige entre los tres valores del enum.
- La contraseña cumple la misma política que en el registro.
- El cuerpo de la acción es `.strict()`: cualquier campo extra es un error visible.

#### Edición

- Permite cambiar nombre, correo, rol y avatar.
- No permite cambiar contraseña ni estado desde este formulario.
- El correo también debe ser único.
- El cuerpo es `.strict()` y solo escribe las columnas permitidas.

#### Activar / desactivar

- Escribe la columna `isActive` con Drizzle.
- Una cuenta inactiva no puede iniciar sesión y su sesión deja de ser válida.
- Un administrador no puede desactivar su propia cuenta desde el directorio.

#### Vetar / levantar veto

- Usa `auth.api.banUser` y `auth.api.unbanUser` del plugin admin de better-auth.
- Escribir `banned` directamente con Drizzle crearía un veto aparente que no cierra sesiones.
- El veto revoca las sesiones activas del objetivo.
- Un administrador no puede vetarse a sí mismo.

### Perfil

- Muestra nombre, correo, avatar, rol, estado, verificación y fechas.
- Muestra cuentas vinculadas (sin secretos).
- Muestra sesiones (sin tokens), incluida la sesión actual.
- Permite editar el nombre por separado.
- Permite subir, cambiar o quitar el avatar.
- Permite cambiar la contraseña.
- Las fechas se envían al cliente como cadenas ISO 8601.

### Avatares con Cloudinary

- La subida ocurre en el navegador con un preset **unsigned**.
- El servidor valida que la URL pertenezca al cloud del proyecto.
- Al guardar un avatar nuevo, se elimina el anterior después de que la escritura haya funcionado.
- Para borrar se necesitan `CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET`.
- Sin Cloudinary configurado, la edición de avatar no funciona.

### Correos con Mailtrap

- Plantillas de verificación y recuperación en `src/lib/emails/templates/`.
- El remitente se configura con `MAILTRAP_FROM_EMAIL` y `MAILTRAP_FROM_NAME`.
- `MAILTRAP_TEST_INBOX_ID` activa el modo sandbox de Email Testing.
- Sin token o sin remitente, el transporte es un no-op silencioso.
- Los enlaces se reconstruyen contra las rutas reales de la aplicación, no contra endpoints de better-auth.

### Tema e interfaz

- Tema claro, oscuro y del sistema con `next-themes`.
- Tailwind v4 con variables CSS en `src/app/globals.css`.
- Componentes base-ui con estilos shadcn (`base-maia`, `mist`).
- Toasts con `sonner`.
- Skeletons en listados y perfil.
- Barra lateral colapsable y menú móvil.
- Formularios con errores por campo.

---

## Arquitectura

### Flujo general

```text
Navegador
  │
  ├─ Client Component (formularios, filtros, tarjetas, paginación)
  │      │
  │      └─ Server Action ("use server")
  │             ├─ Zod.safeParse()
  │             ├─ getSessionDetails() / hasRequiredRole()
  │             ├─ better-auth (auth.api.*)
  │             └─ Drizzle ORM → PostgreSQL
  │
  └─ Server Component (layouts, páginas, perfil)
         ├─ getSessionDetails()
         ├─ Drizzle ORM
         └─ DTOs seguros hacia el cliente
```

### Decisiones importantes

#### Server Actions en lugar de endpoints HTTP

No hay `src/app/api/**/route.ts` ni `toNextJsHandler`. Todas las llamadas a better-auth se hacen desde acciones `"use server"` con `auth.api.*`.

Consecuencias:

- El limitador HTTP integrado de better-auth no se ejecuta; por eso existe `src/lib/auth/rate-limit.ts`.
- Las acciones son accesibles por POST directo y **no heredan** el guardia de la página.
- Cada acción privilegiada vuelve a derivar el actor de la sesión y a comprobar el rol.
- El actor nunca se toma de un parámetro; solo se acepta el id del objetivo en las acciones administrativas, y se valida.

#### Sesión

`getSessionDetails()` es la primitiva de sesión. Devuelve:

- `isAuthenticated`
- `userRole`
- `currentUser`
- `currentSession`
- `fullUserDetails`

La función lee la fila de `users` y considera que no hay sesión si:

- No existe la sesión.
- No existe la fila de usuario.
- La cuenta está inactiva (`isActive`).
- La cuenta está vetada (`banned`).

El rol se toma de la fila de `users`, no de `session.user.role`.

#### DTOs y frontera servidor/cliente

- Nunca se devuelve una fila cruda de la base de datos a un Client Component.
- Los DTOs se escriben campo por campo, sin `Pick`, `Omit` ni spreads.
- `AdminUserListItem` y `ProfileViewModel` son los DTOs de referencia.
- Las fechas cruzan como cadenas ISO 8601.
- `FullUser` es un tipo solo de servidor porque incluye credenciales de `accounts` y `sessions`.

#### Drizzle v2

- `src/lib/db/index.ts` pasa `relations` a `drizzle()`.
- Las relaciones se declaran con `defineRelations` en `src/lib/db/schema.ts`.
- El esquema vive únicamente en `src/lib/db/schema.ts`.
- `users.role` es un `pgEnum`, no texto.

#### TanStack Query

- Se usa para el listado administrativo y sus mutaciones.
- Las claves se construyen con una fábrica (`queries/*.keys.ts`).
- La clave del listado usa parámetros normalizados.
- Las mutaciones invalidan la clave raíz en `onSuccess`.
- No hay actualizaciones optimistas.
- El listado usa `placeholderData` para no parpadear al paginar.
- Configuración por defecto: `staleTime` 5 minutos, `gcTime` 10 minutos, sin reintentos, sin refetch al enfocar.

#### Next.js 16

- Las props de ruta son promesas: `const { userId } = await params`.
- Todas las rutas son dinámicas porque el layout raíz resuelve la sesión.
- `<Suspense>` solo muestra su fallback si el dato se espera en un componente hijo.
- `src/app/error.tsx` es un límite de error de pantalla completa; no se reutiliza para errores inline.
- React Compiler está activado.

#### base-ui en lugar de Radix

- Se compone con `render` y `nativeButton`.
- No se usa `asChild`.
- No se debe anidar un `<Link>` dentro de un `<Button>`.
- `SelectContent` está portalizado y solo se monta al abrir; por eso los `Select` reciben `items` con el mapa valor → etiqueta.

#### shadcn y Tailwind

- `components.json` apunta los alias de shadcn a `@/features/shared/components` y `@/features/shared/components/ui`.
- Añadir un componente con `pnpm dlx shadcn@latest add ...` escribe en esa ruta, no en `src/components`.
- Tailwind v4 no usa `tailwind.config`; el tema está en `src/app/globals.css`.

---

## Estructura de carpetas

```text
.
├── src/
│   ├── app/
│   │   ├── (publico)/                 # Rutas públicas
│   │   ├── (cuenta)/                  # Login, registro y recuperación
│   │   ├── (privado)/                 # Panel, perfil y administración
│   │   ├── error.tsx                  # Límite de error global
│   │   ├── layout.tsx                 # Layout raíz + sesión + providers
│   │   ├── loading.tsx                # Indicador de carga global
│   │   └── globals.css                # Tailwind v4 y variables de tema
│   │
│   ├── features/
│   │   ├── public/
│   │   │   ├── auth/
│   │   │   │   ├── actions/           # login, registro, reset, cambio de contraseña
│   │   │   │   ├── components/        # formularios
│   │   │   │   └── validations/       # esquemas Zod
│   │   │   └── components/            # header público, theme switcher
│   │   │
│   │   ├── private/
│   │   │   ├── dashboard/
│   │   │   │   ├── admin/users/
│   │   │   │   │   ├── actions/       # CRUD y toggles administrativos
│   │   │   │   │   ├── components/    # grid, filtros, formulario, tarjetas
│   │   │   │   │   ├── queries/       # TanStack Query
│   │   │   │   │   └── validations/   # Zod de alta, edición y estado
│   │   │   │   └── components/        # sidebar y header del panel
│   │   │   └── profile/
│   │   │       ├── actions/           # lectura y edición del perfil
│   │   │       ├── components/        # detalles y editores
│   │   │       ├── types/             # ProfileViewModel
│   │   │       └── validations/       # Zod del perfil
│   │   │
│   │   └── shared/
│   │       ├── components/ui/         # base-ui + shadcn
│   │       │   └── pagination/        # módulo de paginación compartido
│   │       └── types/                 # IGeneralResponse, etc.
│   │
│   ├── hooks/                         # hooks globales
│   └── lib/
│       ├── auth/                      # better-auth, sesión, rol, rate limit
│       ├── db/                        # schema, conexión, seeders
│       ├── emails/                    # Mailtrap, templates, transporte
│       ├── logger/                    # consoleLogger
│       ├── query/                     # QueryClient
│       ├── seo/                       # metadata
│       └── utils/                     # cn, enums, Cloudinary, helpers
│
├── drizzle.config.ts                  # Configuración de drizzle-kit
├── next.config.ts                     # React Compiler
├── components.json                    # Configuración de shadcn
├── eslint.config.mjs                  # ESLint flat config
├── postcss.config.mjs                 # Tailwind + PostCSS
├── tsconfig.json                      # TypeScript y alias @/*
├── package.json                       # Scripts y dependencias
├── pnpm-lock.yaml                     # Lockfile
├── pnpm-workspace.yaml                # allowBuilds de pnpm
├── .env.example                       # Plantilla de variables
├── AGENTS.md                          # Instrucciones para agentes de IA
└── README.md
```

### Convenciones de features

Cada dominio sigue una forma similar:

- `actions/*.action.ts`: Server Actions o funciones de mutación.
- `validations/*.schema.ts`: esquemas Zod.
- `components/`: componentes del dominio.
- `queries/`: hooks de TanStack Query y fábrica de claves.
- `types/`: interfaces y tipos del dominio.
- `index.ts`: barrel por subcarpeta.

Las importaciones deben hacerse a través del barrel de la subcarpeta, no del archivo hoja. En `features/private/dashboard/admin/users/` no hay barrel en la raíz del feature: se importa desde `…/users/actions` y `…/users/components`.

---

## Base de datos

### Tablas

| Tabla | Propósito | Campos principales |
|---|---|---|
| `users` | Cuentas de usuario | `id`, `name`, `email`, `email_verified`, `image`, `role`, `banned`, `ban_reason`, `ban_expires`, `is_active`, `tenant_id`, timestamps |
| `sessions` | Sesiones activas | `id`, `expires_at`, `token`, `ip_address`, `user_agent`, `user_id`, `impersonated_by`, timestamps |
| `accounts` | Cuentas de proveedor | `id`, `account_id`, `provider_id`, `user_id`, tokens, `scope`, `password`, timestamps |
| `verifications` | Tokens de verificación | `id`, `identifier`, `value`, `expires_at`, timestamps |

### Enum

```text
user_role: admin | user | guest
```

### Relaciones

- `users` 1 → N `sessions` (borrado en cascada).
- `users` 1 → N `accounts` (borrado en cascada).
- `verifications` es independiente y se indexa por `identifier`.

### Notas

- `banned`, `ban_reason` y `ban_expires` pertenecen al plugin admin de better-auth.
- `is_active` es una columna propia del proyecto.
- `is_active` y `banned` son booleanos nullable; la aplicación los interpreta por veracidad.
- En SQL, `NULL = false` no es verdadero: un filtro de inactivos necesita incluir `isNull`.
- No hay proveedores OAuth configurados actualmente; la tabla `accounts` está preparada para ellos.
- `tenant_id` existe en el esquema, pero no se usa en los flujos actuales.

### Migraciones y seed

- `drizzle.config.ts` apunta a `./src/lib/db/schema.ts` y genera en `./drizzle`.
- `drizzle/` está en `.gitignore`; no se versiona.
- `pnpm seed` regenera migraciones, recrea el esquema y carga datos.
- Los seeders viven en `src/lib/db/seeders/`.
- `_reset-db.ts` elimina y recrea el esquema `public`.
- `index.ts` crea las seis cuentas de prueba.

---

## Seguridad

### Contraseñas

- El hash y la verificación los gestiona better-auth.
- La política exige mínimo 8 y máximo 72 caracteres, mayúscula, minúscula, número y carácter especial.
- Las contraseñas nunca se guardan en texto plano.
- Nunca se registran contraseñas, tokens ni cuerpos de petición de better-auth.

### Sesiones

- Duración absoluta: 8 horas.
- `updateAge`: 1 hora.
- `cookieCache` desactivado para que la revocación sea inmediata.
- Una cuenta inactiva o vetada deja de tener sesión válida en la siguiente resolución.
- El cierre de sesión revoca la sesión en servidor y borra la cookie.

### Autorización

- `hasRequiredRole` es el único guardia de rol.
- `ADMIN_USERS_ROLES` es la única declaración de quién puede abrir el directorio.
- Las páginas y las acciones comprueban el rol por separado.
- Las acciones privilegiadas derivan el sujeto de la sesión, nunca del payload.
- `SUPER_ADMIN_ROLE` debe ser `admin`.
- Nunca se importa `ADMIN_USERS_ROLES` desde un Client Component: en el navegador vale `[undefined]`.

### Validación

- Zod v4 en todas las fronteras.
- `.safeParse()`, nunca `.parse()`.
- `.strict()` en cuerpos privilegiados para que un campo extra sea un error visible.
- Los DTOs se escriben campo por campo.
- Los errores de validación se traducen a mensajes en español.

### Rate limiting

- Login: 5 fallos por 15 minutos por IP.
- Recuperación de contraseña: mismo límite.
- Estado en memoria, por proceso.
- Se reinicia al reiniciar el servidor.
- En producción, varias instancias multiplican el límite efectivo.
- Requiere un proxy que sobrescriba `x-forwarded-for` para ser fiable.

### Correos

- Sin `MAILTRAP_API_TOKEN`, el envío es un no-op silencioso.
- Los errores de correo no rompen los flujos de autenticación.
- Los enlaces se construyen contra las rutas reales de la aplicación.
- Los tokens de verificación y recuperación son de un solo uso.

### Registro de eventos

- Se usa `consoleLogger`.
- Solo imprime si `NEXT_PUBLIC_ENVIRONMENT === "development"`.
- Se registran códigos de motivo y nombres de error.
- No se registran contraseñas ni tokens.

---

## Calidad y verificación

### Comandos

```bash
# 1. Tipos
pnpm tsc --noEmit

# 2. Lint
pnpm lint

# 3. Build de producción
pnpm build
```

### Qué esperar

- `pnpm tsc --noEmit` no debe reportar errores.
- `pnpm lint` no debe reportar advertencias.
- `pnpm build` debe compilar y listar todas las rutas como dinámicas.
- El build no necesita base de datos.

### Lo que no existe

- No hay test runner configurado.
- No hay tests unitarios, de integración ni E2E.
- No hay Prettier.
- No hay CI.
- No hay script `typecheck`; se usa `pnpm tsc --noEmit`.
- No hay `db:push` ni `db:studio`.

### Problema típico de TypeScript

Después de mover o renombrar una ruta, `pnpm tsc --noEmit` puede fallar por un archivo obsoleto en `.next/types`. Solución:

```bash
rm -rf .next
pnpm tsc --noEmit
```

En Windows PowerShell:

```powershell
Remove-Item -Recurse -Force .next
pnpm tsc --noEmit
```

---

## Estado actual y limitaciones

- `/` y `/panel` son pantallas vacías o marcadores de posición.
- El editor de correo del perfil está comentado en la interfaz; el backend y la página de confirmación existen.
- No hay tests ni CI.
- El rate limit es en memoria y por proceso.
- Sin Mailtrap no se envían correos.
- Sin Cloudinary no se pueden subir ni borrar avatares.
- `drizzle/`, `openspec/` y `.opencode/` están en `.gitignore`; son artefactos locales.
- `pnpm seed` elimina el esquema `public`; es solo para desarrollo.
- Los correos del seeder son ficticios.
- El login enlaza a `/registro` en lugar de `/registrarse` (defecto conocido).
- El header del dashboard todavía anida un `<Link>` dentro de un `<Button>` en la rama de `action.path` (defecto conocido).
- Revisa `AGENTS.md` para el resto de decisiones y defectos conocidos.

---

## Solución de problemas

### `pnpm: command not found`

Activa Corepack:

```bash
corepack enable
corepack prepare pnpm@12.6.0 --activate
```

O instala pnpm 12.6.0 con el método que prefieras, siempre respetando la versión del `packageManager`.

### `database "nextjs_rbac_drizzle" does not exist`

Crea la base antes de ejecutar el seed:

```bash
createdb -U postgres nextjs_rbac_drizzle
```

### `pnpm seed` rechaza la contraseña

Revisa `SEED_USERS_PASSWORD`:

- Mínimo 16 caracteres.
- No solo dígitos.
- Sin `password`, `qwertyuiop`, `adminadmin` ni `secretsecre`.

### `pnpm seed` borró mis datos

Es su comportamiento: elimina y recrea el esquema `public`. No lo ejecutes en bases compartidas ni en producción.

### No llegan los correos

Comprueba:

- `MAILTRAP_API_TOKEN`.
- `MAILTRAP_FROM_EMAIL`.
- `MAILTRAP_TEST_INBOX_ID` si usas sandbox.
- Que el dominio del remitente esté verificado si usas Email Sending.

Sin Mailtrap, el flujo de autenticación termina igual y no se envía nada.

### El administrador no puede entrar a `/panel/admin/usuarios`

Comprueba:

- `SUPER_ADMIN_ROLE="admin"` en `.env`.
- Que la cuenta tenga `role = "admin"`.
- Que `adminRoles` de `src/lib/auth/auth.ts` siga siendo `["admin"]`.
- Que hayas reiniciado el servidor después de cambiar `.env`.

Si el rol no coincide, la página redirige a `/panel`.

### Los logs no aparecen

`consoleLogger` solo imprime si:

```env
NEXT_PUBLIC_ENVIRONMENT="development"
```

`LOG_LEVEL` no controla el logger de este proyecto.

### `pnpm tsc --noEmit` falla por `.next/types`

Elimina el artefacto y vuelve a ejecutar:

```bash
rm -rf .next
pnpm tsc --noEmit
```

### La subida de avatar falla

Comprueba:

- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`.
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`.
- Que el preset sea **unsigned**.
- `CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET` si quieres borrar el avatar anterior.

### `pnpm start` vuelve a compilar

Es su comportamiento: elimina `.next`, compila y arranca. Si ya compilaste y solo quieres servir la build:

```bash
pnpm exec next start
```

### El build pasa pero la app falla en runtime

El build no valida la conexión a PostgreSQL ni las variables de runtime. Revisa:

- `.env`.
- Que PostgreSQL esté levantado.
- Que las migraciones se hayan aplicado.
- Que `BETTER_AUTH_SECRET` y las URLs estén definidas.

---

## Contribuir

### Reglas del repositorio

- Usa **pnpm** para todo.
- No añadas `package-lock.json` ni `yarn.lock`.
- No subas `.env`.
- No subas `drizzle/`, `openspec/` ni `.opencode/`.
- No edites migraciones SQL a mano.
- Mantén el código, los comentarios y los mensajes en español.
- Sigue la estructura de `src/features/`.
- Documenta con JSDoc en español.
- Usa Zod en las fronteras.
- No devuelvas filas crudas de la base de datos al cliente.

### Antes de abrir un cambio

```bash
pnpm tsc --noEmit
pnpm lint
pnpm build
```

Los tres comandos deben pasar.

### Commits

Se usan Conventional Commits en español:

```text
feat(auth): agrega verificación de correo
fix(usuarios): corrige el filtro de estado
refactor(perfil): separa la edición de nombre y avatar
docs(readme): documenta la puesta en marcha
```

### Flujo interno

El repositorio usa OpenSpec localmente para planificar cambios. `openspec/` está en `.gitignore`; los artefactos no se versionan. Las decisiones no obvias suelen estar documentadas en comentarios `⚠️` dentro del código y en `AGENTS.md`.

### Agentes de IA

Lee [`AGENTS.md`](./AGENTS.md) antes de tocar el proyecto. Contiene:

- Comandos exactos.
- Arquitectura.
- Reglas de autorización.
- Frontera de datos.
- Defectos conocidos.
- Convenciones de OpenSpec.

---

## Recursos

### Documentación oficial

- [Next.js](https://nextjs.org/docs)
- [React](https://react.dev)
- [TypeScript](https://www.typescriptlang.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [base-ui](https://base-ui.com)
- [shadcn/ui](https://ui.shadcn.com)
- [better-auth](https://www.better-auth.com/docs)
- [Drizzle ORM](https://orm.drizzle.team/docs/overview)
- [Drizzle Kit](https://orm.drizzle.team/docs/kit-overview)
- [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview)
- [Zod](https://zod.dev)
- [react-hook-form](https://react-hook-form.com/docs)
- [PostgreSQL](https://www.postgresql.org/docs)
- [Mailtrap](https://docs.mailtrap.io)
- [Cloudinary](https://cloudinary.com/documentation)

### Documentación interna

- [`AGENTS.md`](./AGENTS.md)
- [`src/features/shared/components/ui/pagination/pagination-usage-guide.md`](./src/features/shared/components/ui/pagination/pagination-usage-guide.md)
- [`.env.example`](./.env.example)

---

## Licencia

El repositorio no declara un archivo de licencia. Si vas a reutilizarlo, consulta con el titular del proyecto.
