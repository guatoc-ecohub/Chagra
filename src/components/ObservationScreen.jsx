import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ArrowLeft, AlertCircle, Camera, Image as ImageIcon, Sparkles } from 'lucide-react';
import DateField from './DateField';
import CaseLinkModal from './CaseLinkModal';
import { syncManager } from '../services/syncManager';
import useAssetStore from '../store/useAssetStore';
import { getParentLandIdFromAsset } from '../utils/assetRelationships';
import { retrieve as ragRetrieve } from '../services/ragRetriever';
import { compressImage, IMAGE_TOO_LARGE_MESSAGE } from '../utils/imageCompress';

// Bug 069.10 — observation requiere descripción mínima útil + ubicación.
// Mínimo de 5 caracteres descarta entries vacíos tipo "ok" o "test".
const MIN_DESCRIPTION_LEN = 5;
const MAX_DESCRIPTION_LEN = 2000;

// Audit deep 070.5 — selector plant opcional. Cuando el land seleccionado
// tiene plants asociadas (parent.data o location.data apuntan al landId),
// mostramos un dropdown para vincular la observación a una planta puntual.
//
// Audit deep 070.6 — bridge severity → case_study. Si severity ∈ {high,
// critical} y savePayload resuelve OK, abrimos CaseLinkModal con el logId
// resultante para que el operador linke a caso existente o cree uno nuevo
// (pre-fill species_slug + timeline[0]).
const SEVERITY_TRIGGER_CASE_BRIDGE = new Set(['high', 'critical']);

// L1.5 — sugerencia proactiva de tratamientos vía RAG.
// Cuando el operador describe una observación con severity media-alta,
// disparamos `retrieve(description + species_name, 5)` tras 3s de inactividad
// (debounce) y mostramos top 2-3 passages en sección colapsada NO bloqueante.
// La sugerencia es informativa: el operador puede ignorarla y guardar igual.
const SEVERITY_TRIGGER_RAG_SUGGEST = new Set(['medium', 'high', 'critical']);
const RAG_SUGGEST_DEBOUNCE_MS = 3000;
const RAG_SUGGEST_TOP_K = 5;
const RAG_SUGGEST_SHOW_LIMIT = 3;
const RAG_PASSAGE_EXCERPT_LEN = 220;

