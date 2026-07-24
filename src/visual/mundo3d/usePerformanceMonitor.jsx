/*
 * usePerformanceMonitor — CALIDAD ADAPTATIVA EN VIVO (FASE 0, complementa deviceTier).
 *
 * `deviceTier.js` decide UNA VEZ, antes de montar, si el equipo aguanta 3D y a
 * qué techo ('alto'|'medio'|'bajo'). Este módulo mide fps REALES en runtime con
 * el `<PerformanceMonitor>` de drei y gradúa la calidad EN CALIENTE dentro de
 * ese techo: DPR, densidad de partículas y efectos suben o bajan sin desmontar
 * la escena. El tier estático es el TECHO; este monitor es el TERMOSTATO.
 * Ninguno reemplaza al otro.
 *
 * Piezas exportadas:
 *   <MonitorRendimiento tier={tier}>  — wrapper del PerformanceMonitor de drei.
 *       Se monta DENTRO del `<Canvas>` (usa useFrame). Publica la calidad en un
 *       store módulo-local y, salvo `ajustarDpr={false}`, aplica el DPR él
 *       mismo vía `setDpr` de fiber.
 *   useCalidad3D()                    — hook de lectura reactiva
 *       (useSyncExternalStore). Funciona dentro Y fuera del Canvas: el store
 *       puentea los dos árboles de React sin depender de contexto. Devuelve
 *       `{ nivel, factor, dpr, escalaParticulas, fallback, tier }`.
 *   leerCalidad() / leerFps()         — getters no-reactivos (para useFrame,
 *       donde un re-render por muestreo sería contraproducente).
 *   nivelPorFactor / dprPorFactor / escalaParticulasPorFactor /
 *   factorInicialPorTier              — derivaciones puras (testables sin GPU).
 *
 * Contratos:
 *   - `nivel` ('alto'|'medio'|'bajo') es la perilla DISCRETA: efectos on/off
 *     (niebla, animaciones secundarias, sombreado caro). `factor` (0..1) y
 *     `escalaParticulas` (0.4..1) son las perillas CONTINUAS (densidades,
 *     distancias de dibujo, conteos de instancias).
 *   - El fps NO viaja en el snapshot reactivo (re-renderizaría consumidores
 *     sin necesidad); se consulta con `leerFps()`.
 *   - Tras `fallback` (el equipo osciló más de `flipflops` veces) la calidad
 *     queda CLAVADA hacia abajo: se aceptan bajadas, se ignoran subidas.
 *     Estable es mejor que bonito (DR §4.4).
 *   - Store singleton: asume UN Canvas 3D activo a la vez (hoy: el host
 *     `<Mundo>`). Lo aprendido persiste entre escenas del mismo tier — el
 *     equipo no cambia por navegar.
 *
 * IMPORTANTE (code-split): este módulo importa drei/fiber. NO exportarlo desde
 * el barrel `mundo3d/index.js` (regla del barrel: three-free). Importarlo SOLO
 * desde código 3D perezoso (escenas/, chunk vendor-three), como useEntradaAbeja.
 *
 * IMPORTANTE (cableo): si el Canvas todavía usa `<AdaptiveDpr>`, hay que
 * quitarlo o montar este monitor con `ajustarDpr={false}`. Dos manos en la
 * misma perilla pelean. Y con `frameloop='demand'` (reduced-motion) el muestreo
 * de fps no significa nada: no montar el monitor en ese modo.
 */

/* eslint-disable react-refresh/only-export-components -- mismo contrato que
   useEntradaAbeja.jsx: módulo 3D perezoso (store + derivaciones puras + su
   componente monitor) que se importa SIEMPRE dentro de un <Canvas> vía el
   chunk vendor-three; no es hot-reload-sensible. Van juntos a propósito: el
   monitor escribe el store y las escenas leen las derivaciones. */
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import usePrefsStore from '../../store/usePrefsStore.js';
import { decidirTier } from './deviceTier.js';

/* ─── 1) Derivaciones puras (sin canvas, sin GPU, sin React) ────────────── */

/** Techo de DPR por tier estático. El DR §6 prohíbe pasar de 1.5. */
export const TECHO_DPR = { alto: 1.5, medio: 1.25, bajo: 1 };

const TIERS = ['bajo', 'medio', 'alto'];
const FPS_BAJO = 30;
const FPS_ALTO = 52;
const FPS_BAJO_CONSECUTIVOS = 4;
const FPS_ALTO_CONSECUTIVOS = 5;

const clamp01 = (x) => Math.max(0, Math.min(1, x));

const indiceTier = (tier) => Math.max(0, TIERS.indexOf(tier));

