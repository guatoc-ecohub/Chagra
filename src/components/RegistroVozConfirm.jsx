/* eslint-disable chagra-i18n/no-hardcoded-spanish --
 * Los textos de UI de este paso de confirmación (rótulos de campos, botones
 * "Cancelar"/"Guardar registro", avisos de GPS) son strings de interfaz. Su
 * migración a src/config/messages.js es la TAREA i18n de ADR-050 (transversal a
 * toda la app), fuera del alcance de este fix — mismo criterio que los hermanos
 * de este flujo (DashboardLive.jsx, FincaVivaHero.jsx, FincaCards.jsx,
 * MiFincaVivaHomeCard.jsx). Los errores reales de ESLint siguen activos. */
import React, { lazy, Suspense, useMemo, useRef, useState } from 'react';
import {
  Check, X, MapPin, LocateFixed, AlertTriangle, Sprout, Pencil,
} from 'lucide-react';
import useAssetStore from '../store/useAssetStore';
import { useGeolocation } from '../hooks/useGeolocation';
import { geoJsonToWkt, latLngToPoint, wktToGeoJson } from '../utils/geo';
import { INTENTS, INTENT_META } from '../services/voiceFieldExtractor';
import SpeciesCombobox from './SpeciesCombobox';

const MapPicker = lazy(() => import('./MapPicker').then((m) => ({ default: m.MapPicker || m.default })));

// Campos táctiles para el campo: 16px (evita el zoom de iOS), min 48px de alto
// y anillo de foco visible — coherente con SpeciesCombobox (p-4, text-lg).
const INPUT_CLS = 'w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-3 min-h-[48px] text-white text-base placeholder:text-slate-500 focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-500/25 disabled:opacity-60 transition-colors motion-reduce:transition-none';

// Hoisted fuera del componente: definirlo en el cuerpo remonta los inputs en
// cada render y se pierde el foco al escribir.
function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">{label}</span>
      {children}
    </label>
  );
}

/**
 * RegistroVozConfirm — Paso de CONFIRMACIÓN del botón único de voz (#23).
 *
 * Muestra la intención CLASIFICADA y los campos EXTRAÍDOS, todos editables, y
 * un pin de mapa para ajustar la georreferencia (GPS del dispositivo). Nada se
 * persiste sin pasar por aquí (gate humano, anti-alucinación). Al confirmar
 * entrega el registro editado + { locationAssetId, wkt } al padre.
 *
 * Props:
 *   - record: registro unificado de voiceRouter.classifyAndExtract.
 *   - onConfirm(editedRecord, { locationAssetId, wkt }): Promise<void>
 *   - onCancel(): void
 *   - isSaving: boolean
 */
