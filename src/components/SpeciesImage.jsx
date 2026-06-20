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

function FallbackIcon({ kind }) {
  if (kind === 'microorganismo') return <Microscope size={28} aria-hidden="true" />;
  if (kind === 'patogeno') return <Bug size={28} aria-hidden="true" />;
  if (kind === 'planta') return <Leaf size={28} aria-hidden="true" />;
  return <ImageOff size={28} aria-hidden="true" />;
}

export default function SpeciesImage({
  scientificName,
  commonName,
  category,
  catalogImage,
  className = '',
  compact = false,
}) {
  const [state, setState] = useState({ status: 'idle', image: null });
  const kind = useMemo(
    () => classifySpecies({ category, commonName, scientificName }),
    [category, commonName, scientificName]
  );

  useEffect(() => {
    let cancelled = false;
    const name = String(scientificName || '').trim();
    if (!name) {
      setState({ status: 'empty', image: null });
      return undefined;
    }

    const curated = parseCatalogImage({ imagen: catalogImage });
    if (curated) {
      setState({ status: 'ready', image: curated });
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
    if (compact) {
      return (
        <div
          className={`grid h-20 place-items-center rounded-lg border species-image-fallback ${className}`}
          title={`Sin imagen con licencia abierta para ${scientificName || commonName || 'esta especie'}`}
        >
          <FallbackIcon kind={kind} />
        </div>
      );
    }

    return (
      <div className={`relative flex items-center gap-3 rounded-lg border p-3 species-image-fallback-large ${className}`}>
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md species-image-icon">
          <FallbackIcon kind={kind} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold species-image-title">Sin foto confiable todavía</p>
          <p className="text-[11px] leading-snug species-image-text">
            No se encontró una imagen con licencia abierta para {scientificName || commonName || 'esta especie'}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <figure className={`relative overflow-hidden rounded-lg border border-slate-800 bg-slate-900 ${className}`}>
      <img
        src={state.image.thumbUrl || state.image.url}
        alt={`${label} ${scientificName || commonName || ''}`.trim()}
        className={`${compact ? 'h-20' : 'h-44'} w-full object-cover`}
        loading="lazy"
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