const limitarTier = (tier, techo = 'alto') => TIERS[Math.min(indiceTier(tier), indiceTier(techo))] || 'bajo';

const tierInferior = (tier) => TIERS[Math.max(0, indiceTier(tier) - 1)] || 'bajo';

const tierSuperior = (tier, techo = 'alto') => {
  const siguiente = TIERS[Math.min(TIERS.length - 1, indiceTier(tier) + 1)] || 'alto';
  return limitarTier(siguiente, techo);
};

const objCongelado = (obj) => Object.freeze(obj);

export const PRESUPUESTO_TIER = objCongelado({
  alto: objCongelado({
    maxCriaturasAmbientales: 5,
    maxFlora: 100,
    bloom: true,
    sombras: true,
    dpr: 1.5,
    postfx: true,
  }),
  medio: objCongelado({
    maxCriaturasAmbientales: 3,
    maxFlora: 56,
    bloom: false,
    sombras: false,
    dpr: 1.25,
    postfx: false,
  }),
  bajo: objCongelado({
    maxCriaturasAmbientales: 1,
    maxFlora: 24,
    bloom: false,
    sombras: false,
    dpr: 1,
    postfx: false,
  }),
});

export function presupuestoDeTier(tier) {
  return PRESUPUESTO_TIER[tier] || PRESUPUESTO_TIER.medio;
}

/**
 * Heurística de arranque para el presupuesto vivo.
 * Usa el tier del host como techo, pero lo baja si el equipo o la ruta lo
 * sugieren (UA viejo, ahorro, bajo recurso, valle3d apagado).
 * @param {{
 *   tier?: 'alto'|'medio'|'bajo',
 *   valle3d?: boolean,
 *   ua?: string,
 * }} [opts]
 * @returns {'alto'|'medio'|'bajo'}
 */
export function detectarTierInicial({ tier, valle3d = true, ua } = {}) {
  if (!valle3d) return 'bajo';

  const decision = decidirTier();
  let base = decision.tier;

  if (TIERS.includes(tier)) {
    base = limitarTier(base, tier);
  }

  const userAgent = ua ?? (typeof window !== 'undefined' ? window.navigator?.userAgent ?? '' : '');
  const androidViejo = /Android\s([0-6]|7\.[0-1])/.test(userAgent);
  const iosViejo = /(iPhone|iPad|iPod).+OS (1[0-2])_/.test(userAgent);
  if (androidViejo || iosViejo) base = 'bajo';

  return base;
}

/**
 * Factor de arranque por tier: 'alto' parte pleno (solo puede bajar si el
 * equipo no rinde); 'medio' parte a media marcha (puede subir si sorprende).
 * @param {'alto'|'medio'|'bajo'} tier
 * @returns {number} 0..1
 */
export function factorInicialPorTier(tier) {
  if (tier === 'alto') return 1;
  if (tier === 'medio') return 0.6;
  return 0.2;
}

/**
 * Perilla discreta a partir del factor continuo del monitor.
 * @param {number} factor 0..1
 * @returns {'alto'|'medio'|'bajo'}
 */
export function nivelPorFactor(factor) {
  if (factor >= 0.7) return 'alto';
  if (factor >= 0.35) return 'medio';
  return 'bajo';
}

/**
 * DPR cuantizado a pasos de 0.25 dentro de [1, techo]. La cuantización evita
 * re-dimensionar el framebuffer por micro-cambios de factor (eso también jankea).
 * @param {number} factor 0..1
 * @param {number} [techo] tope de DPR (default 1.5, DR §6)
 * @returns {number}
 */
export function dprPorFactor(factor, techo = 1.5) {
  const crudo = 1 + clamp01(factor) * (techo - 1);
  return Math.min(techo, Math.max(1, Math.round(crudo * 4) / 4));
}

/**
 * Escala de densidad de partículas/instancias: lineal 0.4..1. Nunca por debajo
 * del 40% — una escena rala se ve rota, no frugal.
 * @param {number} factor 0..1
 * @returns {number}
 */
export function escalaParticulasPorFactor(factor) {
  return Math.round((0.4 + 0.6 * clamp01(factor)) * 100) / 100;
}

/* ─── 2) Store módulo-local (puentea árbol DOM y árbol fiber) ───────────── */

/**
 * @typedef {Object} Calidad3D
 * @property {'alto'|'medio'|'bajo'} tier    tier actual en vivo
 * @property {'alto'|'medio'|'bajo'} techo   techo de escalado del monitor
 * @property {number} factor                 0..1 continuo del monitor
 * @property {'alto'|'medio'|'bajo'} nivel   perilla discreta en vivo
 * @property {number} dpr                    DPR cuantizado, ≤ techo del presupuesto
 * @property {number} escalaParticulas       0.4..1 para conteos/densidades
 * @property {boolean} fallback              calidad clavada hacia abajo
 */

