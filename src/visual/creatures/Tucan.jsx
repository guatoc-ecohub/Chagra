import { useId } from 'react';
import './faunaCalido.css';
import { CreatureFilters } from './_filters.jsx';

/*
 * Tucan — TUCÁN PECHIBLANCO, Ramphastos tucanus (Ramphastidae).
 *
 * El tucán grande del bosque húmedo del piso cálido-tropical bajo colombiano
 * (0–1.000 msnm): ave robusta de PLUMAJE NEGRO, PECHO amarillo-blanco, banda
 * roja en el vientre, coberteras supracaudales rojo-anaranjado, y su firma
 * inconfundible — el PICO enorme, amarillo en el culmen y la base, CELESTE en la
 * mandíbula inferior, con anillo ocular azul. Dispersor de semillas (frugívoro):
 * el que siembra el monte tragando fruto y soltando la pepa lejos. Aquí va
 * POSADO en una rama del sombrío. Fuente: DR piso-cálido (gemini, GBIF
 * Ramphastos tucanus 2478235).
 *
 * Billboard LIGERO (sin kit rubber-hose). Perfil lateral mirando a la izquierda.
 * API estable: { size, className, inline, animated, title }.
 */
const VIEWBOX = '-32 -26 62 54';

const NEGRO = '#1c1c22';       // plumaje negro
const NEGRO2 = '#2b2b34';      // negro con luz
const PECHO = '#f4eccf';       // pecho amarillo-blanco (pechiblanco)
const PECHO_BORDE = '#e9c85a'; // el reborde amarillo del pecho
const ROJO = '#cf3524';        // banda del vientre + supracaudales
const PICO_SUP = '#f2b21e';    // pico: culmen y base amarillos
const PICO_INF = '#7ec7e0';    // pico: mandíbula inferior celeste
const PICO_PUNTA = '#b8471f';  // ápice rojizo del pico
const OJO_ANILLO = '#4f9bd6';  // anillo ocular azul
const RAMA = '#6b4a30';
const INK = '#141118';

export function Tucan({
  size = 64,
  className = '',
  inline = false,
  animated = true,
  title = 'Tucán pechiblanco (Ramphastos tucanus)',
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `fc-glow-${uid}`;
  const blur = `fc-blur-${uid}`;
  const respira = animated ? 'fc-breathe' : undefined;

  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
    </defs>
  );

  // La rama del sombrío de la que se agarra (estática, detrás de las patas).
  const rama = (
    <g aria-hidden="true">
      <path d="M-20,15 C-6,13.4 12,13.4 24,15 C12,16.6 -6,16.6 -20,15 Z"
        fill={RAMA} stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />
    </g>
  );

  const body = (
    <g className="fc-body" filter={`url(#${glow})`}>
      {/* patas amarillas agarrando la rama */}
      <path d="M0,9 L-1.4,14 M0,9 L1.6,14" stroke={PICO_SUP} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M6,9 L4.6,14 M6,9 L7.6,14" stroke={PICO_SUP} strokeWidth="1.8" fill="none" strokeLinecap="round" />

      {/* cola negra cocada hacia arriba-atrás, con las supracaudales rojas */}
      <path d="M9,-2 C17,-3 22,2 20,10 C17,12 12,9 10,4 Z" fill={NEGRO} stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M16,7 C18,8.5 19.4,10 19.6,11.6 C17.6,11 15.6,9.6 14.6,8 Z" fill={ROJO} />

      {/* cuerpo negro (respira) */}
      <g className={respira}>
        <ellipse cx="3" cy="1" rx="10" ry="11" fill={NEGRO} stroke={INK} strokeWidth="1.3" />
        <ellipse cx="0.5" cy="-1.5" rx="6" ry="6.5" fill={NEGRO2} opacity="0.6" />
        {/* pecho amarillo-blanco al frente (pechiblanco) */}
        <path d="M-6.5,-6 C-11,-1 -11,7 -5,10 C-1,11.4 2,10 3.6,7 C0,7 -3.4,3 -3.4,-2 C-3.4,-5 -5,-6.4 -6.5,-6 Z"
          fill={PECHO} stroke={PECHO_BORDE} strokeWidth="1.1" strokeLinejoin="round" />
        {/* banda roja del vientre */}
        <path d="M-5,9 C-1.5,11 2,10.4 4,8.4 C1.4,10.8 -3,11 -5.6,9.8 Z" fill={ROJO} />
      </g>

      {/* cabeza negra */}
      <circle cx="-4" cy="-6.5" r="6.2" fill={NEGRO} stroke={INK} strokeWidth="1.2" />
      {/* anillo ocular azul + ojo */}
      <circle cx="-6.4" cy="-8" r="2.5" fill={OJO_ANILLO} />
      <circle cx="-6.6" cy="-8" r="1.5" fill="#0c0c12" />
      <circle cx="-7.2" cy="-8.6" r="0.5" fill="#f3f7ff" />

      {/* EL PICO enorme — la firma. Base en la cara, se afila a la izquierda. */}
      {/* mandíbula superior (culmen amarillo) */}
      <path d="M-8,-9.4 C-16,-11 -25,-8.6 -28.6,-5.4 C-24,-5.6 -16,-5.8 -9,-5.6 Z"
        fill={PICO_SUP} stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />
      {/* mandíbula inferior (celeste) */}
      <path d="M-9,-5.2 C-17,-4.8 -24,-4.6 -28.6,-5.2 C-24,-2.6 -16,-1.2 -9,-1.6 Z"
        fill={PICO_INF} stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />
      {/* la línea del culmen (borde superior más oscuro) */}
      <path d="M-8.4,-9.2 C-16,-10.6 -24.4,-8.4 -28.4,-5.5" fill="none" stroke="#c8901a" strokeWidth="1" opacity="0.8" />
      {/* ápice rojizo del pico */}
      <path d="M-27,-5.3 C-28.6,-5.4 -29.2,-5.4 -28.9,-5.5 C-28.9,-5.2 -28.2,-4.9 -27,-4.6 Z" fill={PICO_PUNTA} />
      {/* la comisura donde las mandíbulas se juntan */}
      <path d="M-8.6,-5.4 L-28.4,-5.3" stroke={INK} strokeWidth="0.7" opacity="0.5" />
    </g>
  );

  if (inline) {
    return (
      <g className={className} data-creature="tucan">
        {defs}
        {rama}
        {body}
      </g>
    );
  }
  return (
    <svg viewBox={VIEWBOX} width={size} height={size} className={className}
      role="img" aria-label={title} data-creature="tucan" {...rest}>
      <title>{title}</title>
      {defs}
      {rama}
      {body}
    </svg>
  );
}

export default Tucan;
