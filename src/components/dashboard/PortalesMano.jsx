/**
 * PortalesMano — LAS PUERTAS del home como CARTAS EN LA MANO (encargo
 * FABLE_50 §A6: "los 4 portales 'la mano' claros, vivos y bien dispuestos").
 *
 * Antes: tarjetas planas con un emoji del sistema. Ahora cada puerta es una
 * CARTA PINTADA: una viñeta SVG de autor (rubber-hose, tinta cálida, paleta
 * madre) sobre el cielo VIVO de la hora real — el mismo cielo del umbral del
 * valle, para que toda la portada respire la misma hora. En pantalla ancha
 * las cartas se ABREN EN ABANICO como una mano de cartas (la "mano").
 *
 * CONTRATO INTACTO (tests FincaVivaHero.portales): el nav conserva
 * data-testid="finca-viva-puertas", cada botón conserva `puerta-<id>`,
 * su aria-label "<nombre>: abre <abre>" y su onClick — aquí solo cambia la
 * PIEL. Los datos siguen saliendo de buildPuertas (fuente única del hero).
 *
 * PERF: SVG estático por carta (cero animación por frame, cero imágenes);
 * la única animación es la entrada escalonada que ya existía (CSS `brota`).
 * Español de Colombia (usted), sin voseo.
 */
import { useMemo } from 'react';
import useCicloDia from '../../visual/mundo3d/useCicloDia.js';
import { mezclaHex } from '../../visual/mundo3d/cielosHoraData.js';
import { CLIMAS } from '../../mockups/valle/valleData';
import './portales-mano.css';

/* Paleta madre citada (el barrel paleta/ arrastra three; ver UmbralValle). */
const TINTA = '#2c241c';
const VERDE_LADERA = '#4e9143'; // VERDES.templadoVivo
const VERDE_BROTE = '#7a9a3f'; // VERDES.brote
const VERDE_MONTE = '#3f6f3a'; // VERDES.monte
const VERDE_FRIO = '#3c7f64'; // VERDES.frioVivo
const TIERRA_ARCILLA = '#8a5636'; // TIERRAS.arcilla
const TIERRA_CAMINO = '#8a6a44'; // TIERRAS.camino
const BEJUCO = '#a9713c'; // CASA.bejuco (el canasto de cosecha)
const CEREZA = '#c1553f'; // ACENTOS cochinilla/café cereza (fruto, no alarma)
const MAIZ = '#e9b84a'; // ACENTOS maíz
const ENCALADO = '#f3ecdc'; // CASA.encalado
const TEJA = '#b0603f'; // CASA.teja
const TEJA_SOMBRA = '#8f4b31'; // CASA.tejaSombra
const MADERA = '#6b4a2e'; // CASA.madera
const VENTANA = '#ffd9a0'; // CASA.ventana
const AGUA = '#5f9ec4'; // AGUAS (el único azul con permiso)
const CARPINTERIA = '#44685a'; // CASA.carpinteria

/* ── Las viñetas de autor, una por puerta (viewBox 120×64, cielo del card
      detrás — el SVG pinta solo terreno y sujeto). Trazos gordos, curvas
      rubber-hose, siluetas que se leen a un vistazo. ── */

function VinetaMatas() {
  return (
    <svg viewBox="0 0 120 64" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      {/* la ladera con surcos */}
      <path d="M0,64 L0,40 Q30,30 60,36 Q90,42 120,34 L120,64 Z" fill={VERDE_LADERA} />
      <g stroke={mezclaHex(VERDE_LADERA, TINTA, 0.35)} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6">
        <path d="M8,52 Q34,46 60,50 Q86,54 112,48" />
        <path d="M4,59 Q34,53 62,57 Q90,61 116,55" />
      </g>
      {/* LA MATA: el brote gordo y vivo, protagonista */}
      <path d="M60,52 L60,30" fill="none" stroke={TINTA} strokeWidth="3.2" strokeLinecap="round" />
      {/* hoja izquierda: cotiledón carnoso */}
      <path
        d="M59,38 C46,40 36,33 35,21 C48,18 58,26 60,36 Z"
        fill={VERDE_BROTE}
        stroke={TINTA}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* hoja derecha */}
      <path
        d="M61,38 C74,40 84,33 85,21 C72,18 62,26 60,36 Z"
        fill={VERDE_MONTE}
        stroke={TINTA}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* el cogollo nuevo arriba */}
      <path
        d="M60,30 C55,24 56,14 62,10 C68,15 67,26 60,30 Z"
        fill={mezclaHex(VERDE_BROTE, '#e9b84a', 0.25)}
        stroke={TINTA}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* venas de las hojas */}
      <g stroke={TINTA} strokeWidth="1.3" strokeLinecap="round" fill="none" opacity="0.55">
        <path d="M57,36 Q47,32 42,25" />
        <path d="M63,36 Q73,32 78,25" />
      </g>
    </svg>
  );
}