export default function RegistroVozConfirm({ record, onConfirm, onCancel, isSaving = false }) {
  const lands = useAssetStore((s) => s.lands);
  const { position, loading: gpsLoading, error: gpsError, request: requestGps } = useGeolocation();

  const primary = (record.species && record.species[0]) || null;

  const [intent, setIntent] = useState(record.intent);
  // Especie: NOMBRE común (subject) + SLUG del catálogo (speciesId) separados.
  // Se precargan con lo que la voz extrajo (ej. "Durazno" → prunus_persica),
  // pero el usuario CONFIRMA/CAMBIA desde el catálogo con SpeciesCombobox, igual
  // que en SeedingLog. Así la especie del registro por voz resuelve siempre a un
  // slug canónico para calendario/fenología (texto libre = salida explícita,
  // marcada por el propio combobox, con slug null).
  const [subject, setSubject] = useState(primary?.common || record.speciesHint || primary?.raw || '');
  const [speciesId, setSpeciesId] = useState(primary?.slug || null);
  const [cantidad, setCantidad] = useState(record.measures?.cantidad ?? '');
  const [alturaM, setAlturaM] = useState(record.measures?.altura_m ?? '');
  const [anchoM, setAnchoM] = useState(record.measures?.ancho_m ?? '');
  const [fenologia, setFenologia] = useState((record.phenology || []).map((p) => p.canon).join(', '));
  const [notas, setNotas] = useState((record.symptoms || []).join('; '));
  // Campos específicos por tipo, editables para el respaldo MANUAL del flujo
  // unificado (#23): insumo aplicado, labor realizada y plaga. En voz vienen
  // extraídos; a mano el usuario los escribe. Se persisten vía buildVoicePayload
  // (input → log--input.category; labors → log--task.name; pest → log--observation).
  const [insumo, setInsumo] = useState(record.input || '');
  const [labor, setLabor] = useState((record.labors || []).join(', '));
  const [pest, setPest] = useState(record.pest || '');
  const lugar = record.position?.raw || '';
  const [locationAssetId, setLocationAssetId] = useState('');
  const [wkt, setWkt] = useState(null);
  const [showMap, setShowMap] = useState(false);

  const locationOptions = useMemo(
    () => (lands || [])
      .filter((l) => l?.id && l?.attributes?.name)
      .map((l) => ({ id: l.id, name: l.attributes.name })),
    [lands],
  );

  // La intención EDITABLE (no la del prop) decide si se georreferencia: si el
  // campesino corrige de cosecha→planta, la sección GPS debe aparecer.
  const meta = INTENT_META[intent] || INTENT_META[INTENTS.OBSERVACION];
  const georef = meta.georef;

  // Captura del GPS del dispositivo → WKT POINT (funciona offline). setState
  // derivado de `position` es benigno: solo corre cuando llega un fix de GPS.
  React.useEffect(() => {
    if (position && Number.isFinite(position.lat) && Number.isFinite(position.lon)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWkt(geoJsonToWkt(latLngToPoint({ lat: position.lat, lng: position.lon })));
    }
  }, [position]);

  // Default del spec: planta/observación se georreferencian. Pedimos el GPS del
  // dispositivo una vez al entrar (o al cambiar a una intención georef). El
  // navegador pide permiso la 1ª vez y luego lo recuerda; el usuario puede
  // ajustar el pin en el mapa o guardar sin ubicación.
  const gpsAutoRef = useRef(false);
  React.useEffect(() => {
    if (georef && !gpsAutoRef.current) {
      gpsAutoRef.current = true;
      try { requestGps(); } catch (_) { /* noop */ }
    }
  }, [georef, requestGps]);

  const handleConfirm = () => {
    if (isSaving) return;
    // Reconstruye el registro editado preservando lo no-editable. La especie sale
    // del SpeciesCombobox: `subject` = nombre común, `speciesId` = slug del
    // catálogo (o null si el usuario eligió texto libre marcado).
    let species = record.species || [];
    let speciesHint = record.speciesHint || null;
    const typed = subject.trim();
    if (typed) {
      const base = species[0] || {};
      if (speciesId) {
        // Especie grounded del catálogo: hila el slug canónico (calendario,
        // fenología, plan). Si cambió respecto a lo extraído, descartamos el
        // `canonical` viejo para no mezclar nombre científico de otra especie.
        const canonical = base.slug === speciesId ? (base.canonical || null) : null;
        species = [{ ...base, common: typed, slug: speciesId, canonical }, ...species.slice(1)];
        speciesHint = null;
      } else if (species.length > 0) {
        // Texto libre marcado: sin slug (el combobox ya advirtió que no resuelve).
        species = [{ ...base, common: typed, slug: null, canonical: null }, ...species.slice(1)];
      } else {
        speciesHint = typed;
      }
    } else {
      // Sin especie: no inventamos ninguna.
      species = [];
      speciesHint = null;
    }
    const num = (v) => (v === '' || v == null ? null : Number(v));
    const edited = {
      ...record,
      intent,
      species,
      speciesHint,
      measures: {
        ...record.measures,
        cantidad: num(cantidad),
        altura_m: num(alturaM),
        ancho_m: num(anchoM),
      },
      phenology: fenologia.trim()
        ? fenologia.split(',').map((s) => ({ raw: s.trim(), canon: s.trim() })).filter((p) => p.canon)
        : [],
      symptoms: notas.trim() ? notas.split(';').map((s) => s.trim()).filter(Boolean) : [],
      input: insumo.trim() || null,
      labors: labor.trim() ? labor.split(',').map((s) => s.trim()).filter(Boolean) : [],
      pest: pest.trim() || null,
      position: { ...record.position, raw: lugar.trim() },
    };
    onConfirm(edited, { locationAssetId: locationAssetId || null, wkt: wkt || null });
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Transcripción — solo en el camino de VOZ. En el respaldo manual del
          registro unificado (#23) no hay transcripción, así que no se muestra
          la caja vacía "Lo que oí" con comillas vacías. */}
      {record.transcription && (
        <section className="bg-slate-900 border-l-2 border-l-lime-500 border-y border-r border-slate-800 rounded-xl p-3.5">
          <p className="text-xs uppercase font-bold text-lime-400/90 tracking-wide mb-1">Lo que oí</p>
          <p className="text-base text-slate-100 italic leading-snug">"{record.transcription}"</p>
        </section>
      )}

      {/* Selector de intención (chips) */}
      <section>
        <p className="text-xs uppercase font-bold text-slate-300 tracking-wide mb-2">¿Qué está registrando?</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(INTENT_META).map(([key, m]) => {
            const active = key === intent;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setIntent(key)}
                disabled={isSaving}
                aria-pressed={active}
                className={`px-3.5 py-2 min-h-[44px] rounded-full text-sm font-bold border transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400 disabled:opacity-60 ${
                  active
                    ? 'bg-lime-700 border-lime-500 text-white shadow-md shadow-lime-900/40'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span className="mr-1.5" aria-hidden="true">{m.icon}</span>{m.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Sujeto / especie — SELECTOR del catálogo (no texto libre). Mismo
          SpeciesCombobox que SeedingLog (#1879): precargado con lo que la voz
          extrajo, pero el usuario ELIGE/confirma del catálogo → resuelve al slug
          canónico. El texto libre queda como salida explícita y marcada. */}
      <SpeciesCombobox
        label="Cultivo o especie"
        value={subject}
        speciesId={speciesId}
        inputName="voz-cultivo"
        placeholder="Buscar especie… (ej: durazno, mora, café)"
        onChange={(name, id) => { setSubject(name); setSpeciesId(id || null); }}
      />

      {/* Medidas contextuales */}
      <div className="grid grid-cols-3 gap-2.5">
        <Field label="Cantidad">
          <input type="number" min="0" value={cantidad} onChange={(e) => setCantidad(e.target.value)} className={INPUT_CLS} disabled={isSaving} />
        </Field>
        <Field label="Alto (m)">
          <input type="number" min="0" step="0.1" value={alturaM} onChange={(e) => setAlturaM(e.target.value)} className={INPUT_CLS} disabled={isSaving} />
        </Field>
        <Field label="Ancho (m)">
          <input type="number" min="0" step="0.1" value={anchoM} onChange={(e) => setAnchoM(e.target.value)} className={INPUT_CLS} disabled={isSaving} />
        </Field>
      </div>

      <Field label="Estado / fenología">
        <input type="text" value={fenologia} onChange={(e) => setFenologia(e.target.value)} placeholder="ej. floración" className={INPUT_CLS} disabled={isSaving} />
      </Field>

      {/* Campos por tipo: aparecen según la intención elegida (form adaptativo).
          Esto da el "un solo formulario que cambia los campos" del registro
          unificado manual (#23), sin pantallas separadas por tipo. */}
      {intent === INTENTS.INSUMO && (
        <Field label="Insumo aplicado">
          <input type="text" value={insumo} onChange={(e) => setInsumo(e.target.value)} placeholder="ej. caldo bordelés, biol, bocashi" className={INPUT_CLS} disabled={isSaving} />
        </Field>
      )}

      {intent === INTENTS.MANTENIMIENTO && (
        <Field label="Labor realizada">
          <input type="text" value={labor} onChange={(e) => setLabor(e.target.value)} placeholder="ej. poda, deshierbe, guadaña" className={INPUT_CLS} disabled={isSaving} />
        </Field>
      )}

      {intent === INTENTS.PLAGA && (
        <Field label="Plaga o invasora">
          <input type="text" value={pest} onChange={(e) => setPest(e.target.value)} placeholder="ej. hormiga arriera, pulgón" className={INPUT_CLS} disabled={isSaving} />
        </Field>
      )}

      <Field label="Notas / síntomas">
        <textarea rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Lo que quiera anotar de más" className={`${INPUT_CLS} resize-none`} disabled={isSaving} />
      </Field>

      {/* Ubicación: zona + GPS */}
      <Field label="Zona de la finca">
        <select value={locationAssetId} onChange={(e) => setLocationAssetId(e.target.value)} className={INPUT_CLS} disabled={isSaving}>
          <option value="">Sin zona específica</option>
          {locationOptions.map((o) => (
            <option key={o.id} value={o.id}>🌾 {o.name}</option>
          ))}
        </select>
      </Field>

      {georef && (
        <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs uppercase font-bold text-slate-300 tracking-wide flex items-center gap-1.5">
              <MapPin size={13} className="text-lime-400" aria-hidden="true" /> Georreferencia
            </span>
            {lugar && <span className="text-2xs text-slate-500 italic truncate">"{lugar}"</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => requestGps()}
              disabled={isSaving || gpsLoading}
              className="px-4 py-2.5 min-h-[44px] bg-lime-700 hover:bg-lime-600 disabled:bg-slate-700 disabled:opacity-70 rounded-xl text-sm font-bold flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400"
            >
              <LocateFixed size={16} className={gpsLoading ? 'motion-safe:animate-pulse' : ''} aria-hidden="true" /> {gpsLoading ? 'Ubicando…' : 'Usar mi ubicación (GPS)'}
            </button>
            {wkt && (
              <button
                type="button"
                onClick={() => setShowMap(true)}
                disabled={isSaving}
                className="px-4 py-2.5 min-h-[44px] bg-slate-800 hover:bg-slate-700 disabled:opacity-60 rounded-xl text-sm font-bold flex items-center gap-2 text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400"
              >
                <Pencil size={16} aria-hidden="true" /> Ajustar en el mapa
              </button>
            )}
          </div>
          {wkt && <p className="text-2xs text-emerald-300/80 font-mono break-all">📍 {wkt}</p>}
          {gpsError && (
            <p className="text-xs text-amber-300/90 flex items-start gap-1.5 leading-snug">
              <AlertTriangle size={13} className="shrink-0 mt-0.5" aria-hidden="true" /> No se pudo tomar el GPS. Puede ajustar el punto en el mapa o guardar sin ubicación.
            </p>
          )}
        </section>
      )}

      {showMap && (
        <Suspense fallback={null}>
          <div className="fixed inset-0 z-50 bg-slate-950">
            <MapPicker
              mode="point"
              initial={wkt ? wktToGeoJson(wkt) : null}
              onSave={(geo) => { setWkt(geoJsonToWkt(geo)); setShowMap(false); }}
              onCancel={() => setShowMap(false)}
            />
          </div>
        </Suspense>
      )}

      {/* Acciones — barra fija abajo con borde propio para separarla del form.
          Guardar pesa más (2:1) que Cancelar: es la acción principal. */}
      <div className="flex gap-2.5 sticky bottom-0 bg-slate-950 -mx-4 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-slate-800">
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="flex-1 px-4 py-3.5 min-h-[52px] bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          <X size={18} aria-hidden="true" /> Cancelar
        </button>
        <button
          onClick={handleConfirm}
          disabled={isSaving}
          aria-busy={isSaving}
          className="flex-[2] px-4 py-3.5 min-h-[52px] bg-lime-700 hover:bg-lime-600 active:bg-lime-800 text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-lime-900/40 disabled:opacity-60 disabled:bg-slate-700 disabled:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-300"
        >
          {isSaving ? <Sprout size={20} className="motion-safe:animate-pulse" aria-hidden="true" /> : <Check size={20} aria-hidden="true" />}
          {isSaving ? 'Guardando…' : 'Guardar registro'}
        </button>
      </div>
    </div>
  );
}
