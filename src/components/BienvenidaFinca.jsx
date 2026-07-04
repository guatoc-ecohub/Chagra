/* eslint-disable react-refresh/only-export-components -- bienvenidaYaVista/
   marcarBienvenidaVista son los helpers de gating "una sola vez" y deben
   exportarse junto al componente (mismo patrón que NotifPermissionPrompt). */
import React, { useEffect, useRef, useState } from 'react';
import { Mic, Camera, BadgeCheck, MapPin, ArrowRight, Volume2 } from 'lucide-react';
import ChagraAgentAvatarColibri from './ChagraAgentAvatarColibri';
import { MSG } from '../config/messages.js';

/**
 * BienvenidaFinca — la PRIMERA impresión de Chagra (primera vez, una sola vez).
 *
 * Secuencia de 3 "momentos" a pantalla completa, pensada para que en ~20
 * segundos el campesino sienta "esto es MÍO y me entiende":
 *
 *   1. Bienvenida — el colibrí del abutilón (avatar del agente) saluda con la
 *      identidad cuaderno-de-campo / finca viva. Nada de wizard corporativo.
 *   2. Capacidades estrella — hablarle por voz, mostrarle una foto de la mata,
 *      y respuestas verificadas (LA COSTURA: la tarjeta lleva el borde cosido).
 *   3. Ubicación mágica — "¿dónde está su tierra?" como momento de magia, no
 *      como formulario. El CTA delega en la ruta EXISTENTE
 *      'ubicacion-detectada' (LocationDetectedScreen: GPS + vereda + montaña
 *      de pisos térmicos). Cero lógica nueva de permisos/datos.
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
 */

const BIENVENIDA_KEY = 'chagra:bienvenida-vista:v1';
const TOTAL_PASOS = 3;

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

export default function BienvenidaFinca({ onUbicar, onClose }) {
  const [paso, setPaso] = useState(0);
  const dialogRef = useRef(null);
  const B = MSG.bienvenida;

  // Foco al montar (lector de pantalla + teclado aterrizan en la secuencia).
  useEffect(() => {
    dialogRef.current?.focus?.();
  }, []);

  const terminar = (via) => {
    marcarBienvenidaVista();
    if (via === 'ubicar') onUbicar?.();
    else onClose?.();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') terminar('cerrar');
  };

  // Copy de cada momento (para el botón "Escuchar" y los bloques de texto).
  const momentos = [
    { titulo: B.titulo1, copy: B.copy1 },
    {
      titulo: B.titulo2,
      copy: `${B.capVozTitulo}: ${B.capVozCopy} ${B.capFotoTitulo}: ${B.capFotoCopy} ${B.capVerifTitulo}: ${B.capVerifCopy}`,
    },
    { titulo: B.titulo3, copy: B.copy3 },
  ];

  const capacidades = [
    { id: 'voz', Icon: Mic, titulo: B.capVozTitulo, copy: B.capVozCopy, costura: false },
    { id: 'foto', Icon: Camera, titulo: B.capFotoTitulo, copy: B.capFotoCopy, costura: false },
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
              <ChagraAgentAvatarColibri size={152} state="idle" ariaLabel="Colibrí de Chagra" />
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

        {paso === 2 && (
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
