/* eslint-disable chagra-i18n/no-hardcoded-spanish -- el flujo conserva copy
   colombiano preexistente; su migracion a messages.js queda fuera de scope. */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  MapPin,
  ArrowRight,
  ArrowLeft,
  Check,
  Volume2,
  Sparkles,
  Loader2,
  Pencil,
  Mountain,
  Search,
  AlertCircle,
  SkipForward,
  BadgeCheck,
  Camera,
  Download,
  Mic,
  Share,
} from 'lucide-react';
import ChagraAgentAvatarAngelita from './ChagraAgentAvatarAngelita';
import AvatarSelector from './Settings/AvatarSelector';
import { useGeolocation } from '../hooks/useGeolocation';
import {
  resolveUbicacion,
  getPisoTermicoInfo,
  isCoarseLocation,
} from '../services/locationService';
import {
  loadVeredasMunicipio,
  filterVeredaOptions,
} from '../services/veredaLookupService';
import { getDepartamentos, getMunicipios } from '../utils/colombiaLocations';
import {
  PROFILE_QUESTIONS,
  INVERNADERO_FORMAS,
  getProfile,
  saveProfile,
  markProfileDone,
  markProfileSkipped,
  resolveAltitudToSave,
} from '../services/userProfileService';
import usePerfilFincaStore from '../store/usePerfilFincaStore';
import usePwaInstall from '../hooks/usePwaInstall';

/**
 * OnboardingCondensado — la reescritura del onboarding (spec 2026-07-08).
 *
 * 19 preguntas → **3 pantallas de contenido** + "listo":
 *
 *   1. IDENTIDAD  — nombre (opcional) + UNA grilla de tarjetas que fusiona
 *                   vocacion + rol + finca_tipo (antes 3 preguntas).
 *   2. UBICACIÓN  — el corazón: botón "Ubicar mi finca" que HACE la tarea:
 *                   GPS → municipio+depto (DANE offline) → altitud (Open-Meteo)
 *                   → piso térmico → VEREDA por point-in-polygon DANE →
 *                   tarjeta de confirmación con CORRECCIÓN INLINE (picker de
 *                   las veredas de ESE municipio — caso operador: "Potrero
 *                   Grande" → "El Curí" en dos toques). Alternativa sin GPS:
 *                   cascade departamento→municipio + mismo picker.
 *   3. LA FINCA   — composicion (chips) + animales + qué cultiva. Saltable.
 *
 * Todo lo demás (hectáreas, invernadero, manejo, riego, preferencias...) se
 * DIFIERE a la voz / progressive profiling / ProfileScreen — ver el flag
 * `deferred` en PROFILE_QUESTIONS. La ruta histórica
 * 'onboarding-perfil-clasico' queda como alias de este mismo flujo.
 *
 * Persistencia: MISMAS claves de perfil que el flujo viejo + las nuevas de
 * vereda (vereda_codigo / vereda_source geométrico / barrio). 100% client-side
 * (chagra:profile:*, ADR-007). Reusa resolveAltitudToSave (#1213: la cabecera
 * no pisa altitud buena) y emite 'chagra:location-updated' (clima/saludo leen
 * la ubicación GUARDADA del perfil).
 *
 * Visual: tokens de tema existentes (onboarding-piso-primary/secondary,
 * bienvenida-costura como progreso), colibrí como guía, botón "Escuchar"
 * (TTS perezoso), tarjetas grandes con emoji (baja alfabetización), avance
 * automático en elección única. Español colombiano (usted, SIN voseo).
 *
 * Props:
 *   - onComplete(profile): al terminar o saltar todo.
 *   - onClose():           atrás global (opcional).
 *   - onExplorarEjemplo(): SKIP rico → finca de ejemplo (opcional).
 */

const PASOS = ['identidad', 'ubicacion', 'finca', 'escala', 'invernadero', 'agua', 'listo'];

const ESCALAS_TARJETAS = [
  {
    id: 'balcon',
    emoji: '🪴',
    titulo: 'Un rincón con matas',
    copy: 'Una mata o varias materas en balcón, terraza o patio',
  },
  {
    id: 'invernadero',
    emoji: '🏠',
    titulo: 'Un invernadero',
    copy: 'El cultivo protegido es el centro de su finca',
  },
  {
    id: 'finca',
    emoji: '🌄',
    titulo: 'Una finca o cultivo abierto',
    copy: 'Desde un lote pequeño hasta 10.000 matas o más',
  },
];

const INVERNADEROS_TARJETAS = [
  { id: 'cuadrado', emoji: '⬜', titulo: 'Cuadrado', copy: 'Techo a dos aguas' },
  { id: 'tunel', emoji: '🌙', titulo: 'Túnel', copy: 'Plástico curvo en media luna' },
  { id: 'casa_sombra', emoji: '🪟', titulo: 'Casa malla', copy: 'Paredes y techo de malla' },
].filter((opcion) => INVERNADERO_FORMAS.includes(opcion.id));

const AGUAS_TARJETAS = [
  { id: 'quebrada', emoji: '🏞️', titulo: 'Quebrada', copy: 'El agua llega de una corriente' },
  { id: 'tanque', emoji: '🛢️', titulo: 'Tanque', copy: 'La guarda en tanque o reservorio' },
  { id: 'lluvia', emoji: '🌧️', titulo: 'Lluvia', copy: 'Cultiva con lluvia o agua recogida' },
  { id: 'acueducto', emoji: '🚰', titulo: 'Acueducto', copy: 'El agua llega por tubería' },
];

/**
 * Tarjetas de identidad: UNA elección que fusiona vocacion + rol + finca_tipo
 * (colapsa las preguntas Q3+Q4+Q5 del flujo viejo). Los valores son los MISMOS
 * del catálogo PROFILE_QUESTIONS (compatible con resolveEffectiveRol, chips y
 * escena F2 — cero migración).
 */