function VinetaAnimales() {
  return (
    <svg viewBox="0 0 120 64" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      {/* el patio de tierra */}
      <path d="M0,64 L0,44 Q40,36 74,42 Q100,46 120,42 L120,64 Z" fill={TIERRA_ARCILLA} />
      {/* la cerca del corral */}
      <g stroke={MADERA} strokeWidth="3.4" strokeLinecap="round">
        <path d="M14,48 L14,30 M38,46 L38,28" />
        <path d="M8,36 L46,33" />
      </g>
      {/* LA GALLINA rubber-hose: cuerpo gordo, cabeza clara, cresta arriba */}
      <g stroke={TINTA} strokeWidth="2.4" strokeLinejoin="round">
        {/* plumas de la cola, en abanico atrás */}
        <path d="M64,40 Q54,30 58,22 Q66,28 68,36 Z" fill={mezclaHex(ENCALADO, TINTA, 0.16)} />
        <path d="M62,42 Q50,38 48,30 Q58,32 64,39 Z" fill={ENCALADO} />
        {/* cuerpo */}
        <path d="M62,49 Q60,33 78,31 Q95,29 96,42 Q96,51 82,52 Q68,53 62,49 Z" fill={ENCALADO} />
        {/* cabeza redonda */}
        <circle cx="95" cy="29" r="7.4" fill={ENCALADO} />
        {/* cresta: tres bultos ROJOS bien puestos sobre la coronilla */}
        <path d="M89,25 Q89,19 93,21 Q94,16 98,19 Q101,15 102,21 Q99,24 92,25 Z" fill={CEREZA} />
        {/* barbilla bajo el pico */}
        <path d="M99,35 Q99,40 96,39 Q95,36 97,34 Z" fill={CEREZA} />
        {/* pico */}
        <path d="M102,28 L110,30.5 L102,33 Z" fill={MAIZ} />
        {/* ala */}
        <path d="M70,38 Q82,34 87,42 Q79,48 69,44 Z" fill={mezclaHex(ENCALADO, TINTA, 0.12)} />
      </g>
      <circle cx="96" cy="28" r="1.7" fill={TINTA} />
      <g stroke={MAIZ} strokeWidth="2.6" strokeLinecap="round" fill="none">
        <path d="M76,52 L76,59 M73,59 L79,59" />
        <path d="M86,52 L86,59 M83,59 L89,59" />
      </g>
      {/* maíz regado */}
      <g fill={MAIZ}>
        <circle cx="52" cy="55" r="1.7" /><circle cx="58" cy="59" r="1.5" /><circle cx="47" cy="60" r="1.5" />
      </g>
    </svg>
  );
}

