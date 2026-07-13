/* i18n (ADR-050): este formulario es 100% user-facing en español Colombia
 * (etiquetas, ayudas, toasts). La regla chagra-i18n es soft (warn); se desactiva
 * a nivel de archivo —mismo criterio que SpeciesSelect / SeguimientoProcesoScreen—
 * para no bloquear el pre-commit (max-warnings=0). La migración i18n es trabajo
 * aparte. */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, AlertCircle, MapPin, CheckCircle } from 'lucide-react';
import { savePayload } from '../services/payloadService';
import { savePhoto } from '../services/photoService';
import { createFarmProcess } from '../services/farmEventService';
import { buildDraftFromSeeding } from '../services/buildDraftFromSeeding';
import { newUlid } from '../utils/id';
import DateField from './DateField';
import PhotoCaptureField from './PhotoCaptureField';
import { getAllSpecies } from '../db/catalogDB';
import { extractVarieties, varietyHelpText } from '../utils/speciesVariety';
import SpeciesCombobox from './SpeciesCombobox';

// Bug 069.10 — validación client-side: límites razonables para evitar
// payloads inválidos sincronizándose con FarmOS.
const MAX_QUANTITY = 100000; // sanity cap: 100k plántulas en una siembra es ya raro
const MIN_CROP_LEN = 2;
/**
 * Formulario de registro de siembra con captura de foto comprimida,
 * selector de especie/variedad desde el catálogo local, trazado GPS de área
 * y guardado offline-first como log de tipo seeding.
 *
 * Ciclo de vida: al montar recibe `initialData` para pre-llenar campos
 * (modo edición) o arranca vacío (modo creación). Al guardar, construye el
 * draft del activo planta asociado, persiste payload + foto vía servicios
 * locales y ejecuta el callback `onSave`.
 *
 * @param {Object} props
 * @param {Function} [props.onBack] - Callback invocado al cancelar o navegar hacia atrás.
 * @param {Function} [props.onSave] - Callback invocado tras guardado exitoso.
 * @param {Object|null} [props.initialData] - Datos iniciales para pre-llenar el formulario
 *   (crop, plant_type, variety, quantity, coordinates, notes).
 * @returns {React.JSX.Element}
 */
