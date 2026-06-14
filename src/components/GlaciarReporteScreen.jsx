import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft, MapPin, Loader2, AlertCircle, Mountain, Thermometer,
  Save, ListChecks, Trash2, CheckCircle2, Snowflake,
} from 'lucide-react';
import { useGeolocation } from '../hooks/useGeolocation';
import PhotoCaptureField from './PhotoCaptureField';
import { blobToDataUrl } from '../utils/imageProcessor';
import { glaciarReportes, nuevoReporteId } from '../db/glaciarReportes';
import { evaluarSeguridadGlaciar } from '../services/glaciarSafety';
import {
  TIPOS_SUPERFICIE, ESCALA_DUREZA, PELIGROS, NUBOSIDAD, VIENTO, VISIBILIDAD,
  SUPERFICIE_BY_KEY, PELIGRO_BY_KEY, DUREZA_BY_VALOR,
} from '../data/glaciar-schema.js';

/**
 * GlaciarReporteScreen — Reporte OFFLINE de Punto Glaciar (módulo demo para
 * guías de glaciar). Ruta: #glaciar.
 *
 * Flujo de campo (todo offline-first):
 *   1. Capturar UBICACIÓN (GPS: lat/lng/altitud/precisión) sin red.
 *   2. Capturar FOTO del punto (repeat photography → trazabilidad).
 *   3. Diagnóstico de DUREZA DEL HIELO + peligros + condiciones.
 *   4. Estado de seguridad DERIVADO en vivo (🟢/🟡/🔴).
 *   5. Guardar en IndexedDB (sobrevive recargas) + lista de trazabilidad.
 *
 * Español Colombia (usted/tú, SIN voseo). Tono claro y de campo.
 *
 * Demo: refinable con la investigación glaciológica en paralelo. Enums en
 * src/data/glaciar-schema.js; lógica de seguridad en services/glaciarSafety.js.
 */

const COLOR_BTN = {
  emerald: 'bg-emerald-900/30 border-emerald-600/60 text-emerald-200',
  amber: 'bg-amber-900/30 border-amber-600/60 text-amber-200',
  red: 'bg-red-900/30 border-red-600/60 text-red-200',
};

const ESTADO_BG = {
  estable: 'bg-emerald-900/25 border-emerald-600/50',
  precaucion: 'bg-amber-900/25 border-amber-600/50',
  peligro: 'bg-red-900/25 border-red-600/50',
};

function emptyForm() {
  return {
    guia: '',
    tipoSuperficie: '',
    dureza: null,
    tempSuperficie: '',
    peligros: [],
    tempAmbiente: '',
    nubosidad: '',
    viento: '',
    visibilidad: '',
    notas: '',
  };
}

