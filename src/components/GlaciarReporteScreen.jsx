import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft, MapPin, Loader2, AlertCircle, Mountain, Thermometer,
  Save, ListChecks, Trash2, CheckCircle2, Snowflake, Compass, Layers,
  Plus, X, ShieldAlert, Info, Footprints,
} from 'lucide-react';
import { useGeolocation } from '../hooks/useGeolocation';
import PhotoCaptureField from './PhotoCaptureField';
import { blobToDataUrl } from '../utils/imageProcessor';
import { glaciarReportes, nuevoReporteId } from '../db/glaciarReportes';
import { evaluarSeguridadGlaciar } from '../services/glaciarSafety';
import {
  TIPOS_SUPERFICIE, ESCALA_DUREZA, PELIGROS, CIELO, VIENTO, VISIBILIDAD,
  MONTANAS, SUPERFICIE_BY_KEY, PELIGRO_BY_KEY, DUREZA_BY_CODIGO, MONTANA_BY_KEY,
  ESTADOS_SEGURIDAD, DISCLAIMER, PROPOSITO,
} from '../data/glaciar-schema.js';

/**
 * GlaciarReporteScreen — Reporte OFFLINE de Punto Glaciar para guías (v2
 * "escala creíble"). Ruta: #glaciar.
 *
 * El reporte representa el FRENTE/BORDE del hielo (el punto que retrocede).
 * Repetir el mismo punto en el tiempo = trazabilidad del retroceso.
 *
 * Flujo de campo (todo offline-first):
 *   1. Montaña + punto fijo (punto_id) + GPS + foto encuadrada (azimut).
 *   2. Dureza del hielo: escala mano→piolet (F..H2), perfil por capas +
 *      lectura puntual rápida de la superficie.
 *   3. Tipos de superficie, peligros, condiciones.
 *   4. Estado de seguridad DERIVADO en vivo (🟢/🟡/🔴/🔵 observación).
 *   5. Guardar en IndexedDB (sobrevive recargas) + lista de trazabilidad.
 *
 * Español Colombia (usted/tú, SIN voseo). Tono claro y de campo.
 *
 * Enums en src/data/glaciar-schema.js; lógica en services/glaciarSafety.js.
 */

const ESTADO_BG = {
  estable: 'bg-emerald-900/25 border-emerald-600/50',
  precaucion: 'bg-amber-900/25 border-amber-600/50',
  peligro: 'bg-red-900/25 border-red-600/50',
  observacion: 'bg-sky-900/25 border-sky-600/50',
};

const ESTADO_EMOJI = {
  estable: '🟢', precaucion: '🟡', peligro: '🔴', observacion: '🔵',
};

function nuevaCapa() {
  return { profundidad: '', tipoSuperficie: '', dureza: '' };
}