const IDENTIDAD_TARJETAS = [
  {
    id: 'cultivo',
    emoji: '🌱',
    titulo: 'Cultivo comida',
    copy: 'Siembro y cosecho',
    valores: { vocacion: 'campesino', rol: 'campesino', finca_tipo: 'rural' },
  },
  {
    id: 'animales',
    emoji: '🐄',
    titulo: 'Tengo animales',
    copy: 'Gallinas, cerdos o ganado',
    valores: { vocacion: 'campesino', rol: 'ganadero', finca_tipo: 'rural' },
  },
  {
    id: 'restauro',
    emoji: '🌳',
    titulo: 'Restauro la tierra',
    copy: 'Nativas, bosque, páramo',
    valores: { vocacion: 'campesino', rol: 'restaurador', finca_tipo: 'rural' },
  },
  {
    id: 'urbano',
    emoji: '🏙️',
    titulo: 'Cultivo urbano',
    copy: 'Balcón, terraza o patio',
    valores: { vocacion: 'urbano', rol: 'campesino', finca_tipo: 'balcon' },
  },
  {
    id: 'tecnico',
    emoji: '🔬',
    titulo: 'Acompaño técnicamente',
    copy: 'Agrónomo/a o asesor/a',
    valores: { vocacion: 'tecnico', rol: 'tecnico', finca_tipo: 'rural' },
  },
];

/** Lee la pantalla en voz alta (TTS kokoro, import perezoso, fail-silent). */
function escucharTexto(texto) {
  import('../services/ttsService')
    .then((m) => m.speakSentences(texto).catch(() => {}))
    .catch(() => {});
}

const byId = (id) => PROFILE_QUESTIONS.find((q) => q.id === id);

/** Botón "Escuchar" compartido por las pantallas (usuarios que leen poco). */
function EscucharBtn({ texto }) {
  return (
    <button
      type="button"
      onClick={() => escucharTexto(texto)}
      aria-label="Escuchar esta pantalla en voz alta"
      className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full border border-slate-700 text-sm font-bold text-slate-300 hover:text-slate-100 hover:border-slate-500 transition-colors"
    >
      <Volume2 size={18} aria-hidden="true" /> Escuchar
    </button>
  );
}

/**
 * VeredaPicker — corrección INLINE de la vereda (el fix del caso operador).
 *
 * Muestra la vereda detectada y, al tocar el lápiz, un buscador sobre las
 * veredas DANE de ESE municipio (offline, la correcta SIEMPRE está en la
 * lista). Sin dataset del municipio degrada a texto libre.
 */
