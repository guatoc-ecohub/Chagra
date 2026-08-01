/*
 * TransicionSierraMundo — el DESCENSO de la vista global de la Sierra a un
 * mundo (y su reverso, la subida de vuelta al macizo).
 *
 * Cuando el usuario toca un piso térmico en la vista global, este overlay
 * coreografía la bajada por la ladera: el transecto completo de la Sierra
 * (nieve → superpáramo → páramo → bosque de niebla → selva húmeda → bosque
 * seco → mar de Palomino) pasa ante la cámara como una columna de bandas de
 * color, nubes de la franja de niebla cruzan en paralaje, y al tocar fondo un
 * beat de luz con el tinte del piso destino marca la llegada. La subida es el
 * mismo viaje al revés. Norte: la magia del túnel de Mario Odyssey, pero como
 * descenso 3D→3D por la montaña — barato, DOM/CSS puro, cero red, offline.
 *
 * CONTRATO TEMPORAL (misma filosofía que TransicionMundoKit): los callbacks
 * los disparan timers JS deterministas, NUNCA `animationend`. El CSS anima
 * "a ciegas" con la misma duración via `--tsm-ms`, pero quien manda es el
 * setTimeout (pestañas en segundo plano, throttling, etc.).
 *   · `onMitad` — pantalla 100% cubierta (meseta 30%–70% de las keyframes):
 *     AQUÍ el host intercambia la escena debajo del overlay
 *     (bajar: desmonta la vista global y monta el diorama del piso;
 *      subir: desmonta el diorama y monta la vista global).
 *   · `onFin`   — pantalla revelada, overlay inerte: desmonte con `activa=false`.
 * Cada uno se llama a lo sumo UNA vez por activación.
 *
 * PROPS
 *   activa        bool — true corre el ciclo cubrir→mitad→revelar; false no
 *                 monta nada y cancela timers/tween.
 *   direccion     'bajar' (Sierra → mundo) | 'subir' (mundo → Sierra): invierte
 *                 el sentido del transecto y del tween, no el contrato temporal.
 *   pisoDestino   id/nombre del piso térmico destino (p.ej. 'paramo', 'calido',
 *                 'bosque de niebla', 'palomino'): tiñe el beat de llegada y la
 *                 etiqueta. Desconocido → tinte cálido neutro.
 *   tier          'alto'|'medio'|'bajo' (deviceTier): bajo = viaje más corto y
 *                 sin adornos (nubes, destello, viñeta); alto = extras baratos.
 *   reducedMotion bool — colapsa TODO a un corte simple con fade: cubre
 *                 instantáneo, onMitad enseguida, desvanece corto. Sin bandas,
 *                 sin nubes, sin tween de cámara.
 *   onMitad/onFin callbacks del contrato temporal (opcionales).
 *   camaraRef     OPCIONAL — ref a una cámara three (PerspectiveCamera). Si
 *                 llega, durante la fase de cubierta se aplica un tween barato
 *                 (dolly vertical + leve push/pull de FOV) que vende el
 *                 descenso; al completar la cubierta (o al abortar) la cámara
 *                 se RESTAURA a su estado inicial — el host intercambia escena
 *                 bajo tapa y recibe su cámara intacta. Si no llega, el viaje
 *                 es 100% DOM y funciona igual.
 *   caidaCamara   unidades de mundo que el dolly desciende (bajar) o asciende
 *                 (subir) durante la cubierta. Default 1.4.
 *   colorA/colorB overrides del tinte destino (claro/profundo) si el host ya
 *                 resolvió la paleta del piso (ganan sobre `pisoDestino`).
 *   etiqueta      override del texto de estado (accesibilidad/tono lo decide
 *                 el host si quiere).
 *
 * CABLEO SUGERIDO (este archivo no toca nada existente — compone por props):
 *   1. El host de la vista global (p.ej. quien monte VistaGlobalSierra) guarda
 *      un estado `viaje = { activa, direccion, pisoDestino }`;
 *   2. al tocar un piso: `setViaje({ activa: true, direccion: 'bajar',
 *      pisoDestino: piso.id })` y monta
 *      `<TransicionSierraMundo {...viaje} tier={tier}
 *         reducedMotion={reducedMotion} onMitad={swap} onFin={apagar} />`
 *      como HERMANO del canvas (overlay `position: fixed`, z-index 46 — sobre
 *      el velo original z 40 y el kit z 44, puede convivir con ambos);
 *   3. en `onMitad` intercambia la escena (vista global ↔ diorama del piso);
 *   4. en `onFin` hace `setViaje((v) => ({ ...v, activa: false }))`;
 *   5. volver: mismo ciclo con `direccion: 'subir'`;
 *   6. tier/reducedMotion: `decidirTier()` de deviceTier.js + media query
 *      `prefers-reduced-motion` (o el hook que ya use el host);
 *   7. cámara (opcional): la misma ref que el host pasa a su
 *      `<PerspectiveCamera ref={camRef}/>` (o `useThree().camera` guardada en
 *      un ref) → `camaraRef={camRef}`.
 */
