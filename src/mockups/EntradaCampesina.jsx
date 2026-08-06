/* eslint-disable chagra-i18n/no-hardcoded-spanish --
 * MOCKUP DEV (#/mockups/entrada-campesina): copy de muestra en español de
 * Colombia (usted) para decidir la ENTRADA DEFINITIVA. No es UI de producción;
 * si se adopta, sus textos migran a src/config/messages.js (ADR-050). */
/**
 * EntradaCampesina.jsx — MOCKUP DEV · LA ENTRADA DEFINITIVA "campesina"
 * (#/mockups/entrada-campesina, sin gate ni sesión — datos de muestra).
 *
 * Concepto: "EL LUCERO DE MI FINCA".
 *   La entrada RESPIRA la hora real de la vereda (como Apple Weather: cielo,
 *   sol/luna y color cambian con el reloj y las efemérides — se reusa el núcleo
 *   `skyEphemeris`). La finca es un COMPAÑERO VIVO (como Finch: su horizonte
 *   late con el corazón-semilla y su fauna vuela de día). Y —regla de oro
 *   (como Duolingo)— UNA SOLA cosa brilla: EL LUCERO DEL DÍA = la cosa que hay
 *   que hacer hoy. Todo lo demás es paisaje calmo.
 *
 * Jerarquía para un usuario rural (los 4 sí-o-sí, con un solo pulgar, de
 * arriba a abajo), fiel al DR-ENTRADA-DEFINITIVA-2026-07-10 (§3):
 *   0. HORIZONTE VIVO — ancla emocional "esa es mi finca": cielo real de la
 *      hora + saludo + PULSO VITAL de un vistazo (matas, agua, clima) =
 *      SÍ-O-SÍ #4 (estado de cultivos/clima), sin dashboard, sin cifras frías.
 *   1. EL LUCERO DEL DÍA — lo primero grande y LO ÚNICO que brilla: una acción
 *      clara = SÍ-O-SÍ #1 (qué hacer HOY / alerta del día). Se puede escuchar.
 *   2. EL AGENTE — la puerta de voz, grande y al alcance del pulgar (el
 *      corazón-semilla que late) = SÍ-O-SÍ #3. Con "Anote su día" al lado.
 *   3. LOS MUNDOS — puertas ilustradas, bellas y claras (6 mundos reales +
 *      "Todos los mundos") = SÍ-O-SÍ #2. Nunca una parrilla de 15.
 *   4. Pie discreto: ayuda y perfil.
 *
 * Stack (DR dirección #1): SVG + CSS como núcleo (reusa `src/visual/effects`:
 * latido `vfx-beat`, velo, viñeta, scrim, `GlowFilter`; y la fauna de
 * `src/visual/creatures`: Colibrí, Abeja angelita, Mariposa que vuelan en la
 * escena) + UNA capa Canvas 2D para el "aire vivo" (cocuyos de noche / motas
 * doradas de día), CAPADA por `prefers-reduced-motion` y por gama de equipo.
 * Cero Three/WebGL/deps nuevas. Offline-trivial. Español de Colombia (usted).
 *
 * Es un MOCKUP HONESTO: los toques muestran "aquí se abre X" y NO navegan.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { solarTimes } from '../utils/skyEphemeris';
import { GlowFilter } from '../visual/effects';
import { Colibri, AbejaAngelita, Mariposa } from '../visual/creatures';
import '../visual/effects/effects.css';
import '../visual/creatures/creatures.css';
import './entrada-campesina.css';

// ── Vereda de muestra (los reales saldrían del perfil) ────────────────────────
// Guatoc / oriente de Cundinamarca ≈ 4.5°N, tierra fría de montaña.
const FINCA = {
  nombre: 'María',
  vereda: 'Vereda El Hato',
  msnm: 2000,
  lat: 4.53,
  lon: -73.92,
};

// ── Datos de muestra: el ESTADO VIVO de la finca (nunca inventado en prod) ────
const ESTADO = {
  matas: 14, // matas sembradas y vivas
  agua: 'Llovió ayer', // último evento de agua, en cristiano
  climaDia: { emoji: '⛅', frase: 'Sol con nubes', luego: 'Por la tarde puede llover' },
  climaNoche: { emoji: '🌧️', frase: 'Llovizna suave', luego: 'Mañana amanece despejado' },
};

// ── EL LUCERO DEL DÍA: la ÚNICA cosa que brilla (la acción/alerta de hoy) ──────
const LUCERO = {
  titulo: 'Hoy en su finca',
  // Una sola frase, en cristiano. Es la alerta O el siguiente paso, nunca las dos.
  frase: 'Va a llover en la tarde. Guarde el café que tiene secando y revise el desagüe de la era del tomate.',
  accion: 'Ver qué hacer',
};

// ── Los MUNDOS reales (curados: 6 + "todos", nunca 15) ────────────────────────
// id/título/emoji/lema/tinte tomados de src/components/dashboard/mundosFinca.js.
// tinte = [acento fuerte, fondo suave] — la "paleta de tierra" propia del mundo.
const MUNDOS = [
  { id: 'cultivos', nombre: 'Mis matas', lema: 'Qué sembrar y cómo van', emoji: '🌾', tinte: ['#3f8f4e', '#e7f1d6'], glifo: 'mata' },
  { id: 'sanidad', nombre: 'Sanidad', lema: 'Plagas y remedios sin veneno', emoji: '🐞', tinte: ['#b0532f', '#f6ded1'], glifo: 'hoja' },
  { id: 'clima', nombre: 'El clima', lema: 'Lo que viene y qué hacer', emoji: '⛅', tinte: ['#3f7fa0', '#dce9f2'], glifo: 'nube' },
  { id: 'suelo', nombre: 'El suelo', lema: 'Conozca y alimente su tierra', emoji: '🌱', tinte: ['#8a5a38', '#f0e2c8'], glifo: 'terron' },
  { id: 'animales', nombre: 'Animales', lema: 'Gallinas, cerdos y más', emoji: '🐔', tinte: ['#a86a3a', '#f3e3cf'], glifo: 'ave' },
  { id: 'mercado', nombre: 'Vender', lema: 'Venda directo y transforme', emoji: '🧺', tinte: ['#b98a2f', '#f7ecd2'], glifo: 'canasto' },
];

/* Glifos dibujados a mano (trazo redondo, hereda el color del tinte via
   currentColor). Semi-abstractos y legibles al sol; el emoji + el nombre + la
   voz los acompañan (redundancia ícono·texto·voz del DR §3.2). */
