"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { XIcon } from "lucide-react";

import { Button } from "@/features/shared/components/ui/button";
import {
    Combobox,
    ComboboxInput,
} from "@/features/shared/components/ui/combobox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/features/shared/components/ui/select";
import {
    PAGINATION_PARAM_PAGE,
    PAGINATION_PARAM_SEARCH,
} from "@/features/shared/components/ui";
import {
    ADMIN_USERS_ROLE_ITEMS,
    ADMIN_USERS_ROLE_LABELS,
    ADMIN_USERS_ROLE_OPTIONS,
    ADMIN_USERS_ROLE_PARAM,
    ADMIN_USERS_STATUS_LABELS,
    ADMIN_USERS_STATUS_OPTIONS,
    ADMIN_USERS_STATUS_PARAM,
} from ".";
import type {
    AdminUserRoleFilter,
    AdminUserStatusFilter,
} from ".";

/** Retardo del debounce, en milisegundos. */
const SEARCH_DEBOUNCE_MS = 300;

interface Props {
    /** Inutiliza TODOS los controles, incluidos el botón de limpiar. */
    disabled?: boolean;
}

/** Styles del contenedor de un grupo segmentado. */
const GROUP_CONTAINER_CLASS =
    "flex items-center gap-1 rounded-4xl border border-border p-1";

const SEGMENT_CLASS = "rounded-4xl";