import { useEffect, useRef } from 'react';

/* ------------------------------ reloj interno --------------------------- */
/* No se exportan (react-refresh/only-export-components): el host cronometra
 * por los callbacks, nunca por estas constantes. */

const VIAJE_MS = 1500; // tier alto/medio: descenso con aire cinematográfico
const REDUCIDA_MS = 160; // corte simple con fade (mismo valor que el kit)
const FACTOR_TIER_BAJO = 0.7; // menos tiempo de overlay en equipos flojos
const MITAD_FRAC = 0.5; // centro de la meseta cubierta (30%–70% en keyframes)

function duracionViaje(tier, reducedMotion) {
  if (reducedMotion) return REDUCIDA_MS;
  return tier === 'bajo' ? Math.round(VIAJE_MS * FACTOR_TIER_BAJO) : VIAJE_MS;
}

/* ------------------------- paleta de pisos térmicos --------------------- */
/* Tintes [claro, profundo] + nombre legible por piso. Claves normalizadas
 * (minúsculas, sin acentos). El transecto completo vive en el CSS de las
 * bandas; esto solo tiñe el beat de llegada y la etiqueta. */

const PISOS = [
  { claves: ['nieve', 'nival', 'glaciar', 'simmonds'], nombre: 'la nieve perpetua', a: '#eef4f8', b: '#9fb8c8' },
  { claves: ['superparamo'], nombre: 'el superpáramo', a: '#c9d2cf', b: '#75878a' },
  { claves: ['paramo', 'frailejon'], nombre: 'el páramo', a: '#c7bb6e', b: '#5f6b45' },
  { claves: ['niebla', 'frio', 'bosque de niebla', 'bosque_niebla', 'nublado'], nombre: 'el bosque de niebla', a: '#8fae9a', b: '#33544a' },
  { claves: ['templado', 'selva', 'humedo', 'cafetero', 'cafe'], nombre: 'la selva húmeda', a: '#7fae5f', b: '#2c5a33' },
  { claves: ['calido', 'bosque seco', 'bosque_seco', 'seco'], nombre: 'el bosque seco', a: '#e8c675', b: '#8a6a33' },
  { claves: ['playa', 'mar', 'palomino', 'costa', 'litoral'], nombre: 'Palomino', a: '#8fd0d8', b: '#2a7c8f' },
];

const PISO_DEFAULT = { nombre: 'su destino', a: '#f2c063', b: '#1d4030' };

