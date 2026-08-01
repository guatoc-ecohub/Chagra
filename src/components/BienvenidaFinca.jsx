/* eslint-disable react-refresh/only-export-components -- bienvenidaYaVista/
   marcarBienvenidaVista son los helpers de gating "una sola vez" y deben
   exportarse junto al componente (mismo patrón que NotifPermissionPrompt). */
import React, { useEffect, useRef, useState } from 'react';
import { Mic, Camera, BadgeCheck, MapPin, ArrowRight, Volume2, Sparkles, Glasses, Share, Download, WifiOff, Save, Smartphone, Check } from 'lucide-react';
import ChagraAgentAvatarAngelita from './ChagraAgentAvatarAngelita';
import usePwaInstall from '../hooks/usePwaInstall';
import { MSG } from '../config/messages.js';

/**
 * BienvenidaFinca — la PRIMERA impresión de Chagra (primera vez, una sola vez).
 *
 * Secuencia de 5 "momentos" a pantalla completa, pensada para que en ~40
 * segundos el campesino sienta "esto es MÍO y me entiende":
 *
 *   1. Bienvenida — el colibrí del abutilón (avatar del agente) saluda con la
 *      identidad cuaderno-de-campo / finca viva. Nada de wizard corporativo.
 *   2. Capacidades estrella — hablarle por voz, mostrarle una foto de la mata,
 *      y respuestas verificadas (LA COSTURA: la tarjeta lleva el borde cosido).
 *   3. "Hola Chagra" (modo campo, manos ocupadas) — foto real de manos en la
 *      tierra + chip de voz con ondas: en el surco no se escribe, se habla.
 *      HONESTO con el MVP push-to-talk (D9 voice-first): se toca el micrófono
 *      UNA vez y se habla; no promete escucha continua (eso es fase 2 y aún
 *      no existe flag de modo campo que la active).
 *   4. Instalar la app (PWA) — foto real de un cafetal en ladera (donde no
 *      llega la señal = el porqué del offline). En Android/Chromium el botón
 *      dispara el prompt NATIVO (usePwaInstall, compartido con
 *      AndroidInstallBanner); en iOS muestra los pasos "Compartir → Añadir a
 *      pantalla de inicio" (mismo copy que IosInstallBanner, MSG.instalarApp);
 *      si ya corre instalada, lo celebra.
 *   5. Ubicación mágica — "¿dónde está su tierra?" como momento de magia, no
 *      como formulario. El CTA delega en la ruta EXISTENTE
 *      'ubicacion-detectada' (LocationDetectedScreen: GPS + vereda + montaña
 *      de pisos térmicos). Cero lógica nueva de permisos/datos.
 *
 * PHOTO-FORWARD: los momentos 3 y 4 llevan foto real CC de campo colombiano/
 * campesino con su crédito SIEMPRE visible (autor + licencia + fuente, mismo
 * patrón de los mundos — ver /public/bienvenida/creditos.json).
 *
 * FIRMA VISUAL — "la costura": el indicador de progreso es una puntada corrida
 * (hilo punteado) que se va cosiendo momento a momento, el mismo motivo del
 * borde de "respuestas verificadas". Es la marca de la casa: cada respuesta va
 * cosida a su fuente.
 *
 * Diseño para leer poco y a pleno sol: iconos grandes, 1–2 líneas por momento,
 * alto contraste por tokens de tema (coherente en los 4 temas: biopunk /
 * minimalista / nature / verde-vivo), botón "Escuchar" que lee el momento en
 * voz alta (ttsService, import perezoso, fail-silent). Micro-animaciones
 * sutiles (colibrí flota, tarjetas suben escalonadas, anillos del pin);
 * `prefers-reduced-motion` las apaga (guard propio + guard global de
 * index.css).
 *
 * Gating (respeta el disparo existente del primer uso): DashboardLive la monta
 * SOLO cuando plantsCount === 0 && needsPisoCapture (la misma señal del
 * OnboardingHero compacto) y nunca se ha visto (localStorage). Al cerrar por
 * cualquier vía queda el flujo de siempre (banner compacto del piso térmico).
 *
 * Props:
 *   - onUbicar: ir a 'ubicacion-detectada' (flujo existente de ubicación).
 *   - onClose:  descartar la bienvenida (saltar / "ahora no").
 *   - onExplorarEjemplo: SKIP rico → sembrar la finca de ejemplo y entrar al
 *     home ya POBLADO (demo público). Si no se pasa, el botón no se muestra.
 */

const BIENVENIDA_KEY = 'chagra:bienvenida-vista:v1';
const TOTAL_PASOS = 5;