export const AdminDashboardUsersFilters = ({
    disabled = false,
}: Props) => {
    const router = useRouter();
    const searchParams = useSearchParams();

    const currentSearch = searchParams.get(PAGINATION_PARAM_SEARCH) ?? "";
    const currentRole = searchParams.get(
        ADMIN_USERS_ROLE_PARAM,
    ) as AdminUserRoleFilter | null;
    const currentStatus = searchParams.get(
        ADMIN_USERS_STATUS_PARAM,
    ) as AdminUserStatusFilter | null;

    const [searchInput, setSearchInput] = useState(currentSearch);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastAppliedSearchRef = useRef(currentSearch);

    /**
     * Único punto por el que la barra de filtros modifica la URL.
     *
     * ⚠️ Siempre resetea `page` a 1. Centralizarlo aquí es lo que hace que
     * «filtrar vuelve a la primera página» sea cierto por construcción y no por
     * recordar escribirlo en cada punto de llamada: filtrar sobre la página 5
     * produciría una combinación vacía si el `page` sobreviviera al cambio.
     *
     * ⚠️ Un valor vacío borra la clave en vez de dejar `?role=`: una URL con
     * `?search=` y otra sin `search` describen el mismo listado, y si la clave
     * se queda vacía la caché se fragmenta entre dos URLs equivalentes.
     *
     * Los parámetros ajenos se conservan porque `URLSearchParams` se clona del
     * estado actual: paginar no puede perder el filtro activo.
     */
    const updateParam = useCallback(
        (key: string, value: string | null) => {
            const params = new URLSearchParams(searchParams.toString());

            if (value === null || value === "") {
                params.delete(key);
            } else {
                params.set(key, value);
            }

            params.set(PAGINATION_PARAM_PAGE, "1");
            router.push(`?${params.toString()}`);
        },
        [router, searchParams],
    );

    // La barra no está bloqueada mientras se escribe, así que el efecto de
    // debounce lee `updateParam` por ref: incluirlo en las dependencias
    // reiniciaría el temporizador en cada navegación.
    const updateParamRef = useRef(updateParam);
    useEffect(() => {
        updateParamRef.current = updateParam;
    });

    /**
     * Debounce de la búsqueda.
     *
     * ⚠️ El guard `lastAppliedSearchRef` evita que el montaje empuje la URL: sin
     * él, el primer render dispararía una navegación idéntica a la actual.
     */
    useEffect(() => {
        if (searchInput === lastAppliedSearchRef.current) {
            return;
        }

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            lastAppliedSearchRef.current = searchInput;
            updateParamRef.current(
                PAGINATION_PARAM_SEARCH,
                searchInput || null,
            );
        }, SEARCH_DEBOUNCE_MS);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [searchInput]);

    /**
     * Resincroniza el input con la URL cuando el término aplicado cambia.
     *
     * ⚠️ El proyecto de referencia no tiene esto y por eso se queda a medias: un
     * super admin busca, pulsa «atrás» del navegador, la cuadrícula vuelve al
     * listado anterior pero el input sigue mostrando el término nuevo. El efecto
     * compara contra lo que ESTE control aplicó, no contra el estado local, para
     * no pelearse con el usuario mientras escribe.
     */
    useEffect(() => {
        if (currentSearch !== lastAppliedSearchRef.current) {
            lastAppliedSearchRef.current = currentSearch;
            setSearchInput(currentSearch);
        }
    }, [currentSearch]);

    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    const activeStatus: AdminUserStatusFilter = currentStatus ?? "all";

    const hasActiveFilters =
        currentSearch !== "" || currentRole !== null || currentStatus !== null;

    const handleClear = () => {
        setSearchInput("");
        lastAppliedSearchRef.current = "";
        router.push("?");
    };

    return (
        <div className="flex flex-wrap items-center gap-3">
            {/* Sin `ComboboxContent`: la búsqueda coincide contra valores
                almacenados, no contra un conjunto conocido, así que no hay lista
                que mostrar. El combobox aporta el chrome del proyecto y el botón
                de limpiar que el `Input` plano del proyecto de referencia no
                tenía. `showTrigger={false}` es obligatorio: el disparador abriría
                un desplegable vacío. */}
            <Combobox>
                <ComboboxInput
                    placeholder="Buscar por nombre o correo..."
                    className="w-full max-w-sm"
                    value={searchInput}
                    onChange={(event) =>
                        setSearchInput(event.target.value)
                    }
                    disabled={disabled}
                    showTrigger={false}
                    showClear
                />
            </Combobox>

            {/* ⚠️ El filtro de rol es un `Select`, no un grupo segmentado.
                Con `ADMIN_USERS_ROLES` como fuente de opciones salía un único
                botón —*Administrador*, porque `SUPER_ADMIN_ROLE="admin"`— o sea
                un filtro que no puede filtrar nada. Un desplegable con
                *Todos / Administrador / Usuario / Invitado* sí sirve, y de paso
                cabe en el ancho sin empujar al resto de la barra. */}
            <Select
                items={ADMIN_USERS_ROLE_ITEMS}
                value={currentRole ?? "all"}
                onValueChange={(value) =>
                    // ⚠️ `null` y `"all"` significan ambos «sin filtro», y los
                    // dos borran la clave: «Todos los roles» y la ausencia de
                    // `role` son la misma URL y la misma clave de caché.
                    updateParam(
                        ADMIN_USERS_ROLE_PARAM,
                        !value || value === "all" ? null : value,
                    )
                }
                disabled={disabled}
            >
                <SelectTrigger className="h-9 w-44 rounded-4xl">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {ADMIN_USERS_ROLE_OPTIONS.map((role) => (
                        <SelectItem key={role} value={role}>
                            {ADMIN_USERS_ROLE_LABELS[role]}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <div className={GROUP_CONTAINER_CLASS}>
                {ADMIN_USERS_STATUS_OPTIONS.map((status) => {
                    const isSelected = activeStatus === status;

                    return (
                        <Button
                            key={status}
                            variant={isSelected ? "default" : "ghost"}
                            size="sm"
                            className={SEGMENT_CLASS}
                            disabled={disabled}
                            aria-pressed={isSelected}
                            onClick={() =>
                                updateParam(
                                    ADMIN_USERS_STATUS_PARAM,
                                    isSelected ? null : status,
                                )
                            }
                        >
                            {ADMIN_USERS_STATUS_LABELS[status]}
                        </Button>
                    );
                })}
            </div>

            {/* Solo se ofrece cuando hay algo que limpiar: un «limpiar filtros»
                permanent sería ruido visual en el listado sin filtros. */}
            {hasActiveFilters && (
                <Button
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    onClick={handleClear}
                >
                    <XIcon className="size-4" />
                    Limpiar filtros
                </Button>
            )}
        </div>
    );
};
