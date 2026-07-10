/**
 * MontanaMundos.jsx — MOCKUP DEV "La Montaña de los Mundos"
 * (#/mockups/montana-mundos, sin gate ni sesión — datos de muestra).
 *
 * La navegación de Chagra como PAISAJE VERTICAL DE PISOS TÉRMICOS — el modelo
 * mental que el campesino ya usa (café=templado, papa=frío, frailejón=páramo).
 * Referencia: Sierra Nevada de Santa Marta (del río al nevado en una sola
 * montaña). Cada altura contiene la entrada a su mundo: el árbol de mango
 * (cálido) lleva al mundo del mango; el frailejón (páramo) a restauración;
 * el río al agua; el cafetal (templado) al café. Los mundos que no son
 * ecosistema viven como OBJETOS de la escena: la casa → el agente, el troje →
 * la cosecha, el mercado → vender, la luna → el calendario, el corral → los
 * animales.
 *
 * Interacción (decidida con el operador):
 *   - Abre CENTRADO EN LA FINCA del usuario (su piso térmico resaltado, los
 *     demás pisos tenues arriba/abajo). Con un gesto (pellizco hacia adentro
 *     o el botón "Ver toda la montaña") hace zoom-out a la montaña completa.
 *   - Atajo permanente: el botón Ⓐ del agente + "Anotar mi día" SIEMPRE
 *     visibles — ninguna tarea queda detrás de escalar la montaña.
 *   - Afordancia obvia: cada mundo tocable lleva halo que pulsa + etiqueta.
 *
 * TRES DIRECCIONES ARTÍSTICAS conmutables (misma montaña, mismos mundos):
 *   1. Sierra naturalista — pictórica, cálida, luz dorada de montaña.
 *   2. Biopunk — neón orgánico nocturno, coherente con el home en prod;
 *      la red viva (micelio) conecta los pisos.
 *   3. Verde vivo — botánica, luminosa, diurna. El contraste claro.
 *
 * Técnica: SVG + CSS puros (cero deps, cero fotos), prefers-reduced-motion
 * apaga toda la vida de la escena, targets ≥ 48px, español de Colombia
 * (usted). Los toques muestran "aquí se abre X" (mockup honesto: no navega).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import './montana-mundos.css';

// ── Geometría de la escena (unidades del viewBox 390×1440) ──────────────────
const VB_W = 390;
const VB_H = 1440;

// Pisos térmicos de arriba (nevado) a abajo (río). `y0/y1` = franja en el
// viewBox; los msnm son los reales del modelo campesino colombiano.
const PISOS = [
  { id: 'nevado', nombre: 'Nevado', msnm: '4.800 m', y0: 96, y1: 320 },
  { id: 'paramo', nombre: 'Páramo', msnm: '3.500 m', y0: 320, y1: 560 },
  { id: 'frio', nombre: 'Clima frío', msnm: '2.600 m', y0: 560, y1: 800 },
  { id: 'templado', nombre: 'Clima templado', msnm: '1.700 m', y0: 800, y1: 1060, finca: true },
  { id: 'calido', nombre: 'Clima cálido', msnm: '800 m', y0: 1060, y1: 1300 },
  { id: 'rio', nombre: 'El río', msnm: '400 m', y0: 1300, y1: 1440 },
];
const PISO_FINCA = PISOS.findIndex((p) => p.finca);

// Mundos tocables: ancla (x,y) en unidades del viewBox, sobre el dibujo del
// elemento que les da cuerpo en la escena. `abre` = aviso honesto del mockup.
const MUNDOS = [
  { id: 'calendario', x: 316, y: 96, piso: 0, etiqueta: 'Calendario', abre: 'el calendario y el almanaque del campo' },
  { id: 'glaciar', x: 195, y: 228, piso: 0, etiqueta: 'Glaciar', abre: 'los glaciares y el agua de alta montaña' },
  { id: 'restauracion', x: 168, y: 420, piso: 1, etiqueta: 'Restaurar', abre: 'la restauración del páramo y el bosque' },
  { id: 'papa', x: 118, y: 662, piso: 2, etiqueta: 'La papa', abre: 'la papa y los tubérculos' },
  { id: 'animales', x: 272, y: 700, piso: 2, etiqueta: 'Mis animales', abre: 'sus animales: gallinas, vacas, cabras' },
  { id: 'agente', x: 207, y: 896, piso: 3, etiqueta: 'Hablar con Chagra', abre: 'el agente: pregunte con su voz' },
  { id: 'cosecha', x: 296, y: 848, piso: 3, etiqueta: 'Mi cosecha', abre: 'su cosecha guardada en el troje' },
  { id: 'cafe', x: 96, y: 942, piso: 3, etiqueta: 'El café', abre: 'el mundo del café' },
  { id: 'vender', x: 300, y: 986, piso: 3, etiqueta: 'Vender', abre: 'el mercado: precios y ventas' },
  { id: 'mango', x: 92, y: 1136, piso: 4, etiqueta: 'El mango', abre: 'el mundo del mango' },
  { id: 'platano', x: 292, y: 1168, piso: 4, etiqueta: 'El plátano', abre: 'el plátano y el banano' },
  { id: 'rio', x: 190, y: 1372, piso: 5, etiqueta: 'El río', abre: 'el agua, el riego y la pesca' },
];

const DIRECCIONES = [
  { id: 'naturalista', num: 1, corto: 'Sierra', nombre: 'Sierra naturalista', lema: 'luz cálida de montaña' },
  { id: 'biopunk', num: 2, corto: 'Biopunk', nombre: 'Biopunk', lema: 'neón orgánico nocturno, como el home actual' },
  { id: 'verde', num: 3, corto: 'Verde vivo', nombre: 'Verde vivo', lema: 'botánico luminoso de día' },
];

// Transform del zoom: 'finca' encuadra el piso activo (los demás tenues);
// 'montana' encaja la montaña completa en el alto de la pantalla.
function calcularTransform(vp, modo, piso) {
  const escenaH = vp.w * (VB_H / VB_W);
  if (modo === 'montana') {
    // Deja aire para la brújula (arriba) y el botón de zoom (abajo), que
    // tapaban el rótulo de "El río" cuando la montaña llenaba todo el alto.
    const s = Math.min((vp.h - 150) / escenaH, 1);
    return { s, tx: (vp.w - vp.w * s) / 2, ty: 84 };
  }
  const p = PISOS[piso];
  const bandaH = ((p.y1 - p.y0) / VB_H) * escenaH;
  // Tope 1.35: con más acercamiento el piso pierde su ancho (el cafetal y
  // el troje quedaban por fuera de la pantalla) y las etiquetas gigantes.
  const s = Math.max(1, Math.min((vp.h * 0.94) / bandaH, 1.35));
  const cy = (((p.y0 + p.y1) / 2) / VB_H) * escenaH;
  let ty = vp.h / 2 - cy * s;
  ty = Math.max(vp.h - escenaH * s, Math.min(0, ty));
  const tx = (vp.w - vp.w * s) / 2;
  return { s, tx, ty };
}

// ── Piezas de la escena (SVG) ────────────────────────────────────────────────

/** Frailejón: tronco lanudo + roseta que respira. */
function Frailejon({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-3.4" y="-4" width="6.8" height="30" rx="3" className="mm-frailejon-tronco" />
      <g className="mm-frailejon-roseta">
        {[-72, -48, -24, 0, 24, 48, 72].map((a) => (
          <ellipse key={a} cx="0" cy="-16" rx="3.4" ry="14" transform={`rotate(${a} 0 -2)`} className="mm-frailejon-hoja" />
        ))}
        <circle cx="0" cy="-6" r="4.6" className="mm-frailejon-flor" />
      </g>
    </g>
  );
}

