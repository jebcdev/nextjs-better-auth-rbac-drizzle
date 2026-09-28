import { QueryClient } from "@tanstack/react-query";

let queryClientInstance: QueryClient | null = null;

export function getQueryClient(): QueryClient {
    if (!queryClientInstance) {
        queryClientInstance = new QueryClient({
            defaultOptions: {
                queries: {
                    refetchOnWindowFocus: false,
                    retry: false,
                    staleTime: 1000 * 60 * 5,
                    gcTime: 1000 * 60 * 10,
                },
                mutations: {
                    retry: false,
                },
            },
        });
    }
    return queryClientInstance;
}