function VinetaTiempo() {
  return (
    <svg viewBox="0 0 120 64" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      {/* loma fría al fondo */}
      <path d="M0,64 L0,50 Q40,40 80,48 Q102,52 120,48 L120,64 Z" fill={VERDE_FRIO} />
      {/* el sol que asoma */}
      <circle cx="86" cy="22" r="11" fill={MAIZ} stroke={TINTA} strokeWidth="2.2" />
      <g stroke={TINTA} strokeWidth="2.2" strokeLinecap="round">
        <path d="M86,6 L86,10 M102,22 L106,22 M97,11 L100,8 M97,33 L100,36" />
      </g>
      {/* LA NUBE gorda de vereda */}
      <path
        d="M18,34 Q18,24 29,24 Q32,15 43,17 Q53,12 58,21 Q68,21 67,31 Q66,39 55,39 L28,39 Q19,39 18,34 Z"
        fill={ENCALADO}
        stroke={TINTA}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* las gotas */}
      <g fill={AGUA} stroke={TINTA} strokeWidth="1.6">
        <path d="M31,46 q-3.4,5 0,7 q3.4,-2 0,-7 Z" />
        <path d="M44,50 q-3.4,5 0,7 q3.4,-2 0,-7 Z" />
        <path d="M57,45 q-3.4,5 0,7 q3.4,-2 0,-7 Z" />
      </g>
    </svg>
  );
}

function VinetaVender() {
  return (
    <svg viewBox="0 0 120 64" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      {/* la mesa del mercado */}
      <path d="M0,64 L0,46 L120,46 L120,64 Z" fill={TIERRA_CAMINO} />
      <path d="M6,46 L114,46" stroke={mezclaHex(TIERRA_CAMINO, TINTA, 0.3)} strokeWidth="2.4" strokeLinecap="round" />
      {/* EL CANASTO de bejuco con cosecha */}
      <path d="M38,32 L82,32 L76,52 L44,52 Z" fill={BEJUCO} stroke={TINTA} strokeWidth="2.4" strokeLinejoin="round" />
      <g stroke={mezclaHex(BEJUCO, TINTA, 0.35)} strokeWidth="1.6" fill="none" opacity="0.8">
        <path d="M41,38 L79,38 M43,44 L77,44" />
        <path d="M50,32 L52,52 M60,32 L60,52 M70,32 L68,52" />
      </g>
      {/* frutos: café cereza, maíz, aguacate */}
      <g stroke={TINTA} strokeWidth="1.8">
        <circle cx="47" cy="29" r="4.6" fill={CEREZA} />
        <circle cx="57" cy="26" r="4.6" fill={CEREZA} />
        <ellipse cx="68" cy="27" rx="5" ry="6" fill={VERDE_MONTE} />
        <circle cx="77" cy="30" r="4.2" fill={MAIZ} />
      </g>
      {/* las monedas de la venta: pila + una parada */}
      <g stroke={TINTA} strokeWidth="2">
        <ellipse cx="99" cy="44" rx="8.5" ry="3.4" fill={MAIZ} />
        <ellipse cx="99" cy="39.5" rx="8.5" ry="3.4" fill={mezclaHex(MAIZ, '#ffffff', 0.25)} />
        <circle cx="99" cy="26" r="7" fill={MAIZ} />
        <circle cx="99" cy="26" r="4" fill="none" opacity="0.6" />
      </g>
    </svg>
  );
}

