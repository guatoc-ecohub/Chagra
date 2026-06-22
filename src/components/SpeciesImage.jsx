/* eslint-disable react-hooks/set-state-in-effect --
 * El componente resuelve una imagen remota/cacheada al montar o al cambiar el
 * nombre científico. Ese estado async no pertenece al render síncrono.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Bug, ImageOff, Leaf, Microscope } from 'lucide-react';
import { getSpeciesImage, parseCatalogImage } from '../services/speciesImageService';

function classifySpecies({ category, commonName, scientificName }) {
  const text = `${category || ''} ${commonName || ''} ${scientificName || ''}`.toLowerCase();
  if (/fusarium|plaga|patogen|patógen|enfermedad|insect|broca|ácaro|acaro/.test(text)) return 'patogeno';
  if (/trichoderma|hongo|fung|microorgan|bacteria|bacillus/.test(text)) return 'microorganismo';
  if (/invasora|maleza|helecho|pasto/.test(text)) return 'organismo';
  return 'planta';
}

function FallbackIcon({ kind, size = 28 }) {
  if (kind === 'microorganismo') return <Microscope size={size} aria-hidden="true" />;
  if (kind === 'patogeno') return <Bug size={size} aria-hidden="true" />;
  if (kind === 'planta') return <Leaf size={size} aria-hidden="true" />;
  return <ImageOff size={size} aria-hidden="true" />;
}

// Emoji grande de categoría — la cara visible del fallback cuando NO hay
// foto. Contexto inmediato (campesino/niño) sin depender de la red.
const FALLBACK_EMOJI = {
  planta: '🌱',
  patogeno: '🐛',
  microorganismo: '🔬',
  organismo: '🌿',
};

// Fondo suave por categoría — el fallback NUNCA es un hueco vacío.
const FALLBACK_BG = {
  planta: 'from-emerald-900/30 to-slate-900 border-emerald-700/40',
  patogeno: 'from-amber-900/30 to-slate-900 border-amber-700/40',
  microorganismo: 'from-sky-900/30 to-slate-900 border-sky-700/40',
  organismo: 'from-lime-900/30 to-slate-900 border-lime-700/40',
};

export default function SpeciesImage({
  scientificName,
  commonName,
  category,
  catalogImage,
  className = '',
  compact = false,
}) {
  const [state, setState] = useState({ status: 'idle', image: null });
  const handleImageError = React.useCallback(() => {
    setState({ status: 'error', image: null });
  }, []);
  const kind = useMemo(
    () => classifySpecies({ category, commonName, scientificName }),
    [category, commonName, scientificName]
  );

  useEffect(() => {
    let cancelled = false;

    // La imagen curada del catálogo tiene prioridad y funciona aunque no
    // haya nombre científico (algunos catálogos solo traen nombre común).
    const curated = parseCatalogImage({ imagen: catalogImage });
    if (curated) {
      setState({ status: 'ready', image: curated });
      return undefined;
    }

    const name = String(scientificName || '').trim();
    if (!name) {
      // Sin nombre científico no podemos pegarle a GBIF/Wikimedia, pero el
      // fallback (emoji + nombre común) SÍ se muestra — nunca un hueco vacío.
      setState({ status: 'empty', image: null });
      return undefined;
    }

    setState({ status: 'loading', image: null });
    getSpeciesImage(name)
      .then((image) => {
        if (cancelled) return;
        setState({ status: image ? 'ready' : 'empty', image });
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn('[SpeciesImage] lookup failed:', err?.message || err);
        setState({ status: 'error', image: null });
      });

    return () => {
      cancelled = true;
    };
  }, [scientificName, catalogImage]);

  const label = kind === 'patogeno'
    ? 'Imagen de referencia del organismo. Puede no mostrar el síntoma en la planta.'
    : kind === 'microorganismo'
      ? 'Imagen de referencia del microorganismo.'
      : 'Imagen de referencia de la especie.';

  if (state.status === 'loading') {
    return (
      <div className={`relative overflow-hidden rounded-lg bg-slate-800 ${compact ? 'h-20' : 'h-44'} ${className}`}>
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800" />
      </div>
    );
  }

  if (!state.image) {
    // Bug 2026-06-20 (operador, fresa): el catálogo NO tiene imágenes (0/65
    // especies) y las APIs externas pueden devolver vacío/offline. El
    // fallback debe ser SIEMPRE una tarjeta clara con contexto, nunca un
    // hueco vacío. Mostramos emoji de categoría + nombre de la especie
    // sobre fondo suave.
    const displayName = commonName || scientificName || 'Especie';
    const emoji = FALLBACK_EMOJI[kind] || '🌱';
    const bg = FALLBACK_BG[kind] || FALLBACK_BG.planta;

    if (compact) {
      return (
        <div
          data-testid="species-image-fallback"
          className={`flex h-20 items-center gap-2 rounded-lg border bg-gradient-to-br px-3 ${bg} ${className}`}
          title={`Sin foto de referencia para ${displayName}`}
        >
          <span className="text-2xl leading-none" aria-hidden="true">{emoji}</span>
          <span className="min-w-0 truncate text-xs font-semibold text-slate-200">{displayName}</span>
        </div>
      );
    }

    return (
      <figure
        data-testid="species-image-fallback"
        className={`relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border bg-gradient-to-br p-6 text-center ${bg} ${className}`}
        style={{ minHeight: '11rem' }}
      >
        <div className="grid h-16 w-16 place-items-center rounded-full bg-slate-950/40 ring-1 ring-white/10">
          <span className="text-3xl leading-none" aria-hidden="true">{emoji}</span>
        </div>
        <figcaption className="min-w-0">
          <p className="truncate text-sm font-bold text-white">{displayName}</p>
          {scientificName && commonName && (
            <p className="truncate text-[11px] italic text-slate-400">{scientificName}</p>
          )}
          <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-slate-400">
            <FallbackIcon kind={kind} size={11} /> Foto de referencia pendiente
          </p>
        </figcaption>
      </figure>
    );
  }

  return (
    <figure className={`relative overflow-hidden rounded-lg border border-slate-800 bg-slate-900 ${className}`}>
      <img
        src={state.image.thumbUrl || state.image.url}
        alt={`${label} ${scientificName || commonName || ''}`.trim()}
        className={`${compact ? 'h-20' : 'h-44'} w-full object-cover`}
        loading="lazy"
        onError={handleImageError}
      />
      <figcaption className="absolute inset-x-0 bottom-0 bg-slate-950/82 px-2 py-1.5 backdrop-blur-sm">
        <p className="truncate text-[10px] font-semibold text-slate-100">{label}</p>
        <a
          href={state.image.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="block truncate text-[9px] text-slate-300 underline decoration-slate-500 underline-offset-2"
          title={`${state.image.rightsHolder} · ${state.image.license} · ${state.image.source}`}
        >
          {state.image.rightsHolder} · {state.image.license} · {state.image.source}
        </a>
      </figcaption>
    </figure>
  );
}