function GlifoMundo({ tipo }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (tipo) {
    case 'mata':
      return (<><path {...p} d="M12 21V11" /><path {...p} d="M12 13C9 13 6.5 11 6.5 8 9.5 8 12 10 12 13Z" /><path {...p} d="M12 12c0-3 2.5-5 5.5-5 0 3-2.5 5-5.5 5Z" /><path {...p} d="M8 21h8" /></>);
    case 'hoja':
      return (<><path {...p} d="M5 19C5 11 11 5 19 5c0 8-6 14-14 14Z" /><path {...p} d="M8 16 16 8" /><circle cx="10.5" cy="13.5" r="1.1" fill="currentColor" stroke="none" /><circle cx="14" cy="10" r="1.1" fill="currentColor" stroke="none" /></>);
    case 'nube':
      return (<><path {...p} d="M8 15a3.5 3.5 0 0 1 .3-6.98A5 5 0 0 1 18 9.2 3.4 3.4 0 0 1 17.5 16Z" /><path {...p} d="M9 19.5l-.6 1.5M13 19.5l-.6 1.5M17 19.5l-.6 1.5" /></>);
    case 'terron':
      return (<><path {...p} d="M4 15c2-1.5 4-1.5 6 0s4 1.5 6 0 3-1 4 0v4H4Z" /><path {...p} d="M9 12V7M9 7 7 8.5M9 7l2 1.5" /><path {...p} d="M15 12V9" /></>);
    case 'ave':
      return (<><path {...p} d="M9 20c-3 0-5-2-5-5s2-6 6-6c3 0 4 2 6 2 2 0 3-1 4-2 .5 3-1 5-3 5" /><path {...p} d="M9 20h5" /><circle cx="15.5" cy="8.5" r="0.9" fill="currentColor" stroke="none" /><path {...p} d="M18.5 8.5 21 7.5" /></>);
    case 'canasto':
      return (<><path {...p} d="M5 10h14l-1.2 9H6.2Z" /><path {...p} d="M8 10c0-3 1.8-5 4-5s4 2 4 5" /><path {...p} d="M5 13h14M10 10l-.6 9M14 10l.6 9" /></>);
    default:
      return null;
  }
}

