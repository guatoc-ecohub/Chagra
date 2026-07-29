import { useId } from 'react';
import './faunaCalido.css';
import { CreatureFilters } from './_filters.jsx';

/*
 * MicoMaicero — MICO MAICERO / mono ardilla, Saimiri sciureus (Cebidae).
 *
 * El primate ágil del bosque cálido-tropical bajo colombiano (0–1.000 msnm):
 * pequeño, CUERPO gris-oliva, la MÁSCARA BLANCA alrededor de los ojos con el
 * hocico negro (su firma), la CORONA oscura, las EXTREMIDADES amarillo-anaranjado
 * y la COLA larga NO prensil de punta oscura. Frugívoro dispersor de semillas e
 * insectívoro (control biológico). Aquí va SENTADO en una rama del sombrío,
 * curioso, con la cola colgando y meciéndose. Fuente: DR piso-cálido (gemini,
 * GBIF Saimiri sciureus 2436605).
 *
 * Billboard LIGERO (sin kit rubber-hose). API estable:
 * { size, className, inline, animated, title }.
 */
const VIEWBOX = '-26 -27 52 55';

const CUERPO = '#948f79';      // gris-oliva
const CUERPO_LUZ = '#a9a488';  // el lomo con luz
const NARANJA = '#cf9a4c';     // extremidades amarillo-anaranjado
const NARANJA2 = '#e0b062';
const CARA = '#efeade';        // máscara blanca
const CORONA = '#46433a';      // corona/hocico oscuros
const HOCICO = '#241f18';      // negro del morro
const RAMA = '#6b4a30';
const INK = '#171410';

export function MicoMaicero({
  size = 64,
  className = '',
  inline = false,
  animated = true,
  title = 'Mico maicero / mono ardilla (Saimiri sciureus)',
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `fc-glow-${uid}`;
  const blur = `fc-blur-${uid}`;
  const cola = animated ? 'fc-tail fc-tail--der' : undefined;
  const cabeza = animated ? 'fc-nod' : undefined;

  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
    </defs>
  );

  // La rama del sombrío (estática, detrás de las patas).
  const rama = (
    <g aria-hidden="true">
      <path d="M-22,17 C-8,15.6 10,15.6 23,17 C10,18.4 -8,18.4 -22,17 Z"
        fill={RAMA} stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />
    </g>
  );

  const body = (
    <g className="fc-body" filter={`url(#${glow})`}>
      {/* COLA larga NO prensil, cuelga por la derecha y se enrosca (se mece) */}
      <g className={cola}>
        <path d="M7,6 C15,7 20,12 20,18 C20,23 16,26 12,24 C15.4,24.4 17.6,22 17.4,18.4 C17.2,13.6 12.6,9.6 6,8.6 Z"
          fill={CUERPO} stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />
        <path d="M13,24 C15.4,24.4 17.6,22 17.4,18.4 C16,21.6 14,23.4 12,23.6 Z" fill={HOCICO} />
      </g>

      {/* patas traseras dobladas agarrando la rama */}
      <path d="M-5,9 C-7,12 -6.4,15 -4,16.4" stroke={NARANJA} strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M5,9 C7,12 6.4,15 4,16.4" stroke={NARANJA} strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M-4.4,16 l-2.2,0.8 M4.4,16 l2.2,0.8" stroke={HOCICO} strokeWidth="1.3" fill="none" strokeLinecap="round" />

      {/* cuerpo gris-oliva sentado */}
      <ellipse cx="0" cy="3" rx="8" ry="9.5" fill={CUERPO} stroke={INK} strokeWidth="1.3" />
      <path d="M-4,-3 C1,-1 6,0 7.5,4 C4,2.5 -2,2 -5,4 Z" fill={CUERPO_LUZ} opacity="0.7" />
      {/* pecho más claro */}
      <ellipse cx="0" cy="4.5" rx="4.4" ry="6" fill={NARANJA2} opacity="0.35" />

      {/* bracitos amarillos recogidos al pecho (curioso) */}
      <path d="M-5,-1 C-8,1 -8.4,4 -6.6,6.4 C-5,5 -3.6,3 -3.4,1 Z" fill={NARANJA} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
      <path d="M5,-1 C8,1 8.4,4 6.6,6.4 C5,5 3.6,3 3.4,1 Z" fill={NARANJA} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
      <path d="M-6.4,6.2 l-1.4,1.2 m0.6,-2.2 l-1.6,0.8 M6.4,6.2 l1.4,1.2 m-0.6,-2.2 l1.6,0.8" stroke={HOCICO} strokeWidth="0.9" fill="none" strokeLinecap="round" />

      {/* CABEZA (cabecea despacio) */}
      <g className={cabeza}>
        {/* corona oscura */}
        <path d="M-6.6,-9.5 C-6,-13.6 6,-13.6 6.6,-9.5 C4,-11 -4,-11 -6.6,-9.5 Z" fill={CORONA} />
        {/* cráneo gris */}
        <circle cx="0" cy="-8.5" r="6.3" fill={CUERPO} stroke={INK} strokeWidth="1.2" />
        {/* MÁSCARA BLANCA con arcos puntudos sobre los ojos (la firma) */}
        <path d="M-6,-8.8 C-5.4,-12 -2.4,-12.4 -1.2,-9.6 C-0.4,-11 0.4,-11 1.2,-9.6 C2.4,-12.4 5.4,-12 6,-8.8 C6,-5.6 3.6,-4 0,-4 C-3.6,-4 -6,-5.6 -6,-8.8 Z"
          fill={CARA} stroke="#ddd8c9" strokeWidth="0.7" strokeLinejoin="round" />
        {/* orejitas */}
        <circle cx="-6.2" cy="-9" r="1.8" fill={CUERPO} stroke={INK} strokeWidth="0.9" />
        <circle cx="6.2" cy="-9" r="1.8" fill={CUERPO} stroke={INK} strokeWidth="0.9" />
        {/* ojos grandes dentro de la máscara */}
        <circle cx="-2.5" cy="-8.4" r="1.8" fill={HOCICO} />
        <circle cx="2.5" cy="-8.4" r="1.8" fill={HOCICO} />
        <circle cx="-3" cy="-9" r="0.55" fill="#f3f7ff" />
        <circle cx="2" cy="-9" r="0.55" fill="#f3f7ff" />
        {/* HOCICO negro (la boca-máscara oscura de Saimiri) */}
        <ellipse cx="0" cy="-4.4" rx="2.6" ry="2.1" fill={HOCICO} />
        <path d="M-1.2,-4 C-0.4,-3.2 0.4,-3.2 1.2,-4" fill="none" stroke="#0c0a07" strokeWidth="0.7" strokeLinecap="round" />
      </g>
    </g>
  );

  if (inline) {
    return (
      <g className={className} data-creature="mico-maicero">
        {defs}
        {rama}
        {body}
      </g>
    );
  }
  return (
    <svg viewBox={VIEWBOX} width={size} height={size} className={className}
      role="img" aria-label={title} data-creature="mico-maicero" {...rest}>
      <title>{title}</title>
      {defs}
      {rama}
      {body}
    </svg>
  );
}

export default MicoMaicero;
