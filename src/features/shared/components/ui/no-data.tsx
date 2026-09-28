"use client"

// components/EmptyState.tsx
export const NoData = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full p-4 text-center">
      <div className="bg-gray-100 p-6 rounded-full mb-4">
        {/* Un icono simple de una lupa o caja vacía */}
        <svg 
          className="w-12 h-12 text-gray-400" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-700 animate-pulse">
        No se encontraron datos
      </h2>
      <p className="text-gray-500 mt-2 max-w-sm">
        Parece que no hay información disponible en este momento.
      </p>
    </div>
  );
}