export default function SeedingLog({ onBack, onSave, initialData: initialDataRaw }) {
  // Bug B4 piloto 2026-05-28: QuickActionsPanel "Agregar planta" navega a
  // 'sembrar' sin pasar currentViewData → App.jsx pasa initialData={null} →
  // default param `= {}` NO aplica con null (solo con undefined) → línea 18
  // intentaba leer `null.crop` y crasheaba el ErrorBoundary del componente.
  // Coalesce explícito null/undefined → {}.
  const initialData = /** @type {any} */ (initialDataRaw || {});
  const [formData, setFormData] = useState(/** @type {{date: string, crop: string, crop_species_id: (string|null), plant_type?: ({type: string, id: string}|null), variety: string, quantity: string}} */({
    date: new Date().toISOString().split('T')[0],
    crop: initialData.crop || '', // Nombre común limpio de la especie (ej. "Fresa")
    // Bug operador 2026-06-25: id canónico del catálogo elegido en el selector.
    // Si viene null, la especie es texto libre (no resuelve calendario/fenología).
    crop_species_id: initialData.crop_species_id || initialData.speciesId || null,
    plant_type: initialData.plant_type || null, // ADR-019: { type: 'taxonomy_term--plant_type', id: '...' }
    variety: initialData.variety || '',
    quantity: initialData.quantity || ''
  }));
  // Etiqueta de ubicación SEPARADA del nombre de la especie (bug operador
  // 2026-06-25): antes el campesino escribía "Fresa - Invernadero #1" todo
  // junto y la especie no resolvía. Ahora la especie se elige limpia del
  // catálogo y la ubicación va en su propio campo opcional.
  const [locationLabel, setLocationLabel] = useState(initialData.locationLabel || '');
  // UX-25 (#286) 2026-05-27: SeedingLog ahora usa PhotoCaptureField (mismo
  // componente bonito que InvasiveObservationLog). Mantenemos solo el
  // estado photo (blob); el preview/retake/remove/compresión lo maneja
  // PhotoCaptureField internamente. photoUrl ya NO se usa.
  const [photo, setPhoto] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [coordinates, setCoordinates] = useState(initialData.coordinates ? [initialData.coordinates] : []);
  const [notes, setNotes] = useState(initialData.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [syncedOffline, setSyncedOffline] = useState(false);
  const [view, setView] = useState('form');
  const [touched, setTouched] = useState({});
  const watchIdRef = useRef(null);

  // UX-14 (#286) 2026-05-27: variedad dinámica desde catalogDB.
  // Cargamos el catálogo una sola vez al montar. Si el operador escribió
  // un nombre que matchea una species del catálogo CON variedades ICA,
  // mostramos dropdown; si no matchea o la especie no tiene variedades
  // registradas, OCULTAMOS el campo (no pedimos algo sin contexto).
  const [allSpecies, setAllSpecies] = useState([]);
  useEffect(() => {
    let cancelled = false;
    getAllSpecies()
      .then((rows) => { if (!cancelled && Array.isArray(rows)) setAllSpecies(rows); })
      .catch(() => { /* graceful: si falla, varieties queda en [] y campo se oculta */ });
    return () => { cancelled = true; };
  }, []);

  // Resuelve la species del catálogo a partir del free-text `crop`.
  // Match orden: nombre_comun exact (case-insensitive) → id exact →
  // startsWith (para tolerar "Café arábico" vs "Café"). Si no hay match,
  // retorna null (varieties = [] → campo oculto).
  const matchedSpecies = useMemo(() => {
    if (allSpecies.length === 0) return null;
    // Camino canónico: el operador eligió una especie del catálogo en el
    // combobox → tenemos el id exacto, sin ambigüedad de nombre.
    if (formData.crop_species_id) {
      const byId = allSpecies.find((s) => s.id === formData.crop_species_id);
      if (byId) return byId;
    }
    const q = (formData.crop || '').trim().toLowerCase();
    if (!q) return null;
    return (
      allSpecies.find((s) => (s.nombre_comun || '').toLowerCase() === q) ||
      allSpecies.find((s) => (s.id || '').toLowerCase() === q) ||
      allSpecies.find((s) => (s.nombre_comun || '').toLowerCase().startsWith(q) && q.length >= 3) ||
      null
    );
  }, [formData.crop, formData.crop_species_id, allSpecies]);

  const varieties = useMemo(() => extractVarieties(matchedSpecies), [matchedSpecies]);
  const showVarietyField = varieties.length > 0;
  const varietyHelp = useMemo(() => varietyHelpText(varieties), [varieties]);

  // Si la variedad guardada NO está en la lista actual del catálogo, mostramos
  // toggle "Otra (escribir)" para fallback texto libre. Estado del toggle
  // persistente para el ciclo de vida del componente.
  const [varietyCustom, setVarietyCustom] = useState(
    !!(formData.variety && !varieties.find((v) => v.value === formData.variety))
  );

  // Bug 069.10 — validación inline (no bloquea submit existente, pero deshabilita el botón
  // y muestra errores para que el operador corrija antes de guardar).
  const errors = useMemo(() => {
    /** @type {Record<string,string>} */
    const e = {};
    const today = new Date().toISOString().split('T')[0];
    if (!formData.crop.trim()) e.crop = 'Indica el cultivo';
    else if (formData.crop.trim().length < MIN_CROP_LEN) e.crop = `Mínimo ${MIN_CROP_LEN} caracteres`;
    const qty = Number(formData.quantity);
    if (formData.quantity === '' || formData.quantity === null) e.quantity = 'Indica la cantidad';
    else if (!Number.isFinite(qty)) e.quantity = 'Cantidad inválida';
    else if (qty <= 0) e.quantity = 'Debe ser mayor que cero';
    else if (qty > MAX_QUANTITY) e.quantity = `Máximo ${MAX_QUANTITY.toLocaleString()} plántulas`;
    if (!formData.date) e.date = 'Indica la fecha';
    else if (formData.date > today) e.date = 'La fecha no puede ser futura';
    return e;
  }, [formData]);

  const hasErrors = Object.keys(errors).length > 0;
  const markTouched = (field) => setTouched((t) => ({ ...t, [field]: true }));

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const handleInput = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const toggleRecording = () => {
    if (isRecording) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsRecording(false);
    } else {
      setCoordinates([]);
      setIsRecording(true);
      if ("geolocation" in navigator) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => setCoordinates(prev => [...prev, [pos.coords.longitude, pos.coords.latitude]]),
          (err) => console.error(err),
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
          }
        );
      }
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    // Bug 069.10 — re-validar antes de enviar; marca todos los campos como touched
    // para que los errores se vean si el operador llegó acá con el botón deshabilitado vencido.
    if (hasErrors) {
      setTouched({ crop: true, quantity: true, date: true });
      onSave('Revisa los campos marcados', true);
      return;
    }

    setIsSaving(true);
    try {
      let photoRefId = null;
      if (photo) {
        try {
          photoRefId = await savePhoto({
            blob: photo,
            speciesSlug: formData.crop
              ? formData.crop.toLowerCase().replace(/\s+/g, '_')
              : null,
            meta: {
              capturedAt: new Date().toISOString(),
              gps: coordinates.length > 0
                ? { lat: coordinates[0][1], lon: coordinates[0][0] }
                : null,
            },
          });
        } catch (err) {
          console.error('Error guardar foto en media_cache:', err);
          onSave('Foto no se pudo guardar localmente', true);
          setIsSaving(false);
          return;
        }
      }

      const payload = {
        _photoRefId: photoRefId,
        data: {
          type: "log--seeding",
          attributes: {
            name: `Siembra de ${formData.crop} - ${formData.variety || 'N/A'}`,
            timestamp: new Date(formData.date).toISOString().split('.')[0] + '+00:00',
            status: "done",
            ...(coordinates.length >= 3 ? {
              geometry: {
                type: "Polygon",
                coordinates: [[...coordinates, coordinates[0]]]
              }
            } : {})
          },
          relationships: {
            quantity: {
              data: [{
                type: "quantity--standard",
                attributes: {
                  measure: "count",
                  value: { decimal: String(formData.quantity) },
                  label: "Plántulas"
                }
              }]
            },
            plant_type: formData.plant_type ? { data: formData.plant_type } : undefined
          }
        }
      };

      // Notas + ubicación: la etiqueta de ubicación va como línea separada en
      // las notas, NUNCA mezclada con el nombre de la especie (que queda limpio
      // para resolver el calendario). Bug operador 2026-06-25.
      const composedNotes = [
        notes ? notes.trim() : '',
        locationLabel.trim() ? `Ubicación: ${locationLabel.trim()}` : '',
      ].filter(Boolean).join('\n');
      if (composedNotes) /** @type {Record<string, any>} */ (payload.data.attributes).notes = { value: composedNotes, format: 'plain_text' };

      const result = await savePayload('seeding', payload);

      // Auto-ciclo: crear FarmProcess enlazado para que la planta
      // aparezca como ciclo activo en el agente y en alertas.
      // Tolerante a error: si falla, el seeding NO falla.
      try {
        // Pasamos el id de catálogo elegido en el selector: el draft lo usa
        // directo como subject_slug, sin depender del parseo del nombre. Si es
        // null (texto libre), el draft cae a la resolución por nombre.
        const draft = await buildDraftFromSeeding(payload, { speciesSlug: formData.crop_species_id });
        if (draft) {
          const now = Date.now();
          const processId = newUlid();
          /** @type {import('../types/farmProcess').FarmProcess} */
          const process = {
            process_id: processId,
            type: 'farm_process',
            attributes: {
              process_type: 'sowing',
              subject_kind: draft.subject_kind,
              subject_slug: draft.subject_slug,
              subject_label: draft.subject_label,
              quantity: draft.quantity,
              unit: draft.unit,
              location_land_asset_id: draft.location_land_asset_id,
              status: 'active',
              current_stage: 'sowing_confirmed',
              created_at: draft.suggested_date || now,
              updated_at: now,
            },
          };
          await createFarmProcess(process);
        }
      } catch (err) {
        // Auto-ciclo robusto: telemetría cuando falle para no perder plantas nuevas
        console.error('[SeedingLog] Auto-ciclo falló:', {
          error: err.message,
          stack: err.stack,
          payload: payload.data?.attributes?.name,
          timestamp: Date.now(),
        });
        // El seeding sí se guardó. El ciclo se puede crear después manualmente.
      }

      onSave(result.message || 'Registro guardado localmente (Pendiente de sincronización)', !result.success);

      setFormData({ date: new Date().toISOString().split('T')[0], crop: '', crop_species_id: null, variety: '', quantity: '' });
      setLocationLabel('');
      setPhoto(null);
      // UX-25: PhotoCaptureField maneja su preview/ObjectURL internamente
      // — no necesitamos revoke manual acá.
      setCoordinates([]);
      setTimeout(() => onBack(), 500);
    } catch (error) {
      console.error('Error en SeedingLog handleSave:', error);
      onSave('Error al guardar registro', true);
    } finally {
      setIsSaving(false);
    }
  };

  if (view === 'success') {
    return (
      <div className="h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col p-6 items-center justify-center gap-6">
        <div className="text-center animate-in fade-in zoom-in duration-300">
          <CheckCircle size={64} className="text-emerald-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold">Registro guardado</h3>
          <p className="text-sm text-slate-400 mt-2">
            {syncedOffline ? (
              <>Quedó guardado en su finca. Apenas vuelva la señal, se guarda solo. Mientras tanto, lo encuentra en <strong className="text-slate-200">Bitácora → Recientes</strong>.</>
            ) : (
              <>Quedó guardado. Todo al día.</>
            )}
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          {syncedOffline && (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view: 'historial' } }))}
              className="p-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center gap-2"
            >
              Ver en Bitácora
            </button>
          )}
          <button
            onClick={() => { setView('form'); setSyncedOffline(false); }}
            className="p-4 rounded-xl bg-lime-700 hover:bg-lime-600 text-white font-bold flex items-center justify-center gap-2"
          >
            Nueva Siembra
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col overflow-y-auto">
      <header className="p-4 sticky top-0 bg-slate-950 border-b border-slate-800 flex items-center gap-4 z-10 shrink-0 shadow-md">
        <button onClick={/** @type {React.MouseEventHandler<HTMLButtonElement>} */ (onBack)} aria-label="Volver" className="p-3 bg-slate-800 rounded-full active:bg-slate-700 min-h-[56px] min-w-[56px] flex justify-center items-center shrink-0">
          <ArrowLeft size={32} aria-hidden="true" />
        </button>
        <h2 className="text-3xl font-bold truncate">Sembrar</h2>
      </header>

      <div className="flex-1 p-5 flex flex-col gap-6 pb-24">
        {/* UX-25 (#286) 2026-05-27: hero foto unificado vía
            PhotoCaptureField — mismo componente bonito que usa
            InvasiveObservationLog. Operador pidió "que el botón sea
            igual al de especies invasoras". El componente maneja
            internamente: dual cámara/galería, preview, re-tomar,
            eliminar, compresión iterativa y error states. */}
        <div className="flex flex-col gap-2">
          <span className="text-xl font-bold">Foto de la planta</span>
          <PhotoCaptureField
            value={photo}
            onPhoto={(blob) => setPhoto(blob)}
            onRemove={() => setPhoto(null)}
            label="Foto del cultivo"
          />
        </div>

        <DateField
          label="Fecha"
          value={formData.date}
          onChange={(val) => { setFormData(p => ({ ...p, date: val })); markTouched('date'); }}
          required
        />
        {touched.date && errors.date && (
          <p className="text-sm text-red-400 -mt-4 flex items-center gap-1.5">
            <AlertCircle size={14} aria-hidden="true" /> {errors.date}
          </p>
        )}

        {/* Cultivo: SELECTOR del catálogo (no texto libre). Bug operador
            2026-06-25: el camino por defecto es elegir una especie grounded
            para que el `crop` resuelva siempre a un id canónico. */}
        <div className="flex flex-col gap-2">
          <SpeciesCombobox
            label="Cultivo"
            value={formData.crop}
            speciesId={formData.crop_species_id}
            inputName="crop"
            placeholder="Buscar cultivo… (ej: fresa, café, mora)"
            onChange={(name, speciesId) => {
              setFormData((prev) => ({ ...prev, crop: name, crop_species_id: speciesId || null }));
              markTouched('crop');
            }}
          />
          {touched.crop && errors.crop && (
            <p className="text-sm text-red-400 flex items-center gap-1.5">
              <AlertCircle size={14} aria-hidden="true" /> {errors.crop}
            </p>
          )}
        </div>

        {/* Ubicación / etiqueta SEPARADA del nombre de la especie (bug operador
            2026-06-25): aquí va "Invernadero #1", "Era 3", etc. Así la especie
            de arriba siempre resuelve limpia para el calendario y la fenología. */}
        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">
            Ubicación o etiqueta <span className="text-base font-normal text-slate-400">(opcional)</span>
          </span>
          <input
            type="text"
            name="location_label"
            placeholder="Ej: Invernadero #1, Era 3, Lote de abajo"
            value={locationLabel}
            onChange={(e) => setLocationLabel(e.target.value)}
            className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white placeholder-slate-500 min-h-[64px]"
          />
          <span className="text-xs text-slate-500">
            No mezcles la ubicación con el nombre del cultivo: ponla aquí para no romper el calendario.
          </span>
        </label>

        {/* UX-14 (#286) 2026-05-27: variedad dinámica.
            - Si la especie del catálogo trae variedades_registradas_ica → dropdown.
            - Si no → campo OCULTO (no pedimos algo sin contexto).
            - Toggle "Otra" para texto libre cuando la variedad del operador no
              esté en la lista ICA. */}
        {showVarietyField && (
          <label className="flex flex-col gap-2" data-testid="variety-field">
            <span className="text-xl font-bold">Variedad</span>
            {!varietyCustom ? (
              <select
                name="variety"
                value={formData.variety}
                onChange={(e) => {
                  if (e.target.value === '__custom__') {
                    setVarietyCustom(true);
                    setFormData((prev) => ({ ...prev, variety: '' }));
                  } else {
                    handleInput(e);
                  }
                }}
                className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px]"
              >
                <option value="">Seleccionar variedad…</option>
                {varieties.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}{v.obtentor ? ` — ${v.obtentor}` : ''}
                  </option>
                ))}
                <option value="__custom__">Otra (escribir nombre)</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  name="variety"
                  value={formData.variety}
                  onChange={handleInput}
                  placeholder="Nombre de la variedad"
                  className="flex-1 p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px]"
                />
                <button
                  type="button"
                  onClick={() => { setVarietyCustom(false); setFormData((prev) => ({ ...prev, variety: '' })); }}
                  className="px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold min-h-[64px]"
                  aria-label="Volver al listado del catálogo"
                >
                  Lista
                </button>
              </div>
            )}
            {varietyHelp && !varietyCustom && (
              <p className="text-xs text-slate-500">{varietyHelp}</p>
            )}
          </label>
        )}

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Notas</span>
          <textarea name="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-xl text-white min-h-[80px]" />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Cantidad de Plántulas</span>
          <input
            type="number"
            name="quantity"
            min="1"
            max={MAX_QUANTITY}
            step="1"
            value={formData.quantity}
            onChange={handleInput}
            onBlur={() => markTouched('quantity')}
            aria-invalid={touched.quantity && !!errors.quantity}
            className={`p-4 rounded-xl bg-slate-900 border text-2xl text-white min-h-[64px] ${
              touched.quantity && errors.quantity ? 'border-red-700' : 'border-slate-700'
            }`}
          />
          {touched.quantity && errors.quantity && (
            <p className="text-sm text-red-400 flex items-center gap-1.5">
              <AlertCircle size={14} aria-hidden="true" /> {errors.quantity}
            </p>
          )}
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-xl font-bold">Mapeo Geoespacial</span>
          <button onClick={toggleRecording} className={`p-5 rounded-xl text-2xl font-bold flex justify-center items-center gap-3 shadow-md min-h-[80px] ${isRecording ? 'bg-red-600 text-white border-b-4 border-red-800' : 'bg-slate-800 border-2 border-slate-600'}`}>
            <MapPin size={32} />
            {isRecording ? 'Detener Trazado' : 'Definir Área'}
          </button>
          {isRecording && <div className="text-yellow-400 font-bold text-xl text-center animate-pulse mt-2">Grabando ruta... {coordinates.length} puntos registrados</div>}
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving || hasErrors}
          aria-busy={isSaving}
          aria-disabled={hasErrors || undefined}
          title={hasErrors ? 'Completa los campos correctamente' : undefined}
          className="mt-4 p-6 rounded-xl bg-green-600 active:bg-green-500 text-2xl lg:text-3xl font-black shadow-xl min-h-[80px] border-b-4 border-green-800 disabled:opacity-60 disabled:active:bg-green-600 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Guardando…' : 'Guardar Registro'}
        </button>
      </div>
    </div>
  );
}