function VinetaAprender() {
  return (
    <svg viewBox="0 0 120 64" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      {/* la loma del saber, al fondo */}
      <path d="M0,64 L0,52 Q46,42 90,50 Q106,52 120,50 L120,64 Z" fill={VERDE_LADERA} />
      {/* EL LIBRO abierto del que brota una mata */}
      <g stroke={TINTA} strokeWidth="2.4" strokeLinejoin="round">
        <path d="M28,52 Q44,44 60,50 Q76,44 92,52 L92,32 Q76,24 60,30 Q44,24 28,32 Z" fill={ENCALADO} />
        <path d="M60,30 L60,50" />
      </g>
      <g stroke={mezclaHex(ENCALADO, TINTA, 0.4)} strokeWidth="1.6" strokeLinecap="round" opacity="0.75">
        <path d="M36,36 Q48,31 54,34 M36,42 Q48,37 54,40" />
        <path d="M66,34 Q72,31 84,36 M66,40 Q72,37 84,42" />
      </g>
      {/* la mata que brota de la página */}
      <g fill="none" stroke={TINTA} strokeWidth="2.6" strokeLinecap="round">
        <path d="M60,30 Q60,20 60,14" />
        <path d="M60,22 Q53,21 50,14" />
      </g>
      <path d="M50,14 Q46,6 54,4 Q59,9 50,14 Z" fill={VERDE_BROTE} stroke={TINTA} strokeWidth="2" strokeLinejoin="round" />
      <path d="M60,14 Q57,4 64,2 Q70,8 60,14 Z" fill={VERDE_MONTE} stroke={TINTA} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function VinetaFinca() {
  return (
    <svg viewBox="0 0 120 64" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      {/* dos lomas, el valle chiquito */}
      <path d="M0,64 L0,40 Q30,28 62,38 Q94,48 120,38 L120,64 Z" fill={VERDE_LADERA} />
      <path d="M0,64 L0,52 Q40,44 80,52 Q102,56 120,52 L120,64 Z" fill={mezclaHex(VERDE_LADERA, VERDE_BROTE, 0.5)} />
      {/* el sendero a la casa */}
      <path d="M28,64 Q42,54 56,48" fill="none" stroke={TIERRA_CAMINO} strokeWidth="5" strokeLinecap="round" opacity="0.7" />
      {/* LA CASA-ANCLA (la misma del valle) */}
      <g stroke={TINTA} strokeWidth="2.2" strokeLinejoin="round">
        <rect x="54" y="30" width="30" height="20" rx="1.5" fill={ENCALADO} />
        <rect x="54" y="45" width="30" height="5" fill={TEJA_SOMBRA} stroke="none" />
        <path d="M50,32 L69,18 L88,32 Z" fill={TEJA} />
        <rect x="59" y="36" width="7" height="14" rx="1" fill={MADERA} />
        <rect x="72" y="35" width="8" height="8" rx="1" fill={VENTANA} />
      </g>
      {/* el arbolito y las matas de la huerta */}
      <rect x="94" y="36" width="3.2" height="13" rx="1.5" fill={MADERA} />
      <ellipse cx="95.5" cy="30" rx="9" ry="8.5" fill={VERDE_MONTE} stroke={TINTA} strokeWidth="2" />
      <g fill={CARPINTERIA}>
        <ellipse cx="22" cy="56" rx="5" ry="3.4" />
        <ellipse cx="36" cy="59" rx="4.4" ry="3" />
      </g>
    </svg>
  );
}

const VINETAS = {
  matas: VinetaMatas,
  animales: VinetaAnimales,
  tiempo: VinetaTiempo,
  vender: VinetaVender,
  aprender: VinetaAprender,
  finca: VinetaFinca,
};

/**
 * @param {Object} props
 * @param {Array<{id: string, nombre: string, tinte: string, abre: string,
 *   onClick: React.MouseEventHandler<HTMLButtonElement>, emoji?: string}>} props.puertas - buildPuertas del hero
 *   (fuente única de destinos; aquí solo se pinta).
 */
export default function PortalesMano({ puertas }) {
  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  /* El MISMO reloj del umbral: toda la portada respira la misma hora. */
  const { franja } = useCicloDia({ reducedMotion });
  const clima = CLIMAS[franja] || CLIMAS.tarde;

  return (
    <nav
      className="fvh-puertas fvh-puertas--mano"
      aria-label="Puertas de su finca"
      data-testid="finca-viva-puertas"
      style={{
        '--pm-cielo-a': clima.cielo[0],
        '--pm-cielo-b': clima.cielo[1],
      }}
    >
      {puertas.map((p, i) => {
        const Vineta = VINETAS[p.id] || null;
        return (
          <button
            key={p.id}
            type="button"
            className={`fvh-puerta pm-carta t-${p.tinte}`}
            data-testid={`puerta-${p.id}`}
            onClick={p.onClick}
            style={{ animationDelay: `${0.08 + i * 0.06}s` }}
            aria-label={`${p.nombre}: abre ${p.abre}`}
          >
            <span className="pm-vineta" aria-hidden="true">
              {Vineta ? <Vineta /> : <span className="fvh-puerta-emoji">{p.emoji}</span>}
            </span>
            <span className="pm-rotulo">
              <span className="fvh-puerta-nombre">{p.nombre}</span>
              <span className="pm-abre">{p.abre}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