/** @param {'alto'|'medio'|'bajo'} tier @param {'alto'|'medio'|'bajo'} techo @param {number} factor @param {boolean} fallback @param {number} fps */
function derivar(tier, techo, factor, fallback, fps = 0) {
  const cierre = limiteTierSeguro(techo);
  const t = limitarTier(tier, cierre);
  const f = Math.round(clamp01(factor) * 100) / 100;
  const presupuesto = presupuestoDeTier(t);
  return Object.freeze({
    tier: t,
    techo: cierre,
    factor: f,
    fallback,
    fps,
    nivel: nivelPorFactor(f),
    presupuesto,
    dpr: dprPorFactor(f, presupuesto.dpr ?? TECHO_DPR[t] ?? 1.25),
    escalaParticulas: escalaParticulasPorFactor(f),
  });
}

function limiteTierSeguro(tier) {
  return TIERS.includes(tier) ? tier : 'medio';
}

let calidad = derivar('medio', 'medio', factorInicialPorTier('medio'), false, 0);
let fpsUltimo = 0;
let frioPersistente = 0;
let calientePersistente = 0;
const oyentes = new Set();

/** Notifica SOLO si algo derivado cambió (el fps queda fuera a propósito). */
function emitir(sig) {
  if (
    sig.tier === calidad.tier &&
    sig.techo === calidad.techo &&
    sig.factor === calidad.factor &&
    sig.nivel === calidad.nivel &&
    sig.dpr === calidad.dpr &&
    sig.fallback === calidad.fallback &&
    sig.fps === calidad.fps
  ) return;
  calidad = sig;
  oyentes.forEach((fn) => fn());
}