/* ── Fotos reales del recorrido, con crédito CC visible (requisito de las
 *    licencias CC BY-SA: autor + licencia + enlace, siempre a la vista).
 *    Los archivos y el detalle completo viven en /public/bienvenida/. ────── */
const FOTOS = {
  'manos-siembra': {
    autor: 'Robbieross123',
    licencia: 'CC BY-SA 4.0',
    fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Plant_a_Sapling_for_Better_Future.jpg',
  },
  'cafetal-tolima': {
    autor: 'Kevin Santiago Gonzalez',
    licencia: 'CC BY-SA 4.0',
    fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Cultivo_de_caf%C3%A9_Tolima.jpg',
  },
};

/** Foto de momento con la franja de crédito opaca (legible a pleno sol),
 * mismo patrón visual de los mundos (AlmacenamientoScreen/AguaScreen). */
function FotoMomento({ slug, alt, delay = '0ms', objectPos = 'object-center' }) {
  const c = FOTOS[slug];
  if (!c) return null;
  return (
    <figure
      className="bienvenida-item relative w-full overflow-hidden rounded-2xl border border-slate-700 bg-slate-800"
      style={{ '--bv-delay': delay }}
    >
      <img
        src={`/bienvenida/${slug}.jpg`}
        alt={alt}
        loading="lazy"
        className={`w-full aspect-[16/10] object-cover ${objectPos}`}
      />
      <figcaption className="absolute inset-x-0 bottom-0 bg-slate-950/80 px-2 py-1 backdrop-blur-sm text-left">
        <a
          href={c.fuenteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 truncate text-[9px] text-slate-300 underline decoration-slate-600 underline-offset-2"
          title={`${c.autor} · ${c.licencia} · Wikimedia Commons`}
        >
          <Camera size={9} className="shrink-0" aria-hidden="true" />
          <span className="truncate">Foto: {c.autor} · {c.licencia} · Wikimedia</span>
        </a>
      </figcaption>
    </figure>
  );
}

/** ¿Ya se mostró la bienvenida alguna vez? Fail-closed: si el storage está
 * roto, respondemos true para NO taparle la app al usuario en cada arranque. */
export function bienvenidaYaVista() {
  try {
    return window.localStorage.getItem(BIENVENIDA_KEY) === '1';
  } catch {
    return true;
  }
}

export function marcarBienvenidaVista() {
  try {
    window.localStorage.setItem(BIENVENIDA_KEY, '1');
  } catch {
    /* storage no disponible: la secuencia simplemente no persiste */
  }
}

/** Lee el momento en voz alta. Import perezoso del ttsService (no pesa en el
 * bundle del dashboard) y fail-silent: sin red/voz no rompe nada. */
function escucharTexto(texto) {
  import('../services/ttsService')
    .then((m) => m.speakSentences(texto).catch(() => {}))
    .catch(() => {});
}

export default function BienvenidaFinca({ onUbicar, onClose, onExplorarEjemplo = undefined }) {
  const [paso, setPaso] = useState(0);
  const [sembrando, setSembrando] = useState(false);
  const dialogRef = useRef(null);
  const B = MSG.bienvenida;
  // Instalación PWA (momento 4): mismo manejo de beforeinstallprompt que
  // AndroidInstallBanner, vía el hook compartido (sin duplicar lógica).
  const { canInstall, installed, isIos, promptInstall } = usePwaInstall();

  // Foco al montar (lector de pantalla + teclado aterrizan en la secuencia).
  useEffect(() => {
    dialogRef.current?.focus?.();
  }, []);

  // Mientras el recorrido está abierto, los banners de instalación
  // (Android/iOS) se ocultan por CSS (body.bienvenida-abierta en themes.css):
  // la instalación ya vive DENTRO del recorrido (momento 4) y las pantallas
  // animadas con transform atrapan el z-index del overlay, así que el banner
  // fijo de App se encimaba sobre la secuencia.
  useEffect(() => {
    document.body.classList.add('bienvenida-abierta');
    return () => document.body.classList.remove('bienvenida-abierta');
  }, []);

  const terminar = (via) => {
    marcarBienvenidaVista();
    if (via === 'ubicar') onUbicar?.();
    else onClose?.();
  };

  // SKIP rico: sembrar la finca de ejemplo y entrar al home ya poblado. Marca la
  // bienvenida como vista (no reaparece) y delega en el contenedor la siembra +
  // navegación. Guard anti-doble-toque mientras siembra.
  const explorarEjemplo = async () => {
    if (sembrando) return;
    setSembrando(true);
    marcarBienvenidaVista();
    try {
      await onExplorarEjemplo?.();
    } finally {
      setSembrando(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') terminar('cerrar');
  };

  // Copy de cada momento (para el botón "Escuchar" y los bloques de texto).
  const momentos = [
    { titulo: B.titulo1, copy: B.copy1 },
    {
      titulo: B.titulo2,
      copy: `${B.capVozTitulo}: ${B.capVozCopy} ${B.capFotoTitulo}: ${B.capFotoCopy} ${B.capHerramTitulo}: ${B.capHerramCopy} ${B.capVerifTitulo}: ${B.capVerifCopy}`,
    },
    { titulo: B.vozTitulo, copy: `${B.vozCopy} ${B.vozEjemplo}. ${B.vozNota}` },
    {
      titulo: B.instalarTitulo,
      copy: `${B.instalarCopy} ${B.instalarPorque1} ${B.instalarPorque2} ${B.instalarPorque3}`,
    },
    { titulo: B.titulo3, copy: B.copy3 },
  ];

  // Los tres "porqués" de instalar la app (el argumento es el campo sin señal).
  const porquesInstalar = [
    { id: 'offline', Icon: WifiOff, copy: B.instalarPorque1 },
    { id: 'guardado', Icon: Save, copy: B.instalarPorque2 },
    { id: 'un-toque', Icon: Smartphone, copy: B.instalarPorque3 },
  ];

  const capacidades = [
    { id: 'voz', Icon: Mic, titulo: B.capVozTitulo, copy: B.capVozCopy, costura: false },
    { id: 'foto', Icon: Camera, titulo: B.capFotoTitulo, copy: B.capFotoCopy, costura: false },
    { id: 'herramientas', Icon: Glasses, titulo: B.capHerramTitulo, copy: B.capHerramCopy, costura: false },
    { id: 'verificado', Icon: BadgeCheck, titulo: B.capVerifTitulo, copy: B.capVerifCopy, costura: true },
  ];

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={B.eyebrow}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="bienvenida-overlay"
      data-testid="bienvenida-finca"
    >
      {/* ── Cabecera: progreso cosido + saltar ─────────────────────────── */}
      <div className="w-full max-w-sm mx-auto flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            {B.pasoDe(paso + 1, TOTAL_PASOS)}
          </p>
          {/* La costura: puntada corrida que avanza con cada momento. */}
          <div className="bienvenida-costura" aria-hidden="true">
            <span className="bienvenida-costura-guia" />
            <span
              className="bienvenida-costura-hilo"
              style={{ width: `${((paso + 1) / TOTAL_PASOS) * 100}%` }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => terminar('cerrar')}
          aria-label={B.saltarAria}
          className="shrink-0 min-h-[44px] px-3 rounded-lg text-sm font-bold text-slate-400 hover:text-slate-200 transition-colors"
        >
          {B.saltar}
        </button>
      </div>

      {/* ── Momento activo (key re-dispara la entrada escalonada) ──────── */}
      <div
        key={paso}
        className="flex-1 w-full max-w-sm mx-auto flex flex-col items-center justify-center text-center gap-5 py-6"
      >
        {paso === 0 && (
          <>
            <div className="bienvenida-item bienvenida-flotar" style={{ '--bv-delay': '0ms' }}>
              <ChagraAgentAvatarAngelita size={188} state="idle" ariaLabel="Angelita, la abeja de Chagra" />
            </div>
            <div className="bienvenida-item flex flex-col gap-3" style={{ '--bv-delay': '120ms' }}>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">
                {B.eyebrow}
              </p>
              <h1 className="text-4xl font-black leading-tight text-slate-100">
                {B.titulo1}
              </h1>
              <p className="text-lg leading-snug text-slate-300">
                {B.copy1}
              </p>
            </div>
          </>
        )}

        {paso === 1 && (
          <>
            <div className="bienvenida-item flex flex-col gap-1.5" style={{ '--bv-delay': '0ms' }}>
              <h1 className="text-3xl font-black leading-tight text-slate-100">
                {B.titulo2}
              </h1>
              <p className="text-base text-slate-400">{B.copy2}</p>
            </div>
            <div className="w-full flex flex-col gap-3" role="list">
              {capacidades.map((cap, i) => (
                <div
                  key={cap.id}
                  role="listitem"
                  className={`bienvenida-item flex items-center gap-4 text-left rounded-2xl p-4 bg-slate-900 ${
                    cap.costura ? 'bienvenida-verificada' : 'border border-slate-700'
                  }`}
                  style={{ '--bv-delay': `${120 + i * 130}ms` }}
                >
                  <span
                    className={`shrink-0 w-14 h-14 rounded-full grid place-items-center ${
                      cap.costura ? 'bg-emerald-900/60 text-emerald-300' : 'bg-slate-800 text-slate-200'
                    }`}
                    aria-hidden="true"
                  >
                    <cap.Icon size={30} strokeWidth={2.25} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-lg font-black leading-tight text-slate-100">
                      {cap.titulo}
                    </span>
                    <span className="block text-sm leading-snug text-slate-300 mt-0.5">
                      {cap.copy}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Momento 3: "Hola Chagra" — hablarle con las manos ocupadas ── */}
        {paso === 2 && (
          <>
            <FotoMomento slug="manos-siembra" alt={B.vozFotoAlt} delay="0ms" />
            <div className="bienvenida-item flex flex-col gap-2" style={{ '--bv-delay': '120ms' }}>
              <h1 className="text-3xl font-black leading-tight text-slate-100">
                {B.vozTitulo}
              </h1>
              <p className="text-base leading-snug text-slate-300">
                {B.vozCopy}
              </p>
            </div>
            {/* Chip de voz "vivo": micrófono + ondas que laten + el saludo de
                ejemplo. Es la demo de cómo suena hablarle a Chagra. */}
            <div
              className="bienvenida-item bienvenida-chip-voz"
              style={{ '--bv-delay': '250ms' }}
              data-testid="bienvenida-chip-voz"
            >
              <span
                className="shrink-0 w-11 h-11 rounded-full grid place-items-center bg-emerald-900/60 text-emerald-300"
                aria-hidden="true"
              >
                <Mic size={22} strokeWidth={2.25} />
              </span>
              <span className="bienvenida-onda" aria-hidden="true">
                <span /><span /><span /><span /><span />
              </span>
              <span className="text-base font-bold leading-snug text-slate-100 text-left">
                {B.vozEjemplo}
              </span>
            </div>
            {/* Cuándo sirve: chips cortos, para leer de un vistazo. */}
            <div className="bienvenida-item flex flex-wrap justify-center gap-2" style={{ '--bv-delay': '360ms' }}>
              {[B.vozChip1, B.vozChip2, B.vozChip3].map((chip) => (
                <span
                  key={chip}
                  className="px-3 py-1.5 rounded-full border border-slate-700 bg-slate-900 text-sm font-bold text-slate-300"
                >
                  {chip}
                </span>
              ))}
            </div>
            <p className="bienvenida-item text-sm text-slate-400" style={{ '--bv-delay': '470ms' }}>
              {B.vozNota}
            </p>
          </>
        )}

        {/* ── Momento 4: instalar la app (PWA) — el porqué es el campo ──── */}
        {paso === 3 && (
          <>
            <FotoMomento slug="cafetal-tolima" alt={B.instalarFotoAlt} delay="0ms" />
            <div className="bienvenida-item flex flex-col gap-2" style={{ '--bv-delay': '120ms' }}>
              <h1 className="text-3xl font-black leading-tight text-slate-100">
                {B.instalarTitulo}
              </h1>
              <p className="text-base leading-snug text-slate-300">
                {B.instalarCopy}
              </p>
            </div>
            <div className="w-full flex flex-col gap-2" role="list">
              {porquesInstalar.map((p, i) => (
                <div
                  key={p.id}
                  role="listitem"
                  className="bienvenida-item flex items-center gap-3 text-left rounded-2xl px-4 py-3 bg-slate-900 border border-slate-700"
                  style={{ '--bv-delay': `${220 + i * 110}ms` }}
                >
                  <span className="shrink-0 w-10 h-10 rounded-full grid place-items-center bg-slate-800 text-emerald-300" aria-hidden="true">
                    <p.Icon size={20} strokeWidth={2.25} />
                  </span>
                  <span className="text-sm leading-snug text-slate-200">{p.copy}</span>
                </div>
              ))}
            </div>
            {/* La vía de instalación según el equipo (detección por CAPACIDAD,
                igual que los banners): prompt nativo / pasos iOS / menú. */}
            {installed ? (
              <div
                className="bienvenida-item flex items-center gap-2 rounded-xl px-4 py-3 bg-emerald-900/40 border border-emerald-600/60 text-emerald-200 font-bold text-sm"
                style={{ '--bv-delay': '560ms' }}
                data-testid="bienvenida-instalada"
              >
                <Check size={20} aria-hidden="true" /> {B.instalarListo}
              </div>
            ) : canInstall ? (
              <button
                type="button"
                onClick={() => promptInstall()}
                className="bienvenida-item w-full min-h-[52px] rounded-xl bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white font-black flex items-center justify-center gap-2 transition-colors"
                style={{ '--bv-delay': '560ms' }}
                data-testid="bienvenida-instalar-cta"
              >
                <Download size={22} aria-hidden="true" /> {B.instalarCta}
              </button>
            ) : isIos ? (
              <ol
                className="bienvenida-item w-full flex flex-col gap-2 text-left"
                style={{ '--bv-delay': '560ms' }}
                data-testid="bienvenida-instalar-ios"
              >
                <li className="flex items-center gap-3 rounded-xl px-4 py-3 bg-slate-900 border border-slate-700 text-sm text-slate-200">
                  <Share size={18} className="shrink-0 text-emerald-300" aria-hidden="true" />
                  <span><span className="font-black text-slate-100">1.</span> {MSG.instalarApp.iosPaso1}</span>
                </li>
                <li className="flex items-center gap-3 rounded-xl px-4 py-3 bg-slate-900 border border-slate-700 text-sm text-slate-200">
                  <Smartphone size={18} className="shrink-0 text-emerald-300" aria-hidden="true" />
                  <span><span className="font-black text-slate-100">2.</span> {MSG.instalarApp.iosPaso2}</span>
                </li>
              </ol>
            ) : (
              <p
                className="bienvenida-item text-sm text-slate-400"
                style={{ '--bv-delay': '560ms' }}
                data-testid="bienvenida-instalar-menu"
              >
                {B.instalarMenuHint}
              </p>
            )}
          </>
        )}

        {/* ── Momento 5: ubicación mágica ─────────────────────────────────── */}
        {paso === 4 && (
          <>
            <div className="bienvenida-item relative w-24 h-24 grid place-items-center" style={{ '--bv-delay': '0ms' }}>
              <span className="bienvenida-pin-anillo" aria-hidden="true" />
              <span className="bienvenida-pin-anillo" aria-hidden="true" />
              <span className="relative z-[1] w-20 h-20 rounded-full bg-slate-900 border border-slate-700 grid place-items-center text-amber-400">
                <MapPin size={40} strokeWidth={2} aria-hidden="true" />
              </span>
            </div>
            <div className="bienvenida-item flex flex-col gap-3" style={{ '--bv-delay': '120ms' }}>
              <h1 className="text-4xl font-black leading-tight text-slate-100">
                {B.titulo3}
              </h1>
              <p className="text-lg leading-snug text-slate-300">
                {B.copy3}
              </p>
            </div>
          </>
        )}

        {/* Escuchar el momento en voz alta (usuarios que leen poco). */}
        <button
          type="button"
          onClick={() => escucharTexto(`${momentos[paso].titulo}. ${momentos[paso].copy}`)}
          aria-label={B.escuchar}
          className="bienvenida-item inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full border border-slate-700 text-sm font-bold text-slate-300 hover:text-slate-100 hover:border-slate-500 transition-colors"
          style={{ '--bv-delay': '340ms' }}
        >
          <Volume2 size={18} aria-hidden="true" /> {B.escuchar}
        </button>
      </div>

      {/* ── Acciones del momento ────────────────────────────────────────── */}
      <div className="w-full max-w-sm mx-auto flex flex-col gap-2">
        {paso < TOTAL_PASOS - 1 ? (
          <button
            type="button"
            onClick={() => setPaso((p) => Math.min(p + 1, TOTAL_PASOS - 1))}
            className="onboarding-piso-primary"
            data-testid="bienvenida-siguiente"
          >
            {B.siguiente} <ArrowRight size={22} aria-hidden="true" />
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => terminar('ubicar')}
              className="onboarding-piso-primary"
              data-testid="bienvenida-ubicar"
            >
              <MapPin size={22} aria-hidden="true" /> {B.ubicarFinca}
            </button>
            {/* SKIP rico: explorar con la finca de ejemplo ya poblada (demo). */}
            {typeof onExplorarEjemplo === 'function' && (
              <button
                type="button"
                onClick={explorarEjemplo}
                disabled={sembrando}
                aria-label={B.explorarEjemploAria}
                className="onboarding-piso-secondary inline-flex items-center justify-center gap-2 disabled:opacity-60"
                data-testid="bienvenida-explorar-ejemplo"
              >
                <Sparkles size={18} aria-hidden="true" />
                {sembrando ? 'Preparando su finca…' : B.explorarEjemplo}
              </button>
            )}
            <button
              type="button"
              onClick={() => terminar('cerrar')}
              className="onboarding-piso-secondary"
              data-testid="bienvenida-ahora-no"
            >
              {B.ahoraNo}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