function ObservationScreen({ onBack, onSave }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    observationType: 'general',
    description: '',
    locationId: '',
    plantId: '',
    severity: 'info'
  });
  const [photo, setPhoto] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [touched, setTouched] = useState(/** @type {Record<string,boolean>} */ ({}));
  // Audit 070.6 — modal payload tras éxito en severity high/critical.
  // Shape: { logId, severity, description, speciesSlug, plantId, landId }.
  const [caseBridgePayload, setCaseBridgePayload] = useState(null);

  const lands = useAssetStore((s) => s.lands);
  const plants = useAssetStore((s) => s.plants);

  // Audit 070.5 — plants filtradas por land seleccionado. Cuando no hay
  // locationId aún (o el land no tiene plants), el selector se oculta.
  const plantsForSelectedLand = useMemo(() => {
    if (!formData.locationId || !Array.isArray(plants) || plants.length === 0) return [];
    return plants.filter((p) => getParentLandIdFromAsset(p) === formData.locationId);
  }, [formData.locationId, plants]);

  // Bug 069.10 — validación inline para description + date. `locationId` no
  // tiene input en la UI todavía (queda en el handleSave check legacy) — no se
  // incluye acá para no deshabilitar el botón de forma permanente.
  /** @type {{ description?: string, date?: string }} */
  const errors = useMemo(() => {
    const e = {};
    const today = new Date().toISOString().split('T')[0];
    const desc = (formData.description || '').trim();
    if (!desc) e.description = 'Describe la observación';
    else if (desc.length < MIN_DESCRIPTION_LEN) e.description = `Mínimo ${MIN_DESCRIPTION_LEN} caracteres`;
    else if (desc.length > MAX_DESCRIPTION_LEN) e.description = `Máximo ${MAX_DESCRIPTION_LEN} caracteres`;
    if (!formData.date) e.date = 'Indica la fecha';
    else if (formData.date > today) e.date = 'La fecha no puede ser futura';
    return e;
  }, [formData]);

  const hasErrors = Object.keys(errors).length > 0;
  const markTouched = (field) => setTouched((t) => ({ ...t, [field]: true }));

  // L1.5 — sugerencias proactivas RAG (debounced, no bloqueante).
  const [ragSuggestions, setRagSuggestions] = useState([]);
  // _ragLoading: prefijo `_` para satisfacer eslint (state actualizado pero
  // no leído en este componente — el UI loading lo refleja vía ragSuggestions
  // length + skeleton fallback. Mantener el setter para futuro indicator).
  const [_ragLoading, setRagLoading] = useState(false);
  const ragRequestIdRef = useRef(0);

  // Nombre de la especie seleccionada (si hay plant). Usado para enriquecer
  // la query RAG con contexto botánico. Cae a '' cuando no hay match.
  const selectedSpeciesName = useMemo(() => {
    if (!formData.plantId) return '';
    const plant = (plants || []).find((p) => p.id === formData.plantId);
    return (
      plant?.attributes?.species_slug
      || plant?.attributes?.species?.name
      || plant?.attributes?.name
      || ''
    );
  }, [formData.plantId, plants]);

  useEffect(() => {
    const desc = (formData.description || '').trim();
    const triggers = SEVERITY_TRIGGER_RAG_SUGGEST.has(formData.severity);

    // Reset si no se cumplen condiciones (mantiene UI limpia entre cambios
    // de severity o descripción vaciada).
    if (!triggers || desc.length < MIN_DESCRIPTION_LEN) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRagSuggestions([]);
      setRagLoading(false);
      return undefined;
    }

    const requestId = ++ragRequestIdRef.current;
    setRagLoading(true);

    const timerId = setTimeout(async () => {
      try {
        const query = selectedSpeciesName
          ? `${desc} ${selectedSpeciesName}`
          : desc;
        const results = await ragRetrieve(query, RAG_SUGGEST_TOP_K);
        // Race-guard: si entre el debounce y el resolve otro cambio disparó
        // un nuevo request, descartamos este resultado.
        if (requestId !== ragRequestIdRef.current) return;
        const filtered = Array.isArray(results)
          ? results.filter((r) => r && typeof r.score === 'number' && r.score > 0)
          : [];
        setRagSuggestions(filtered.slice(0, RAG_SUGGEST_SHOW_LIMIT));
      } catch (err) {
        // Graceful: RAG falla → sección NO se renderiza, sin error UI.
        console.warn('[ObservationScreen] RAG retrieve failed:', err);
        if (requestId === ragRequestIdRef.current) setRagSuggestions([]);
      } finally {
        if (requestId === ragRequestIdRef.current) setRagLoading(false);
      }
    }, RAG_SUGGEST_DEBOUNCE_MS);

    return () => clearTimeout(timerId);
  }, [formData.description, formData.severity, selectedSpeciesName]);

  const handleInput = (e) => {
    setFormData(prev => {
      const next = { ...prev, [e.target.name]: e.target.value };
      // Si cambia el land, reseteamos plantId para no arrastrar referencia
      // huérfana de la zona anterior.
      if (e.target.name === 'locationId') next.plantId = '';
      return next;
    });
  };

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const handlePhotoCapture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Pre-compresión cliente-lado (operador 2026-05-27): 1600 px / JPEG 0.85
    // → fallback 0.7 → reject > 2 MB.
    const compressed = await compressImage(file);
    if (!compressed.ok) {
      if ('reason' in compressed && compressed.reason === 'too_large') {
        window.dispatchEvent(new CustomEvent('chagraToast', {
          detail: { message: IMAGE_TOO_LARGE_MESSAGE },
        }));
      }
      if (e.target) e.target.value = '';
      return;
    }
    setPhoto(compressed.blob);
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(URL.createObjectURL(compressed.blob));
    if (e.target) e.target.value = '';
  };

  const handleSave = async () => {
    if (isSaving) return;
    // Bug 069.10 — validación inline previa
    if (hasErrors) {
      setTouched({ description: true, date: true });
      onSave('Revisa los campos marcados', true);
      return;
    }
    if (!formData.description || !formData.locationId) {
      onSave('Completa descripcion y ubicacion', true);
      return;
    }

    setIsSaving(true);
    try {
      // Audit 070.5 — id pre-asignado para que el bridge 070.6 tenga un
      // logId estable que pasar al modal aún en flujo offline.
      const logId = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
        ? crypto.randomUUID()
        : `obs-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

      // Audit 070.5 — relationships dual:
      //   - location: SIEMPRE asset--land (compat flujo legacy).
      //   - asset: SOLO si el operador eligió una planta puntual.
      const relationships = {
        location: {
          data: [{ type: 'asset--land', id: formData.locationId }],
        },
      };
      if (formData.plantId) {
        relationships.asset = {
          data: [{ type: 'asset--plant', id: formData.plantId }],
        };
      }

      const payload = {
        data: {
          type: 'log--observation',
          id: logId,
          attributes: {
            name: formData.description,
            timestamp: new Date(formData.date).toISOString().split('.')[0] + '+00:00',
            status: 'done',
            notes: formData.notes || '',
            severity: formData.severity,
          },
          relationships,
        },
      };

      // Guardar en IndexedDB usando syncManager
      await syncManager.saveTransaction({
        type: 'observation',
        payload: { ...payload, endpoint: '/api/log/observation' }
      });

      onSave('Registro guardado localmente (Pendiente de sincronización)', false);

      // Audit 070.6 — bridge severity → case_study. Si severity es high/critical
      // abrimos el modal ANTES de navegar atrás para que el operador pueda
      // linkar o crear caso. La planta seleccionada (si la hay) alimenta el
      // pre-fill de species_slug.
      const triggersCaseBridge = SEVERITY_TRIGGER_CASE_BRIDGE.has(formData.severity);
      if (triggersCaseBridge) {
        const selectedPlant = formData.plantId
          ? (plants || []).find((p) => p.id === formData.plantId)
          : null;
        const speciesSlug = selectedPlant?.attributes?.species_slug
          || selectedPlant?.attributes?.species?.name
          || null;
        setCaseBridgePayload({
          logId,
          severity: formData.severity,
          description: formData.description,
          speciesSlug,
          plantId: formData.plantId || null,
          landId: formData.locationId,
        });
        // Reset parcial: NO navegamos atrás hasta que el modal cierre.
        setFormData({
          date: new Date().toISOString().split('T')[0],
          observationType: 'general',
          description: '',
          locationId: '',
          plantId: '',
          severity: 'info',
        });
        setPhoto(null);
        if (photoUrl) URL.revokeObjectURL(photoUrl);
        setPhotoUrl(null);
        return;
      }

      // Reset partial state and navigate back (flujo sin bridge)
      setFormData({
        date: new Date().toISOString().split('T')[0],
        observationType: 'general',
        description: '',
        locationId: '',
        plantId: '',
        severity: 'info'
      });
      setPhoto(null);
      setPhotoUrl(null);
      setTimeout(() => onBack(), 500); // Pequeño delay para feedback visual
    } catch (error) {
      console.error('Error en ObservationScreen handleSave:', error);
      onSave('Error al guardar registro', true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCaseBridgeClose = () => {
    setCaseBridgePayload(null);
    // Cerrar la pantalla tras dismiss del modal (link, create o "más tarde").
    setTimeout(() => onBack(), 200);
  };

  return (
    <div className="h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col overflow-y-auto">
      <header className="p-4 sticky top-0 bg-slate-950 border-b border-slate-800 flex items-center gap-4 z-10 shrink-0 shadow-md">
        <button onClick={onBack} aria-label="Volver" className="p-3 bg-slate-800 rounded-full active:bg-slate-700 min-h-[56px] min-w-[56px] flex justify-center items-center shrink-0">
          <ArrowLeft size={32} />
        </button>
        <h2 className="text-3xl font-bold">Observacion</h2>
      </header>

      <div className="flex-1 p-5 flex flex-col gap-6 pb-24">
        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Tipo de Observacion</span>
          <select name="observationType" value={formData.observationType} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px] appearance-none">
            <option value="general">General</option>
            <option value="health">Salud</option>
            <option value="environmental">Ambiental</option>
            <option value="infrastructure">Infraestructura</option>
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Descripcion</span>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInput}
            onBlur={() => markTouched('description')}
            aria-invalid={touched.description && !!errors.description}
            rows={4}
            maxLength={MAX_DESCRIPTION_LEN}
            className={`p-4 rounded-xl bg-slate-900 border text-xl text-white min-h-[80px] ${
              touched.description && errors.description ? 'border-red-700' : 'border-slate-700'
            }`}
            placeholder="Describe la observacion..."
          />
          {touched.description && errors.description && (
            <p className="text-sm text-red-400 flex items-center gap-1.5">
              <AlertCircle size={14} aria-hidden="true" /> {errors.description}
            </p>
          )}
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Severidad</span>
          <select name="severity" value={formData.severity} onChange={handleInput} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px] appearance-none">
            <option value="info">Informacion</option>
            <option value="warning">Advertencia</option>
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
            <option value="critical">Critica</option>
          </select>
        </label>

        {/* L1.5 — sugerencias RAG no bloqueantes. Solo renderiza si hay
            resultados con score>0. Colapsada por defecto para no robar foco
            del flujo de guardado. Operador puede ignorarla. */}
        {ragSuggestions.length > 0 && (
          <details
            data-testid="rag-treatment-suggestions"
            className="rounded-xl bg-slate-900 border border-purple-700/40 overflow-hidden"
          >
            <summary className="p-4 cursor-pointer flex items-center gap-2 text-lg font-bold text-purple-200">
              <Sparkles size={20} aria-hidden="true" className="text-purple-300" />
              Tratamientos sugeridos por la red Chagra
              <span className="text-sm font-normal text-slate-400 ml-1">
                ({ragSuggestions.length})
              </span>
            </summary>
            <ul className="px-4 pb-4 flex flex-col gap-3" role="list">
              {ragSuggestions.map((suggestion, idx) => {
                const excerpt = (suggestion.text || '').slice(0, RAG_PASSAGE_EXCERPT_LEN);
                const truncated = (suggestion.text || '').length > RAG_PASSAGE_EXCERPT_LEN;
                return (
                  <li
                    key={`${suggestion.species || 'unknown'}-${suggestion.key || idx}`}
                    data-testid="rag-suggestion-item"
                    className="rounded-lg bg-slate-950/60 border border-slate-800 p-3 text-base"
                  >
                    {suggestion.species && (
                      <p className="text-purple-300 text-sm font-semibold italic mb-1">
                        {suggestion.species}
                      </p>
                    )}
                    <p className="text-slate-200 leading-relaxed">
                      {excerpt}{truncated ? '…' : ''}
                    </p>
                  </li>
                );
              })}
            </ul>
            <p className="px-4 pb-3 text-xs text-slate-500">
              Sugerencia informativa. Puedes ignorarla y guardar la observación.
            </p>
          </details>
        )}

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Zona (Land)</span>
          <select
            name="locationId"
            value={formData.locationId}
            onChange={handleInput}
            className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px] appearance-none"
          >
            <option value="">— Selecciona una zona —</option>
            {(lands || []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.attributes?.name || l.name || l.id}
              </option>
            ))}
          </select>
        </label>

        {/* Audit 070.5 — selector plant opcional. Solo aparece si hay land
            seleccionado Y ese land tiene plants asociadas. Sin selección, la
            observación queda vinculada solo al land (compat legacy). */}
        {plantsForSelectedLand.length > 0 && (
          <label className="flex flex-col gap-2" data-testid="plant-selector-wrapper">
            <span className="text-xl font-bold">Planta (opcional)</span>
            <select
              name="plantId"
              value={formData.plantId}
              onChange={handleInput}
              data-testid="plant-selector"
              className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px] appearance-none"
            >
              <option value="">— Sin planta puntual —</option>
              {plantsForSelectedLand.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.attributes?.name || p.name || p.id}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-500">
              Si eliges una planta, la observación se vincula a la planta además del land.
            </span>
          </label>
        )}

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

        <label className="flex flex-col gap-2">
          <span className="text-xl font-bold">Notas Adicionales</span>
          <textarea name="notes" value={formData.notes ?? ''} onChange={handleInput} rows={2} className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-xl text-white min-h-[80px]" />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-xl font-bold">Foto</span>
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} className="hidden" aria-label="Tomar foto con camara" />
          <input ref={galleryInputRef} type="file" accept="image/*" onChange={handlePhotoCapture} className="hidden" aria-label="Seleccionar foto de galeria" />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="p-4 rounded-xl text-lg font-bold flex justify-center items-center gap-2 shadow-md min-h-[80px] bg-emerald-900/40 border-2 border-emerald-700/60 text-emerald-100 active:bg-emerald-800/60"
            >
              <Camera size={28} />
              <span>Tomar foto</span>
            </button>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="p-4 rounded-xl text-lg font-bold flex justify-center items-center gap-2 shadow-md min-h-[80px] bg-slate-800 border-2 border-slate-600 active:bg-slate-700"
            >
              <ImageIcon size={28} />
              <span>Subir desde galería</span>
            </button>
          </div>
          {photo && (
            <p className="text-sm text-emerald-300">Foto lista ({Math.round(photo.size / 1024)} KB).</p>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving || hasErrors}
          aria-busy={isSaving}
          aria-disabled={hasErrors || undefined}
          title={hasErrors ? 'Completa los campos correctamente' : undefined}
          className="mt-4 p-6 rounded-xl bg-purple-600 active:bg-purple-500 text-2xl lg:text-3xl font-black shadow-xl min-h-[80px] border-b-4 border-purple-800 disabled:opacity-60 disabled:active:bg-purple-600 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Guardando…' : 'Guardar Observacion'}
        </button>
      </div>

      {caseBridgePayload && (
        <CaseLinkModal
          logId={caseBridgePayload.logId}
          severity={caseBridgePayload.severity}
          description={caseBridgePayload.description}
          speciesSlug={caseBridgePayload.speciesSlug}
          plantId={caseBridgePayload.plantId}
          landId={caseBridgePayload.landId}
          onClose={handleCaseBridgeClose}
        />
      )}
    </div>
  );
}

export default ObservationScreen;