function suscribir(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

/** Snapshot vigente, no-reactivo (seguro dentro de useFrame). @returns {Calidad3D} */
export function leerCalidad() {
  return calidad;
}

/** fps del último muestreo que movió el factor (no-reactivo, para HUD/debug). */
export function leerFps() {
  return fpsUltimo;
}

/**
 * Siembra el store con el tier estático. Idempotente: si el tier no cambió,
 * conserva lo aprendido (factor y candado de fallback) — navegar entre mundos
 * no borra lo que el equipo ya demostró.
 * @param {'alto'|'medio'|'bajo'} tier
 */
export function sembrarCalidad(tier) {
  const techo = limiteTierSeguro(tier);
  if (calidad.techo === techo) return;
  frioPersistente = 0;
  calientePersistente = 0;
  emitir(derivar(techo, techo, factorInicialPorTier(techo), false, fpsUltimo));
}

/** Reset total (tests / dev). @param {'alto'|'medio'|'bajo'} [tier] */
export function reiniciarCalidad(tier = 'medio') {
  fpsUltimo = 0;
  frioPersistente = 0;
  calientePersistente = 0;
  calidad = derivar(tier, tier, factorInicialPorTier(tier), false, 0);
  oyentes.forEach((fn) => fn());
}

function registrarFPS(fps) {
  if (!Number.isFinite(fps)) return;
  fpsUltimo = fps;
  if (fps < FPS_BAJO) {
    frioPersistente += 1;
    calientePersistente = 0;
    return;
  }
  if (fps >= FPS_ALTO) {
    calientePersistente += 1;
    frioPersistente = 0;
    return;
  }
  frioPersistente = 0;
  calientePersistente = 0;
}

function aplicarTierSegunFPS() {
  let siguiente = calidad.tier;
  if (frioPersistente >= FPS_BAJO_CONSECUTIVOS) {
    siguiente = tierInferior(calidad.tier);
    frioPersistente = 0;
  } else if (calientePersistente >= FPS_ALTO_CONSECUTIVOS) {
    siguiente = tierSuperior(calidad.tier, calidad.techo);
    calientePersistente = 0;
  }
  if (siguiente !== calidad.tier) {
    emitir(derivar(siguiente, calidad.techo, calidad.factor, calidad.fallback, fpsUltimo));
  }
}

/** Callback de cambio del monitor drei. Tras fallback solo se acepta bajar. */
function acusarCambio(api) {
  registrarFPS(api.fps);
  const factor = calidad.fallback ? Math.min(calidad.factor, api.factor) : api.factor;
  emitir(derivar(calidad.tier, calidad.techo, factor, calidad.fallback, fpsUltimo));
  aplicarTierSegunFPS();
}

/** Callback de fallback del monitor drei: clava la calidad hacia abajo. */
function acusarFallback(api) {
  registrarFPS(api.fps);
  emitir(derivar(calidad.tier, calidad.techo, Math.min(calidad.factor, api.factor), true, fpsUltimo));
}

/** Internos expuestos SOLO para tests unitarios (no consumir en escenas). */
export const __internos = {
  acusarCambio,
  acusarFallback,
  emitir,
  derivar,
  registrarFPS,
  aplicarTierSegunFPS,
  limitarTier,
  tierInferior,
  tierSuperior,
};

/* ─── 3) Piezas React ───────────────────────────────────────────────────── */

/**
 * Lectura reactiva de la calidad en vivo. Usable dentro del Canvas (escenas,
 * arquetipos) y fuera (HUD, botones de la PWA): el store es el puente.
 * @returns {Calidad3D}
 */
export function useCalidad3D() {
  return useSyncExternalStore(suscribir, leerCalidad, leerCalidad);
}

/**
 * Lectura reactiva del presupuesto vivo. El `tierInicial` sale de la heurística
 * del host; `tier`/`presupuesto` vienen del store dinámico.
 * @param {{
 *   tier?: 'alto'|'medio'|'bajo',
 *   reducedMotion?: boolean,
 *   valle3d?: boolean,
 *   ua?: string,
 * }} [opts]
 */
export function useTierPerformance({ tier, reducedMotion = false, valle3d = true, ua } = {}) {
  const valle3dHabilitado = usePrefsStore((s) => s.valle3d);
  const tierInicial = useMemo(
    () => detectarTierInicial({
      tier,
      valle3d: valle3d && valle3dHabilitado,
      ua,
    }),
    [tier, valle3d, valle3dHabilitado, ua],
  );
  const calidadViva = useCalidad3D();
  return {
    tierInicial,
    tier: calidadViva.tier,
    presupuesto: calidadViva.presupuesto || presupuestoDeTier(calidadViva.tier),
    reducedMotion,
    samplerActivo: !reducedMotion,
    fallback: calidadViva.fallback,
    dpr: calidadViva.dpr,
  };
}

/** Aplica el DPR del store al renderer. Hijo del Canvas, no dibuja nada. */
function AjusteDpr() {
  const setDpr = useThree((s) => s.setDpr);
  const { dpr } = useCalidad3D();
  useEffect(() => {
    setDpr(dpr);
  }, [setDpr, dpr]);
  return null;
}

/**
 * Límites de fps por defecto: por debajo de 45 sostenido baja calidad; al
 * clavar el refresco (>=60, o >=100 en pantallas rápidas) la sube. drei
 * compara `fps >= superior` para subir y `fps < inferior` para bajar.
 * @param {number} hz refresco detectado
 * @returns {[number, number]}
 */
const limitesPorDefecto = (hz) => (hz > 100 ? [45, 100] : [45, 60]);

/**
 * Wrapper del `<PerformanceMonitor>` de drei con la política Chagra. Montar
 * UNA vez, DENTRO del `<Canvas>`, con el tier de `decidirTier()`.
 *
 * OJO drei: `flipflops` cuenta CADA cambio de factor (no solo oscilaciones);
 * con el default 12, una escalada monótona de 'medio' a pleno (4 pasos) queda
 * lejos del candado, pero un equipo que serrucha termina clavado abajo.
 *
 * @param {{
 *   tier?: 'alto'|'medio'|'bajo',
 *   ajustarDpr?: boolean,
 *   ms?: number,
 *   iterations?: number,
 *   step?: number,
 *   flipflops?: number,
 *   limites?: (hz: number) => [number, number],
 *   children?: import('react').ReactNode,
 * }} props
 */
export function MonitorRendimiento({
  tier = 'medio',
  ajustarDpr = true,
  ms = 250,
  iterations = 8,
  step = 0.1,
  flipflops = 12,
  limites = limitesPorDefecto,
  children = null,
}) {
  /* Siembra ANTES del primer render de drei (su `factor` inicial se captura en
     un useState interno): initializer de estado, idempotente bajo StrictMode. */
  const [factorArranque] = useState(() => {
    sembrarCalidad(tier);
    return leerCalidad().factor;
  });
  /* Si el tier cambia en caliente (raro: re-resolución del host), re-siembra. */
  useEffect(() => {
    sembrarCalidad(tier);
  }, [tier]);

  return (
    <PerformanceMonitor
      factor={factorArranque}
      ms={ms}
      iterations={iterations}
      step={step}
      flipflops={flipflops}
      bounds={limites}
      onChange={acusarCambio}
      onFallback={acusarFallback}
    >
      {ajustarDpr ? <AjusteDpr /> : null}
      {children}
    </PerformanceMonitor>
  );
}

export default MonitorRendimiento;
