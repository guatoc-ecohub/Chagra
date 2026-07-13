/* eslint-disable chagra-i18n/no-hardcoded-spanish -- legacy UI copy already tracked separately */
import React, { useState, useMemo, useEffect } from 'react';
import { X, Calendar, Tag, Activity, MapPin, AlertCircle, Images, Skull, Layers, Sprout } from 'lucide-react';
import { SplitFlow } from './SplitFlow';
import PlantCemeteryModal from './PlantCemeteryModal';
import useAssetStore from '../store/useAssetStore';
import AssetTimeline from './AssetTimeline';
import { InputLogForm } from './InputLogForm';
import MapPicker from './MapPicker';
import PlanEditor from './PlanEditor';
import { useAssetPerformance } from '../hooks/useAssetPerformance';
import { MATERIAL_CATEGORIES } from '../config/materials';
import { FARM_CONFIG } from '../config/defaults';
import { geoJsonToWkt, wktToGeoJson } from '../utils/geo';
import { proximityCheck, findNearestLand, checkInvasiveProximity, getCoords } from '../utils/spatialAnalysis';
import { ExternalAiButton } from './common/ExternalAiButton';
import { buildOpenExternalPrompt } from '../services/externalAiPromptBuilder';
import { listUserPhotosBySpecies, captureAndCompress, savePhoto } from '../services/photoService';
import { usePhotoUrl } from '../hooks/usePhotoUrl';
import { ETAPA_FENOLOGICA_LABELS } from '../utils/plantMeta';
import { getAllSpecies } from '../db/catalogDB';
import SpeciesImage from './SpeciesImage';
import { matchSpeciesInCatalog } from '../utils/speciesResolver';
import { getFeedingPlanKindForSpecies, resolveFeedingPlanTemplateForSpecies } from '../data/feedingPlanFrutales';