function normaliza(texto) {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Piso desconocido → tinte cálido neutro (nunca revienta). */
function resolverPiso(pisoDestino) {
  const p = normaliza(pisoDestino);
  if (!p) return PISO_DEFAULT;
  const hallado = PISOS.find((piso) => piso.claves.some((c) => p.includes(c)));
  return hallado || PISO_DEFAULT;
}

/* ----------------------------- tween de cámara --------------------------- */

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/* --------------------------------- CSS ----------------------------------- */
/* Embebido (el componente es un solo archivo nuevo): solo transform/opacity
 * en lo caliente (compositor). La cobertura de pantalla la garantiza la
 * opacidad de la columna de bandas entre el 30% y el 70% de las keyframes —
 * holgura amplia alrededor de la meseta 45%–55% del contrato. */

const CSS = `
.tsm {
  position: fixed;
  inset: 0;
  z-index: 46; /* sobre el velo original (z 40) y el kit (z 44) */
  pointer-events: none;
  overflow: hidden;
}

/* Columna-transecto de la Sierra (300vh): nieve arriba → mar de Palomino
 * abajo, con la franja blanda del bosque de niebla baked en un segundo
 * gradiente. Bajar la ladera = la columna sube ante la cámara. */
.tsm__bandas {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 300vh;
  opacity: 0;
  background:
    linear-gradient(180deg,
      rgba(255, 255, 255, 0) 40%,
      rgba(255, 255, 255, 0.38) 46%,
      rgba(255, 255, 255, 0.55) 50%,
      rgba(255, 255, 255, 0.38) 54%,
      rgba(255, 255, 255, 0) 60%),
    linear-gradient(180deg,
      #f2f7fa 0%, #dfe9ef 6%,
      #aebfc0 12%, #8b9a92 19%,
      #b8b076 27%, #7d7f4e 35%,
      #5d7f6b 43%, #35594d 53%,
      #3f7040 63%, #2f5c33 72%,
      #8a6a33 80%, #caa45c 88%,
      #7fc4cd 94%, #2a7c8f 100%);
  animation:
    tsm-cubre var(--tsm-ms) ease-in-out both,
    tsm-desciende var(--tsm-ms) cubic-bezier(0.55, 0, 0.35, 1) both;
  will-change: transform, opacity;
}

.tsm[data-direccion='subir'] .tsm__bandas {
  animation-name: tsm-cubre, tsm-asciende;
  animation-timing-function: ease-in-out, cubic-bezier(0.4, 0, 0.3, 1);
}

@keyframes tsm-cubre {
  0% { opacity: 0; }
  30%, 70% { opacity: 1; }
  100% { opacity: 0; }
}

/* Recorrido: con -200vh el borde inferior de la columna queda en 100vh, así
 * la pantalla sigue tapada por bandas durante toda la meseta. */
@keyframes tsm-desciende {
  0% { transform: translateY(0); }
  100% { transform: translateY(-200vh); }
}

@keyframes tsm-asciende {
  0% { transform: translateY(-200vh); }
  100% { transform: translateY(0); }
}

/* Beat de llegada: velo radial con el tinte del piso destino que respira en
 * la meseta — el "ya llegó" antes de revelar el diorama. */
.tsm__tinte {
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 120% at 50% 45%, var(--tsm-a) 0%, var(--tsm-b) 82%);
  opacity: 0;
  animation: tsm-beat var(--tsm-ms) ease-in-out both;
  will-change: opacity;
}

@keyframes tsm-beat {
  0%, 28% { opacity: 0; }
  45%, 58% { opacity: 0.85; }
  76%, 100% { opacity: 0; }
}

/* Nubes de la franja de niebla en paralaje (adorno tier alto/medio):
 * cruzan más rápido que las bandas — capa cercana del descenso. */
.tsm__nube {
  position: absolute;
  left: 50%;
  width: 72vw;
  height: 24vh;
  margin-left: -36vw;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0));
  opacity: 0;
  animation: tsm-nube calc(var(--tsm-ms) * 0.55) cubic-bezier(0.3, 0, 0.6, 1) both;
  will-change: transform, opacity;
}

.tsm__nube--2 {
  width: 54vw;
  margin-left: -20vw;
  animation-delay: calc(var(--tsm-ms) * 0.16);
}

.tsm__nube--3 {
  width: 62vw;
  margin-left: -44vw;
  animation-delay: calc(var(--tsm-ms) * 0.3);
}

.tsm[data-direccion='subir'] .tsm__nube {
  animation-direction: reverse;
}

@keyframes tsm-nube {
  0% { transform: translateY(112vh) scale(0.8); opacity: 0; }
  22% { opacity: 0.9; }
  100% { transform: translateY(-46vh) scale(1.3); opacity: 0; }
}

/* Viñeta de velocidad (adorno): oscurece bordes durante el tramo rápido. */
.tsm__vineta {
  position: absolute;
  inset: 0;
  background: radial-gradient(90% 90% at 50% 50%, rgba(0, 0, 0, 0) 55%, rgba(8, 20, 24, 0.55) 100%);
  opacity: 0;
  animation: tsm-vineta var(--tsm-ms) ease-in-out both;
  will-change: opacity;
}

@keyframes tsm-vineta {
  0%, 8% { opacity: 0; }
  28%, 66% { opacity: 0.75; }
  88%, 100% { opacity: 0; }
}

/* Destello de llegada (solo tier alto): rompe las nubes justo en la mitad. */
.tsm__destello {
  position: absolute;
  left: 50%;
  top: 45%;
  width: 90vmax;
  height: 90vmax;
  margin: -45vmax 0 0 -45vmax;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(255, 250, 236, 0.95), rgba(255, 250, 236, 0));
  opacity: 0;
  animation: tsm-destello var(--tsm-ms) ease-out both;
  will-change: transform, opacity;
}

@keyframes tsm-destello {
  0%, 40% { opacity: 0; transform: scale(0.55); }
  50% { opacity: 0.9; transform: scale(1); }
  66%, 100% { opacity: 0; transform: scale(1.3); }
}

.tsm__txt {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 12vh;
  margin: 0;
  text-align: center;
  color: #fdf8ec;
  font-size: 0.95rem;
  letter-spacing: 0.02em;
  text-shadow: 0 1px 8px rgba(10, 24, 20, 0.65);
  opacity: 0;
  animation: tsm-txt var(--tsm-ms) ease-in-out both;
}

@keyframes tsm-txt {
  0%, 12% { opacity: 0; }
  32%, 68% { opacity: 1; }
  90%, 100% { opacity: 0; }
}

/* ------------------- reduced motion = corte con fade -------------------- */
/* Via prop: cubierta YA opaca (el swap de mitad ocurre bajo tapa) que se
 * desvanece corto sobre la escena nueva. */
.tsm__corte {
  position: absolute;
  inset: 0;
  background: var(--tsm-b);
  animation: tsm-corte var(--tsm-ms) linear both;
}

@keyframes tsm-corte {
  0%, 62% { opacity: 1; }
  100% { opacity: 0; }
}

/* Red de seguridad si el host no pasó la prop pero el sistema pide calma. */
@media (prefers-reduced-motion: reduce) {
  .tsm__bandas,
  .tsm__nube,
  .tsm__tinte,
  .tsm__destello,
  .tsm__vineta,
  .tsm__txt {
    display: none;
  }

  .tsm::after {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--tsm-b);
    animation: tsm-corte var(--tsm-ms) linear both;
  }
}
`;

/* ------------------------------ componente ------------------------------- */

export default function TransicionSierraMundo({
  activa = false,
  direccion = 'bajar',
  pisoDestino = '',
  tier = 'medio',
  reducedMotion = false,
  onMitad,
  onFin,
  camaraRef = null,
  caidaCamara = 1.4,
  colorA,
  colorB,
  etiqueta,
}) {
  const mitadRef = useRef(onMitad);
  const finRef = useRef(onFin);
  // Refs "última versión": se actualizan en un effect (no en render) para que
  // los timers llamen siempre al callback más fresco sin re-armarse.
  useEffect(() => {
    mitadRef.current = onMitad;
    finRef.current = onFin;
  });

  // Contrato temporal: timers deterministas, cada callback a lo sumo una vez.
  useEffect(() => {
    if (!activa) return undefined;
    const total = duracionViaje(tier, reducedMotion);
    let hechoMitad = false;
    let hechoFin = false;
    const tMitad = setTimeout(() => {
      if (!hechoMitad) {
        hechoMitad = true;
        mitadRef.current?.();
      }
    }, Math.round(total * MITAD_FRAC));
    const tFin = setTimeout(() => {
      if (!hechoFin) {
        hechoFin = true;
        finRef.current?.();
      }
    }, total);
    return () => {
      hechoMitad = true;
      hechoFin = true;
      clearTimeout(tMitad);
      clearTimeout(tFin);
    };
  }, [activa, direccion, tier, reducedMotion]);

  // Tween de cámara OPCIONAL: dolly vertical + push/pull de FOV solo durante
  // la fase de cubierta; al terminar (o abortar) restaura pos/fov iniciales —
  // el intercambio de escena ocurre bajo tapa y la cámara vuelve intacta.
  useEffect(() => {
    if (!activa || reducedMotion || !camaraRef) return undefined;
    const cam = camaraRef.current;
    if (!cam || !cam.position || typeof cam.position.y !== 'number') return undefined;

    const dur = Math.round(duracionViaje(tier, false) * MITAD_FRAC);
    const y0 = cam.position.y;
    const fov0 = typeof cam.fov === 'number' ? cam.fov : null;
    const baja = direccion !== 'subir';
    const proyecta = () => {
      if (typeof cam.updateProjectionMatrix === 'function') cam.updateProjectionMatrix();
    };
    const restaura = () => {
      cam.position.y = y0;
      if (fov0 != null) {
        cam.fov = fov0;
        proyecta();
      }
    };

    let raf = 0;
    let inicio = 0;
    const paso = (ts) => {
      if (!inicio) inicio = ts;
      const t = Math.min(1, (ts - inicio) / dur);
      if (t >= 1) {
        restaura(); // pantalla cubierta: nadie ve el salto de vuelta
        return;
      }
      const e = easeInOutCubic(t);
      cam.position.y = y0 + (baja ? -1 : 1) * caidaCamara * e;
      if (fov0 != null) {
        // bajar = push-in (se clava ladera abajo); subir = pull-out (respira).
        cam.fov = fov0 * (1 + (baja ? -0.14 : 0.1) * e);
        proyecta();
      }
      raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);

    return () => {
      cancelAnimationFrame(raf);
      restaura();
    };
  }, [activa, direccion, tier, reducedMotion, camaraRef, caidaCamara]);

  if (!activa) return null;

  const piso = resolverPiso(pisoDestino);
  const total = duracionViaje(tier, reducedMotion);
  const conAdornos = tier !== 'bajo' && !reducedMotion;
  const baja = direccion !== 'subir';
  const texto =
    etiqueta ?? (baja ? `Descendiendo a ${piso.nombre}…` : 'Subiendo a la Sierra…');

  return (
    <div
      className="tsm"
      data-direccion={baja ? 'bajar' : 'subir'}
      data-tier={tier}
      data-reducida={reducedMotion ? '1' : '0'}
      style={{
        '--tsm-a': colorA ?? piso.a,
        '--tsm-b': colorB ?? piso.b,
        '--tsm-ms': `${total}ms`,
      }}
      role="status"
      aria-live="polite"
      data-testid="tsm"
    >
      <style>{CSS}</style>

      {reducedMotion ? (
        <div className="tsm__corte" aria-hidden="true" />
      ) : (
        <>
          <div className="tsm__bandas" aria-hidden="true" />
          {conAdornos && (
            <>
              <div className="tsm__nube tsm__nube--1" aria-hidden="true" />
              <div className="tsm__nube tsm__nube--2" aria-hidden="true" />
              <div className="tsm__nube tsm__nube--3" aria-hidden="true" />
              <div className="tsm__vineta" aria-hidden="true" />
            </>
          )}
          <div className="tsm__tinte" aria-hidden="true" />
          {tier === 'alto' && <div className="tsm__destello" aria-hidden="true" />}
          <p className="tsm__txt">{texto}</p>
        </>
      )}
    </div>
  );
}
