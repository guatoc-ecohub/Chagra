/* eslint-disable react-hooks/set-state-in-effect --
 * El componente resuelve una imagen remota/cacheada al montar o al cambiar el
 * nombre cientifico. Ese estado async no pertenece al render sincrono.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bug, ImageOff, Leaf, Microscope } from 'lucide-react';
import { getSpeciesImage, parseCatalogImage } from '../services/speciesImageService';

// Bug #61 (ficha de especie, foto no carga): en senal movil rural el
// `original.jpg` de iNaturalist (1.7-3.5 MB) nunca termina de bajar.
// El resolver ya deriva `thumbUrl` a la variante `medium` (10-20x mas
// liviana), pero el S3 open-data solo sirve `original`. Si `medium` no
// existe (404 o timeout), reintentamos con la URL original antes de caer
// al fallback.
const IMAGE_TIMEOUT_MS = 15000;
const PLACEHOLDER_URL = '/placeholder-species.svg';

function classifySpecies({ category, commonName, scientificName }) {
  const text = `${category || ''} ${commonName || ''} ${scientificName || ''}`.toLowerCase();
  if (/fusarium|plaga|patogen|patogen|enfermedad|insect|broca|acaro|acaro/.test(text)) return 'patogeno';
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

// Emoji grande de categoria - la cara visible del fallback cuando NO hay
// foto. Contexto inmediato (campesino/nino) sin depender de la red.
const FALLBACK_EMOJI = {
  planta: '\u{1F331}',
  patogeno: '\u{1F41B}',
  microorganismo: '\u{1F52C}',
  organismo: '\u{1F33F}',
};

// Fondo suave por categoria - el fallback NUNCA es un hueco vacio.
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
  // Bug #61: si thumbUrl (medium) falla, reintentamos con la URL original
  // antes de caer al fallback emoji. failedThumb=true cambia el src a la
  // url original (si existe y es distinta de thumbUrl).
  const [failedThumb, setFailedThumb] = useState(false);
  const timeoutRef = useRef(null);

  // Bug #61: currentSrc se computa en render desde state.image + failedThumb.
  // Si thumbUrl existe y no ha fallado aun, usamos thumbUrl (medium, mas
  // liviano). Si fallo, caemos a la url original (full-res).
  const currentSrc = useMemo(() => {
    if (!state.image) return null;
    const thumb = state.image.thumbUrl;
    const orig = state.image.url;
    if (thumb && orig && thumb !== orig && failedThumb) return orig;
    return thumb || orig || null;
  }, [state.image, failedThumb]);

  const kind = useMemo(
    () => classifySpecies({ category, commonName, scientificName }),
    [category, commonName, scientificName]
  );

  const clearImageTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleImageLoad = useCallback(() => {
    clearImageTimeout();
  }, [clearImageTimeout]);

  // Bug #61: reintento con URL original si thumbUrl falla. onError se
  // dispara por 404 (medium no existe en S3 open-data) o por timeout
  // (conexion rural colgada). Si ya fallamos thumb y la original tambien
  // falla, caemos al fallback emoji.
  const handleImageError = useCallback(() => {
    clearImageTimeout();
    if (state.image && !failedThumb) {
      const thumb = state.image.thumbUrl;
      const orig = state.image.url;
      if (thumb && orig && thumb !== orig) {
        setFailedThumb(true);
        return;
      }
    }
    setState({ status: 'error', image: null });
  }, [clearImageTimeout, state.image, failedThumb]);

  // Reinicia failedThumb cuando el image cambia (nueva especie/busqueda)
  useEffect(() => {
    setFailedThumb(false);
  }, [state.image]);

  // Timeout para imagenes colgadas en senal rural. Si tras
  // IMAGE_TIMEOUT_MS onLoad/onError no se disparo, forzamos el
  // reintento (failedThumb) o caemos al fallback.
  useEffect(() => {
    if (state.status !== 'ready' || !currentSrc) return undefined;
    clearImageTimeout();
    timeoutRef.current = setTimeout(() => {
      setState((prev) => {
        if (!prev.image) return { status: 'error', image: null };
        const thumb = prev.image.thumbUrl;
        const orig = prev.image.url;
        if (thumb && orig && thumb !== orig) {
          setFailedThumb(true);
          return prev;
        }
        return { status: 'error', image: null };
      });
    }, IMAGE_TIMEOUT_MS);
    return clearImageTimeout;
  }, [state.status, currentSrc, clearImageTimeout]);

  useEffect(() => {
    let cancelled = false;

    // La imagen curada del catalogo tiene prioridad y funciona aunque no
    // haya nombre cientifico (algunos catalogos solo traen nombre comun).
    const curated = parseCatalogImage({ imagen: catalogImage });
    if (curated) {
      setState({ status: 'ready', image: curated });
      return undefined;
    }

    const name = String(scientificName || '').trim();
    if (!name) {
      // Sin nombre cientifico no podemos pegarle a GBIF/Wikimedia, pero el
      // fallback (emoji + nombre comun) SI se muestra - nunca un hueco vacio.
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
    ? 'Imagen de referencia del organismo. Puede no mostrar el sintoma en la planta.'
    : kind === 'microorganismo'
      ? 'Imagen de referencia del microorganismo.'
      : 'Imagen de referencia de la especie.';

  if (state.status === 'loading') {
    return (
      <div
        className={`relative overflow-hidden rounded-lg bg-slate-800 bg-cover bg-center ${compact ? 'h-20' : 'h-44'} ${className}`}
        style={{ backgroundImage: `url(${PLACEHOLDER_URL})` }}
      >
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-slate-800/90 via-slate-700/90 to-slate-800/90" />
      </div>
    );
  }

  if (!state.image) {
    // Bug 2026-06-20 (operador, fresa): el catalogo NO tiene imagenes (0/65
    // especies) y las APIs externas pueden devolver vacio/offline. El
    // fallback debe ser SIEMPRE una tarjeta clara con contexto, nunca un
    // hueco vacio. Mostramos emoji de categoria + nombre de la especie
    // sobre fondo suave.
    const displayName = commonName || scientificName || 'Especie';
    const emoji = FALLBACK_EMOJI[kind] || '\u{1F331}';
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

  // Bug #61: la imagen resuelve pero puede no cargar (S3 sin medium,
  // senal rural lenta). Ponemos placeholder como background del contenedor
  // para que nunca sea un hueco blanco. Si failedThumb=true, currentSrc
  // apunta a la URL original (reintento tras fallar thumbUrl).

  return (
    <figure
      className={`relative overflow-hidden rounded-lg border border-slate-800 bg-slate-900 bg-cover bg-center ${className}`}
      style={{ backgroundImage: `url(${PLACEHOLDER_URL})` }}
    >
      <img
        src={currentSrc}
        alt={`${label} ${scientificName || commonName || ''}`.trim()}
        className={`${compact ? 'h-20' : 'h-44'} w-full object-cover`}
        loading="lazy"
        onLoad={handleImageLoad}
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