function emptyForm() {
  return {
    guia: '',
    montana: '',
    montanaLibre: '',
    puntoId: '',
    pisoGlaciar: true,
    // Perfil por capas (la primera es la superficie) + lectura puntual rápida.
    capas: [nuevaCapa()],
    tipoSuperficie: '', // lectura puntual de superficie
    dureza: '', // lectura puntual de dureza (código F..H2)
    tempSuperficie: '',
    // Peligros + flags de contexto que afinan la lógica de seguridad.
    peligros: [],
    rutaBajoSeracs: false,
    penitentesDensos: false,
    pendientePronunciada: false,
    nieveReciente24h: false,
    // Trazabilidad climática / repeat photography.
    distanciaBordeHieloM: '',
    azimutBrujula: '',
    referenciaEncuadre: '',
    // Condiciones.
    tempAmbiente: '',
    cielo: '',
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

  const esBorde = form.pisoGlaciar === false;

  // Estado de seguridad en vivo (cada vez que cambia el diagnóstico).
  const seguridad = useMemo(
    () => evaluarSeguridadGlaciar({
      capas: form.capas,
      tipoSuperficie: form.tipoSuperficie,
      dureza: form.dureza,
      peligros: form.peligros,
      pisoGlaciar: form.pisoGlaciar,
      rutaBajoSeracs: form.rutaBajoSeracs,
      penitentesDensos: form.penitentesDensos,
      pendientePronunciada: form.pendientePronunciada,
      nieveReciente24h: form.nieveReciente24h,
      horaLocal: horaLocalAhora(),
    }),
    [
      form.capas, form.tipoSuperficie, form.dureza, form.peligros, form.pisoGlaciar,
      form.rutaBajoSeracs, form.penitentesDensos, form.pendientePronunciada,
      form.nieveReciente24h,
    ],
  );

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleField = (k) => setForm((f) => ({ ...f, [k]: !f[k] }));

  const togglePeligro = (key) => {
    setForm((f) => {
      const has = f.peligros.includes(key);
      return { ...f, peligros: has ? f.peligros.filter((p) => p !== key) : [...f.peligros, key] };
    });
  };

  // ── Perfil por capas ──
  const setCapa = (i, k, v) => setForm((f) => {
    const capas = f.capas.map((c, idx) => (idx === i ? { ...c, [k]: v } : c));
    return { ...f, capas };
  });
  const addCapa = () => setForm((f) => ({ ...f, capas: [...f.capas, nuevaCapa()] }));
  const removeCapa = (i) => setForm((f) => ({
    ...f, capas: f.capas.length > 1 ? f.capas.filter((_, idx) => idx !== i) : f.capas,
  }));

  const handlePhoto = useCallback((blob) => setFotoBlob(blob), []);
  const handleRemovePhoto = useCallback(() => setFotoBlob(null), []);

  // Para guardar: ubicación + montaña + (lectura puntual O al menos una capa
  // con superficie). En modo borde no exigimos dureza (no se pisa el hielo).
  const capaConDatos = form.capas.some((c) => c.tipoSuperficie);
  const tieneSuperficie = !!form.tipoSuperficie || capaConDatos;
  const tieneDureza = !!form.dureza || form.capas.some((c) => c.dureza);
  const puedeGuardar =
    !!coords && !!form.montana && tieneSuperficie && (esBorde || tieneDureza) && !saving;

  const handleGuardar = async () => {
    if (!puedeGuardar) return;
    setSaving(true);
    setSavedOk(false);
    try {
      let fotoDataUrl = null;
      if (fotoBlob) {
        try {
          fotoDataUrl = await blobToDataUrl(fotoBlob);
        } catch (e) {
          console.warn('[Glaciar] no se pudo convertir la foto, se guarda sin ella:', e);
        }
      }
      // Capas: solo las que tengan algún dato.
      const capas = form.capas.filter((c) => c.tipoSuperficie || c.dureza || c.profundidad);
      const reporte = {
        id: nuevoReporteId(),
        puntoId: form.puntoId.trim() || null,
        guia: form.guia.trim(),
        montana: form.montana || null,
        montanaLibre: form.montana === 'otra' ? form.montanaLibre.trim() : '',
        pisoGlaciar: form.pisoGlaciar,
        horaLocal: horaLocalAhora(),
        lat: coords.lat,
        lng: coords.lng,
        altitud: coords.altitud,
        precision: coords.precision,
        distanciaBordeHieloM: numOrNull(form.distanciaBordeHieloM),
        azimutBrujula: numOrNull(form.azimutBrujula),
        referenciaEncuadre: form.referenciaEncuadre.trim(),
        capas,
        tipoSuperficie: form.tipoSuperficie || null,
        dureza: form.dureza || null,
        tempSuperficie: numOrNull(form.tempSuperficie),
        peligros: form.peligros,
        rutaBajoSeracs: form.rutaBajoSeracs,
        penitentesDensos: form.penitentesDensos,
        pendientePronunciada: form.pendientePronunciada,
        nieveReciente24h: form.nieveReciente24h,
        tempAmbiente: numOrNull(form.tempAmbiente),
        cielo: form.cielo || null,
        viento: form.viento || null,
        visibilidad: form.visibilidad || null,
        notas: form.notas.trim(),
        fotoDataUrl,
        estado: seguridad.nivel,
        estadoRazones: seguridad.razones,
      };
      await glaciarReportes.save(reporte);
      setSavedOk(true);
      // Conservamos guía + montaña + puntoId (suelen repetirse en la jornada y
      // el mismo punto se vuelve a medir).
      const { guia, montana, montanaLibre, puntoId } = form;
      setForm({ ...emptyForm(), guia, montana, montanaLibre, puntoId });
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

  const montanaSel = MONTANA_BY_KEY[form.montana];

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
              <p className="text-[11px] text-slate-400 leading-tight">Frente del hielo · reporte offline</p>
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
          {/* Estado de seguridad en vivo */}
          <SeguridadBanner seguridad={seguridad} />

          {/* 1. MONTAÑA + PUNTO */}
          <Section num="1" title="Montaña y punto del frente" icon={<Mountain size={18} />}>
            <Label>Montaña</Label>
            <select
              value={form.montana}
              onChange={(e) => setField('montana', e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-base text-white outline-none focus:border-sky-500 appearance-none"
            >
              <option value="">Elija la montaña…</option>
              <optgroup label="Colombia">
                {MONTANAS.filter((m) => m.pais === 'Colombia').map((m) => (
                  <option key={m.key} value={m.key}>{m.label}{m.noPisar ? ' (no pisar)' : ''}</option>
                ))}
              </optgroup>
              <optgroup label="Perú — Cordillera Blanca">
                {MONTANAS.filter((m) => m.pais === 'Perú').map((m) => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </optgroup>
              {MONTANAS.filter((m) => m.libre).map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>

            {form.montana === 'otra' && (
              <input
                type="text"
                value={form.montanaLibre}
                onChange={(e) => setField('montanaLibre', e.target.value)}
                placeholder="Nombre de la montaña"
                className="mt-2 w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-base text-white outline-none focus:border-sky-500"
              />
            )}

            {montanaSel?.noPisar && (
              <div className="mt-2 p-3 bg-sky-900/20 border border-sky-800/50 rounded-xl flex gap-2">
                <Info size={18} className="text-sky-300 shrink-0" />
                <p className="text-xs text-sky-200">
                  En {montanaSel.label} está prohibido pisar el hielo. El reporte va en
                  <strong> modo borde</strong> (observación), no como juicio de tránsito.
                </p>
              </div>
            )}

            <Label className="mt-4">Punto fijo (id del frente) — opcional</Label>
            <input
              type="text"
              value={form.puntoId}
              onChange={(e) => setField('puntoId', e.target.value)}
              placeholder="ej. RITACUBA-FRENTE-01"
              className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-base text-white outline-none focus:border-sky-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Repita el mismo id en cada visita: así se ve cuánto retrocede el frente del hielo.
            </p>

            {/* Modo borde (no pisar) */}
            <div className="mt-4">
              <Label>¿Se pisó el hielo?</Label>
              <div className="grid grid-cols-2 gap-2">
                <ToggleBtn
                  active={form.pisoGlaciar === true}
                  onClick={() => setField('pisoGlaciar', true)}
                  icon={<Footprints size={18} />}
                >
                  Sí, se pisó
                </ToggleBtn>
                <ToggleBtn
                  active={form.pisoGlaciar === false}
                  onClick={() => setField('pisoGlaciar', false)}
                  icon={<Compass size={18} />}
                >
                  Modo borde (no pisar)
                </ToggleBtn>
              </div>
              {esBorde && (
                <p className="text-[11px] text-sky-300 mt-1.5">
                  Modo observación: se registra el estado del frente sin emitir juicio de tránsito.
                </p>
              )}
            </div>
          </Section>

          {/* 2. UBICACIÓN + ENCUADRE */}
          <Section num="2" title="Ubicación y encuadre" icon={<MapPin size={18} />}>
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

            <Label className="mt-4">Azimut de la foto (brújula, 0–359°)</Label>
            <NumberInput
              value={form.azimutBrujula}
              onChange={(v) => setField('azimutBrujula', v)}
              placeholder="ej. 135"
              icon={<Compass size={18} />}
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Anote hacia dónde apunta la cámara: clave para repetir el mismo encuadre con el tiempo.
            </p>

            <Label className="mt-3">Referencia del encuadre — opcional</Label>
            <input
              type="text"
              value={form.referenciaEncuadre}
              onChange={(e) => setField('referenciaEncuadre', e.target.value)}
              placeholder="ej. desde la roca grande, cima al centro"
              className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-base text-white outline-none focus:border-sky-500"
            />

            <Label className="mt-3">Distancia al borde del hielo (m) — opcional</Label>
            <NumberInput
              value={form.distanciaBordeHieloM}
              onChange={(v) => setField('distanciaBordeHieloM', v)}
              placeholder="ej. 12 (desde un hito fijo)"
            />
          </Section>

          {/* 3. FOTO */}
          <Section num="3" title="Foto del frente" icon={<CheckCircle2 size={18} />}>
            <p className="text-xs text-slate-400 mb-2">
              La foto deja huella del mismo punto en el tiempo (repeat photography → retroceso).
            </p>
            <PhotoCaptureField
              onPhoto={handlePhoto}
              onRemove={handleRemovePhoto}
              value={fotoBlob}
              label="Foto del glaciar"
            />
          </Section>

          {/* 4. DUREZA — escala mano→piolet + perfil por capas */}
          <Section num="4" title="Dureza del hielo (mano → piolet)" icon={<Snowflake size={18} />}>
            <EscalaDurezaAyuda />

            <div className="mt-4 flex items-center gap-2 mb-2">
              <Layers size={16} className="text-sky-300" />
              <Label className="mb-0">Perfil por capas (superficie → fondo)</Label>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              La capa de arriba manda el tránsito. Agregue capas más profundas para contar la historia del hielo.
            </p>
            <div className="space-y-3">
              {form.capas.map((capa, i) => (
                <CapaRow
                  key={i}
                  index={i}
                  capa={capa}
                  esSuperficie={i === 0}
                  onChange={(k, v) => setCapa(i, k, v)}
                  onRemove={() => removeCapa(i)}
                  removable={form.capas.length > 1}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={addCapa}
              className="mt-3 w-full p-2.5 rounded-xl border border-dashed border-slate-600 text-slate-300 text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-800/50 transition"
            >
              <Plus size={16} /> Agregar capa
            </button>

            {/* Lectura puntual rápida */}
            <Label className="mt-5">Lectura puntual rápida (superficie)</Label>
            <p className="text-[11px] text-slate-500 -mt-1 mb-2">
              Si no quiere registrar el perfil completo, marque la superficie y su dureza acá.
            </p>
            <SuperficieGrid
              value={form.tipoSuperficie}
              onChange={(v) => setField('tipoSuperficie', v)}
            />
            <Label className="mt-3">Dureza de la superficie</Label>
            <DurezaGrid value={form.dureza} onChange={(v) => setField('dureza', v)} />

            <Label className="mt-4">Temperatura de la superficie (°C) — opcional</Label>
            <NumberInput
              value={form.tempSuperficie}
              onChange={(v) => setField('tempSuperficie', v)}
              placeholder="ej. -3"
              icon={<Thermometer size={18} />}
            />
          </Section>

          {/* 5. PELIGROS */}
          <Section num="5" title="Peligros observados" icon={<AlertCircle size={18} />}>
            <p className="text-xs text-slate-400 mb-2">Marque todos los que vea.</p>
            <div className="grid grid-cols-2 gap-2">
              {PELIGROS.map((p) => (
                <ChipBtn
                  key={p.key}
                  active={form.peligros.includes(p.key)}
                  danger={p.key !== 'ninguno_evidente'}
                  onClick={() => togglePeligro(p.key)}
                >
                  <span className="text-xl">{p.icon}</span>
                  <span className="text-left text-sm leading-tight">{p.label}</span>
                </ChipBtn>
              ))}
            </div>

            {/* Matices que afinan la lógica de seguridad */}
            <div className="mt-4 space-y-2">
              <CheckRow
                label="La ruta pasa por debajo de los séracs"
                checked={form.rutaBajoSeracs}
                onClick={() => toggleField('rutaBajoSeracs')}
                icon={<ShieldAlert size={16} />}
              />
              <CheckRow
                label="Penitentes densos / altos"
                checked={form.penitentesDensos}
                onClick={() => toggleField('penitentesDensos')}
              />
              <CheckRow
                label="Pendiente pronunciada"
                checked={form.pendientePronunciada}
                onClick={() => toggleField('pendientePronunciada')}
              />
              <CheckRow
                label="Nieve fresca en las últimas 24 h"
                checked={form.nieveReciente24h}
                onClick={() => toggleField('nieveReciente24h')}
              />
            </div>
          </Section>

          {/* 6. CONDICIONES */}
          <Section num="6" title="Condiciones y datos del guía" icon={<Thermometer size={18} />}>
            <Label>Temperatura ambiente (°C) — opcional</Label>
            <NumberInput
              value={form.tempAmbiente}
              onChange={(v) => setField('tempAmbiente', v)}
              placeholder="ej. 1"
              icon={<Thermometer size={18} />}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <SelectField label="Cielo" value={form.cielo} onChange={(v) => setField('cielo', v)} options={CIELO} />
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

          {/* Hora auto (informativa, obligatoria — afecta puentes de nieve) */}
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
              {esBorde
                ? 'Capture ubicación, montaña y la superficie del frente para guardar.'
                : 'Capture ubicación, montaña, superficie y dureza para guardar.'}
            </p>
          )}

          {/* Disclaimer + propósito */}
          <DisclaimerBox />
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
        <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-300 grid place-items-center text-sm font-black shrink-0">
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

function ToggleBtn({ active, onClick, icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-bold transition active:scale-[0.98] ${
        active ? 'bg-sky-900/30 border-sky-500 text-sky-100' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function CheckRow({ label, checked, onClick, icon = null }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition text-left active:scale-[0.99] ${
        checked ? 'bg-amber-900/25 border-amber-600/60 text-amber-100' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
      }`}
    >
      <span className={`shrink-0 w-5 h-5 rounded grid place-items-center border ${
        checked ? 'bg-amber-500 border-amber-500 text-slate-950' : 'border-slate-600'
      }`}>
        {checked && <CheckCircle2 size={14} />}
      </span>
      {icon}
      <span className="text-sm leading-tight">{label}</span>
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

/** Ayuda visual de la escala híbrida mano→piolet. */
function EscalaDurezaAyuda() {
  return (
    <details className="rounded-xl bg-slate-900/60 border border-slate-700 p-3">
      <summary className="cursor-pointer text-sm font-bold text-slate-300 flex items-center gap-2">
        <Info size={16} className="text-sky-300" /> Cómo se mide la dureza (mano → piolet)
      </summary>
      <ul className="mt-2 space-y-1.5">
        {ESCALA_DUREZA.map((d) => (
          <li key={d.codigo} className="flex gap-2 text-xs">
            <span className={`shrink-0 w-9 text-center font-mono font-black rounded ${
              d.medio === 'piolet' ? 'text-indigo-300' : 'text-sky-300'
            }`}>{d.codigo}</span>
            <span className="text-slate-400">
              <span className="font-bold text-slate-300">{d.label}:</span> {d.heuristica}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-slate-500">
        F–K se prueban con la mano (fuerza moderada, 10–15 N). H1/H2 ya son hielo: la mano no entra,
        se prueba con el piolet. No se convierte a un número de penetración: se guarda el grado.
      </p>
    </details>
  );
}

/** Grilla de tipos de superficie con su implicación de seguridad. */
function SuperficieGrid({ value, onChange }) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {TIPOS_SUPERFICIE.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(value === t.key ? '' : t.key)}
          className={`flex items-start gap-3 p-3 rounded-xl border-2 transition active:scale-[0.99] text-left ${
            value === t.key ? 'bg-sky-900/30 border-sky-500 text-sky-100' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <span className="text-2xl shrink-0">{t.icon}</span>
          <span>
            <span className="font-bold block leading-tight">{t.label}</span>
            <span className="text-[11px] text-slate-400 leading-tight block">{t.seguridad}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

/** Grilla de dureza por código (chips compactos). */
function DurezaGrid({ value, onChange }) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
      {ESCALA_DUREZA.map((d) => (
        <button
          key={d.codigo}
          type="button"
          onClick={() => onChange(value === d.codigo ? '' : d.codigo)}
          title={d.heuristica}
          className={`flex flex-col items-center justify-center py-2 rounded-xl border-2 transition active:scale-95 ${
            value === d.codigo
              ? d.medio === 'piolet'
                ? 'bg-indigo-900/40 border-indigo-400 text-indigo-100'
                : 'bg-sky-900/40 border-sky-400 text-sky-100'
              : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <span className="font-mono font-black text-base leading-none">{d.codigo}</span>
          <span className="text-[9px] text-slate-400 leading-tight mt-0.5">{d.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Una fila del perfil por capas. */
function CapaRow({ index, capa, esSuperficie, onChange, onRemove, removable }) {
  return (
    <div className="rounded-xl bg-slate-900/60 border border-slate-700 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-slate-300">
          Capa {index + 1}{esSuperficie ? ' · superficie (manda el tránsito)' : ''}
        </span>
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-900/20 transition"
            aria-label={`Quitar capa ${index + 1}`}
          >
            <X size={16} />
          </button>
        )}
      </div>
      <input
        type="text"
        value={capa.profundidad}
        onChange={(e) => onChange('profundidad', e.target.value)}
        placeholder="Profundidad o rango (ej. 0–10 cm)"
        className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white outline-none focus:border-sky-500 mb-2"
      />
      <select
        value={capa.tipoSuperficie}
        onChange={(e) => onChange('tipoSuperficie', e.target.value)}
        className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white outline-none focus:border-sky-500 appearance-none mb-2"
      >
        <option value="">Tipo de superficie…</option>
        {TIPOS_SUPERFICIE.map((t) => (
          <option key={t.key} value={t.key}>{t.label}</option>
        ))}
      </select>
      <select
        value={capa.dureza}
        onChange={(e) => onChange('dureza', e.target.value)}
        className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white outline-none focus:border-sky-500 appearance-none"
      >
        <option value="">Dureza…</option>
        {ESCALA_DUREZA.map((d) => (
          <option key={d.codigo} value={d.codigo}>{d.codigo} · {d.label}</option>
        ))}
      </select>
    </div>
  );
}

function SeguridadBanner({ seguridad }) {
  return (
    <div className={`rounded-2xl border-2 p-4 ${ESTADO_BG[seguridad.nivel] || ESTADO_BG.precaucion}`}>
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

function DisclaimerBox() {
  return (
    <div className="rounded-2xl bg-slate-900/60 border border-slate-700 p-4 space-y-2">
      <p className="text-xs text-slate-300 flex gap-2">
        <ShieldAlert size={16} className="text-amber-300 shrink-0 mt-0.5" />
        <span>{DISCLAIMER}</span>
      </p>
      <p className="text-[11px] text-slate-500 flex gap-2">
        <Info size={14} className="text-sky-300 shrink-0 mt-0.5" />
        <span>{PROPOSITO}</span>
      </p>
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
        repita el mismo punto fijo en el tiempo para ver el retroceso del frente.
      </p>
      {reportes.map((r) => (
        <ReporteCard key={r.id} reporte={r} onEliminar={() => onEliminar(r.id)} />
      ))}
    </main>
  );
}

function ReporteCard({ reporte, onEliminar }) {
  const estado = reporte.estado || 'precaucion';
  // Superficie/dureza a mostrar: lectura puntual o la capa superior.
  const supKey = reporte.tipoSuperficie || reporte.capas?.[0]?.tipoSuperficie;
  const durCod = reporte.dureza || reporte.capas?.[0]?.dureza;
  const sup = SUPERFICIE_BY_KEY[supKey];
  const dur = DUREZA_BY_CODIGO[durCod];
  const montana = MONTANA_BY_KEY[reporte.montana];
  const fecha = reporte.fechaISO ? new Date(reporte.fechaISO) : new Date(reporte.createdAt || 0);
  const emoji = ESTADO_EMOJI[estado] || '🟡';

  return (
    <div className={`rounded-2xl border ${ESTADO_BG[estado] || ESTADO_BG.precaucion} overflow-hidden`}>
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
              {emoji} <span className="text-sm">{ESTADOS_SEGURIDAD[estado]?.label || 'Precaución'}</span>
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
            {montana && <Badge>{montana.libre ? (reporte.montanaLibre || 'Otra') : montana.label}</Badge>}
            {reporte.puntoId && <Badge>📍 {reporte.puntoId}</Badge>}
            {sup && <Badge>{sup.icon} {sup.label}</Badge>}
            {dur && <Badge>Dureza {dur.codigo} · {dur.label}</Badge>}
            {reporte.altitud != null && <Badge>{reporte.altitud} msnm</Badge>}
            {reporte.azimutBrujula != null && <Badge>↗ {reporte.azimutBrujula}°</Badge>}
            {reporte.pisoGlaciar === false && <Badge>🔵 borde</Badge>}
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
      {Array.isArray(reporte.peligros) && reporte.peligros.filter((p) => p !== 'ninguno_evidente').length > 0 && (
        <div className="px-3 pb-3 flex flex-wrap gap-1.5">
          {reporte.peligros.filter((p) => p !== 'ninguno_evidente').map((p) => (
            <span key={p} className="text-[11px] px-2 py-0.5 rounded-full bg-red-900/30 text-red-200 border border-red-800/40">
              {(PELIGRO_BY_KEY[p]?.icon || '⚠️')} {PELIGRO_BY_KEY[p]?.label || p}
            </span>
          ))}
        </div>
      )}
      {Array.isArray(reporte.capas) && reporte.capas.length > 1 && (
        <p className="px-3 pb-2 text-[11px] text-slate-500">
          Perfil de {reporte.capas.length} capas registrado.
        </p>
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

/** Hora local actual como número 0–23.999 (para la lógica de puentes de nieve). */
function horaLocalAhora() {
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60;
}