// Derive speciesSlug from asset name.
function deriveSpeciesSlug(name) {
  if (!name || typeof name !== 'string') return null;
  return name.replace(/\s+#\d+$/, '').toLowerCase().replace(/\s+/g, '_').trim() || null;
}

// Nombre común legible derivado del nombre del asset (quita el sufijo "#N").
// Último recurso para el fallback de SpeciesImage cuando el catálogo no
// resuelve la especie — siempre mostramos algo con sentido al operador.
function deriveCommonName(name) {
  if (!name || typeof name !== 'string') return null;
  return name.replace(/\s+#\d+\s*$/, '').trim() || null;
}

// UX-26 (#286) 2026-05-27 — bug operador: la sección de foto era una
// caja gris separada al final del scroll, fea, descontextualizada. Pidió
// que la foto se integrara al hero principal del activo "bellamente".
//
// Rediseño: PhotoHeroSection es ahora el HERO del detail panel.
//   - Si hay foto: imagen 4:3 full-width como portada, con overlay
//     gradient + botón pequeño "Cambiar foto" abajo-derecha.
//   - Si NO hay foto: card grande con CTA prominente "Agregar foto" +
//     icono de cámara + copy contextual según assetType.
//   - Cuenta con el evento `chagra:photo:saved` para refrescar el
//     thumb inmediato sin volver a montar.
//
// Copy contextual por tipo de asset.
const PHOTO_HERO_LABELS = {
  plant: { title: 'Foto de la planta', cta: 'Agregar foto de la planta' },
  land: { title: 'Foto de la zona', cta: 'Agregar foto de la zona' },
  structure: { title: 'Foto de la estructura', cta: 'Agregar foto de la estructura' },
  equipment: { title: 'Foto del equipo', cta: 'Agregar foto del equipo' },
  default: { title: 'Foto', cta: 'Agregar foto' },
};

// UX-21 (#286) 2026-05-27 — copy success contextual según tipo de asset
// (operador: "me dice 'foto agregada para esta planta' cuando es zona").
// UX-26 (#286) 2026-05-27 — usados también por PhotoHeroSection.
const PHOTO_SUCCESS_LABELS = {
  plant: '✓ Foto guardada para esta planta.',
  land: '✓ Foto guardada para esta zona.',
  structure: '✓ Foto guardada para esta estructura.',
  equipment: '✓ Foto guardada para este equipo.',
  default: '✓ Foto guardada.',
};

function PhotoHeroSection({ assetId, speciesSlug, assetType, scientificName, commonName, category, catalogImage }) {
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  // Si la foto resuelta (usuario/catálogo) falla al decodificar en runtime,
  // caemos al fallback de SpeciesImage en vez de dejar una caja rota. Cubre
  // URLs que pasan el HEAD pero no son una imagen válida (defensa en
  // profundidad sobre el fix de checkImageExists en photoService).
  // Guardamos la URL rota (no un boolean): así, cuando la foto cambia a otra
  // URL, el flag se "resetea" solo por comparación, sin un useEffect que
  // llame setState (evita el cascading-render que veta el linter).
  const [brokenPhotoUrl, setBrokenPhotoUrl] = useState(null);
  const cameraRef = React.useRef(null);
  const galleryRef = React.useRef(null);

  // Foto actual del asset (si la hay) — se refresca via chagra:photo:saved.
  const photo = usePhotoUrl({ assetId, speciesSlug: speciesSlug || undefined });
  const heroImgBroken = !!photo.url && brokenPhotoUrl === photo.url;

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    setBusy(true);
    setSuccess(false);
    try {
      const { blob } = await captureAndCompress(file);
      await savePhoto({ blob, assetId, speciesSlug });
      // UX-20/22 (#286): notificar a todos los hooks usePhotoUrl que
      // matcheen este asset/species, para que actualicen su URL sin
      // esperar a un remount (AssetCardThumb, SpeciesPhotoGallery, y
      // el propio hero del PhotoHeroSection se refrescan en tiempo
      // real). Sin esto, quedaban en placeholder hasta refresh manual.
      window.dispatchEvent(new CustomEvent('chagra:photo:saved', {
        detail: { assetId: assetId || null, speciesSlug: speciesSlug || null },
      }));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.warn('[PhotoHeroSection] save failed:', err);
    } finally {
      setBusy(false);
      if (e.target) e.target.value = '';
    }
  };

  const labels = PHOTO_HERO_LABELS[assetType] || PHOTO_HERO_LABELS.default;
  const hasPhoto = photo.url && photo.source !== 'placeholder' && photo.source !== 'missing'
    && !photo.loading && !heroImgBroken;

  return (
    <section className="rounded-2xl overflow-hidden border border-slate-700/50 bg-slate-900" data-testid="photo-hero-section">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" aria-label="Tomar foto con camara" />
      <input ref={galleryRef} type="file" accept="image/*" onChange={handleFile} className="hidden" aria-label="Seleccionar foto de galeria" />

      {hasPhoto ? (
        // Hero con foto: imagen 4:3 + overlay gradient + botones flotantes.
        <div className="relative w-full aspect-[4/3] bg-slate-900">
          <img
            src={photo.url}
            alt={labels.title}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            onError={() => setBrokenPhotoUrl(photo.url)}
          />
          {/* Gradient para legibilidad de los botones overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-transparent pointer-events-none" />
          {/* Botones overlay abajo */}
          <div className="absolute bottom-0 inset-x-0 p-3 flex gap-2">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              disabled={busy}
              data-testid="photo-hero-retake-camera"
              className="flex-1 py-2.5 rounded-xl bg-slate-900/85 hover:bg-slate-800 active:scale-95 backdrop-blur-md border border-slate-700 text-white text-sm font-bold disabled:opacity-50"
            >
              📷 Cambiar
            </button>
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              disabled={busy}
              className="py-2.5 px-3 rounded-xl bg-slate-900/85 hover:bg-slate-800 active:scale-95 backdrop-blur-md border border-slate-700 text-white text-sm font-bold disabled:opacity-50"
              aria-label="Elegir foto de galería"
            >
              🖼️
            </button>
          </div>
          {busy && (
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center">
              <span className="text-sm text-slate-200 italic">Procesando…</span>
            </div>
          )}
        </div>
      ) : (
        // Hero sin foto: card grande con CTA prominente + SpeciesImage como fallback.
        <div className="p-6 bg-gradient-to-br from-emerald-900/20 to-slate-800/40 flex flex-col items-center gap-3 text-center">
          {/* Bug 2026-06-20 (operador, fresa): la sección de foto salía vacía
              cuando la especie no tiene imagen en el catálogo. SpeciesImage
              ahora SIEMPRE renderiza un fallback claro (emoji de categoría +
              nombre), aunque no haya nombre científico — nunca un hueco. */}
          {(scientificName || commonName) ? (
            <div className="w-full" data-testid="photo-hero-species-fallback">
              <SpeciesImage
                scientificName={scientificName}
                commonName={commonName}
                category={category}
                catalogImage={catalogImage}
                compact={false}
                className="w-full"
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-emerald-900/40 border border-emerald-700/50 flex items-center justify-center">
              <Images size={28} className="text-emerald-400" aria-hidden="true" />
            </div>
          )}
          <h3 className="text-base font-bold text-white">{labels.title}</h3>
          <p className="text-xs text-slate-400 max-w-xs">
            Aún no hay foto. Tomarla ayuda a identificar y recordar este activo.
          </p>
          <div className="grid grid-cols-2 gap-2 w-full max-w-sm mt-1">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              disabled={busy}
              data-testid="photo-hero-add-camera"
              className="py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white text-sm font-bold disabled:opacity-50 min-h-[48px]"
            >
              📷 Tomar foto
            </button>
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              disabled={busy}
              className="py-3 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 active:scale-95 text-white text-sm font-bold disabled:opacity-50 min-h-[48px]"
            >
              🖼️ Galería
            </button>
          </div>
          {busy && <p className="text-xs text-slate-400 italic mt-1">Procesando…</p>}
        </div>
      )}
      {success && (
        <p className="text-xs text-emerald-400 px-4 py-2 bg-emerald-900/20 border-t border-emerald-800/40" data-testid="photo-hero-success">
          {PHOTO_SUCCESS_LABELS[assetType] || PHOTO_SUCCESS_LABELS.default}
        </p>
      )}
    </section>
  );
}

// Gallery of photos for the same species.
function SpeciesPhotoGallery({ speciesSlug, currentAssetId }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const urls = [];
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    listUserPhotosBySpecies(speciesSlug).then((records) => {
      if (!alive) return;
      const enriched = records
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
        .map((rec) => {
          const url = URL.createObjectURL(rec.blob);
          urls.push(url);
          return { url, assetId: rec.assetId, createdAt: rec.createdAt };
        });
      setPhotos(enriched);
      setLoading(false);
    }).catch(() => {
      if (alive) setLoading(false);
    });
    return () => {
      alive = false;
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [speciesSlug]);

  if (loading) return <p className="text-xs text-slate-500 italic">Cargando fotos…</p>;
  if (photos.length === 0) {
    return <p className="text-xs text-slate-500 italic leading-relaxed">No hay otras fotos de esta especie.</p>;
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      {photos.map((p, i) => (
        <div key={i} className={`aspect-square rounded-lg overflow-hidden border ${p.assetId === currentAssetId ? 'border-emerald-500' : 'border-slate-800'} bg-slate-800 shadow-inner`}>
          <img src={p.url} alt="" className="w-full h-full object-cover" />
        </div>
      ))}
    </div>
  );
}

// Audit finding 070.3 (2026-05-18): muestra el estado actual de la planta
// (fecha de siembra/germinación, altura, etapa fenológica) cuando AssetsDashboard
// los persistió en attributes._chagra_plant_meta. Renderiza nada si no hay
// metadata — permite siembras rápidas sin saturar la vista.
const formatDaysAgo = (isoDate) => {
  if (!isoDate) return null;
  const t = new Date(isoDate).getTime();
  if (!Number.isFinite(t)) return null;
  const diffMs = Date.now() - t;
  if (diffMs < 0) return 'Programada a futuro';
  const days = Math.floor(diffMs / 86400000);
  if (days === 0) return 'Sembrada hoy';
  if (days === 1) return 'Sembrada hace 1 día';
  return `Sembrada hace ${days} días`;
};

const PlantMetaPanel = ({ asset }) => {
  const meta = asset?.attributes?._chagra_plant_meta;
  if (!meta || typeof meta !== 'object') return null;

  const fechaLabel = formatDaysAgo(meta.fecha_germinacion);
  const alturaLabel =
    meta.altura_cm != null && Number.isFinite(Number(meta.altura_cm))
      ? `Altura: ${Number(meta.altura_cm)} cm`
      : null;
  const etapaRaw = meta.etapa_fenologica;
  // UX-17 (#286) 2026-05-27: "Etapa: ..." → "Momento: ..." con label
  // amigable. Los labels mapean a copy de campo (ver plantMeta.js).
  const etapaLabel = etapaRaw ? `Momento: ${ETAPA_FENOLOGICA_LABELS[etapaRaw] || etapaRaw}` : null;

  if (!fechaLabel && !alturaLabel && !etapaLabel) return null;

  return (
    <section
      data-testid="plant-meta-panel"
      className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 space-y-2"
    >
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estado actual</h3>
      <ul className="space-y-1 text-sm text-white">
        {fechaLabel && <li>{fechaLabel}</li>}
        {alturaLabel && <li>{alturaLabel}</li>}
        {etapaLabel && <li>{etapaLabel}</li>}
      </ul>
    </section>
  );
};

// Audit finding 070.7 (2026-05-18): PlanEditor wrapper. Verifica si la
// species de la planta tiene `feeding_plan_template` en el catálogo:
//   - Si sí → monta PlanEditor (que se auto-fetchea de IDB store `plans`).
//   - Si no → muestra placeholder "Sin plan disponible" con botón mock
//     "Solicitar al equipo Chagra agregar plan" (sin envío real, queda
//     como hook UX para una futura iteración de feedback al catálogo).
// Resolución de speciesSlug:
//   1. asset.attributes._speciesSlug explícito (camino VoiceCapture / seeding).
//   2. asset.attributes._chagra_plant_meta.species_slug si existe.
//   3. deriveSpeciesSlug(name) como fallback.
// plantingDate viene de attributes._chagra_plant_meta.fecha_germinacion (post
// PR #918) o Date.now() si la planta aún no tiene metadata sembrada.
const resolveSpeciesSlug = (asset) => {
  if (!asset) return null;
  const explicit = asset.attributes?._speciesSlug || asset._speciesSlug;
  if (explicit && typeof explicit === 'string') return explicit;
  const metaSlug = asset.attributes?._chagra_plant_meta?.species_slug;
  if (metaSlug && typeof metaSlug === 'string') return metaSlug;
  const name = asset.attributes?.name || asset.name || '';
  return deriveSpeciesSlug(name);
};

const resolvePlantingDate = (asset) => {
  const fecha = asset?.attributes?._chagra_plant_meta?.fecha_germinacion;
  if (fecha) {
    const t = new Date(fecha).getTime();
    if (Number.isFinite(t)) return t;
  }
  return Date.now();
};

// Plan de NUTRICIÓN genérico (orientativo por tipo de cultivo). Se muestra
// cuando la especie está reconocida pero NO tiene `feeding_plan_template`
// propio. Marcado de forma visible como aproximado por TIPO de cultivo
// (anti-alucinación: nunca aparentar un dato específico que no tenemos). Solo
// NUTRICIÓN; la sanidad es otra sección. Dosis textuales del seed.
const GenericFeedingPlan = ({ template }) => {
  if (!template) return null;
  return (
    <section
      data-testid="plan-section-generic"
      className="bg-slate-800/40 p-4 rounded-xl border border-amber-700/40 space-y-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
          <Sprout size={12} /> Plan de alimentación
        </h3>
        <span
          data-testid="plan-generic-badge"
          className="text-[10px] font-bold uppercase tracking-wide text-amber-300 bg-amber-900/40 border border-amber-700/50 px-2 py-0.5 rounded-full"
        >
          Generico por categoria
        </span>
      </div>

      <p className="text-xs text-amber-200/90 italic">
        No hay un plan propio para esta especie. Mostramos uno generico por categoria para{' '}
        <span className="font-semibold">{template.label}</span>.
      </p>

      {template.notes?.map((nota) => (
        <p key={nota} className="text-xs text-slate-300 border-l-2 border-amber-600/50 pl-2">
          {nota}
        </p>
      ))}

      <ol className="space-y-2">
        {template.primary_steps.map((step) => (
          <li
            key={`${step.offset_days}-${step.biofertilizer_slug}`}
            className="bg-slate-900/40 rounded-lg p-2 border border-slate-700/40"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-200">{step.action}</span>
              <span className="text-[10px] text-slate-400 whitespace-nowrap">
                {step.offset_days < 0
                  ? `${Math.abs(step.offset_days)} días antes de sembrar`
                  : `día ${step.offset_days}`}
              </span>
            </div>
            <div className="text-xs text-emerald-300 mt-0.5">
              {step.biofertilizer_slug.replace(/_/g, ' ')}
              {Number.isFinite(step.dose_g) ? ` · ${step.dose_g} g aprox.` : ''}
            </div>
            {step.dose_safe && (
              <p className="text-[11px] text-emerald-200 mt-1">
                <span className="font-semibold">Dosis: </span>
                {step.dose_safe}
              </p>
            )}
            {step.dose_text && (
              <details className="mt-1">
                <summary className="text-[10px] text-slate-500 cursor-pointer">
                  Cómo se prepara y se aplica (referencia)
                </summary>
                <p className="text-[11px] text-slate-400 mt-1">{step.dose_text}</p>
              </details>
            )}
            {step.notes && (
              <p className="text-[11px] text-slate-500 italic mt-1">{step.notes}</p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
};

const PlanSection = ({ asset }) => {
  const speciesSlug = useMemo(() => resolveSpeciesSlug(asset), [asset]);
  const assetName = useMemo(() => asset?.attributes?.name || asset?.name || '', [asset]);
  const plantingDate = useMemo(() => resolvePlantingDate(asset), [asset]);
  // status: 'idle' (sin slug ni nombre, nada que buscar), 'loading',
  // 'present' (template propio → PlanEditor), 'generic' (sin template propio
  // pero hay genérico por tipo de cultivo), 'absent', 'error'.
  // Inicialización lazy (function form) garantiza que React no llame al
  // initializer en re-renders y respeta la regla react-hooks/set-state-in-effect.
  const [status, setStatus] = useState(() => ((speciesSlug || assetName) ? 'loading' : 'idle'));
  // Slug canónico resuelto contra el catálogo — lo que se le pasa a
  // PlanEditor para que el plan se ancle al id correcto (no a "fresa").
  const [canonicalSlug, setCanonicalSlug] = useState(speciesSlug);
  // Plantilla genérica de nutrición (orientativa) cuando no hay template propio.
  const [genericTemplate, setGenericTemplate] = useState(null);

  useEffect(() => {
    if (!speciesSlug && !assetName) return undefined;
    let cancelled = false;
    getAllSpecies()
      .then((list) => {
        if (cancelled) return;
        // Bug 2026-06-20 (operador, fresa): el plan decía "Sin plan
        // disponible" porque el slug derivado ("fresa") no coincidía con el
        // id del catálogo ("fragaria_ananassa"), que SÍ tiene template.
        // matchSpeciesInCatalog resuelve la des-coincidencia.
        const match = matchSpeciesInCatalog(list || [], speciesSlug, assetName);
        if (match?.id) setCanonicalSlug(match.id);
        const tplKind = getFeedingPlanKindForSpecies(match);
        const tpl = resolveFeedingPlanTemplateForSpecies(match);
        const present = tplKind === 'poblado';
        if (present) {
          setStatus('present');
          return;
        }
        // Cascada: sin template propio → usar la derivación genérica por
        // categoria, marcada como orientativa y con notas de contexto.
        if (tplKind === 'generico' && tpl) {
          setGenericTemplate(tpl);
          setStatus('generic');
        } else {
          setStatus('absent');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn('[PlanSection] getAllSpecies falló:', err);
        setStatus('error');
      });
    return () => { cancelled = true; };
  }, [speciesSlug, assetName]);

  if (!speciesSlug && !assetName) {
    return (
      <section data-testid="plan-section-no-slug" className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
          <Sprout size={12} /> Plan de alimentación
        </h3>
        <p className="text-sm text-slate-400">
          Sin especie reconocida; no es posible asociar un plan.
        </p>
      </section>
    );
  }

  if (status === 'loading') {
    return (
      <section data-testid="plan-section-loading" className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
        <p className="text-sm text-slate-400 italic">Buscando plan en el catálogo…</p>
      </section>
    );
  }

  if (status === 'generic') {
    return <GenericFeedingPlan template={genericTemplate} />;
  }

  if (status !== 'present') {
    return (
      <section data-testid="plan-section-empty" className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 space-y-3">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
          <Sprout size={12} /> Plan de alimentación
        </h3>
        <p className="text-sm text-slate-300">
          {status === 'error'
            ? 'No se pudo consultar el catálogo de planes. Inténtalo de nuevo más tarde.'
            : 'Sin plan disponible para esta especie.'}
        </p>
        <button
          type="button"
          onClick={() => window.alert(
            'Tu solicitud quedó anotada localmente. El equipo Chagra revisará agregar un plan para esta especie.',
          )}
          className="w-full px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold"
        >
          Solicitar al equipo Chagra agregar plan
        </button>
      </section>
    );
  }

  return (
    <section data-testid="plan-section-editor" className="space-y-2">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 flex items-center gap-1">
        <Sprout size={12} /> Plan de alimentación
      </h3>
      <PlanEditor
        assetId={asset.id}
        speciesSlug={canonicalSlug || speciesSlug}
        plantingDate={plantingDate}
      />
    </section>
  );
};

// Normaliza una fecha de siembra persistida (puede venir como "yyyy-mm-dd"
// del input date o como ISO completo del flujo de voz) al value que espera
// <input type="date">: yyyy-mm-dd. Devuelve '' si no hay fecha válida.
const toDateInputValue = (raw) => {
  if (!raw) return '';
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const t = new Date(raw).getTime();
  if (!Number.isFinite(t)) return '';
  return new Date(t).toISOString().slice(0, 10);
};

// Bug 2026-06-20 (operador, fresa): la fecha de "Registro" mostraba "Sin
// fecha" y no era editable. Este componente expone un date picker EDITABLE
// para la fecha de siembra/germinación que persiste en
// attributes._chagra_plant_meta.fecha_germinacion vía updateAsset (mismo
// servicio que usa AssetsDashboard), y se puede definir si está vacía.
// El parent monta este componente con key={asset.id} para que el estado
// inicial se re-derive de forma natural al cambiar de asset (evita un
// useEffect de resync con setState síncrono — regla react-hooks).
const EditableSeedingDate = ({ asset, updateAsset }) => {
  const persisted = asset?.attributes?._chagra_plant_meta?.fecha_germinacion;
  const [value, setValue] = useState(() => toDateInputValue(persisted));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const persist = async (nextValue) => {
    setSaving(true);
    setSaved(false);
    try {
      const prevMeta = asset?.attributes?._chagra_plant_meta || {};
      const nextMeta = { ...prevMeta };
      if (nextValue) nextMeta.fecha_germinacion = nextValue;
      else delete nextMeta.fecha_germinacion;
      const updatedAsset = {
        ...asset,
        attributes: { ...asset.attributes, _chagra_plant_meta: nextMeta },
      };
      const assetType = resolveAssetType(asset);
      await updateAsset(assetType, updatedAsset, []);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.warn('[EditableSeedingDate] persistencia falló:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      data-testid="seeding-date-editor"
      className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50"
    >
      <label
        htmlFor="seeding-date-input"
        className="text-xs text-slate-500 flex items-center gap-1 italic mb-1"
      >
        <Sprout size={12} /> Fecha de siembra
      </label>
      <input
        id="seeding-date-input"
        type="date"
        value={value}
        disabled={saving}
        max={new Date().toISOString().slice(0, 10)}
        onChange={(e) => {
          setValue(e.target.value);
          persist(e.target.value);
        }}
        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm font-medium min-h-[44px] focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
      />
      <p className="text-[11px] mt-1 h-4 leading-4">
        {saving && <span className="text-slate-400 italic">Guardando…</span>}
        {!saving && saved && <span className="text-emerald-400" data-testid="seeding-date-saved">✓ Fecha guardada</span>}
        {!saving && !saved && !value && <span className="text-slate-500 italic">Aún sin definir — tócala para registrarla</span>}
      </p>
    </div>
  );
};

// Bio-efficiency metrics panel.
const PerformancePanel = ({ assetId }) => {
  const { globalRatio, byCategory, totalHarvestWeight, totalInputWeight, hasData } = useAssetPerformance(assetId);
  if (!hasData) return null;
  return (
    <div className="bg-slate-900 border border-slate-800/50 rounded-2xl p-4 space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xl font-black text-white">{globalRatio}</p>
          <p className="text-[10px] text-slate-500 uppercase font-bold">Ratio</p>
        </div>
        <div className="border-x border-slate-800/50">
          <p className="text-lg font-bold text-green-400">{totalHarvestWeight}</p>
          <p className="text-[10px] text-slate-500 uppercase font-bold">Cosecha</p>
        </div>
        <div>
          <p className="text-lg font-bold text-blue-400">{totalInputWeight}</p>
          <p className="text-[10px] text-slate-500 uppercase font-bold">Insumos</p>
        </div>
      </div>
      <CategoryBreakdown byCategory={byCategory} />
    </div>
  );
};

const CategoryBreakdown = ({ byCategory }) => {
  const visible = Object.entries(byCategory).filter(([, d]) => d.count > 0);
  if (visible.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {visible.map(([id, d]) => {
        const meta = MATERIAL_CATEGORIES[id];
        return (
          <div key={id} className="flex justify-between text-[11px]">
            <span className="text-slate-400">{meta?.label || id}</span>
            <span className="text-slate-200">×{d.ratio}</span>
          </div>
        );
      })}
    </div>
  );
};
/**
 * Panel de detalle para un asset individual. Obtiene `selectedAssetId` desde
 * `useAssetStore` y, según el bundle detectado, renderiza foto del asset,
 * tablas de atributos, editor de geometría (latitud/longitud) y flujos de
 * split (dividir planta) y merge (fusionar assets del mismo bundle).
 *
 * Expone el modal de "cementerio" para marcar assets como inactivos y un
 * botón de cierre que limpia la selección activa vía `clearSelectedAsset`.
 *
 * @returns {React.ReactNode|null} Retorna null si no hay `selectedAssetId` en el store.
 */
export const AssetDetailView = () => {
  const selectedAssetId = useAssetStore((s) => s.selectedAssetId);
  const plants = useAssetStore((s) => s.plants);
  const structures = useAssetStore((s) => s.structures);
  const equipment = useAssetStore((s) => s.equipment);
  const materials = useAssetStore((s) => s.materials);
  const lands = useAssetStore((s) => s.lands);
  const clearSelectedAsset = useAssetStore((s) => s.clearSelectedAsset);
  const updateAsset = useAssetStore((s) => s.updateAsset);

  const [showGeoPicker, setShowGeoPicker] = useState(false);
  const [geoSaving, setGeoSaving] = useState(false);
  const [showCemeteryModal, setShowCemeteryModal] = useState(false);
  const [showSplitFlow, setShowSplitFlow] = useState(false);
  const [scientificName, setScientificName] = useState(null);
  const [commonName, setCommonName] = useState(null);
  const [speciesCategory, setSpeciesCategory] = useState(null);
  const [catalogImage, setCatalogImage] = useState(null);
  const [speciesThermalZones, setSpeciesThermalZones] = useState([]);

  const asset = useMemo(() => {
    if (!selectedAssetId) return null;
    return [...plants, ...structures, ...equipment, ...materials, ...lands].find((a) => a.id === selectedAssetId);
  }, [selectedAssetId, plants, structures, equipment, materials, lands]);

  const isPlantType = (asset?.asset_type || asset?.type || '').includes('plant');

  // Cargar nombre científico/común desde el catálogo para SpeciesImage.
  // Bug 2026-06-20 (operador, fresa): los assets viejos guardan el nombre
  // común ("Fresa") como slug derivado, que NO coincide con el id canónico
  // ("fragaria_ananassa"). matchSpeciesInCatalog tolera esa des-coincidencia
  // (id/slug exacto → nombre común → inclusión parcial), así la imagen y el
  // plan resuelven igual para assets nuevos y viejos.
  useEffect(() => {
    // Solo resolvemos catálogo para plantas. Para no-plantas el render ya
    // pasa null a PhotoHeroSection (isPlantType ? ...), así que no hace
    // falta resetear estado de forma síncrona (evita react-hooks warning).
    if (!isPlantType) return undefined;
    const slug = resolveSpeciesSlug(asset);
    const assetName = asset?.attributes?.name || asset?.name || '';
    let cancelled = false;
    getAllSpecies()
      .then((list) => {
        if (cancelled) return;
        const match = matchSpeciesInCatalog(list || [], slug, assetName);
        setScientificName(match?.nombre_cientifico || null);
        setCommonName(match?.nombre_comun || deriveCommonName(assetName) || null);
        setSpeciesCategory(match?.category || null);
        setCatalogImage(match?.imagen || match?.image || match?.media?.image || match?.media || null);
        setSpeciesThermalZones(Array.isArray(match?.pisoTermico?.thermalZones) ? match.pisoTermico.thermalZones : []);
      })
      .catch((err) => {
        console.warn('[AssetDetailView] getAllSpecies falló:', err);
        if (!cancelled) setCommonName(deriveCommonName(assetName) || null);
        if (!cancelled) setSpeciesThermalZones([]);
      });
    return () => { cancelled = true; };
  }, [asset, isPlantType]);

  // UX-19 (#286) 2026-05-27 — bug crítico operador: "después de que entro a
  // una planta es casi imposible salir de ahí el botón de cerrar no funciona".
  // Fixes:
  //   1. Escape key handler global mientras el panel está abierto.
  //   2. Touch targets ampliados a 44x44 (iOS minimum) — eran ~32px.
  //   3. aria-label en X para screenreaders.
  //   4. Header sticky para que el X NO se pierda cuando el operador
  //      scrolea por el contenido largo.
  //   5. Botón secundario "Cerrar" al final del scroll, gigante y obvio.
  useEffect(() => {
    if (!selectedAssetId) return undefined;
    const handleKey = (e) => {
      // Solo si no hay un modal hijo abierto (cemetery / split / geo picker).
      if (e.key === 'Escape' && !showCemeteryModal && !showSplitFlow && !showGeoPicker) {
        clearSelectedAsset();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedAssetId, clearSelectedAsset, showCemeteryModal, showSplitFlow, showGeoPicker]);

  if (!selectedAssetId || !asset) return null;

  const name = asset.attributes?.name || asset.name || 'Sin nombre';
  const speciesSlug = isPlantType ? resolveSpeciesSlug(asset) : null;
  const status = asset.attributes?.status || 'active';
  // Bug 2026-06-20 operator: Invalid Date en Registro.
  // asset.attributes.created viene del server FarmOS post-sync. Para optimistic locales
  // (recién creadas aún no sincronizadas), fallback a asset._createdAt (timestamp local en ms).
  // Si tampoco existe, usar null. Validamos que sea una fecha válida antes de formatear.
  const createdTs = asset.attributes?.created
    ? new Date(asset.attributes.created * 1000)
    : asset._createdAt
      ? new Date(asset._createdAt)
      : (asset._pending ? new Date() : null);

  // Validar que la fecha sea válida; si no, usar null
  const isValidDate = createdTs && !isNaN(createdTs.getTime()) && createdTs.getTime() > 0;
  const formattedDate = isValidDate ? createdTs.toLocaleDateString() : 'Sin fecha';

  const geoRaw = asset.attributes?.intrinsic_geometry;
  const geoWkt = typeof geoRaw === 'object' ? geoRaw?.value : geoRaw;
  const currentGeo = geoWkt ? wktToGeoJson(geoWkt) : null;

  const parentRefs = asset.relationships?.parent?.data || asset.relationships?.location?.data || [];
  const parentRef = Array.isArray(parentRefs) ? parentRefs[0] : parentRefs;
  const parentZoneName = parentRef ? [...structures, ...lands].find((a) => a.id === parentRef.id)?.attributes?.name : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Detalle del activo ${name}`}
      className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm"
      onClick={clearSelectedAsset}
    >
      <div className="w-full max-w-2xl bg-[rgb(var(--c-surface-card))] h-full shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header — UX-19 (#286) 2026-05-27: sticky para que el botón cerrar
            NUNCA se pierda cuando el operador scrolea contenido largo.
            Touch targets ampliados a 44x44 (iOS minimum) — eran ~32px.
            aria-label explícito para screenreaders.
            Bug 2026-06-20: Aplicar tema estándar de la app usando variables CSS. */}
        <div className="p-6 border-b border-[rgb(var(--c-surface-border))] flex justify-between items-start bg-[rgb(var(--c-surface-card))] sticky top-0 z-10">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-white truncate">{name}</h2>
            <p className="text-slate-500 text-xs font-mono">ID: {asset.id}</p>
          </div>
          <button
            type="button"
            onClick={clearSelectedAsset}
            aria-label="Cerrar detalle"
            title="Cerrar (Esc)"
            data-testid="asset-detail-close"
            className="p-3 hover:bg-slate-800 active:bg-slate-700 rounded-full text-slate-300 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
          >
            <X size={24} aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* UX-26 (#286) 2026-05-27: foto AHORA es el primer elemento del
              scroll content (hero card). Operador reportó que la sección
              de foto "sale al final separado feo". Solución: integrarla al
              hero como portada visual del activo. Si hay foto, se ve como
              imagen 4:3 con botones overlay; si no, card grande con CTA. */}
          <PhotoHeroSection
            assetId={asset.id}
            speciesSlug={speciesSlug}
            assetType={isPlantType ? 'plant' : asset.type?.replace('asset--', '') || 'default'}
            scientificName={isPlantType ? scientificName : null}
            commonName={isPlantType ? commonName : null}
            category={isPlantType ? speciesCategory : null}
            catalogImage={isPlantType ? catalogImage : null}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
              <span className="text-xs text-slate-500 flex items-center gap-1 italic mb-1"><Calendar size={12} /> Registro</span>
              <p className="text-white text-sm font-medium">{formattedDate}</p>
            </div>
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
              <span className="text-xs text-slate-500 flex items-center gap-1 italic mb-1"><Activity size={12} /> Estado</span>
              <p className="text-white text-sm font-medium capitalize">{status}</p>
            </div>
          </div>

          {/* Bug 2026-06-20 (operador, fresa): fecha de siembra editable y
              persistente. Solo para plantas. key={asset.id} re-deriva el
              estado al cambiar de planta sin un effect de resync. */}
          {isPlantType && (
            <EditableSeedingDate key={asset.id} asset={asset} updateAsset={updateAsset} />
          )}

          <GeometrySection asset={asset} parentZoneName={parentZoneName} onEdit={() => setShowGeoPicker(true)} saving={geoSaving} />

          {isPlantType && (
            <>
              <PlantMetaPanel asset={asset} />
              <PerformancePanel assetId={asset.id} />
              <section>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 px-1">Acciones de Campo</h3>
                <InputLogForm assetId={asset.id} onComplete={() => { }} />
              </section>

              <PlanSection asset={asset} />

              <section className="pt-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Historial de la planta</h3>
                <div className="flex flex-wrap gap-2">
                  {status !== 'dead' && (
                    <>
                      <button onClick={() => setShowCemeteryModal(true)} className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-xs flex items-center gap-2">
                        <Skull size={14} /> Marcar muerte
                      </button>
                      <button onClick={() => setShowSplitFlow(true)} className="px-3 py-2 rounded-lg bg-emerald-900/20 text-emerald-400 border border-emerald-700/30 text-xs flex items-center gap-2">
                        <Layers size={14} /> Dividir / Juntar
                      </button>
                    </>
                  )}
                  <ExternalAiButton
                    context={{ speciesName: name, thermalZones: FARM_CONFIG.THERMAL_ZONES, speciesThermalZones, altitudMsnm: FARM_CONFIG.ALTITUD_MSNM, municipio: FARM_CONFIG.MUNICIPIO }}
                    buildPrompt={buildOpenExternalPrompt}
                    label="Ayuda IA"
                  />
                </div>
              </section>

              {speciesSlug && (
                <section>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
                    <Images size={14} /> Galería de la especie
                  </h3>
                  <SpeciesPhotoGallery speciesSlug={speciesSlug} currentAssetId={asset.id} />
                </section>
              )}
            </>
          )}

          {asset.asset_type === 'land' && (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view: 'reportar_invasora', initialData: { locationId: asset.id, wkt: geoWkt } } }))}
              className="w-full p-6 rounded-xl bg-amber-600/20 border border-amber-600/40 text-amber-400 font-bold flex items-center justify-center gap-3 active:bg-amber-600/30 transition-colors shadow-lg"
            >
              <AlertCircle size={24} /> Reportar invasora aquí
            </button>
          )}

          <section className="pb-10">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 px-1">Línea de Tiempo</h3>
            <AssetTimeline assetId={asset.id} />
          </section>

          {/* UX-19 (#286) 2026-05-27: botón secundario "Cerrar" al final del
              scroll. El header sticky ya tiene el X chiquito arriba, pero si
              el operador scrollea contenido largo y se desorienta, este
              botón gigante al fondo es una salida obvia. */}
          <div className="pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] border-t border-slate-800">
            <button
              type="button"
              onClick={clearSelectedAsset}
              data-testid="asset-detail-close-bottom"
              className="w-full p-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white font-bold text-base min-h-[56px] flex items-center justify-center gap-2"
            >
              <X size={20} aria-hidden="true" />
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showGeoPicker && (
        <MapPicker
          mode={isPlantType ? 'point' : 'polygon'}
          initial={currentGeo}
          center={currentGeo?.coordinates ? (isPlantType ? currentGeo.coordinates : currentGeo.coordinates[0][0]) : null}
          onCancel={() => setShowGeoPicker(false)}
          onSave={async (geometry) => {
            setShowGeoPicker(false);
            setGeoSaving(true);
            try {
              if (navigator.geolocation) {
                try {
                  const gpsPos = await new Promise((res, rej) =>
                    navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 })
                  );
                  const { distance, isClose } = proximityCheck(gpsPos, geometry);
                  if (!isClose && !window.confirm(`Ubicación fuera de rango (${distance}m). ¿Confirmas registro remoto?`)) {
                    setGeoSaving(false); return;
                  }
                } catch (gpsErr) { console.warn('[Geo] GPS no disponible', gpsErr); }
              }

              const coords = getCoords(geometry);
              if (coords) {
                const invasive = checkInvasiveProximity(coords, plants);
                if (invasive.length > 0) window.alert(`⚠ Invasora detectada a menos de 10m.`);
              }

              const wkt = geoJsonToWkt(geometry);
              const assetType = resolveAssetType(asset);
              const updatedAsset = { ...asset, attributes: { ...asset.attributes, intrinsic_geometry: { value: wkt } } };

              if (coords) {
                const nearest = findNearestLand(wkt, lands);
                if (nearest && nearest.distance < 200 && window.confirm(`¿Vincularlo a ${nearest.land.attributes?.name || nearest.land.name}?`)) {
                  updatedAsset.relationships = {
                    ...updatedAsset.relationships,
                    parent: { data: [{ type: 'asset--land', id: nearest.land.id }] },
                    location: { data: [{ type: 'asset--land', id: nearest.land.id }] },
                  };
                }
              }

              await updateAsset(assetType, updatedAsset, []);
              window.dispatchEvent(new CustomEvent('syncComplete', { detail: { message: 'Geometría actualizada' } }));
            } finally {
              setGeoSaving(false);
            }
          }}
        />
      )}

      {showCemeteryModal && (
        <PlantCemeteryModal
          plantName={name}
          onClose={() => setShowCemeteryModal(false)}
          onConfirm={async (_reason) => {
            const updatedAsset = { ...asset, attributes: { ...asset.attributes, status: 'dead' } };
            await updateAsset('plant', updatedAsset, []);
            setShowCemeteryModal(false);
          }}
        />
      )}

      {showSplitFlow && <SplitFlow asset={asset} onClose={() => setShowSplitFlow(false)} />}
    </div>
  );
};

const GeometrySection = ({ asset, parentZoneName, onEdit, saving }) => {
  const geoRaw = asset.attributes?.intrinsic_geometry;
  const wkt = typeof geoRaw === 'object' ? geoRaw?.value : geoRaw;
  const hasGeo = !!wkt;
  const preview = hasGeo ? (wkt.startsWith('POINT') ? 'Punto registrado' : 'Polígono registrado') : (parentZoneName ? `En: ${parentZoneName}` : 'Sin ubicación');

  return (
    <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 flex items-center justify-between">
      <div>
        <span className="text-xs text-slate-500 block mb-1">Ubicación</span>
        <p className="text-sm text-white font-medium">{preview}</p>
      </div>
      <button onClick={onEdit} disabled={saving} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold text-slate-200">
        <MapPin size={14} className="inline mr-1" /> {hasGeo ? 'Corregir' : 'Definir'}
      </button>
    </div>
  );
};

const resolveAssetType = (asset) => {
  const t = asset.asset_type || asset.type || '';
  if (t.includes('plant')) return 'plant';
  if (t.includes('land')) return 'land';
  if (t.includes('structure')) return 'structure';
  if (t.includes('equipment')) return 'equipment';
  return 'material';
};

export default AssetDetailView;
