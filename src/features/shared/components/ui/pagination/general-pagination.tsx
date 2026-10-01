"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Button 
} from "@/features/shared/components/ui/";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { PAGE_SIZE_OPTIONS } from "./pagination.constants";
import { resolvePageSize } from "./pagination.utils";
import type { GeneralPaginationProps } from "./pagination.interfaces";

export function GeneralPagination({
    totalPages,
    disabled = false,
}: GeneralPaginationProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const currentPage = useMemo(() => {
        const pageParam = searchParams.get("page");
        const parsed = Number(pageParam);
        const page = Number.isFinite(parsed) ? parsed : 1;
        return Math.max(1, Math.min(page, totalPages));
    }, [searchParams, totalPages]);

    const currentPageSize = useMemo(() => {
        const sizeParam = searchParams.get("pageSize");
        return resolvePageSize(sizeParam);
    }, [searchParams]);

    const createPageURL = useCallback(
        (page: number, pageSize?: number) => {
            const params = new URLSearchParams(searchParams);
            params.set("page", String(page));
            if (pageSize !== undefined) {
                params.set("pageSize", String(pageSize));
            }
            return `?${params.toString()}`;
        },
        [searchParams],
    );

    const handlePageChange = useCallback(
        (page: number) => {
            router.push(createPageURL(page));
        },
        [router, createPageURL],
    );

    const handlePageSizeChange = useCallback(
        (value: string | null) => {
            if (!value) return;
            const newSize = Number(value);
            if (!Number.isFinite(newSize)) return;
            router.push(createPageURL(1, newSize));
        },
        [router, createPageURL],
    );

    const pageNumbers = useMemo(() => {
        const pages: (number | "...")[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push("...");
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) pages.push(i);
            if (currentPage < totalPages - 2) pages.push("...");
            if (totalPages > 1) pages.push(totalPages);
        }
        return pages;
    }, [currentPage, totalPages]);

    return (
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 mb-10">
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                    Mostrar
                </span>
                <Select
                    value={String(currentPageSize)}
                    onValueChange={handlePageSizeChange}
                    disabled={disabled}
                >
                    <SelectTrigger className="h-9 w-18 rounded-4xl">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {PAGE_SIZE_OPTIONS.map((size) => (
                            <SelectItem
                                key={size}
                                value={String(size)}
                            >
                                {size}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">
                    por página
                </span>
            </div>

            <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    disabled={currentPage <= 1 || disabled}
                    onClick={() => handlePageChange(currentPage - 1)}
                >
                    <ChevronLeftIcon className="h-4 w-4" />
                </Button>

                {pageNumbers.map((page, index) =>
                    page === "..." ? (
                        <span
                            key={`ellipsis-${index}`}
                            className="px-2 text-sm text-muted-foreground"
                        >
                            ...
                        </span>
                    ) : (
                        <Button
                            key={page}
                            variant={page === currentPage ? "default" : "outline"}
                            size="icon"
                            className="h-9 w-9"
                            disabled={disabled}
                            onClick={() => handlePageChange(page)}
                        >
                            {page}
                        </Button>
                    ),
                )}

                <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    disabled={currentPage >= totalPages || disabled}
                    onClick={() => handlePageChange(currentPage + 1)}
                >
                    <ChevronRightIcon className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