export default function GlaciarReporteScreen({ onBack }) {
  const [tab, setTab] = useState('nuevo'); // 'nuevo' | 'lista'
  const [form, setForm] = useState(emptyForm);
  const [coords, setCoords] = useState(null); // {lat,lng,altitud,precision}
  const [fotoBlob, setFotoBlob] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [reportes, setReportes] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  const { position, error: geoError, loading: geoLoading, request } = useGeolocation();

  // Capturar coords cuando llega la posición del GPS.
  useEffect(() => {
    if (position && !geoError) {
      setCoords({
        lat: position.lat,
        lng: position.lon,
        // altitud: la del GPS si vino; si no, queda null (el guía la conoce).
        altitud: typeof position.altitude === 'number' ? Math.round(position.altitude) : null,
        precision: typeof position.accuracy === 'number' ? Math.round(position.accuracy) : null,
      });
    }
  }, [position, geoError]);

  const cargarReportes = useCallback(async () => {
    setLoadingList(true);
    try {
      const all = await glaciarReportes.getAll();
      setReportes(all);
    } catch (e) {
      console.error('[Glaciar] error cargando reportes:', e);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'lista') cargarReportes();
  }, [tab, cargarReportes]);

  // Estado de seguridad en vivo (cada vez que cambia el diagnóstico).
  const seguridad = useMemo(
    () => evaluarSeguridadGlaciar({
      tipoSuperficie: form.tipoSuperficie,
      dureza: form.dureza,
      peligros: form.peligros,
    }),
    [form.tipoSuperficie, form.dureza, form.peligros],
  );

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const togglePeligro = (key) => {
    setForm((f) => {
      const has = f.peligros.includes(key);
      return { ...f, peligros: has ? f.peligros.filter((p) => p !== key) : [...f.peligros, key] };
    });
  };

  const handlePhoto = useCallback((blob) => setFotoBlob(blob), []);
  const handleRemovePhoto = useCallback(() => setFotoBlob(null), []);

  const puedeGuardar = !!coords && !!form.tipoSuperficie && form.dureza != null && !saving;

  const handleGuardar = async () => {
    if (!puedeGuardar) return;
    setSaving(true);
    setSavedOk(false);
    try {
      // Foto → dataURL para sobrevivir recargas offline (NO blob URL volátil).
      let fotoDataUrl = null;
      if (fotoBlob) {
        try {
          fotoDataUrl = await blobToDataUrl(fotoBlob);
        } catch (e) {
          console.warn('[Glaciar] no se pudo convertir la foto, se guarda sin ella:', e);
        }
      }
      const reporte = {
        id: nuevoReporteId(),
        guia: form.guia.trim(),
        lat: coords.lat,
        lng: coords.lng,
        altitud: coords.altitud,
        precision: coords.precision,
        tipoSuperficie: form.tipoSuperficie,
        dureza: form.dureza,
        tempSuperficie: numOrNull(form.tempSuperficie),
        peligros: form.peligros,
        tempAmbiente: numOrNull(form.tempAmbiente),
        nubosidad: form.nubosidad || null,
        viento: form.viento || null,
        visibilidad: form.visibilidad || null,
        notas: form.notas.trim(),
        fotoDataUrl,
        estado: seguridad.nivel,
        estadoRazones: seguridad.razones,
      };
      await glaciarReportes.save(reporte);
      setSavedOk(true);
      // Reset del formulario para el siguiente punto, pero conservamos el
      // nombre del guía (suele ser el mismo en toda la jornada).
      const guia = form.guia;
      setForm({ ...emptyForm(), guia });
      setCoords(null);
      setFotoBlob(null);
      setTimeout(() => setSavedOk(false), 2500);
    } catch (e) {
      console.error('[Glaciar] error guardando reporte:', e);
      alert('No se pudo guardar el reporte. Intente de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Eliminar este reporte?')) return;
    await glaciarReportes.remove(id);
    cargarReportes();
  };

  return (
    <div className="min-h-screen w-full text-slate-100 pb-28">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur-md bg-slate-950/70 border-b border-slate-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 -ml-2 rounded-xl text-slate-300 hover:bg-slate-800 active:scale-95 transition"
            aria-label="Volver"
          >
            <ChevronLeft size={26} />
          </button>
          <div className="flex items-center gap-2">
            <Snowflake size={22} className="text-sky-300" />
            <div>
              <h1 className="text-lg font-black leading-tight">Punto Glaciar</h1>
              <p className="text-[11px] text-slate-400 leading-tight">Reporte offline para guías</p>
            </div>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex px-3 gap-2 pb-2">
          <TabBtn active={tab === 'nuevo'} onClick={() => setTab('nuevo')} icon={<MapPin size={16} />}>
            Nuevo reporte
          </TabBtn>
          <TabBtn active={tab === 'lista'} onClick={() => setTab('lista')} icon={<ListChecks size={16} />}>
            Reportes guardados
          </TabBtn>
        </div>
      </header>

      {tab === 'nuevo' ? (
        <main className="px-4 pt-4 space-y-5 max-w-xl mx-auto">
          {/* Estado de seguridad en vivo (sticky-ish arriba del form) */}
          <SeguridadBanner seguridad={seguridad} />

          {/* 1. UBICACIÓN */}
          <Section num="1" title="Ubicación del punto" icon={<MapPin size={18} />}>
            <button
              type="button"
              onClick={() => request()}
              disabled={geoLoading}
              className={`w-full p-4 rounded-2xl border-2 flex items-center justify-center gap-3 transition active:scale-95 ${
                geoLoading
                  ? 'bg-slate-800 border-slate-700 text-slate-500'
                  : coords
                    ? 'bg-emerald-900/20 border-emerald-700 text-emerald-300'
                    : 'bg-slate-900 border-slate-700 text-sky-200 hover:bg-slate-800'
              }`}
            >
              {geoLoading ? <Loader2 size={22} className="animate-spin" /> : <MapPin size={22} />}
              <span className="font-bold text-base">
                {geoLoading ? 'Capturando GPS…' : coords ? 'Ubicación capturada' : 'Capturar ubicación (GPS)'}
              </span>
            </button>

            {geoError && (
              <div className="mt-2 p-3 bg-amber-900/20 border border-amber-800/50 rounded-xl flex gap-2">
                <AlertCircle size={18} className="text-amber-400 shrink-0" />
                <p className="text-xs text-amber-300">
                  No se pudo obtener la ubicación. Reintente a cielo abierto con buena señal.
                </p>
              </div>
            )}

            {coords && (
              <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                <Stat label="Latitud" value={coords.lat.toFixed(5)} />
                <Stat label="Longitud" value={coords.lng.toFixed(5)} />
                <Stat
                  label="Altitud"
                  value={coords.altitud != null ? `${coords.altitud} msnm` : '—'}
                  icon={<Mountain size={14} />}
                />
                <Stat
                  label="Precisión"
                  value={coords.precision != null ? `±${coords.precision} m` : '—'}
                />
              </div>
            )}
          </Section>

          {/* 2. FOTO */}
          <Section num="2" title="Foto del punto" icon={<CheckCircle2 size={18} />}>
            <p className="text-xs text-slate-400 mb-2">
              La foto deja huella del mismo punto en el tiempo (trazabilidad del deshielo).
            </p>
            <PhotoCaptureField
              onPhoto={handlePhoto}
              onRemove={handleRemovePhoto}
              value={fotoBlob}
              label="Foto del glaciar"
            />
          </Section>

          {/* 3. DIAGNÓSTICO */}
          <Section num="3" title="Dureza del hielo" icon={<Snowflake size={18} />}>
            <Label>Tipo de superficie</Label>
            <div className="grid grid-cols-2 gap-2">
              {TIPOS_SUPERFICIE.map((t) => (
                <ChipBtn
                  key={t.key}
                  active={form.tipoSuperficie === t.key}
                  onClick={() => setField('tipoSuperficie', t.key)}
                >
                  <span className="text-xl">{t.icon}</span>
                  <span className="text-left text-sm leading-tight">{t.label}</span>
                </ChipBtn>
              ))}
            </div>

            <Label className="mt-4">Dureza (penetración de piolet/sonda)</Label>
            <div className="space-y-2">
              {ESCALA_DUREZA.map((d) => (
                <button
                  key={d.valor}
                  type="button"
                  onClick={() => setField('dureza', d.valor)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition active:scale-[0.99] text-left ${
                    form.dureza === d.valor
                      ? 'bg-sky-900/30 border-sky-500 text-sky-100'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className={`shrink-0 w-9 h-9 rounded-full grid place-items-center font-black text-lg ${
                    form.dureza === d.valor ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {d.valor}
                  </span>
                  <span>
                    <span className="font-bold block leading-tight">{d.label}</span>
                    <span className="text-xs text-slate-400 leading-tight">{d.desc}</span>
                  </span>
                </button>
              ))}
            </div>

            <Label className="mt-4">Temperatura de la superficie (°C) — opcional</Label>
            <NumberInput
              value={form.tempSuperficie}
              onChange={(v) => setField('tempSuperficie', v)}
              placeholder="ej. -3"
              icon={<Thermometer size={18} />}
            />
          </Section>

          {/* 4. PELIGROS */}
          <Section num="4" title="Peligros observados" icon={<AlertCircle size={18} />}>
            <p className="text-xs text-slate-400 mb-2">Marque todos los que vea.</p>
            <div className="grid grid-cols-2 gap-2">
              {PELIGROS.map((p) => (
                <ChipBtn
                  key={p.key}
                  active={form.peligros.includes(p.key)}
                  danger
                  onClick={() => togglePeligro(p.key)}
                >
                  <span className="text-xl">{p.icon}</span>
                  <span className="text-left text-sm leading-tight">{p.label}</span>
                </ChipBtn>
              ))}
            </div>
          </Section>

          {/* 5. CONDICIONES */}
          <Section num="5" title="Condiciones y datos del guía" icon={<Thermometer size={18} />}>
            <Label>Temperatura ambiente (°C) — opcional</Label>
            <NumberInput
              value={form.tempAmbiente}
              onChange={(v) => setField('tempAmbiente', v)}
              placeholder="ej. 1"
              icon={<Thermometer size={18} />}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <SelectField label="Nubosidad" value={form.nubosidad} onChange={(v) => setField('nubosidad', v)} options={NUBOSIDAD} />
              <SelectField label="Viento" value={form.viento} onChange={(v) => setField('viento', v)} options={VIENTO} />
              <SelectField label="Visibilidad" value={form.visibilidad} onChange={(v) => setField('visibilidad', v)} options={VISIBILIDAD} />
            </div>

            <Label className="mt-3">Nombre del guía</Label>
            <input
              type="text"
              value={form.guia}
              onChange={(e) => setField('guia', e.target.value)}
              placeholder="Quién hace el reporte"
              className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-base text-white outline-none focus:border-sky-500"
            />

            <Label className="mt-3">Notas</Label>
            <textarea
              value={form.notas}
              onChange={(e) => setField('notas', e.target.value)}
              placeholder="Lo que quiera dejar anotado del punto…"
              className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-base text-white outline-none focus:border-sky-500 min-h-[80px] resize-y"
            />
          </Section>

          {/* Hora auto (informativa) */}
          <p className="text-[11px] text-slate-500 text-center">
            Hora del reporte: {new Date().toLocaleString('es-CO')}
          </p>

          {/* Guardar */}
          <button
            type="button"
            onClick={handleGuardar}
            disabled={!puedeGuardar}
            className={`w-full p-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition active:scale-95 ${
              savedOk
                ? 'bg-emerald-500 text-slate-950'
                : puedeGuardar
                  ? 'bg-sky-500 text-slate-950 hover:bg-sky-400'
                  : 'bg-slate-800 text-slate-500'
            }`}
          >
            {saving ? <Loader2 size={22} className="animate-spin" /> : savedOk ? <CheckCircle2 size={22} /> : <Save size={22} />}
            {savedOk ? 'Reporte guardado' : saving ? 'Guardando…' : 'Guardar reporte'}
          </button>
          {!puedeGuardar && !saving && !savedOk && (
            <p className="text-[11px] text-slate-500 text-center -mt-2">
              Capture ubicación, tipo de superficie y dureza para guardar.
            </p>
          )}
        </main>
      ) : (
        <ListaReportes
          reportes={reportes}
          loading={loadingList}
          onEliminar={handleEliminar}
          onNuevo={() => setTab('nuevo')}
        />
      )}
    </div>
  );
}

/* ───────────────────────── Subcomponentes ───────────────────────── */

function TabBtn({ active, onClick, icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition ${
        active ? 'bg-sky-500/20 text-sky-200 border border-sky-600/50' : 'bg-slate-900 text-slate-400 border border-slate-800'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function Section({ num, title, icon, children }) {
  return (
    <section className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4">
      <h2 className="flex items-center gap-2 text-base font-bold text-slate-200 mb-3">
        <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-300 grid place-items-center text-sm font-black">
          {num}
        </span>
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function Label({ children, className = '' }) {
  return <p className={`text-sm font-bold text-slate-400 mb-2 ${className}`}>{children}</p>;
}

function Stat({ label, value, icon = null }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-2">
      <p className="text-[10px] uppercase tracking-wide text-slate-500 flex items-center justify-center gap-1">
        {icon}{label}
      </p>
      <p className="text-sm font-mono font-bold text-slate-100">{value}</p>
    </div>
  );
}

function ChipBtn({ active, danger = false, onClick, children }) {
  const activeCls = danger
    ? 'bg-red-900/30 border-red-500 text-red-100'
    : 'bg-sky-900/30 border-sky-500 text-sky-100';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 p-3 rounded-xl border-2 transition active:scale-[0.98] ${
        active ? activeCls : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
      }`}
    >
      {children}
    </button>
  );
}

function NumberInput({ value, onChange, placeholder, icon }) {
  return (
    <div className="relative">
      {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">{icon}</span>}
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-base text-white outline-none focus:border-sky-500 ${icon ? 'pl-10' : ''}`}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-base text-white outline-none focus:border-sky-500 appearance-none"
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.key} value={o.key}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function SeguridadBanner({ seguridad }) {
  return (
    <div className={`rounded-2xl border-2 p-4 ${ESTADO_BG[seguridad.nivel]}`}>
      <div className="flex items-center gap-3">
        <span className="text-3xl" aria-hidden="true">{seguridad.emoji}</span>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Estado de seguridad</p>
          <p className="text-xl font-black leading-tight">{seguridad.label}</p>
        </div>
      </div>
      <p className="text-sm text-slate-300 mt-2">{seguridad.desc}</p>
      {seguridad.razones?.length > 0 && (
        <ul className="mt-2 space-y-1">
          {seguridad.razones.map((r, i) => (
            <li key={i} className="text-xs text-slate-400 flex gap-1.5">
              <span className="text-slate-500">•</span>{r}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ListaReportes({ reportes, loading, onEliminar, onNuevo }) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <Loader2 size={32} className="animate-spin mb-3" />
        <p>Cargando reportes…</p>
      </div>
    );
  }
  if (!reportes.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <Snowflake size={48} className="text-slate-600 mb-4" />
        <p className="text-slate-300 font-bold mb-1">Aún no hay reportes</p>
        <p className="text-sm text-slate-500 mb-5">
          Cada reporte queda guardado en este dispositivo, incluso sin internet.
        </p>
        <button
          type="button"
          onClick={onNuevo}
          className="px-5 py-3 rounded-xl bg-sky-500 text-slate-950 font-bold flex items-center gap-2"
        >
          <MapPin size={18} /> Crear el primero
        </button>
      </div>
    );
  }

  return (
    <main className="px-4 pt-4 space-y-3 max-w-xl mx-auto">
      <p className="text-xs text-slate-500">
        {reportes.length} {reportes.length === 1 ? 'reporte guardado' : 'reportes guardados'} ·
        repita el mismo punto GPS en el tiempo para ver el cambio.
      </p>
      {reportes.map((r) => (
        <ReporteCard key={r.id} reporte={r} onEliminar={() => onEliminar(r.id)} />
      ))}
    </main>
  );
}

function ReporteCard({ reporte, onEliminar }) {
  const estado = reporte.estado || 'precaucion';
  const sup = SUPERFICIE_BY_KEY[reporte.tipoSuperficie];
  const dur = DUREZA_BY_VALOR[reporte.dureza];
  // createdAt/fechaISO siempre los estampa el store al guardar; el 0 es solo
  // un fallback defensivo (no usamos Date.now() en render — regla de pureza).
  const fecha = reporte.fechaISO ? new Date(reporte.fechaISO) : new Date(reporte.createdAt || 0);
  const emoji = estado === 'estable' ? '🟢' : estado === 'peligro' ? '🔴' : '🟡';

  return (
    <div className={`rounded-2xl border ${ESTADO_BG[estado]} overflow-hidden`}>
      <div className="flex gap-3 p-3">
        {/* Miniatura */}
        <div className="shrink-0 w-20 h-20 rounded-xl bg-slate-800 overflow-hidden grid place-items-center">
          {reporte.fotoDataUrl ? (
            <img src={reporte.fotoDataUrl} alt="Punto glaciar" className="w-full h-full object-cover" />
          ) : (
            <Snowflake size={28} className="text-slate-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-lg font-black flex items-center gap-1.5">
              {emoji} <span className="text-sm">{estadoLabel(estado)}</span>
            </span>
            <button
              type="button"
              onClick={onEliminar}
              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-900/20 transition"
              aria-label="Eliminar reporte"
            >
              <Trash2 size={16} />
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {fecha.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {sup && <Badge>{sup.icon} {sup.label}</Badge>}
            {dur && <Badge>Dureza {dur.valor} · {dur.label}</Badge>}
            {reporte.altitud != null && <Badge>{reporte.altitud} msnm</Badge>}
          </div>
          {reporte.lat != null && reporte.lng != null && (
            <p className="text-[11px] font-mono text-slate-500 mt-1">
              {reporte.lat.toFixed(5)}, {reporte.lng.toFixed(5)}
              {reporte.precision != null ? ` (±${reporte.precision}m)` : ''}
            </p>
          )}
          {reporte.guia && <p className="text-[11px] text-slate-400 mt-0.5">Guía: {reporte.guia}</p>}
        </div>
      </div>
      {Array.isArray(reporte.peligros) && reporte.peligros.length > 0 && (
        <div className="px-3 pb-3 flex flex-wrap gap-1.5">
          {reporte.peligros.map((p) => (
            <span key={p} className="text-[11px] px-2 py-0.5 rounded-full bg-red-900/30 text-red-200 border border-red-800/40">
              {(PELIGRO_BY_KEY[p]?.icon || '⚠️')} {PELIGRO_BY_KEY[p]?.label || p}
            </span>
          ))}
        </div>
      )}
      {reporte.notas && (
        <p className="px-3 pb-3 text-xs text-slate-400 italic">“{reporte.notas}”</p>
      )}
    </div>
  );
}

function Badge({ children }) {
  return (
    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
      {children}
    </span>
  );
}

/* ───────────────────────── helpers ───────────────────────── */

function numOrNull(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function estadoLabel(nivel) {
  if (nivel === 'estable') return 'Estable';
  if (nivel === 'peligro') return 'Peligro';
  return 'Precaución';
}