/** Mata de café con frutos rojos. */
function MataCafe({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle cx="0" cy="0" r="8" className="mm-cafe-mata" />
      <circle cx="-3.4" cy="-1.5" r="1.6" className="mm-cafe-fruto" />
      <circle cx="2.6" cy="-3.4" r="1.6" className="mm-cafe-fruto" />
      <circle cx="1.4" cy="2.8" r="1.6" className="mm-cafe-fruto" />
    </g>
  );
}

/** Animal del corral (silueta simple: cuerpo + cabeza + patas). */
function Animalito({ x, y, s = 1, clase = 'mm-oveja' }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} className={clase}>
      <ellipse cx="0" cy="0" rx="8.4" ry="5.4" />
      <circle cx="8.2" cy="-3.2" r="3.1" />
      <rect x="-6" y="3" width="2.2" height="6" rx="1" />
      <rect x="3.6" y="3" width="2.2" height="6" rx="1" />
    </g>
  );
}

// `onBack` con default: los tests montan el mockup sin prop (TS2741 del gate
// tsc en checkJs infiere el prop como requerido si no tiene valor por defecto).
export default function MontanaMundos({ onBack = null }) {
  const [dir, setDir] = useState('naturalista');
  const [modo, setModo] = useState('finca'); // 'finca' | 'montana'
  const [piso, setPiso] = useState(PISO_FINCA);
  const [aviso, setAviso] = useState(null);
  const avisoTimer = useRef(null);
  const viewportRef = useRef(null);
  const [vp, setVp] = useState({ w: 390, h: 700 });

  useEffect(() => {
    const medir = () => {
      const el = viewportRef.current;
      if (el) setVp({ w: el.clientWidth, h: el.clientHeight });
    };
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, []);

  const t = useMemo(() => calcularTransform(vp, modo, piso), [vp, modo, piso]);
  const escenaH = vp.w * (VB_H / VB_W);

  const avisar = (texto) => {
    setAviso(texto);
    if (avisoTimer.current) clearTimeout(avisoTimer.current);
    avisoTimer.current = setTimeout(() => setAviso(null), 2600);
  };
  useEffect(() => () => { if (avisoTimer.current) clearTimeout(avisoTimer.current); }, []);

  // Gestos: pellizco (2 dedos) alterna finca ↔ montaña; deslizar vertical
  // (1 dedo, en modo finca) sube o baja de piso — como caminar la montaña.
  const pinchRef = useRef(null);
  const swipeRef = useRef(null);
  const distancia = (touches) =>
    Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      pinchRef.current = distancia(e.touches);
      swipeRef.current = null;
    } else if (e.touches.length === 1) {
      swipeRef.current = e.touches[0].clientY;
    }
  };
  const onTouchMove = (e) => {
    if (e.touches.length === 2 && pinchRef.current != null) {
      const razon = distancia(e.touches) / pinchRef.current;
      if (razon < 0.78) { setModo('montana'); pinchRef.current = null; }
      if (razon > 1.28) { setModo('finca'); pinchRef.current = null; }
    }
  };
  const onTouchEnd = (e) => {
    if (pinchRef.current == null && swipeRef.current != null && modo === 'finca' && e.changedTouches.length === 1) {
      const delta = e.changedTouches[0].clientY - swipeRef.current;
      if (delta < -72 && piso < PISOS.length - 1) setPiso(piso + 1); // desliza arriba → baja la montaña
      if (delta > 72 && piso > 0) setPiso(piso - 1); // desliza abajo → sube la montaña
    }
    if (e.touches.length < 2) pinchRef.current = null;
    if (e.touches.length === 0) swipeRef.current = null;
  };

  const alternarZoom = () => setModo(modo === 'finca' ? 'montana' : 'finca');
  const irAPiso = (i) => { setPiso(i); setModo('finca'); };
  const pisoActual = PISOS[piso];
  const direccion = DIRECCIONES.find((d) => d.id === dir) || DIRECCIONES[0];

  const pct = (v, total) => `${(v / total) * 100}%`;

  return (
    <div className="mm" data-dir={dir} data-modo={modo}>
      {/* ── Barra del mockup (herramienta de revisión, no parte del diseño) ── */}
      <header className="mm-cabecera">
        <div className="mm-mockbar">
          <button type="button" className="mm-volver" onClick={() => onBack && onBack()}>← Volver</button>
          <span className="mm-mockbar-titulo">MOCKUP · decidir dirección</span>
        </div>
        <h1 className="mm-titulo">La Montaña de los Mundos</h1>
        <div className="mm-direcciones" role="tablist" aria-label="Dirección artística">
          {DIRECCIONES.map((d) => (
            <button
              key={d.id}
              type="button"
              role="tab"
              aria-selected={dir === d.id}
              data-testid={`mm-dir-${d.id}`}
              className={`mm-dir-btn${dir === d.id ? ' es-activa' : ''}`}
              onClick={() => setDir(d.id)}
            >
              <span className="mm-dir-num">{d.num}</span> {d.corto}
            </button>
          ))}
        </div>
        <p className="mm-dir-lema" data-testid="mm-dir-lema">
          Dirección {direccion.num} · <strong>{direccion.nombre}</strong> — {direccion.lema}
        </p>
      </header>

      {/* ── Ventana a la montaña ── */}
      <div
        className="mm-viewport"
        ref={viewportRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        data-testid="mm-viewport"
      >
        <div
          className="mm-escena"
          style={{
            height: `${escenaH}px`,
            transform: `translate3d(${t.tx}px, ${t.ty}px, 0) scale(${t.s})`,
          }}
        >
          <MontanaSvg />

          {/* Velos: en modo finca, los pisos que no son el activo quedan tenues. */}
          <div
            className="mm-velo mm-velo-arriba"
            style={{ height: pct(pisoActual.y0, VB_H) }}
            aria-hidden="true"
          />
          <div
            className="mm-velo mm-velo-abajo"
            style={{ top: pct(pisoActual.y1, VB_H) }}
            aria-hidden="true"
          />

          {/* Marcador de la finca del usuario (siempre en su piso). */}
          <div className="mm-finca-pin" style={{ left: pct(195, VB_W), top: pct(838, VB_H) }} aria-hidden="true">
            ⭐ Su finca
          </div>

          {/* Mundos tocables: halo que pulsa + etiqueta (afordancia obvia). */}
          {MUNDOS.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`mm-mundo${modo === 'finca' && m.piso !== piso ? ' es-tenue' : ''}`}
              style={{ left: pct(m.x, VB_W), top: pct(m.y, VB_H) }}
              data-testid={`mm-mundo-${m.id}`}
              aria-label={`${m.etiqueta}: abre ${m.abre}`}
              onClick={() => avisar(`Aquí se abre ${m.abre}.`)}
            >
              <span className="mm-mundo-halo" aria-hidden="true" />
              <span className="mm-mundo-etiqueta">{m.etiqueta}</span>
            </button>
          ))}

          {/* Franjas de piso: en la montaña completa, tocar un piso lo acerca. */}
          {PISOS.map((p, i) => (
            <button
              key={p.id}
              type="button"
              className="mm-franja"
              style={{ top: pct(p.y0, VB_H), height: pct(p.y1 - p.y0, VB_H) }}
              data-testid={`mm-franja-${p.id}`}
              tabIndex={modo === 'montana' ? 0 : -1}
              aria-label={`Acercarse a ${p.nombre}, ${p.msnm}`}
              onClick={() => irAPiso(i)}
            >
              <span className="mm-franja-rotulo">
                {p.nombre} · {p.msnm}{p.finca ? ' ⭐' : ''}
              </span>
            </button>
          ))}
        </div>

        {/* Indicador del piso + flechas para caminar la montaña (modo finca). */}
        <div className="mm-brujula" data-testid="mm-brujula">
          <span className="mm-brujula-piso">
            {pisoActual.nombre} · {pisoActual.msnm}{pisoActual.finca ? ' — aquí está su finca ⭐' : ''}
          </span>
        </div>
        {modo === 'finca' && piso > 0 && (
          <button type="button" className="mm-paso mm-paso-arriba" data-testid="mm-paso-arriba" onClick={() => setPiso(piso - 1)}>
            ▲ Subir a {PISOS[piso - 1].nombre}
          </button>
        )}
        {modo === 'finca' && piso < PISOS.length - 1 && (
          <button type="button" className="mm-paso mm-paso-abajo" data-testid="mm-paso-abajo" onClick={() => setPiso(piso + 1)}>
            ▼ Bajar a {PISOS[piso + 1].nombre}
          </button>
        )}

        {/* Alternador de zoom: el gesto del pellizco hecho botón visible. */}
        <button type="button" className="mm-zoom" data-testid="mm-zoom-toggle" onClick={alternarZoom}>
          {modo === 'finca' ? '🏔 Ver toda la montaña' : '🏡 Volver a mi finca'}
        </button>
      </div>

      {/* ── Atajos permanentes: nada queda detrás de escalar la montaña ── */}
      <nav className="mm-atajos" aria-label="Atajos permanentes">
        <button
          type="button"
          className="mm-atajo-anotar"
          data-testid="mm-atajo-anotar"
          onClick={() => avisar('Aquí se anota lo que hizo hoy en su finca.')}
        >
          📝 Anotar mi día
        </button>
        <button
          type="button"
          className="mm-atajo-agente"
          data-testid="mm-atajo-agente"
          aria-label="Hablar con Chagra, el agente"
          onClick={() => avisar('Aquí se abre el agente: pregunte con su voz.')}
        >
          Ⓐ
        </button>
      </nav>

      {aviso && (
        <output className="mm-aviso" data-testid="mm-aviso">{aviso}</output>
      )}
    </div>
  );
}