function VeredaPicker({ vereda, opciones, onSelect, onFreeText }) {
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  const filtradas = useMemo(() => filterVeredaOptions(opciones, query), [opciones, query]);
  const hasDataset = Array.isArray(opciones) && opciones.length > 0;

  useEffect(() => {
    if (editing) inputRef.current?.focus?.();
  }, [editing]);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setQuery('');
          setEditing(true);
        }}
        className="w-full flex items-center justify-between gap-2 text-left"
        data-testid="onb2-vereda-editar"
        aria-label={vereda ? `Vereda ${vereda}. Tocar para corregir` : 'Escoger vereda'}
      >
        <span className="text-base font-bold text-slate-100 truncate">
          {vereda || 'Sin vereda — tóquela para escogerla'}
        </span>
        <span className="shrink-0 w-9 h-9 rounded-lg grid place-items-center bg-slate-800 text-slate-300">
          <Pencil size={16} aria-hidden="true" />
        </span>
      </button>
    );
  }

  return (
    <div className="w-full">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={hasDataset ? 'Busque su vereda…' : 'Escriba su vereda'}
          aria-label="Vereda de su finca"
          className="w-full pl-9 pr-3 py-2.5 text-base rounded-xl bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
          data-testid="onb2-vereda-input"
        />
      </div>
      {hasDataset ? (
        <ul
          className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-slate-700 divide-y divide-slate-800 bg-slate-900"
          data-testid="onb2-vereda-opciones"
        >
          {filtradas.map((o) => (
            <li key={o.codigo}>
              <button
                type="button"
                onClick={() => {
                  onSelect(o);
                  setEditing(false);
                }}
                className="w-full text-left px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800 active:bg-slate-700 transition-colors"
                data-testid={`onb2-vereda-opcion-${o.codigo}`}
              >
                {o.nombre}
              </button>
            </li>
          ))}
          {filtradas.length === 0 && (
            <li className="px-3 py-2.5 text-sm text-slate-500">
              Ninguna vereda coincide. Revise la escritura o toque abajo.
            </li>
          )}
        </ul>
      ) : (
        <p className="mt-1.5 text-xs text-slate-500">
          Aún no tenemos el mapa de veredas de este municipio. Escríbala como la conoce.
        </p>
      )}
      <div className="mt-2 flex items-center gap-2">
        {!hasDataset && (
          <button
            type="button"
            onClick={() => {
              if (query.trim()) onFreeText(query.trim());
              setEditing(false);
            }}
            className="px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-sm font-bold text-white"
            data-testid="onb2-vereda-guardar-texto"
          >
            Guardar
          </button>
        )}
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

/** Fila de la tarjeta de confirmación (emoji + etiqueta + contenido). */
function FilaDato({ emoji, label, children }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span className="text-xl leading-none shrink-0 mt-0.5" aria-hidden="true">
        {emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-widest font-bold text-slate-500">{label}</p>
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  );
}

/** Opciones grandes y concretas para sembrar una respuesta en el valle. */
function TarjetasPregunta({ opciones, seleccion, onSelect, testId }) {
  return (
    <div className="grid grid-cols-1 gap-2.5">
      {opciones.map((opcion, i) => {
        const seleccionada = seleccion === opcion.id;
        return (
          <button
            key={opcion.id}
            type="button"
            aria-pressed={seleccionada}
            onClick={() => onSelect(opcion.id)}
            className={`anim-brota w-full flex items-center gap-3.5 text-left px-4 py-3.5 min-h-[72px] rounded-2xl border transition-all active:scale-[0.99] ${
              seleccionada
                ? 'bg-emerald-900/40 border-emerald-500 ring-1 ring-emerald-500/40 text-white'
                : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-500'
            }`}
            style={{ '--i': i + 1 }}
            data-testid={`${testId}-${opcion.id}`}
          >
            <span className="text-3xl leading-none shrink-0" aria-hidden="true">
              {opcion.emoji}
            </span>
            <span className="min-w-0">
              <span className="block text-base font-black leading-tight">{opcion.titulo}</span>
              <span className="block text-sm text-slate-400">{opcion.copy}</span>
            </span>
            {seleccionada ? <Check size={18} className="ml-auto text-emerald-400 shrink-0" /> : null}
          </button>
        );
      })}
    </div>
  );
}

export default function OnboardingCondensado({
  onComplete,
  onClose = undefined,
  onExplorarEjemplo = undefined,
}) {
  const [paso, setPaso] = useState(0);
  const [sembrando, setSembrando] = useState(false);
  const { canInstall, installed, isIos, promptInstall } = usePwaInstall();
  // Marca de inicio para onboarding_tiempo_segundos (regla react: nada impuro
  // en render — se fija una sola vez al montar).
  const startedAtRef = useRef(null);
  useEffect(() => {
    if (startedAtRef.current == null) startedAtRef.current = Date.now();
  }, []);

  // ── Paso 1: identidad ──────────────────────────────────────────────────
  const perfilInicial = useMemo(() => getProfile(), []);
  const [nombre, setNombre] = useState(perfilInicial.nombre || '');
  const [tarjeta, setTarjeta] = useState(null);

  // ── Paso 2: ubicación ──────────────────────────────────────────────────
  const { request: requestGeo } = useGeolocation();
  const [geoState, setGeoState] = useState('idle'); // idle|detecting|denied|unavailable|listo
  const [loc, setLoc] = useState(null); // resultado enriquecido de resolveUbicacion (+accuracy)
  const [manualMode, setManualMode] = useState(false);
  const [manualDpto, setManualDpto] = useState('');
  const [manualAltitud, setManualAltitud] = useState('');

  // ── Paso 3: la finca ───────────────────────────────────────────────────
  const [composicion, setComposicion] = useState(
    Array.isArray(perfilInicial.composicion) ? perfilInicial.composicion : [],
  );
  const [animales, setAnimales] = useState(
    Array.isArray(perfilInicial.animales) ? perfilInicial.animales : [],
  );
  const [cultivos, setCultivos] = useState(perfilInicial.cultivos_actuales || '');

  // ── Pasos 4 a 6: lo que siembra la forma del valle ────────────────────
  const setEscalaPerfil = usePerfilFincaStore((s) => s.setEscala);
  const setInvernaderoPerfil = usePerfilFincaStore((s) => s.setInvernadero);
  const setAguaPerfil = usePerfilFincaStore((s) => s.setAgua);
  const [escala, setEscala] = useState(
    ['balcon', 'invernadero', 'finca'].includes(perfilInicial.escala)
      ? perfilInicial.escala
      : null,
  );
  const invernaderoInicial = perfilInicial.invernadero_tiene === 'si'
    || perfilInicial.finca_tipo === 'invernadero';
  const [tieneInvernadero, setTieneInvernadero] = useState(
    perfilInicial.invernadero_tiene === 'no' ? false : (invernaderoInicial ? true : null),
  );
  const [tipoInvernadero, setTipoInvernadero] = useState(
    INVERNADERO_FORMAS.includes(perfilInicial.invernadero_forma)
      ? perfilInicial.invernadero_forma
      : null,
  );
  const [agua, setAgua] = useState(
    AGUAS_TARJETAS.some((opcion) => opcion.id === perfilInicial.agua) ? perfilInicial.agua : null,
  );

  const manualAltitudNum = useMemo(() => {
    const t = manualAltitud.trim();
    if (t === '') return null;
    const n = Number(t);
    return Number.isFinite(n) && n >= -100 && n <= 6000 ? Math.round(n) : null;
  }, [manualAltitud]);

  // Altitud efectiva: la corregida a mano gana sobre la derivada (#1213).
  const effectiveAltitud = manualAltitudNum != null ? manualAltitudNum : (loc?.altitud ?? null);
  const pisoInfo = useMemo(
    () => (effectiveAltitud != null ? getPisoTermicoInfo(effectiveAltitud) : null),
    [effectiveAltitud],
  );

  /** GPS → resolveUbicacion (municipio+altitud+piso+vereda PIP, §2.2). */
  const ubicarMiFinca = () => {
    // Una corrección manual de altitud previa pertenece a la ubicación
    // ANTERIOR — no debe envenenar la nueva detección.
    setManualAltitud('');
    setGeoState('detecting');
    requestGeo({
      maximumAge: 0,
      onSuccess: async (pos) => {
        const { latitude, longitude, altitude, accuracy } = pos.coords;
        try {
          const r = await resolveUbicacion({
            lat: latitude,
            lng: longitude,
            // #coarse-location: con lectura gruesa NO confiamos en la altitud
            // del GPS; que la resuelva Open-Meteo para el punto (o cabecera).
            altitud: isCoarseLocation(accuracy) ? null : (altitude ?? null),
          });
          setLoc({ ...r, accuracy: accuracy ?? null });
          setGeoState('listo');
        } catch (e) {
          console.warn('[OnboardingCondensado] resolveUbicacion:', e?.message || e);
          setGeoState('unavailable');
        }
      },
      onError: (tipo) => {
        setGeoState(tipo === 'denied' ? 'denied' : 'unavailable');
        setManualMode(true);
      },
    });
  };

  /** Alternativa sin GPS: municipio del cascade DANE → centroide + veredas. */
  const escogerMunicipioManual = async (m, departamento) => {
    setManualAltitud('');
    const base = {
      lat: m.lat,
      lng: m.lng,
      municipio: m.name,
      municipio_codigo: String(m.codigo),
      departamento,
      vereda: null,
      vereda_codigo: null,
      vereda_fuente: null,
      barrio: null,
      // Altitud curada de la CABECERA (si existe) — marcada para no pisar
      // una altitud buena del perfil (#1213). El usuario puede corregirla.
      altitud: typeof m.altitud === 'number' ? m.altitud : null,
      altitud_fuente: typeof m.altitud === 'number' ? 'cabecera' : null,
      accuracy: null,
      veredaOptions: [],
    };
    setLoc(base);
    setGeoState('listo');
    setManualMode(false);
    // Cargar el picker de veredas de ESE municipio (on-demand, offline-safe).
    const data = await loadVeredasMunicipio(m.codigo);
    if (data) {
      setLoc((prev) =>
        prev && prev.municipio_codigo === String(m.codigo)
          ? {
              ...prev,
              veredaOptions: data.veredas.map((v) => ({
                codigo: v.codigo,
                nombre: v.nombre,
                nombre_dane: v.nombre_dane,
              })),
            }
          : prev,
      );
    }
  };

  /** Confirmar ubicación → persistir en el perfil (mismas claves del flujo viejo). */
  const confirmarUbicacion = () => {
    if (!loc) return;
    const existing = getProfile();
    const altitudSource = manualAltitudNum != null ? 'manual' : 'derived';
    const { finca_altitud, altitud_source } = resolveAltitudToSave({
      altitudSource,
      resolvedAltitudFuente: loc.altitud_fuente ?? null,
      effectiveAltitud,
      existingFincaAltitud: existing.finca_altitud,
      existingAltitudSource: existing.altitud_source,
    });
    saveProfile({
      ubicacion_lat: loc.lat,
      ubicacion_lng: loc.lng,
      vereda: loc.vereda || undefined,
      vereda_codigo: loc.vereda_codigo || undefined,
      vereda_source: loc.vereda_fuente || undefined,
      barrio: loc.barrio || undefined,
      municipio: loc.municipio || undefined,
      departamento: loc.departamento || undefined,
      region: loc.municipio
        ? [loc.vereda, loc.municipio, loc.departamento].filter(Boolean).join(', ')
        : undefined,
      finca_altitud,
      altitud_source,
      ubicacion_accuracy: loc.accuracy != null ? Math.round(loc.accuracy) : undefined,
      piso_termico: finca_altitud !== undefined ? pisoInfo?.slug : existing.piso_termico,
    });
    // Clima/saludo leen la ubicación GUARDADA — avisar a la UI montada.
    try {
      window.dispatchEvent(
        new CustomEvent('chagra:location-updated', {
          detail: {
            vereda: loc.vereda || null,
            municipio: loc.municipio || null,
            departamento: loc.departamento || null,
          },
        }),
      );
    } catch (_) {
      /* SSR / tests sin window */
    }
    setPaso(2);
  };

  const guardarIdentidad = () => {
    const partial = {};
    if (nombre.trim()) partial.nombre = nombre.trim();
    if (tarjeta) {
      const t = IDENTIDAD_TARJETAS.find((x) => x.id === tarjeta);
      if (t) Object.assign(partial, t.valores);
    }
    if (Object.keys(partial).length > 0) saveProfile(partial);
  };

  const guardarFinca = () => {
    const partial = {};
    if (composicion.length > 0) partial.composicion = composicion;
    if (animales.length > 0) partial.animales = animales;
    if (cultivos.trim()) partial.cultivos_actuales = cultivos.trim();
    if (Object.keys(partial).length > 0) saveProfile(partial);
  };

  const terminar = () => {
    saveProfile({
      onboarding_tiempo_segundos: Math.round(
        (Date.now() - (startedAtRef.current ?? Date.now())) / 1000,
      ),
      onboarding_version: 'condensado-v1',
    });
    markProfileDone();
    onComplete?.(getProfile());
  };

  const saltarTodo = () => {
    markProfileSkipped();
    onComplete?.(getProfile());
  };

  const explorarEjemplo = async () => {
    if (sembrando) return;
    setSembrando(true);
    markProfileSkipped();
    try {
      await onExplorarEjemplo?.();
    } finally {
      setSembrando(false);
    }
  };

  const avanzarDesdeIdentidad = () => {
    guardarIdentidad();
    setPaso(1);
  };

  const avanzarDesdeFinca = () => {
    guardarFinca();
    setPaso(3);
  };

  const avanzarDesdeEscala = () => {
    if (!escala) return;
    setEscalaPerfil(escala);
    if (escala === 'invernadero') setTieneInvernadero(true);
    setPaso(4);
  };

  const avanzarDesdeInvernadero = () => {
    if (tieneInvernadero == null) return;
    if (tieneInvernadero && !tipoInvernadero) return;
    setInvernaderoPerfil(tieneInvernadero ? { tipo: tipoInvernadero } : null);
    setPaso(5);
  };

  const avanzarDesdeAgua = () => {
    if (!agua) return;
    setAguaPerfil(agua);
    setPaso(6);
  };

  const atras = () => {
    if (paso === 0) onClose?.();
    else setPaso((p) => p - 1);
  };

  const compQ = byId('composicion');
  const animQ = byId('animales');
  const conAnimales = composicion.includes('animales');

  const textosPantalla = [
    'Cuéntenos de usted. Su nombre, y qué hace en el campo.',
    'Ubiquemos su finca. Con un toque sabemos su vereda, su altura y su clima. Si algo sale mal, lo corrige ahí mismo.',
    '¿Qué tiene en su finca? Marque lo que tenga. El detalle lo vamos llenando con la voz.',
    '¿Qué tan grande es su cultivo? Escoja el espacio que más se parece al suyo.',
    '¿Tiene invernadero? Si tiene, escoja la forma que más se parece al suyo.',
    '¿De dónde llega el agua que usa en su cultivo?',
    'Su finca está lista. El consejo le va a llegar acertado para su clima.',
  ];

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white flex flex-col px-4 py-5">
      {/* ── Cabecera: costura de progreso + saltar ─────────────────────── */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            {paso < 6 ? `Paso ${paso + 1} de 6` : '¡Listo!'}
          </p>
          {/* La costura: la firma "cada dato va cosido a su fuente". */}
          <div className="bienvenida-costura" aria-hidden="true">
            <span className="bienvenida-costura-guia" />
            <span
              className="bienvenida-costura-hilo"
              style={{ width: `${((paso + 1) / PASOS.length) * 100}%` }}
            />
          </div>
        </div>
        {paso < 6 && (
          <button
            type="button"
            onClick={saltarTodo}
            className="shrink-0 inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-lg text-xs font-bold text-amber-300 hover:text-amber-200"
            data-testid="onb2-saltar-todo"
          >
            <SkipForward size={13} aria-hidden="true" /> Saltar todo
          </button>
        )}
      </div>

      {/* ── Contenido del paso ─────────────────────────────────────────── */}
      <div key={paso} className="flex-1 w-full max-w-md mx-auto flex flex-col gap-5 py-6">
        {/* ═══ PASO 1: IDENTIDAD ═══ */}
        {paso === 0 && (
          <>
            <div className="flex items-center gap-4">
              <div className="shrink-0">
                <ChagraAgentAvatarAngelita size={96} state="idle" ariaLabel="Angelita, la abeja de Chagra" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-black leading-tight text-slate-100">
                  Cuéntenos de usted
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Dos toques y arrancamos. Todo se puede saltar.
                </p>
              </div>
            </div>

            <label className="block">
              <span className="text-[11px] uppercase tracking-widest font-bold text-emerald-400/90">
                ¿Cómo se llama?
              </span>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Su nombre (opcional)"
                className="mt-1.5 w-full px-4 py-3.5 text-base rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
                data-testid="onb2-nombre"
              />
            </label>

            <div>
              <p className="text-[11px] uppercase tracking-widest font-bold text-emerald-400/90">
                ¿Qué hace en el campo?
              </p>
              <div className="grid grid-cols-1 gap-2.5 mt-2">
                {IDENTIDAD_TARJETAS.map((t, i) => {
                  const sel = tarjeta === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      aria-pressed={sel}
                      onClick={() => {
                        setTarjeta(t.id);
                        // Avance automático estilo encuesta rápida (patrón del
                        // flujo viejo); puede volver atrás.
                        setTimeout(() => {
                          guardarIdentidadCon(t.id);
                        }, 180);
                      }}
                      className={`anim-brota w-full flex items-center gap-3.5 text-left px-4 py-3.5 min-h-[64px] rounded-2xl border transition-all active:scale-[0.99] ${
                        sel
                          ? 'bg-emerald-900/40 border-emerald-500 ring-1 ring-emerald-500/40 text-white'
                          : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-500'
                      }`}
                      style={{ '--i': i + 1 }}
                      data-testid={`onb2-identidad-${t.id}`}
                    >
                      <span className="text-3xl leading-none shrink-0" aria-hidden="true">
                        {t.emoji}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-base font-black leading-tight">{t.titulo}</span>
                        <span className="block text-sm text-slate-400">{t.copy}</span>
                      </span>
                      {sel && <Check size={18} className="ml-auto text-emerald-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Elija su animal (saltable): el avatar del usuario. Persiste al
                toque en usePrefsStore (avatarCreatureId); si no toca nada,
                queda la abeja Angelita. Mismo selector del Perfil. */}
            <div data-testid="onb2-avatar">
              <p className="text-[11px] uppercase tracking-widest font-bold text-emerald-400/90 mb-2">
                Elija su animal (si quiere)
              </p>
              <AvatarSelector compact />
            </div>
          </>
        )}

        {/* ═══ PASO 2: UBICACIÓN AUTO-MÁGICA ═══ */}
        {paso === 1 && (
          <>
            <div className="flex flex-col gap-1.5">
              <h1 className="text-2xl font-black leading-tight text-slate-100">
                ¿Dónde está su finca?
              </h1>
              <p className="text-sm text-slate-400">
                Con un toque sabemos su vereda, su altura y su clima. Y el consejo llega acertado
                para su tierra.
              </p>
            </div>

            {geoState !== 'listo' && (
              <>
                <button
                  type="button"
                  onClick={ubicarMiFinca}
                  disabled={geoState === 'detecting'}
                  className="onboarding-piso-primary w-full disabled:opacity-70"
                  data-testid="onb2-ubicar-btn"
                >
                  {geoState === 'detecting' ? (
                    <>
                      <Loader2 size={22} className="animate-spin" aria-hidden="true" /> Buscando su
                      finca…
                    </>
                  ) : (
                    <>
                      <MapPin size={22} aria-hidden="true" /> Ubicar mi finca
                    </>
                  )}
                </button>

                {(geoState === 'denied' || geoState === 'unavailable') && (
                  <p
                    className="flex items-start gap-2 text-sm text-amber-300 bg-amber-950/30 border border-amber-800/50 rounded-xl px-3 py-2.5"
                    data-testid="onb2-geo-error"
                  >
                    <AlertCircle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
                    {geoState === 'denied'
                      ? 'Sin permiso de ubicación. Escoja su municipio abajo y listo.'
                      : 'No pudimos leer el GPS. Escoja su municipio abajo y listo.'}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => setManualMode((v) => !v)}
                  className="text-sm text-slate-400 underline underline-offset-2 hover:text-slate-200 self-start"
                  data-testid="onb2-manual-toggle"
                >
                  Prefiero escoger el municipio yo
                </button>

                {manualMode && (
                  <div className="flex flex-col gap-2.5" data-testid="onb2-manual">
                    <select
                      value={manualDpto}
                      onChange={(e) => setManualDpto(e.target.value)}
                      aria-label="Departamento"
                      className="w-full px-3 py-3 rounded-xl bg-slate-900 border border-slate-700 text-base text-white"
                      data-testid="onb2-dpto"
                    >
                      <option value="">Departamento…</option>
                      {getDepartamentos().map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                    {manualDpto && (
                      <select
                        value=""
                        onChange={(e) => {
                          const m = getMunicipios(manualDpto).find((x) => x.name === e.target.value);
                          if (m) escogerMunicipioManual(m, manualDpto);
                        }}
                        aria-label="Municipio"
                        className="w-full px-3 py-3 rounded-xl bg-slate-900 border border-slate-700 text-base text-white"
                        data-testid="onb2-municipio"
                      >
                        <option value="">Municipio…</option>
                        {getMunicipios(manualDpto).map((m) => (
                          <option key={m.codigo} value={m.name}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </>
            )}

            {geoState === 'listo' && loc && (
              <div
                className="rounded-2xl border border-slate-700 bg-slate-900 divide-y divide-slate-800 overflow-hidden"
                data-testid="onb2-ubicacion-card"
              >
                {/* Vereda (rural) o barrio (urbano) — con corrección inline. */}
                <FilaDato emoji="📍" label="Vereda">
                  <VeredaPicker
                    vereda={loc.vereda}
                    opciones={loc.veredaOptions}
                    onSelect={(o) =>
                      setLoc((prev) => ({
                        ...prev,
                        vereda: o.nombre,
                        vereda_codigo: o.codigo,
                        vereda_fuente: 'picker_dane',
                      }))
                    }
                    onFreeText={(t) =>
                      setLoc((prev) => ({
                        ...prev,
                        vereda: t,
                        vereda_codigo: null,
                        vereda_fuente: 'manual',
                      }))
                    }
                  />
                  {loc.vereda_fuente === 'poligono_dane' && (
                    <p className="text-xs text-emerald-400/90 mt-1">
                      Detectada con el mapa oficial de veredas (DANE). Si no es, tóquela y corríjala.
                    </p>
                  )}
                  {loc.barrio && (
                    <p className="text-xs text-slate-400 mt-1">Barrio: {loc.barrio}</p>
                  )}
                </FilaDato>

                {/* Altura — editable inline. */}
                <FilaDato emoji="🏔️" label="Altura">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={manualAltitud !== '' ? manualAltitud : (effectiveAltitud ?? '')}
                      onChange={(e) => setManualAltitud(e.target.value)}
                      className="w-28 px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-base font-bold text-white focus:outline-none focus:border-emerald-500/60"
                      data-testid="onb2-altitud"
                      aria-label="Altura en metros sobre el nivel del mar"
                    />
                    <span className="text-sm text-slate-400">msnm</span>
                    {loc.altitud_fuente === 'cabecera' && manualAltitudNum == null && (
                      <span className="text-xs text-amber-300">≈ del pueblo, ajústela</span>
                    )}
                  </div>
                </FilaDato>

                {/* Clima (piso térmico) — derivado, offline-safe. */}
                <FilaDato emoji={pisoInfo?.emoji || '🌤️'} label="Clima">
                  <p className="text-base font-bold text-slate-100" data-testid="onb2-piso">
                    {pisoInfo ? `${pisoInfo.label} (${pisoInfo.rango})` : 'Se calcula con la altura'}
                  </p>
                </FilaDato>

                {/* Municipio — cambiar si el GPS erró. */}
                <FilaDato emoji="🏙️" label="Municipio">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-base font-bold text-slate-100 truncate" data-testid="onb2-municipio-nombre">
                      {[loc.municipio, loc.departamento].filter(Boolean).join(', ') || '—'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setGeoState('idle');
                        setManualMode(true);
                        setManualDpto(loc.departamento || '');
                      }}
                      className="shrink-0 text-xs font-bold text-slate-400 underline underline-offset-2 hover:text-slate-200"
                      data-testid="onb2-cambiar-municipio"
                    >
                      Cambiar
                    </button>
                  </div>
                </FilaDato>

                {isCoarseLocation(loc.accuracy) && (
                  <p className="flex items-start gap-2 px-4 py-2.5 text-xs text-amber-300 bg-amber-950/20">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" aria-hidden="true" />
                    La señal ubicó por internet, no por GPS. Revise la vereda y la altura.
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* ═══ PASO 3: LA FINCA ═══ */}
        {paso === 2 && (
          <>
            <div className="flex flex-col gap-1.5">
              <h1 className="text-2xl font-black leading-tight text-slate-100">
                ¿Qué tiene en su finca?
              </h1>
              <p className="text-sm text-slate-400">
                Marque lo que tenga. El detalle lo vamos llenando después, hablando.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {(compQ?.options || []).map((opt, i) => {
                const sel = composicion.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={sel}
                    onClick={() =>
                      setComposicion((prev) =>
                        sel ? prev.filter((v) => v !== opt.value) : [...prev, opt.value],
                      )
                    }
                    className={`anim-brota flex flex-col items-center justify-center gap-1.5 p-4 min-h-[88px] rounded-2xl border text-center transition-all active:scale-[0.98] ${
                      sel
                        ? 'bg-emerald-900/40 border-emerald-500 ring-1 ring-emerald-500/40 text-white'
                        : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-500'
                    }`}
                    style={{ '--i': i + 1 }}
                    data-testid={`onb2-comp-${opt.value}`}
                  >
                    <span className="text-3xl leading-none" aria-hidden="true">
                      {opt.label.split(' ')[0]}
                    </span>
                    <span className="text-sm font-bold leading-tight">
                      {opt.label.replace(/^\S+\s/, '').split(' — ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>

            {conAnimales && (
              <div>
                <p className="text-[11px] uppercase tracking-widest font-bold text-emerald-400/90">
                  ¿Cuáles animales?
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(animQ?.options || [])
                    .filter((o) => o.value !== 'ninguno')
                    .map((opt) => {
                      const sel = animales.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          aria-pressed={sel}
                          onClick={() =>
                            setAnimales((prev) =>
                              sel ? prev.filter((v) => v !== opt.value) : [...prev, opt.value],
                            )
                          }
                          className={`px-3 py-2 rounded-full border text-sm font-bold transition-colors ${
                            sel
                              ? 'bg-emerald-900/40 border-emerald-500 text-white'
                              : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                          }`}
                          data-testid={`onb2-animal-${opt.value}`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            <label className="block">
              <span className="text-[11px] uppercase tracking-widest font-bold text-emerald-400/90">
                ¿Qué cultiva ahora mismo?
              </span>
              <input
                type="text"
                value={cultivos}
                onChange={(e) => setCultivos(e.target.value)}
                placeholder="Café, mora, tomate… (opcional)"
                className="mt-1.5 w-full px-4 py-3.5 text-base rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
                data-testid="onb2-cultivos"
              />
              <span className="flex flex-wrap items-center gap-2 pt-2">
                {['Café', 'Plátano', 'Tomate', 'Mora', 'Maíz'].map((ej) => (
                  <button
                    key={ej}
                    type="button"
                    onClick={() => {
                      const partes = cultivos.split(',').map((s) => s.trim()).filter(Boolean);
                      if (partes.some((p) => p.toLowerCase() === ej.toLowerCase())) return;
                      setCultivos([...partes, ej].join(', '));
                    }}
                    className="px-3 py-1.5 rounded-full text-sm bg-slate-900 border border-slate-700 text-slate-300 hover:border-emerald-600 hover:text-emerald-200 active:scale-95 transition-all"
                  >
                    {ej}
                  </button>
                ))}
              </span>
            </label>
          </>
        )}

        {/* ═══ PASO 4: ESCALA DEL MUNDO ═══ */}
        {paso === 3 && (
          <>
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] uppercase tracking-widest font-bold text-emerald-400/90">
                El tamaño de su valle
              </p>
              <h1 className="text-2xl font-black leading-tight text-slate-100">
                ¿Qué tan grande es su cultivo?
              </h1>
              <p className="text-sm text-slate-400">
                Escoja el espacio que más se parece al suyo. Así verá un valle de su tamaño.
              </p>
            </div>
            <TarjetasPregunta
              opciones={ESCALAS_TARJETAS}
              seleccion={escala}
              onSelect={setEscala}
              testId="onb2-escala"
            />
          </>
        )}

        {/* ═══ PASO 5: INVERNADERO Y FORMA ═══ */}
        {paso === 4 && (
          <>
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] uppercase tracking-widest font-bold text-emerald-400/90">
                Una pieza de su finca
              </p>
              <h1 className="text-2xl font-black leading-tight text-slate-100">
                {escala === 'invernadero' ? '¿Cómo es su invernadero?' : '¿Tiene invernadero?'}
              </h1>
              <p className="text-sm text-slate-400">
                {escala === 'invernadero'
                  ? 'Escoja la forma que más se parece al suyo.'
                  : 'Si tiene uno, lo sembraremos con su forma en el valle.'}
              </p>
            </div>

            {escala !== 'invernadero' ? (
              <div className="grid grid-cols-2 gap-2.5" role="group" aria-label="¿Tiene invernadero?">
                <button
                  type="button"
                  aria-pressed={tieneInvernadero === true}
                  onClick={() => setTieneInvernadero(true)}
                  className={`min-h-[64px] rounded-2xl border px-3 font-bold transition-colors ${
                    tieneInvernadero === true
                      ? 'bg-emerald-900/40 border-emerald-500 text-white'
                      : 'bg-slate-900 border-slate-700 text-slate-300'
                  }`}
                  data-testid="onb2-invernadero-si"
                >
                  Sí, tengo uno
                </button>
                <button
                  type="button"
                  aria-pressed={tieneInvernadero === false}
                  onClick={() => {
                    setTieneInvernadero(false);
                    setTipoInvernadero(null);
                  }}
                  className={`min-h-[64px] rounded-2xl border px-3 font-bold transition-colors ${
                    tieneInvernadero === false
                      ? 'bg-emerald-900/40 border-emerald-500 text-white'
                      : 'bg-slate-900 border-slate-700 text-slate-300'
                  }`}
                  data-testid="onb2-invernadero-no"
                >
                  No tengo
                </button>
              </div>
            ) : null}

            {tieneInvernadero === true ? (
              <TarjetasPregunta
                opciones={INVERNADEROS_TARJETAS}
                seleccion={tipoInvernadero}
                onSelect={setTipoInvernadero}
                testId="onb2-invernadero-tipo"
              />
            ) : null}
          </>
        )}

        {/* ═══ PASO 6: FUENTE DE AGUA ═══ */}
        {paso === 5 && (
          <>
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] uppercase tracking-widest font-bold text-emerald-400/90">
                El agua de su finca
              </p>
              <h1 className="text-2xl font-black leading-tight text-slate-100">
                ¿De dónde llega el agua?
              </h1>
              <p className="text-sm text-slate-400">
                Escoja la fuente que más usa. El agua de su valle saldrá de ahí.
              </p>
            </div>
            <TarjetasPregunta
              opciones={AGUAS_TARJETAS}
              seleccion={agua}
              onSelect={setAgua}
              testId="onb2-agua"
            />
          </>
        )}

        {/* ═══ LISTO ═══ */}
        {paso === 6 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
            <ChagraAgentAvatarAngelita size={140} state="speaking" ariaLabel="Angelita, la abeja de Chagra" />
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-black leading-tight text-slate-100">
                Su finca está lista 🌱
              </h1>
              <p className="text-base text-slate-300 leading-snug" data-testid="onb2-resumen">
                {[loc?.vereda, loc?.municipio].filter(Boolean).join(', ') || 'Su tierra'}
                {pisoInfo ? ` · clima ${pisoInfo.label.toLowerCase()}` : ''}
              </p>
              <p className="text-sm text-slate-400">
                Ahora háblele al colibrí: «Hola Chagra, ¿cuándo abono el café?»
              </p>
            </div>
            <div
              className="grid w-full grid-cols-3 gap-2"
              aria-label="Capacidades principales de Chagra"
              data-testid="onb2-capacidades"
            >
              {[
                { Icon: Mic, label: 'Hablar por voz' },
                { Icon: Camera, label: 'Mostrar una foto' },
                { Icon: BadgeCheck, label: 'Revisar fuentes' },
              ].map(({ Icon, label }) => (
                <div key={label} className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-xs text-slate-300">
                  {React.createElement(Icon, {
                    size: 20,
                    className: 'mx-auto mb-1 text-emerald-300',
                    'aria-hidden': true,
                  })}
                  {label}
                </div>
              ))}
            </div>
            {installed ? (
              <p className="text-sm font-bold text-emerald-300" data-testid="onb2-pwa-instalada">
                Chagra ya está instalada en este equipo.
              </p>
            ) : canInstall ? (
              <button
                type="button"
                onClick={promptInstall}
                className="onboarding-piso-secondary inline-flex items-center justify-center gap-2"
                data-testid="onb2-instalar-pwa"
              >
                <Download size={18} aria-hidden="true" /> Instalar Chagra
              </button>
            ) : isIos ? (
              <p className="text-xs text-slate-400" data-testid="onb2-instalar-ios">
                Para instalarla, toque <Share size={14} className="inline" aria-hidden="true" /> Compartir y luego
                Añadir a pantalla de inicio.
              </p>
            ) : null}
          </div>
        )}

        <div className="mt-auto self-center">
          <EscucharBtn texto={textosPantalla[paso]} />
        </div>
      </div>

      {/* ── Footer de navegación ───────────────────────────────────────── */}
      <div className="w-full max-w-md mx-auto flex flex-col gap-2">
        {paso === 0 && typeof onExplorarEjemplo === 'function' && (
          <button
            type="button"
            onClick={explorarEjemplo}
            disabled={sembrando}
            className="onboarding-piso-secondary inline-flex items-center justify-center gap-2 disabled:opacity-60"
            data-testid="onb2-explorar-ejemplo"
          >
            <Sparkles size={18} aria-hidden="true" />
            {sembrando ? 'Preparando su finca…' : 'Explorar con finca de ejemplo'}
          </button>
        )}

        <div className="flex items-center gap-3">
          {paso > 0 && paso < 6 && (
            <button
              type="button"
              onClick={atras}
              className="inline-flex items-center gap-1 px-3 py-3 min-h-[48px] rounded-xl text-slate-400 hover:text-white transition-colors"
              data-testid="onb2-atras"
            >
              <ArrowLeft size={18} aria-hidden="true" /> Atrás
            </button>
          )}
          <div className="flex-1" />
          {paso === 0 && (
            <button
              type="button"
              onClick={avanzarDesdeIdentidad}
              className="onboarding-piso-primary !w-auto px-6"
              data-testid="onb2-siguiente"
            >
              Siguiente <ArrowRight size={20} aria-hidden="true" />
            </button>
          )}
          {paso === 1 &&
            (geoState === 'listo' && loc ? (
              <button
                type="button"
                onClick={confirmarUbicacion}
                className="onboarding-piso-primary !w-auto px-6"
                data-testid="onb2-confirmar-ubicacion"
              >
                <Check size={20} aria-hidden="true" /> Confirmar
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setPaso(2)}
                className="px-4 py-3 min-h-[48px] text-sm text-slate-500 hover:text-slate-300 underline underline-offset-2"
                data-testid="onb2-ubicacion-despues"
              >
                Lo hago después
              </button>
            ))}
          {paso === 2 && (
            <button
              type="button"
              onClick={avanzarDesdeFinca}
              className="onboarding-piso-primary !w-auto px-6"
              data-testid="onb2-terminar-finca"
            >
              Siguiente <ArrowRight size={20} aria-hidden="true" />
            </button>
          )}
          {paso === 3 && (
            <button
              type="button"
              onClick={avanzarDesdeEscala}
              disabled={!escala}
              className="onboarding-piso-primary !w-auto px-6 disabled:opacity-50"
              data-testid="onb2-guardar-escala"
            >
              Siguiente <ArrowRight size={20} aria-hidden="true" />
            </button>
          )}
          {paso === 4 && (
            <button
              type="button"
              onClick={avanzarDesdeInvernadero}
              disabled={tieneInvernadero == null || (tieneInvernadero && !tipoInvernadero)}
              className="onboarding-piso-primary !w-auto px-6 disabled:opacity-50"
              data-testid="onb2-guardar-invernadero"
            >
              Siguiente <ArrowRight size={20} aria-hidden="true" />
            </button>
          )}
          {paso === 5 && (
            <button
              type="button"
              onClick={avanzarDesdeAgua}
              disabled={!agua}
              className="onboarding-piso-primary !w-auto px-6 disabled:opacity-50"
              data-testid="onb2-guardar-agua"
            >
              Sembrar mi valle <ArrowRight size={20} aria-hidden="true" />
            </button>
          )}
          {paso === 6 && (
            <button
              type="button"
              onClick={terminar}
              className="onboarding-piso-primary w-full"
              data-testid="onb2-entrar"
            >
              <Mountain size={22} aria-hidden="true" /> Entrar a mi finca
            </button>
          )}
        </div>
      </div>
    </div>
  );

  /** Guarda identidad con la tarjeta recién tocada y avanza (auto-advance). */
  function guardarIdentidadCon(tarjetaId) {
    const partial = {};
    if (nombre.trim()) partial.nombre = nombre.trim();
    const t = IDENTIDAD_TARJETAS.find((x) => x.id === tarjetaId);
    if (t) Object.assign(partial, t.valores);
    saveProfile(partial);
    setPaso(1);
  }
}
