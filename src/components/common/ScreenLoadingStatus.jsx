import React from 'react';
import { AlertTriangle, PackageOpen } from 'lucide-react';
import ChagraGrowLoader from '../ChagraGrowLoader';

/**
 * ScreenLoadingStatus — estado de carga / vacio / error reutilizable.
 *
 * Props:
 *  - isLoading (boolean) — muestra el loader de la casa (ChagraGrowLoader)
 *  - loadingMessage (string) — mensaje contextual de carga ("Cargando el
 *    catálogo…"); pásalo SIEMPRE que sepas qué se está cargando — el
 *    "Cargando..." genérico es solo el último recurso (perceived performance)
 *  - isEmpty (boolean) — muestra estado vacio
 *  - hasError (boolean) — muestra estado de error
 *  - emptyTitle (string) — titulo del estado vacio
 *  - emptyDescription (string) — descripcion del estado vacio
 *  - errorMessage (string) — mensaje de error
 *  - onRetry (function) — callback del boton reintentar
 */
export default function ScreenLoadingStatus({
  isLoading = false,
  loadingMessage = 'Cargando...',
  isEmpty = false,
  hasError = false,
  emptyTitle = '',
  emptyDescription = '',
  errorMessage = '',
  onRetry,
}) {
  if (isLoading) {
    return (
      <div className="h-[100dvh] w-full flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          {/* Loader de la casa (planta que crece; respeta reduced-motion) en
              lugar del spinner genérico — misma gramática visual que el
              fallback de Suspense y el directorio. */}
          <ChagraGrowLoader size={56} ariaLabel={loadingMessage} />
          <p className="text-slate-400 text-sm font-medium" aria-hidden="true">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="h-[100dvh] w-full flex items-center justify-center bg-slate-950 p-6">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
            <PackageOpen size={32} className="text-slate-500" aria-hidden="true" />
          </div>
          {emptyTitle && (
            <h2 className="text-lg font-bold text-white">{emptyTitle}</h2>
          )}
          {emptyDescription && (
            <p className="text-sm text-slate-400 leading-relaxed">{emptyDescription}</p>
          )}
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="h-[100dvh] w-full flex items-center justify-center bg-slate-950 p-6">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-16 h-16 bg-red-900/50 rounded-full flex items-center justify-center">
            <AlertTriangle size={32} className="text-red-400" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-bold text-white">Algo fallo</h2>
          {errorMessage ? (
            <p className="text-sm text-slate-400 leading-relaxed">{errorMessage}</p>
          ) : (
            <p className="text-sm text-slate-400 leading-relaxed">
              Ocurrio un error inesperado. Tus datos estan a salvo.
            </p>
          )}
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 py-3 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors text-sm"
            >
              Intentar de nuevo
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