// ── Franja del día a partir de la hora REAL + efemérides de la vereda ──────────
// Se reusa solarTimes() de src/utils/skyEphemeris.js (offline, sin deps): la
// entrada respira el SOL REAL del lugar (amanecer/día/tarde-dorada/noche) en vez
// de un corte fijo hora>=18. Como Apple Weather: es ancla de veracidad, no
// decoración inventada. Si el algoritmo no da bordes (polar), cae a corte fijo.
const MIN = 60 * 1000;
function franjaDeLaHora(now, lat, lon) {
  const { sunrise, sunset } = solarTimes(now, lat, lon);
  if (!sunrise || !sunset) {
    const H = now.getHours() + now.getMinutes() / 60;
    return H < 6.5 ? 'amanecer' : H < 17 ? 'dia' : H < 18.8 ? 'tarde' : 'noche';
  }
  const t = now.getTime();
  const sr = sunrise.getTime();
  const ss = sunset.getTime();
  if (t < sr - 30 * MIN || t > ss + 25 * MIN) return 'noche';
  if (t < sr + 90 * MIN) return 'amanecer'; // primera hora y media de sol
  if (t > ss - 90 * MIN) return 'tarde'; // hora dorada antes del ocaso
  return 'dia';
}

function saludoPorHora(h) {
  if (h >= 5 && h < 12) return 'Buenos días';
  if (h >= 12 && h < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

/* Capa Canvas 2D — el "aire vivo" (cocuyos de noche / motas doradas de día).
   CAPADA con dureza: apagada bajo prefers-reduced-motion y en equipos de gama
   baja (pocos núcleos / poca RAM) → fotograma estático digno. Pausa cuando la
   pestaña no está visible (batería). "cero JS por frame" es la regla de la casa
   para SVG/CSS; el Canvas es LA excepción que el DR autoriza, por eso se capa. */
function FincaAmbiente({ franja }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const cores = navigator.hardwareConcurrency || 4;
    const mem = navigator.deviceMemory || 4;
    const gamaBaja = cores <= 4 || mem <= 2;

    const esNoche = franja === 'noche';
    // Densidad de partículas por gama; de noche cocuyos, de día motas doradas.
    const N = gamaBaja ? 10 : esNoche ? 26 : 18;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let W = 0;
    let Hh = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const parent = canvas.parentElement;

    const sized = () => {
      const r = parent.getBoundingClientRect();
      W = Math.max(1, r.width);
      Hh = Math.max(1, r.height);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(Hh * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${Hh}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    sized();

    // Semillas de las partículas.
    const rnd = (a, b) => a + Math.random() * (b - a);
    const parts = Array.from({ length: N }, () => ({
      x: rnd(0, W),
      y: rnd(0, Hh),
      r: esNoche ? rnd(0.8, 2.0) : rnd(0.6, 1.6),
      vx: rnd(-0.12, 0.12),
      vy: esNoche ? rnd(-0.18, -0.04) : rnd(-0.06, 0.04),
      ph: rnd(0, Math.PI * 2),
      sp: rnd(0.6, 1.6),
    }));

    const dibujo = (t) => {
      ctx.clearRect(0, 0, W, Hh);
      for (const q of parts) {
        const tw = 0.55 + 0.45 * Math.sin(t * 0.001 * q.sp + q.ph); // titileo
        const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.r * 4);
        if (esNoche) {
          g.addColorStop(0, `rgba(255,229,140,${0.9 * tw})`); // cocuyo cálido
          g.addColorStop(0.4, `rgba(180,255,180,${0.35 * tw})`);
          g.addColorStop(1, 'rgba(180,255,180,0)');
        } else {
          g.addColorStop(0, `rgba(255,238,190,${0.55 * tw})`); // mota dorada
          g.addColorStop(1, 'rgba(255,238,190,0)');
        }
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.r * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    // Reduced-motion o gama muy baja: UN fotograma estático y quieto.
    if (reduce) {
      dibujo(0);
      const ro = new ResizeObserver(() => { sized(); dibujo(0); });
      ro.observe(parent);
      return () => ro.disconnect();
    }

    let raf = 0;
    let corriendo = true;
    const paso = (t) => {
      if (!corriendo) return;
      for (const q of parts) {
        q.x += q.vx;
        q.y += q.vy;
        if (q.y < -6) { q.y = Hh + 6; q.x = rnd(0, W); }
        if (q.y > Hh + 6) { q.y = -6; q.x = rnd(0, W); }
        if (q.x < -6) q.x = W + 6;
        if (q.x > W + 6) q.x = -6;
      }
      dibujo(t);
      raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);

    const onVis = () => {
      if (document.hidden) { corriendo = false; cancelAnimationFrame(raf); }
      else if (!corriendo) { corriendo = true; raf = requestAnimationFrame(paso); }
    };
    document.addEventListener('visibilitychange', onVis);
    const ro = new ResizeObserver(() => sized());
    ro.observe(parent);

    return () => {
      corriendo = false;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
      ro.disconnect();
    };
  }, [franja]);

  return <canvas ref={ref} className="ec-ambiente" aria-hidden="true" />;
}

/* EL HORIZONTE VIVO — la silueta de la finca bajo el cielo de la hora real.
   SVG + CSS (reusa GlowFilter, vfx-beat, veil/scrim). Montaña de páramo con
   frailejones, casita, milpa en surcos y un árbol; el corazón-semilla late bajo
   la tierra. De día vuela la fauna real (Colibrí, Abeja angelita, Mariposa);
   de noche descansa y aparecen los cocuyos (Canvas). aria-hidden: es ambiente,
   el saludo y el pulso vital de al lado narran el estado en texto. */
function HorizonteVivo({ franja }) {
  const esNoche = franja === 'noche';
  const esDorada = franja === 'amanecer' || franja === 'tarde';

  return (
    <svg className="ec-horizonte" viewBox="0 0 390 220" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <GlowFilter id="ec-glow" std={2.4} blurId="ec-blur" blurStd={4} />
        <linearGradient id="ec-monte" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--ec-monte-a)" />
          <stop offset="1" stopColor="var(--ec-monte-b)" />
        </linearGradient>
        <linearGradient id="ec-tierra" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--ec-suelo-a)" />
          <stop offset="1" stopColor="var(--ec-suelo-b)" />
        </linearGradient>
        <radialGradient id="ec-astro" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="var(--ec-astro-a)" />
          <stop offset="0.6" stopColor="var(--ec-astro-b)" />
          <stop offset="1" stopColor="var(--ec-astro-b)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* astro real de la hora: sol de día / luna de noche */}
      <g className="ec-astro-wrap">
        <circle cx="312" cy="52" r="46" fill="url(#ec-astro)" className="ec-astro-halo" />
        <circle cx="312" cy="52" r="17" fill="var(--ec-astro-core)" filter="url(#ec-glow)" />
        {esNoche && (
          <circle cx="305" cy="47" r="14" fill="var(--ec-cielo-b)" /> /* sombra de luna */
        )}
      </g>

      {/* silueta lejana del páramo con frailejones */}
      <path fill="var(--ec-monte-lejos)" d="M0 118 L46 92 L92 108 L150 78 L210 104 L270 74 L330 100 L390 84 L390 220 L0 220 Z" />
      <g className="ec-frailejones" fill="var(--ec-monte-lejos)" opacity="0.9">
        <path d="M150 78 q-4 -14 0 -26 q4 12 0 26Z" />
        <path d="M270 74 q-4 -14 0 -26 q4 12 0 26Z" />
      </g>

      {/* monte cercano */}
      <path fill="url(#ec-monte)" d="M0 150 L70 120 L140 142 L220 116 L300 140 L390 122 L390 220 L0 220 Z" />

      {/* tierra de la finca */}
      <rect x="0" y="168" width="390" height="52" fill="url(#ec-tierra)" />
      {/* surcos de la milpa */}
      <g stroke="var(--ec-surco)" strokeWidth="2" strokeLinecap="round" opacity="0.55">
        <path d="M18 208 L60 182" /><path d="M52 210 L92 184" /><path d="M92 208 L128 184" />
      </g>

      {/* corazón-semilla que late bajo la tierra (el pulso de la finca viva) */}
      <g transform="translate(196 196)">
        <circle className="vfx-beat-wave" r="10" fill="none" stroke="var(--ec-corazon)" strokeWidth="1.4" opacity="0.5" />
        <circle className="vfx-beat" r="5.5" fill="var(--ec-corazon)" filter="url(#ec-glow)" />
      </g>

      {/* casita de la finca */}
      <g transform="translate(300 150)">
        <path fill="var(--ec-casa)" d="M0 18 L18 4 L36 18 L36 40 L0 40 Z" />
        <path fill="var(--ec-casa-techo)" d="M-3 19 L18 2 L39 19 Z" />
        <rect x="14" y="26" width="8" height="14" fill="var(--ec-casa-puerta)" />
        {esNoche && <rect x="4" y="24" width="6" height="6" fill="var(--ec-ventana)" filter="url(#ec-glow)" />}
      </g>

      {/* un árbol de la finca */}
      <g transform="translate(58 138)">
        <rect x="-2.5" y="18" width="5" height="20" rx="2" fill="var(--ec-tronco)" />
        <circle cx="0" cy="12" r="16" fill="var(--ec-copa)" />
        <circle cx="-11" cy="18" r="10" fill="var(--ec-copa)" />
        <circle cx="11" cy="18" r="10" fill="var(--ec-copa)" />
      </g>

      {/* fauna viva: solo de día/hora dorada (de noche descansa) */}
      {!esNoche && (
        <>
          <g className="ec-vuela ec-vuela-colibri">
            <Colibri inline size={0} animated title="" />
          </g>
          <g className="ec-vuela ec-vuela-abeja">
            <AbejaAngelita inline size={0} animated title="" />
          </g>
          {esDorada && (
            <g className="ec-vuela ec-vuela-mariposa">
              <Mariposa inline size={0} animated title="" />
            </g>
          )}
        </>
      )}

      {/* scrim inferior para que el texto de arriba SIEMPRE lea sobre la escena */}
      <rect className="ec-scrim" x="0" y="150" width="390" height="70" fill="url(#ec-scrim-grad)" pointerEvents="none" />
      <linearGradient id="ec-scrim-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="var(--ec-scrim)" stopOpacity="0" />
        <stop offset="1" stopColor="var(--ec-scrim)" stopOpacity="0.42" />
      </linearGradient>
    </svg>
  );
}

export default function EntradaCampesina({ onBack }) {
  // Franja real por defecto (se puede forzar desde la barra del mockup).
  const [franja, setFranja] = useState(() => franjaDeLaHora(new Date(), FINCA.lat, FINCA.lon));
  const [aviso, setAviso] = useState(null);
  const avisoTimer = useRef(null);

  const esNoche = franja === 'noche';
  const clima = esNoche ? ESTADO.climaNoche : ESTADO.climaDia;
  const horaSaludo = franja === 'amanecer' ? 7 : franja === 'dia' ? 11 : franja === 'tarde' ? 18 : 20;
  const saludo = `${saludoPorHora(horaSaludo)}, ${FINCA.nombre}`;

  const avisar = (t) => {
    setAviso(t);
    if (avisoTimer.current) clearTimeout(avisoTimer.current);
    avisoTimer.current = setTimeout(() => setAviso(null), 2800);
  };
  useEffect(() => () => { if (avisoTimer.current) clearTimeout(avisoTimer.current); }, []);

  // 🔊 Escuchar toda la entrada (baja alfabetización / manos ocupadas).
  const textoLectura = useMemo(
    () => `${saludo}. Su finca: tiene ${ESTADO.matas} matas sembradas, ${ESTADO.agua.toLowerCase()}, `
      + `${clima.frase.toLowerCase()}, ${clima.luego.toLowerCase()}. `
      + `Lo del día: ${LUCERO.frase} `
      + 'Puede preguntarle a Chagra con su voz, anotar su día, o entrar a los mundos de su finca.',
    [saludo, clima],
  );
  const escuchar = () => {
    try {
      const u = new SpeechSynthesisUtterance(textoLectura);
      u.lang = 'es-CO';
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (_) {
      avisar('Aquí Chagra le lee la pantalla en voz alta.');
    }
  };

  return (
    <div className="ec" data-franja={franja} data-testid="mockup-entrada-campesina">
      {/* ── Barra del mockup (NO es parte del diseño propuesto) ── */}
      <div className="ec-mockbar">
        {typeof onBack === 'function' && (
          <button type="button" className="ec-mockchip" onClick={onBack}>← Salir</button>
        )}
        <div className="ec-mockfranjas" role="group" aria-label="Hora del mockup">
          {[
            ['amanecer', '🌅 Amanecer'],
            ['dia', '☀️ Día'],
            ['tarde', '🌇 Tarde'],
            ['noche', '🌙 Noche'],
          ].map(([id, txt]) => (
            <button
              key={id}
              type="button"
              className={`ec-mockchip ${franja === id ? 'on' : ''}`}
              aria-pressed={franja === id}
              onClick={() => setFranja(id)}
            >
              {txt}
            </button>
          ))}
        </div>
      </div>

      <main className="ec-shell">
        {/* ── 0. HORIZONTE VIVO + saludo + PULSO VITAL (estado/clima de un vistazo) ── */}
        <header className="ec-cielo">
          <div className="ec-escena">
            <HorizonteVivo franja={franja} />
            <FincaAmbiente franja={franja} />
          </div>

          <div className="ec-cielo-txt">
            <p className="ec-lugar">{FINCA.vereda} · {FINCA.msnm.toLocaleString('es-CO')} msnm</p>
            <h1 className="ec-saludo">{saludo}</h1>

            {/* Pulso vital: el estado vivo, glanceable, nunca un tablero de cifras */}
            <ul className="ec-pulso" aria-label="Cómo está su finca ahora">
              <li><span className="ec-pulso-ico" aria-hidden="true">🌱</span> {ESTADO.matas} matas vivas</li>
              <li><span className="ec-pulso-ico" aria-hidden="true">💧</span> {ESTADO.agua}</li>
              <li><span className="ec-pulso-ico" aria-hidden="true">{clima.emoji}</span> {clima.frase}</li>
            </ul>

            <button type="button" className="ec-escuchar" onClick={escuchar}>
              🔊 Escuchar mi finca
            </button>
          </div>
        </header>

        {/* ── 1. EL LUCERO DEL DÍA — lo primero, grande, LO ÚNICO que brilla ── */}
        <section className="ec-lucero" aria-label="Lo del día en su finca">
          <span className="ec-lucero-astro" aria-hidden="true">
            <span className="ec-lucero-halo" />
            <span className="ec-lucero-halo ec-lucero-halo2" />
            <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
              <path fill="#3a2a08" d="M12 2l2.2 6.6H21l-5.4 4 2 6.6L12 15.4 6.4 19.2l2-6.6L3 8.6h6.8Z" />
            </svg>
          </span>
          <div className="ec-lucero-txt">
            <p className="ec-lucero-tit">{LUCERO.titulo}</p>
            <p className="ec-lucero-frase">{LUCERO.frase}</p>
          </div>
          <div className="ec-lucero-pie">
            <button
              type="button"
              className="ec-lucero-btn"
              data-testid="ec-lucero"
              onClick={() => avisar('Aquí se abren los pasos de hoy, con dibujos y en voz.')}
            >
              {LUCERO.accion}
            </button>
            <button
              type="button"
              className="ec-lucero-oir"
              aria-label="Escuchar lo del día"
              onClick={escuchar}
            >
              🔊
            </button>
          </div>
        </section>

        {/* ── 2. EL AGENTE — la puerta de voz, grande y al alcance del pulgar ── */}
        <div className="ec-acciones">
          <button
            type="button"
            className="ec-preguntar"
            data-testid="ec-preguntar"
            onClick={() => avisar('Aquí se abre el agente: usted habla y Chagra le contesta.')}
          >
            <span className="ec-corazon" aria-hidden="true">
              <span className="ec-corazon-onda" />
              <svg viewBox="0 0 24 24" width="30" height="30" fill="none" aria-hidden="true">
                <rect x="9" y="2.5" width="6" height="11.5" rx="3" fill="#0f2408" />
                <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" stroke="#0f2408" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </span>
            <span className="ec-preguntar-txt">
              <b>Pregunte</b>
              <small>Toque y hable. Chagra le contesta.</small>
            </span>
          </button>

          <button
            type="button"
            className="ec-anotar"
            data-testid="ec-anotar"
            onClick={() => avisar('Aquí se abre Registrar: cuente qué hizo, por voz o a mano.')}
          >
            <span className="ec-anotar-ico" aria-hidden="true">✍️</span>
            <span className="ec-anotar-txt"><b>Anote su día</b></span>
          </button>
        </div>

        {/* ── 3. LOS MUNDOS — puertas ilustradas, bellas y claras ── */}
        <h2 className="ec-tit">Los mundos de su finca</h2>
        <nav className="ec-mundos" aria-label="Los mundos de su finca">
          {MUNDOS.map((m) => (
            <button
              key={m.id}
              type="button"
              className="ec-mundo"
              style={{ '--m-a': m.tinte[0], '--m-b': m.tinte[1] }}
              data-testid={`ec-mundo-${m.id}`}
              aria-label={`${m.nombre}: ${m.lema}`}
              onClick={() => avisar(`Aquí se abre el mundo "${m.nombre}": ${m.lema.toLowerCase()}.`)}
            >
              <span className="ec-mundo-medalla" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="30" height="30"><GlifoMundo tipo={m.glifo} /></svg>
              </span>
              <span className="ec-mundo-txt">
                <b>{m.nombre}</b>
                <small>{m.lema}</small>
              </span>
            </button>
          ))}
          <button
            type="button"
            className="ec-mundo ec-mundo-todos"
            data-testid="ec-mundo-todos"
            onClick={() => avisar('Aquí se abren TODOS los mundos de su finca.')}
          >
            <span className="ec-mundo-medalla" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <circle cx="7" cy="7" r="3" /><circle cx="17" cy="7" r="3" /><circle cx="7" cy="17" r="3" /><circle cx="17" cy="17" r="3" />
              </svg>
            </span>
            <span className="ec-mundo-txt"><b>Todos los mundos</b><small>Toda su finca, mundo por mundo</small></span>
          </button>
        </nav>

        {/* ── 4. Pie discreto ── */}
        <div className="ec-pie">
          <button type="button" className="ec-pie-btn" onClick={() => avisar('Aquí se abre la ayuda, paso a paso.')}>
            🙋 Necesito ayuda
          </button>
          <button type="button" className="ec-pie-btn" onClick={() => avisar('Aquí se abre su perfil y su finca.')}>
            👤 Mi perfil
          </button>
        </div>
        <p className="ec-mocknota">MOCKUP · datos de muestra · no navega</p>
      </main>

      {aviso && <div className="ec-aviso" role="status">{aviso}</div>}
    </div>
  );
}
