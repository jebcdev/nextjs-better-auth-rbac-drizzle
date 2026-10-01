#!/usr/bin/env bash
#
# reset-db.sh — Reinicia la base de datos nextjs_rbac_drizzle
#
# Uso:
#   ./reset-db.sh
#   ./reset-db.sh -h localhost -p 5432 -U postgres -d nextjs_rbac_drizzle
#
# Requiere: psql instalado y acceso al servidor PostgreSQL.

set -euo pipefail

# ---- Valores por defecto (ajústalos o pásalos por flags) ----
DB_NAME="nextjs_rbac_drizzle"
DB_HOST="${PGHOST:-localhost}"
DB_PORT="${PGPORT:-5432}"
DB_USER="${PGUSER:-postgres}"

# ---- Parseo de argumentos ----
while getopts ":h:p:U:d:" opt; do
  case "$opt" in
    h) DB_HOST="$OPTARG" ;;
    p) DB_PORT="$OPTARG" ;;
    U) DB_USER="$OPTARG" ;;
    d) DB_NAME="$OPTARG" ;;
    \?) echo "Opción inválida: -$OPTARG" >&2; exit 1 ;;
    :)  echo "La opción -$OPTARG requiere un valor." >&2; exit 1 ;;
  esac
done

echo "▶ Reseteando base de datos '$DB_NAME' en $DB_HOST:$DB_PORT como '$DB_USER'"

# ---- Ejecutar el SQL ----
# Nos conectamos a 'postgres' (o template1) porque no podemos dropear la DB a la que estamos conectados.
psql \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="postgres" \
  --set=ON_ERROR_STOP=1 \
  --set=dbname="$DB_NAME" \
  <<'SQL'
-- Terminar conexiones activas a la DB objetivo
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = :'dbname' AND pid <> pg_backend_pid();

-- Eliminar si existe
DROP DATABASE IF EXISTS :"dbname";

-- Recrear
CREATE DATABASE :"dbname";

-- (Opcional) Asignar dueño distinto
-- CREATE DATABASE :"dbname" OWNER mi_usuario;
SQL

echo "✅ Base de datos '$DB_NAME' reseteada correctamente."