// ── La montaña (una sola escena SVG; las 3 direcciones la re-pintan por CSS) ──
function MontanaSvg() {
  return (
    <svg
      className="mm-svg"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="mm-g-cielo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="mm-stop-cielo-a" />
          <stop offset="1" className="mm-stop-cielo-b" />
        </linearGradient>
        <radialGradient id="mm-g-halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" className="mm-stop-halo-a" />
          <stop offset="1" className="mm-stop-halo-b" />
        </radialGradient>
        <linearGradient id="mm-g-rio" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="mm-stop-rio-a" />
          <stop offset="1" className="mm-stop-rio-b" />
        </linearGradient>
        {/* Luz de montaña: baña la ladera de arriba (cálida/neón/blanca según
            dirección) y hunde el valle — profundidad pictórica sin más capas. */}
        <linearGradient id="mm-g-luz" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="mm-stop-luz-a" />
          <stop offset="0.45" stopColor="rgba(0,0,0,0)" />
          <stop offset="1" className="mm-stop-luz-b" />
        </linearGradient>
        {/* La montaña recorta sus pisos: nada se pinta fuera de su silueta. */}
        <clipPath id="mm-clip-montana">
          <path d="M-2 1442 L-2 760 Q56 706 96 596 Q136 486 160 366 Q178 268 195 176 Q212 268 230 366 Q254 486 294 596 Q334 706 392 760 L392 1442 Z" />
        </clipPath>
      </defs>

      {/* Cielo */}
      <rect x="0" y="0" width="390" height="1440" fill="url(#mm-g-cielo)" />

      {/* Estrellas (viven de noche: biopunk; tenues en la sierra) */}
      <g className="mm-estrellas">
        {[[24, 60, 1.6], [70, 130, 1.1], [120, 44, 1.4], [170, 96, 1], [250, 60, 1.5],
          [292, 150, 1.1], [350, 40, 1.3], [366, 120, 1], [46, 210, 1.2], [340, 210, 1.4],
          [96, 300, 1], [300, 300, 1.1]].map(([cx, cy, r]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} className="mm-estrella" />
          ))}
      </g>

      {/* El astro (sol de día, luna de noche) → mundo Calendario */}
      <g className="mm-astro">
        <circle cx="316" cy="96" r="52" fill="url(#mm-g-halo)" />
        <circle cx="316" cy="96" r="24" className="mm-astro-disco" />
        <circle cx="308" cy="88" r="4.6" className="mm-astro-crater" />
        <circle cx="324" cy="102" r="3.2" className="mm-astro-crater" />
        <circle cx="314" cy="108" r="2.4" className="mm-astro-crater" />
      </g>

      {/* Nubes que pasan despacio (sierra y verde vivo) */}
      <g className="mm-nubes">
        <g className="mm-nube mm-nube-1">
          <ellipse cx="80" cy="180" rx="34" ry="10" />
          <ellipse cx="104" cy="172" rx="22" ry="8" />
        </g>
        <g className="mm-nube mm-nube-2">
          <ellipse cx="300" cy="250" rx="40" ry="11" />
          <ellipse cx="272" cy="242" rx="24" ry="8" />
        </g>
      </g>

      {/* Cordilleras de atrás: lomas redondas y brumosas, más bajas que el pico */}
      <path className="mm-ridge mm-ridge-a" d="M-2 1442 L-2 720 Q50 600 96 486 Q120 430 150 470 Q180 540 196 640 L196 1442 Z" />
      <path className="mm-ridge mm-ridge-b" d="M392 1442 L392 700 Q346 590 306 500 Q284 452 258 496 Q230 560 214 660 L214 1442 Z" />

      {/* ── Cuerpo de la montaña: pisos térmicos apilados ── */}
      <g clipPath="url(#mm-clip-montana)">
        {/* base páramo→abajo; cada piso tapa al anterior con borde ondulado */}
        <rect x="-2" y="170" width="394" height="1272" className="mm-piso-paramo" />
        <path className="mm-piso-frio" d="M-2 574 Q46 556 94 566 Q152 578 200 564 Q258 550 306 564 Q350 576 392 562 L392 1442 L-2 1442 Z" />
        <path className="mm-piso-templado" d="M-2 816 Q50 798 104 808 Q160 820 212 806 Q266 792 316 806 Q356 816 392 804 L392 1442 L-2 1442 Z" />
        <path className="mm-piso-calido" d="M-2 1076 Q54 1058 110 1068 Q166 1080 222 1066 Q276 1052 330 1066 Q364 1074 392 1062 L392 1442 L-2 1442 Z" />
        <path className="mm-piso-valle" d="M-2 1316 Q60 1300 130 1310 Q210 1322 280 1308 Q340 1298 392 1308 L392 1442 L-2 1442 Z" />

        {/* Nieve: casquete ancho con ruana dentada y lengua de glaciar */}
        <path className="mm-nieve" d="M195 140 Q168 220 138 320 L154 306 L166 324 L182 306 L196 330 L212 306 L226 322 L240 304 L254 318 Q222 220 195 140 Z" />
        <path className="mm-nieve" d="M196 330 Q192 358 184 382 Q178 360 182 336 Z" opacity="0.9" />

        {/* Bordes de piso: rima de luz (neón en biopunk) */}
        <path className="mm-borde-piso" d="M-2 574 Q46 556 94 566 Q152 578 200 564 Q258 550 306 564 Q350 576 392 562" />
        <path className="mm-borde-piso" d="M-2 816 Q50 798 104 808 Q160 820 212 806 Q266 792 316 806 Q356 816 392 804" />
        <path className="mm-borde-piso" d="M-2 1076 Q54 1058 110 1068 Q166 1080 222 1066 Q276 1052 330 1066 Q364 1074 392 1062" />
        <path className="mm-borde-piso" d="M-2 1316 Q60 1300 130 1310 Q210 1322 280 1308 Q340 1298 392 1308" />

        {/* Niebla entre pisos */}
        <ellipse className="mm-niebla" cx="120" cy="566" rx="120" ry="16" />
        <ellipse className="mm-niebla" cx="290" cy="812" rx="130" ry="18" />
        <ellipse className="mm-niebla" cx="110" cy="1072" rx="120" ry="16" />

        {/* ── PÁRAMO: frailejones, pajonal y laguna (el cono es angosto a esta
            altura: todo vive entre x≈140 y x≈255 para no caer del recorte) ── */}
        <ellipse className="mm-laguna" cx="222" cy="512" rx="34" ry="9" />
        <path className="mm-laguna-brillo" d="M198 510 Q222 504 246 510" />
        <g className="mm-pajonal">
          <path d="M196 452 q-3 -10 -7 -13 M196 452 q0 -12 1 -15 M196 452 q4 -9 8 -12" />
          <path d="M216 436 q-3 -9 -6 -11 M216 436 q0 -10 1 -13 M216 436 q3 -8 7 -10" />
          <path d="M160 508 q-3 -9 -6 -11 M160 508 q0 -10 1 -13 M160 508 q3 -8 7 -10" />
          <path d="M186 528 q-3 -8 -6 -10 M186 528 q0 -9 1 -12 M186 528 q3 -7 6 -9" />
          <path d="M250 486 q-3 -9 -6 -11 M250 486 q0 -10 1 -13 M250 486 q3 -8 7 -10" />
        </g>
        <ellipse className="mm-piedra" cx="150" cy="532" rx="9" ry="5" />
        <ellipse className="mm-piedra" cx="228" cy="456" rx="6" ry="3.6" />
        <Frailejon x={168} y={438} s={1.25} />
        <Frailejon x={204} y={472} s={0.95} />
        <Frailejon x={150} y={488} s={0.8} />
        <Frailejon x={240} y={530} s={0.7} />

        {/* ── FRÍO: surcos de papa + corral ── */}
        <g className="mm-surcos">
          <path d="M70 636 Q118 626 166 636" />
          <path d="M62 656 Q118 644 174 656" />
          <path d="M56 676 Q118 662 180 676" />
          <path d="M52 696 Q118 682 184 696" />
        </g>
        <g className="mm-matas-papa">
          {[[80, 632], [112, 628], [144, 632], [72, 652], [108, 646], [148, 652],
            [66, 672], [106, 664], [152, 672], [62, 692], [104, 684], [156, 692]].map(([cx, cy]) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3" />
            ))}
        </g>
        <g className="mm-corral">
          {[236, 258, 280, 302, 318].map((x) => (
            <rect key={x} x={x} y={694} width="3.2" height="16" rx="1.4" className="mm-cerca-poste" />
          ))}
          <rect x="234" y="697" width="88" height="2.6" rx="1.3" className="mm-cerca-riel" />
          <rect x="234" y="704" width="88" height="2.6" rx="1.3" className="mm-cerca-riel" />
          <Animalito x={258} y={688} s={0.9} clase="mm-oveja" />
          <Animalito x={296} y={690} s={1.05} clase="mm-vaca" />
        </g>

        {/* ── TEMPLADO: la casa (finca del usuario), troje, cafetal, mercado ── */}
        <g className="mm-casa">
          {/* humo del fogón */}
          <g className="mm-humo">
            <circle className="mm-humo-1" cx="212" cy="856" r="3.4" />
            <circle className="mm-humo-2" cx="214" cy="848" r="4.4" />
            <circle className="mm-humo-3" cx="217" cy="838" r="5.4" />
          </g>
          <rect x="206" y="856" width="7" height="14" rx="1.5" className="mm-casa-chimenea" />
          <rect x="168" y="874" width="56" height="34" rx="3" className="mm-casa-muro" />
          <path d="M162 876 L196 850 L230 876 Z" className="mm-casa-techo" />
          <rect x="176" y="884" width="12" height="12" rx="2" className="mm-casa-ventana" />
          <rect x="200" y="882" width="14" height="26" rx="2.5" className="mm-casa-puerta" />
          <path d="M150 908 Q196 916 244 908" className="mm-casa-camino" />
        </g>
        <g className="mm-troje">
          <rect x="282" y="856" width="4" height="16" className="mm-troje-pata" />
          <rect x="306" y="856" width="4" height="16" className="mm-troje-pata" />
          <rect x="276" y="836" width="40" height="22" rx="3" className="mm-troje-cuerpo" />
          <path d="M272 838 L296 822 L320 838 Z" className="mm-troje-techo" />
          <circle cx="290" cy="847" r="3" className="mm-troje-grano" />
          <circle cx="298" cy="849" r="3" className="mm-troje-grano" />
          <circle cx="304" cy="846" r="3" className="mm-troje-grano" />
        </g>
        {/* Sombríos del café (guamos): el cafetal colombiano crece a la sombra */}
        <g className="mm-sombrio">
          <path d="M52 940 Q50 924 54 912" />
          <path d="M146 936 Q144 920 148 908" />
        </g>
        <ellipse className="mm-sombrio-copa" cx="54" cy="906" rx="17" ry="9" />
        <ellipse className="mm-sombrio-copa" cx="148" cy="902" rx="19" ry="10" />
        <g className="mm-cafetal">
          <MataCafe x={72} y={938} s={1.1} />
          <MataCafe x={98} y={930} s={1} />
          <MataCafe x={124} y={940} s={1.15} />
          <MataCafe x={84} y={958} s={0.95} />
          <MataCafe x={112} y={956} s={1.05} />
        </g>
        <g className="mm-mercado">
          <rect x="278" y="988" width="46" height="20" rx="2.5" className="mm-mercado-meson" />
          {[278, 289.5, 301, 312.5].map((x, i) => (
            <rect key={x} x={x} y={974} width="11.5" height="10" rx="1.5" className={i % 2 ? 'mm-toldo-b' : 'mm-toldo-a'} />
          ))}
          <rect x="276" y="982" width="50" height="4" rx="2" className="mm-mercado-tabla" />
          <circle cx="288" cy="994" r="3.4" className="mm-mercado-fruta-a" />
          <circle cx="298" cy="994" r="3.4" className="mm-mercado-fruta-b" />
          <circle cx="308" cy="994" r="3.4" className="mm-mercado-fruta-a" />
        </g>

        {/* ── CÁLIDO: mango, platanera, cañaduzal ── */}
        <g className="mm-arbol-mango">
          <path d="M90 1172 Q88 1150 94 1136" className="mm-mango-tronco" />
          <circle cx="80" cy="1128" r="20" className="mm-mango-copa" />
          <circle cx="104" cy="1124" r="17" className="mm-mango-copa" />
          <circle cx="92" cy="1112" r="16" className="mm-mango-copa" />
          {[[74, 1132], [96, 1120], [106, 1132], [86, 1116]].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.2" className="mm-mango-fruto" />
          ))}
        </g>
        <g className="mm-platanera">
          {[-58, -30, 0, 30, 58].map((a) => (
            <path
              key={a}
              d="M0 0 Q4 -22 0 -40 Q-4 -22 0 0"
              transform={`translate(292 1180) rotate(${a} 0 0)`}
              className="mm-platano-hoja"
            />
          ))}
          <rect x="289" y="1180" width="6" height="18" rx="2.6" className="mm-platano-tallo" />
          <g className="mm-racimo">
            {[[284, 1170], [281, 1176], [284, 1182]].map(([cx, cy]) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3" />
            ))}
          </g>
        </g>
        <g className="mm-cana">
          {[176, 188, 200, 212].map((x, i) => (
            <path key={x} d={`M${x} 1252 Q${x + (i % 2 ? 5 : -5)} 1222 ${x + (i % 2 ? 2 : -2)} 1200`} className="mm-cana-tallo" />
          ))}
        </g>

        {/* ── RÍO: baja de la montaña y se abre en el valle ── */}
        <path
          className="mm-rio"
          d="M236 1004 Q248 1050 232 1096 Q214 1146 228 1196 Q244 1250 214 1300 Q186 1350 196 1400 L204 1442 L146 1442 Q136 1390 158 1338 Q182 1290 168 1240 Q152 1186 172 1136 Q192 1090 208 1052 Q218 1024 224 1004 Z"
          fill="url(#mm-g-rio)"
        />
        <g className="mm-flujo">
          <path d="M226 1030 Q234 1072 222 1112 Q206 1158 218 1204" />
          <path d="M228 1230 Q238 1272 210 1318 Q188 1356 194 1404" />
          <path d="M212 1080 Q200 1130 212 1178" />
        </g>
        <ellipse className="mm-piedra" cx="182" cy="1368" rx="8" ry="5" />
        <ellipse className="mm-piedra" cx="222" cy="1322" rx="6" ry="4" />

        {/* Luz de montaña sobre toda la ladera (dentro del recorte) */}
        <rect x="-2" y="120" width="394" height="1322" fill="url(#mm-g-luz)" pointerEvents="none" />
      </g>

      {/* Red viva (solo biopunk): el micelio conecta los pisos */}
      <g className="mm-micelio">
        <path d="M316 120 Q260 200 195 300 Q160 390 168 428 Q150 520 160 600 Q175 660 195 700 Q220 760 195 880 Q180 940 230 1000 Q260 1060 240 1140 Q220 1240 195 1300 Q180 1340 190 1380" />
        <path d="M168 428 Q200 520 272 700" opacity="0.55" />
        <path d="M195 880 Q140 920 96 942" opacity="0.55" />
        <path d="M230 1000 Q270 1080 292 1168" opacity="0.55" />
        {MUNDOS.map((m) => (
          <circle key={m.id} cx={m.x} cy={m.y} r="3" className="mm-micelio-nodo" />
        ))}
      </g>

      {/* Mariposas (solo verde vivo) */}
      <g className="mm-mariposas">
        <g transform="translate(150 860)">
          <g className="mm-mariposa mm-mariposa-1">
            <ellipse cx="-3" cy="0" rx="3.4" ry="2.2" />
            <ellipse cx="3" cy="0" rx="3.4" ry="2.2" />
          </g>
        </g>
        <g transform="translate(260 1120)">
          <g className="mm-mariposa mm-mariposa-2">
            <ellipse cx="-3" cy="0" rx="3" ry="2" />
            <ellipse cx="3" cy="0" rx="3" ry="2" />
          </g>
        </g>
      </g>

      {/* Aves lejanas (solo sierra naturalista) */}
      <g className="mm-aves">
        <path d="M96 236 q6 -6 12 0 q6 -6 12 0" />
        <path d="M130 258 q5 -5 10 0 q5 -5 10 0" />
      </g>

      {/* Follaje botánico en primer plano (solo verde vivo) */}
      <g className="mm-botanica">
        <path d="M-4 1442 Q10 1380 44 1352 Q26 1394 22 1442 Z" />
        <path d="M-4 1442 Q28 1402 74 1392 Q40 1420 34 1442 Z" opacity="0.75" />
        <path d="M394 1442 Q380 1376 344 1348 Q364 1392 368 1442 Z" />
        <path d="M394 1442 Q360 1400 316 1390 Q352 1418 358 1442 Z" opacity="0.75" />
      </g>
    </svg>
  );
}
