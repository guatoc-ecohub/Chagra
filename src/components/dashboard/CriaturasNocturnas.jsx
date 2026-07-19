/*
 * CriaturasNocturnas — set de fauna NOCTURNA colombiana (+ el cóndor diurno del
 * valle) en el MISMO lenguaje biopunk aprobado de GuardianEspiritu.jsx:
 * cuerpos oscuros casi negros (#171030 / #1c1338 / #141a3a / #1c2350),
 * contornos neón por especie, realces crema (#eafff6), ojos con glow y filtros
 * feGaussianBlur+feMerge. El look oscuro+neón calza con animales de noche.
 *
 * GROUNDING (regla dura): fauna REAL colombiana, nombre científico correcto y
 * rol agroecológico verificable — NUNCA especies inventadas. Cada criatura
 * lleva su `rol` (por qué le sirve a la finca) y su `fuente` de grounding.
 *
 * Componentes reutilizables (patrón GuardianEspiritu): funciones Avatar<X> que
 * comparten <CriaturasNocturnasDefs/> (glow + blur). El ROSTER se exporta para
 * que la vitrina —u otras superficies— lo pinten sin duplicar datos.
 */
import { useId } from 'react';
import { LineBoilFilter } from '../../visual/creatures/LineBoilFilter';
import './criaturas-nocturnas.css';

/* Respeta prefers-reduced-motion para el line-boil SMIL (los transforms CSS ya
   se congelan por media-query). Se evalúa una vez en cliente; si el usuario lo
   cambia luego, el resto de la animación ya obedece la media-query. */
const CN_REDUCED =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ─── ROSTER GROUNDED — 7 nocturnas + el cóndor del valle ─────────────────── */
export const CRIATURAS_NOCTURNAS = [
  {
    id: 'zariguya',
    nombre: 'Zarigüeya (chucha)',
    cientifico: 'Didelphis marsupialis',
    eje: 'Control de plagas y semillas',
    rol: 'Marsupial nocturno: come insectos, babosas y roedores pequeños, y dispersa semillas de frutales por la finca.',
    frase: 'Salgo de noche: le limpio la huerta de plagas y le siembro monte con lo que como.',
    fuente: 'Marsupial nativo · control biológico y dispersión de semillas',
    acc: '#9ff0ff', accRgb: '159, 240, 255',
  },
  {
    id: 'buho',
    nombre: 'Currucutú (búho)',
    cientifico: 'Megascops choliba',
    eje: 'Control de roedores',
    rol: 'Búho pequeño de los Andes: caza ratones y ratas de noche, aliado contra los roedores que dañan el grano guardado.',
    frase: 'Desde la rama vigilo su granero: cada ratón que cae es cosecha que usted salva.',
    fuente: 'Estrígido nativo · control nocturno de roedores',
    acc: '#ffcf5a', accRgb: '255, 207, 90',
  },
  {
    id: 'murcielago',
    nombre: 'Murciélago nectarívoro',
    cientifico: 'Glossophaga soricina',
    eje: 'Polinización nocturna',
    rol: 'Murciélago de lengua larga: poliniza flores que abren de noche, dispersa semillas y también come insectos.',
    frase: 'Cuando el sol se va, yo sigo polinizando: su floración no descansa conmigo.',
    fuente: 'Quiróptero nectarívoro nativo · polinización y dispersión nocturna',
    acc: '#c78bff', accRgb: '199, 139, 255',
  },
  {
    id: 'luciernaga',
    nombre: 'Luciérnaga (cocuyo)',
    cientifico: 'Lampyridae',
    eje: 'Bioindicador de la noche',
    rol: 'Escarabajo bioluminiscente: sus larvas comen babosas y caracoles; su presencia indica suelo sano y poca contaminación lumínica.',
    frase: 'Mi luz solo brilla donde el campo está sano: si me ve, va por buen camino.',
    fuente: 'Coleóptero bioindicador · larvas depredadoras de babosas',
    acc: '#c6ff4f', accRgb: '198, 255, 79',
  },
  {
    id: 'marteja',
    nombre: 'Marteja (mono nocturno)',
    cientifico: 'Aotus lemurinus',
    eje: 'Frugívoro dispersor',
    rol: 'Único primate nocturno de Colombia: de ojos enormes, come frutas de noche y dispersa por el bosque las semillas de los árboles de la finca.',
    frase: 'Con estos ojos veo en lo oscuro: como su fruta y le siembro el bosque árbol por árbol.',
    fuente: 'Primate nocturno nativo · frugívoro y dispersor de semillas',
    acc: '#ff9d4f', accRgb: '255, 157, 79',
  },
  {
    id: 'armadillo',
    nombre: 'Gurre (armadillo)',
    cientifico: 'Dasypus novemcinctus',
    eje: 'Suelo aireado',
    rol: 'Armadillo de nueve bandas: escarba de noche buscando insectos y larvas del suelo, y con eso airea y remueve la tierra.',
    frase: 'Escarbo su suelo buscando plaga: le dejo la tierra suelta y respirada.',
    fuente: 'Cingulado nativo · aireación de suelo y control de larvas',
    acc: '#6fe6c0', accRgb: '111, 230, 192',
  },
  {
    id: 'tigrillo',
    nombre: 'Tigrillo (oncilla)',
    cientifico: 'Leopardus tigrinus',
    eje: 'Depredador tope',
    rol: 'Felino pequeño nocturno: caza roedores y aves que atacan cultivos; regula la cadena y mantiene el equilibrio de la finca.',
    frase: 'Soy el que cierra la cadena: donde yo cazo, la plaga no manda.',
    fuente: 'Félido nativo (VU) · control biológico tope',
    acc: '#ff7d5a', accRgb: '255, 125, 90',
  },
  {
    id: 'condor',
    nombre: 'Cóndor de los Andes',
    cientifico: 'Vultur gryphus',
    eje: 'Vigía del valle',
    rol: 'Ave carroñera: planea alto sobre el valle limpiando animales muertos, lo que corta el ciclo de enfermedades en el campo.',
    frase: 'Desde lo alto plano sobre su valle: limpio el campo y aviso que la montaña vive.',
    fuente: 'Cóndor andino (símbolo nacional) · sanidad del valle por carroñeo',
    acc: '#bfe3ff', accRgb: '191, 227, 255',
  },
];

const byId = (id) => CRIATURAS_NOCTURNAS.find((c) => c.id === id) || CRIATURAS_NOCTURNAS[0];

/* ─── filtros SVG compartidos (glow + blur), mismos que GuardianEspiritu ──── */
export function CriaturasNocturnasDefs() {
  return (
    <defs>
      <filter id="cn-glow1" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="2.2" result="b" />
        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="cn-blur3"><feGaussianBlur stdDeviation="3" /></filter>
    </defs>
  );
}

/* ─── los avatares (SVG biopunk, uno por criatura) ────────────────────────── */

/* Zarigüeya / chucha (Didelphis marsupialis) — PERSONAJE COMPLETO.
   Rasgos diagnósticos reales del marsupial: hocico largo y puntudo con
   VIBRISAS, orejas desnudas membranosas, COLA PRENSIL DESNUDA (el rasgo que la
   delata, con su anillado escamoso), pelaje de guardia largo y desgreñado sobre
   lanilla clara, y andar plantígrado bajo — apoya toda la planta, no de puntas.
   Y el gesto que le gana el corazón a una niña de once: las CRÍAS cargadas en
   el lomo, agarradas con sus manitos.
   Animación: husmea (el marsupial vive por la nariz), le tiemblan las vibrisas,
   la cola prensil se mece y las crías se acomodan. Contorno con line-boil. */
function AvatarZariguya() {
  const uid = useId().replace(/[:]/g, '');
  const boilId = `cn-boil-zari-${uid}`;

  return (
    <g className="cn-av-camina" filter="url(#cn-glow1)">
      <defs>
        <LineBoilFilter id={boilId} baseFrequency={0.038} scale={1.8} animated={!CN_REDUCED} dur="0.42s" />
      </defs>

      <ellipse cx="0" cy="15" rx="17" ry="2.8" fill="#000" opacity="0.36" />

      <g className="cn-zari">
        {/* ── COLA PRENSIL DESNUDA: base gruesa, punta enroscada, anillos ── */}
        <g className="cn-zari-cola">
          <path d="M-9,10.6 C-17.4,11.6 -22.6,5.4 -21.4,-2.4 C-20.8,-6.4 -18.2,-8.4 -16,-7.4
                   C-17.6,-6.4 -18.8,-4.6 -19.2,-2.2 C-20,3.8 -16.2,8.6 -9,7.4 Z"
            fill="#1c2350" stroke="#9ff0ff" strokeWidth="0.85" strokeOpacity="0.65" />
          {/* anillado escamoso de la cola pelona */}
          <g stroke="#d8f6ff" strokeWidth="0.5" fill="none" opacity="0.42">
            <path d="M-11.4,10.4 C-11.6,9.2 -11.6,8.4 -11.4,7.6" />
            <path d="M-14.6,9.6 C-15,8.4 -15.2,7.6 -15,6.6" />
            <path d="M-17.6,7.4 C-18.4,6.4 -18.8,5.6 -19,4.6" />
            <path d="M-19.6,3.6 C-20.4,3 -21,2.8 -21.2,2.4" />
            <path d="M-20.2,-0.8 C-20.8,-1 -21,-1.4 -21.2,-1.8" />
            <path d="M-18.6,-5 C-19,-5.6 -19.2,-6 -19.2,-6.4" />
          </g>
          {/* base peluda: donde el pelo de guardia todavía cubre la cola */}
          <path d="M-8.4,11 C-11.4,11 -13,9.6 -13.4,7.4 C-11.6,8.2 -10,8.4 -8.4,8 Z"
            fill="#171030" stroke="#9ff0ff" strokeWidth="0.6" strokeOpacity="0.5" />
        </g>

        <g filter={`url(#${boilId})`}>
          {/* ── cuerpo bajo y encorvado, con peso ── */}
          <path d="M-11.6,12.4 C-14,5.4 -11.4,-2 -2.6,-3.6 C6,-5.2 13.4,-1.6 13.8,5.6
                   C14,10.4 9.4,13.6 -0.4,13.8 C-6.4,13.9 -10.4,13.6 -11.6,12.4 Z"
            fill="#171030" stroke="#9ff0ff" strokeWidth="0.9" strokeOpacity="0.6" />

          {/* lanilla clara del vientre bajo el pelo de guardia */}
          <path d="M-10.2,10.4 C-7.4,13.2 6,13.6 12.4,7.8 C11.4,12.4 -5.6,14.2 -10.2,10.4 Z"
            fill="#eafff6" opacity="0.2" />

          {/* PELO DE GUARDIA largo y desgreñado: mechones que rompen la silueta */}
          <g stroke="#9ff0ff" strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.5">
            <path d="M-9.6,-0.4 C-11,-2.4 -11.8,-3.6 -11.6,-4.8" />
            <path d="M-6.2,-2.4 C-7,-4.6 -7.2,-5.8 -6.6,-7" />
            <path d="M-2.6,-3.6 C-2.8,-5.8 -2.6,-7.2 -1.8,-8.2" />
            <path d="M1.4,-4 C1.6,-6.2 2.2,-7.4 3.2,-8.2" />
            <path d="M5.4,-3.6 C6.2,-5.6 7,-6.6 8.2,-7.2" />
            <path d="M9.4,-2 C10.6,-3.6 11.6,-4.4 12.8,-4.8" />
            <path d="M-11.8,4.4 C-13.6,3.6 -14.6,3 -15.2,2.2" />
            <path d="M-12,8.2 C-14,8.2 -15,8 -15.8,7.4" />
          </g>
          {/* textura interna del pelaje (dirección del pelo) */}
          <g stroke="#d8f6ff" strokeWidth="0.55" fill="none" opacity="0.3">
            <path d="M-8.4,2.4 C-6.4,0.6 -3.4,-0.6 0.4,-1" />
            <path d="M-7.6,6.4 C-4.6,4.4 -0.6,3.2 4,3" />
            <path d="M-5.6,10 C-1.6,8.6 3.4,7.6 8.4,7.4" />
          </g>
        </g>

        {/* ── ANDAR PLANTÍGRADO: apoya toda la planta, con deditos ── */}
        {/* pata trasera */}
        <path d="M-7.4,11.4 C-8.2,12.6 -8.4,13.4 -8.2,14.2" stroke="#0f0a24" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M-10.6,14.4 L-4.6,14.4" stroke="#0f0a24" strokeWidth="2.4" strokeLinecap="round" />
        <g stroke="#9ff0ff" strokeWidth="0.7" strokeLinecap="round" opacity="0.65">
          <path d="M-10.4,14.6 L-11.4,15.4" /><path d="M-8.6,14.8 L-9,15.8" />
          <path d="M-6.8,14.8 L-6.6,15.8" /><path d="M-5,14.6 L-4.2,15.4" />
        </g>
        {/* pata delantera */}
        <path d="M8.4,11 C8.8,12.4 8.8,13.4 8.6,14.2" stroke="#0f0a24" strokeWidth="2.8" strokeLinecap="round" fill="none" />
        <path d="M6,14.4 L11.6,14.4" stroke="#0f0a24" strokeWidth="2.2" strokeLinecap="round" />
        <g stroke="#9ff0ff" strokeWidth="0.7" strokeLinecap="round" opacity="0.65">
          <path d="M6.2,14.6 L5.4,15.4" /><path d="M8,14.8 L7.8,15.8" />
          <path d="M9.8,14.8 L10.2,15.8" /><path d="M11.4,14.6 L12.2,15.4" />
        </g>

        {/* ── LAS CRÍAS AL LOMO: el gesto ── */}
        <g className="cn-zari-cria">
          <ZariguyaCria x={-6.2} y={-6.4} escala={1} />
        </g>
        <g className="cn-zari-cria cn-zari-cria-b">
          <ZariguyaCria x={-0.6} y={-7.6} escala={1.05} />
        </g>
        <g className="cn-zari-cria cn-zari-cria-c">
          <ZariguyaCria x={5.2} y={-6.8} escala={0.92} />
        </g>

        {/* ── CABEZA que HUSMEA: hocico largo, orejas desnudas, vibrisas ── */}
        <g className="cn-zari-hocico">
          {/* oreja trasera (membranosa, desnuda) */}
          <path d="M8.6,-3.4 C6.8,-9 11.4,-11.6 13.6,-7.6 C13.2,-5.2 11,-3.6 8.6,-3.4 Z"
            fill="#141a3a" stroke="#9ff0ff" strokeWidth="0.7" strokeOpacity="0.6" />
          <path d="M10,-4.6 C9.4,-7.8 11.6,-9.2 12.6,-7.4 C12.2,-6 11.2,-5 10,-4.6 Z"
            fill="#ffc0dc" opacity="0.22" />
          {/* oreja delantera */}
          <path d="M13.6,-2.6 C12.4,-8.4 17.4,-10.6 19.2,-6.4 C18.6,-4.2 16.2,-2.8 13.6,-2.6 Z"
            fill="#1c1338" stroke="#9ff0ff" strokeWidth="0.7" strokeOpacity="0.7" />
          <path d="M15,-3.8 C14.6,-7.2 17.2,-8.4 18.2,-6.2 C17.6,-4.8 16.4,-4 15,-3.8 Z"
            fill="#ffc0dc" opacity="0.28" />

          {/* cráneo + HOCICO LARGO Y PUNTUDO */}
          <path d="M9.4,-1.4 C14.2,-4 19,-2.4 22.4,0.6 C24,2 25.4,3.4 25.6,4.6
                   C25.8,5.8 24.6,6.4 23.4,5.8 C22,4 19,2.6 15.6,3.2 C12.4,3.8 9.6,1.8 9.4,-1.4 Z"
            fill="#1c1338" stroke="#9ff0ff" strokeWidth="0.85" strokeOpacity="0.65" />
          {/* cara pálida del marsupial (la máscara clara sobre el hocico) */}
          <path d="M12,-1.2 C15.4,-2.6 19.2,-1.4 22.6,1.6 C19.4,0.6 15.6,0.4 12.8,1.2 Z"
            fill="#eafff6" opacity="0.32" />
          {/* mejilla: pelo de guardia también en la cara */}
          <g stroke="#9ff0ff" strokeWidth="0.6" strokeLinecap="round" fill="none" opacity="0.4">
            <path d="M10.4,1.4 C9,2.4 8.2,3 7.8,3.8" />
            <path d="M11,-2.2 C10.2,-3.6 9.8,-4.4 9.8,-5.2" />
          </g>

          {/* trufa rosada */}
          <ellipse cx="24.4" cy="4.6" rx="1.4" ry="1.1" fill="#ffc0dc" opacity="0.95"
            style={{ filter: 'drop-shadow(0 0 3px rgba(255,192,220,0.8))' }} />
          <path d="M24.4,5.2 L24.4,6" stroke="#0f0a24" strokeWidth="0.4" strokeLinecap="round" opacity="0.7" />

          {/* VIBRISAS (el marsupial lee el mundo con ellas) */}
          <g className="cn-zari-bigote">
            <g stroke="#eafff6" strokeWidth="0.45" fill="none" opacity="0.6" strokeLinecap="round">
              <path d="M22.4,3.2 C23.8,1.4 24.4,0 24.6,-1.6" />
              <path d="M22.8,4.2 C24.2,3.2 25,2.2 25.3,1" />
              <path d="M22.6,5.4 C24.2,5.6 25,6.2 25.3,7.2" />
              <path d="M21.6,6 C22.8,7.2 23.6,8.2 24,9.4" />
            </g>
          </g>

          {/* ojo: cuenta negra con anillo neón y brillo de linterna */}
          <circle cx="15.4" cy="-0.4" r="1.5" fill="#04160f" />
          <circle cx="15.4" cy="-0.4" r="1.5" fill="none" stroke="#9ff0ff" strokeWidth="0.7"
            style={{ filter: 'drop-shadow(0 0 3px #9ff0ff)' }} />
          <circle cx="15.9" cy="-0.9" r="0.5" fill="#eafff6" />
        </g>
      </g>
    </g>
  );
}

/* Cría de zarigüeya agarrada al lomo de la madre: cuerpito, hocico ya puntudo,
   orejas desnudas, manito que agarra el pelo y colita pelona. Miniatura fiel —
   la cría de Didelphis es la madre en pequeño, no un muñeco redondo. */
function ZariguyaCria({ x, y, escala = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${escala})`}>
      {/* cuerpito agachado sobre el lomo */}
      <path d="M-3.2,2.6 C-4,0.4 -2.6,-1.6 0,-1.8 C2.6,-2 4.2,-0.6 4.2,1.4 C4.2,2.8 2.6,3.4 -0.4,3.4 C-2,3.4 -2.8,3.2 -3.2,2.6 Z"
        fill="#1c1338" stroke="#9ff0ff" strokeWidth="0.55" strokeOpacity="0.65" />
      {/* colita pelona enroscada */}
      <path d="M-3,2.2 C-5.2,2.4 -6.2,1 -5.6,-0.4" fill="none" stroke="#9ff0ff" strokeWidth="0.6"
        strokeLinecap="round" opacity="0.7" />
      {/* orejita desnuda */}
      <path d="M2.6,-1.4 C2.2,-3.4 4.4,-4.2 5,-2.4 C4.6,-1.6 3.6,-1.2 2.6,-1.4 Z"
        fill="#141a3a" stroke="#9ff0ff" strokeWidth="0.45" strokeOpacity="0.6" />
      {/* cabecita con hocico ya puntudo */}
      <path d="M2.4,-0.6 C4,-1.6 5.6,-1 6.8,0 C7.4,0.5 7.3,1.3 6.6,1.3 C5.8,0.7 4.6,0.4 3.6,0.7
               C2.8,0.9 2.3,0.2 2.4,-0.6 Z"
        fill="#1c1338" stroke="#9ff0ff" strokeWidth="0.5" strokeOpacity="0.65" />
      <circle cx="6.5" cy="1.1" r="0.4" fill="#ffc0dc" opacity="0.9" />
      {/* ojito */}
      <circle cx="4" cy="-0.3" r="0.5" fill="#04160f" />
      <circle cx="4.15" cy="-0.45" r="0.18" fill="#eafff6" />
      {/* manito que AGARRA el pelo de la madre */}
      <path d="M-1,3 C-1.4,4 -1.2,4.8 -0.4,5" fill="none" stroke="#9ff0ff" strokeWidth="0.6"
        strokeLinecap="round" opacity="0.75" />
      <path d="M2,3.2 C2,4.2 2.4,4.8 3.2,5" fill="none" stroke="#9ff0ff" strokeWidth="0.6"
        strokeLinecap="round" opacity="0.75" />
    </g>
  );
}

/* Currucutú (Megascops choliba) — PERSONAJE COMPLETO, no silueta.
   Rasgos diagnósticos reales del estrígido andino: disco facial marcado con
   REBORDE oscuro, penachos auriculares erectos, ojos amarillos frontales
   enormes, patrón CRÍPTICO de corteza en el plumaje (estrías verticales +
   barrado fino) y postura vertical compacta con garras prensiles agarrando la
   madera. Anatomía = el efecto especial: si Julieta lo mira, entiende que ese
   pájaro está hecho para ver y agarrar en lo oscuro.
   Animación: respira (squash&stretch del pecho), gira la cabeza como búho,
   parpadea y le tiemblan los penachos. Contorno con line-boil rubber-hose. */
function AvatarBuho() {
  const uid = useId().replace(/[:]/g, '');
  const boilId = `cn-boil-buho-${uid}`;

  return (
    <g className="cn-av-flota" filter="url(#cn-glow1)">
      <defs>
        <LineBoilFilter id={boilId} baseFrequency={0.038} scale={1.8} animated={!CN_REDUCED} dur="0.42s" />
      </defs>

      <ellipse cx="0" cy="19" rx="14" ry="2.6" fill="#000" opacity="0.34" />

      {/* ── la rama: le da suelo, escala y oficio de vigía ── */}
      <g filter={`url(#${boilId})`}>
        <path d="M-19,15.4 C-9,14 9,14 19,15.6 C19,17.8 -19,17.6 -19,15.4 Z"
          fill="#141a3a" stroke="#ffcf5a" strokeWidth="0.8" strokeOpacity="0.42" />
        <path d="M-15,16.2 C-6,15.2 7,15.2 15,16.4" fill="none" stroke="#ffe6a6" strokeWidth="0.5" opacity="0.3" />
        {/* muñón de rama seca */}
        <path d="M13,15 C16,12.6 18.6,12 20.4,12.6 C18.6,13.6 17,14.4 16,15.4 Z"
          fill="#141a3a" stroke="#ffcf5a" strokeWidth="0.6" strokeOpacity="0.35" />
      </g>

      {/* ── cuerpo: masa compacta que RESPIRA ── */}
      <g className="cn-buho-respira">
        <g filter={`url(#${boilId})`}>
          {/* cola corta bajo el cuerpo */}
          <path d="M-5,10 C-4.6,15.6 4.6,15.6 5,10 Z" fill="#141a3a" stroke="#ffcf5a" strokeWidth="0.7" strokeOpacity="0.5" />
          <path d="M-2.6,11.4 L-2.2,15 M0,11.6 L0,15.4 M2.6,11.4 L2.2,15" stroke="#0f0a24" strokeWidth="0.7" opacity="0.8" />

          {/* torso rechoncho, hombros anchos y panza de búho posado */}
          <path d="M-10.6,-2 C-12.4,4 -10.4,11.4 -0.2,13.8 C10,11.6 12.4,4 10.6,-2 C8.6,-7.4 -8.6,-7.4 -10.6,-2 Z"
            fill="#171030" stroke="#ffcf5a" strokeWidth="0.9" strokeOpacity="0.55" />

          {/* volumen: el vientre recibe la luz de la luna */}
          <path d="M-6.6,1 C-7.4,6 -5.2,10.6 0,12.4 C5.2,10.6 7.4,6 6.6,1 C4,-1.4 -4,-1.4 -6.6,1 Z"
            fill="#1c1338" opacity="0.85" />

          {/* patrón CRÍPTICO de corteza: estrías verticales + barrado fino */}
          <path d="M-4.4,0.6 C-4.8,4 -4.6,8 -3.6,11 M0,-0.2 C-0.3,4 -0.2,8.4 0,12
                   M4.4,0.6 C4.8,4 4.6,8 3.6,11"
            fill="none" stroke="#0f0a24" strokeWidth="1.1" strokeLinecap="round" opacity="0.9" />
          <path d="M-6,2.4 Q0,4 6,2.4 M-6.6,5.6 Q0,7.2 6.6,5.6 M-5.6,8.8 Q0,10.4 5.6,8.8"
            fill="none" stroke="#ffe6a6" strokeWidth="0.7" opacity="0.4" />

          {/* ── alas plegadas: escapulares escalonadas, no una mancha plana ── */}
          <path d="M-10.6,-2.4 C-13.4,3 -12.6,10 -7.6,13.2 C-6,9.8 -6.2,3 -7.4,-2.4 Z"
            fill="#141a3a" stroke="#ffcf5a" strokeWidth="0.8" strokeOpacity="0.55" />
          <path d="M10.6,-2.4 C13.4,3 12.6,10 7.6,13.2 C6,9.8 6.2,3 7.4,-2.4 Z"
            fill="#141a3a" stroke="#ffcf5a" strokeWidth="0.8" strokeOpacity="0.55" />
          {/* escalones de pluma (coberteras) */}
          <path d="M-11.6,1.6 C-9.6,2.6 -8,2.4 -7,1.6 M-12,5.4 C-10,6.4 -8.4,6.2 -7.2,5.4 M-11.4,9.2 C-9.6,10.2 -8.2,10 -7,9.2"
            fill="none" stroke="#ffe6a6" strokeWidth="0.6" opacity="0.45" />
          <path d="M11.6,1.6 C9.6,2.6 8,2.4 7,1.6 M12,5.4 C10,6.4 8.4,6.2 7.2,5.4 M11.4,9.2 C9.6,10.2 8.2,10 7,9.2"
            fill="none" stroke="#ffe6a6" strokeWidth="0.6" opacity="0.45" />
        </g>

        {/* ── GARRAS PRENSILES agarrando la madera (rasgo diagnóstico) ── */}
        {/* tarsos emplumados */}
        <path d="M-5.4,11 C-6.6,12.4 -6.6,13.6 -5.6,14.2 C-4.4,13.8 -4.2,12.4 -4.6,11 Z"
          fill="#1c1338" stroke="#ffcf5a" strokeWidth="0.5" strokeOpacity="0.5" />
        <path d="M5.4,11 C6.6,12.4 6.6,13.6 5.6,14.2 C4.4,13.8 4.2,12.4 4.6,11 Z"
          fill="#1c1338" stroke="#ffcf5a" strokeWidth="0.5" strokeOpacity="0.5" />
        {/* dedos que ABRAZAN la rama */}
        <g stroke="#ffcf5a" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.92">
          <path d="M-5.2,13.6 C-7.4,14 -8.8,15 -9.2,16.4" />
          <path d="M-5.2,13.6 C-5.4,14.8 -5.2,15.8 -5,16.8" />
          <path d="M-5.2,13.6 C-3.4,14.2 -2.4,15.2 -2.2,16.4" />
          <path d="M5.2,13.6 C7.4,14 8.8,15 9.2,16.4" />
          <path d="M5.2,13.6 C5.4,14.8 5.2,15.8 5,16.8" />
          <path d="M5.2,13.6 C3.4,14.2 2.4,15.2 2.2,16.4" />
        </g>
        {/* uñas */}
        <g fill="#eafff6" opacity="0.75">
          <circle cx="-9.3" cy="16.7" r="0.45" /><circle cx="-5" cy="17.1" r="0.45" /><circle cx="-2.1" cy="16.7" r="0.45" />
          <circle cx="9.3" cy="16.7" r="0.45" /><circle cx="5" cy="17.1" r="0.45" /><circle cx="2.1" cy="16.7" r="0.45" />
        </g>
      </g>

      {/* ── CABEZA: gira como búho, sin mover el cuerpo ── */}
      <g className="cn-buho-cabeza">
        {/* penachos auriculares erectos (mechones) */}
        <g className="cn-buho-penacho">
          <path d="M-9.6,-9.6 C-11.4,-14.6 -10,-18.6 -7.6,-19.4 C-7,-16 -6.2,-12.6 -5,-10.2 Z"
            fill="#171030" stroke="#ffcf5a" strokeWidth="0.7" strokeOpacity="0.6" />
          <path d="M-9,-11.4 C-9.8,-14.6 -9,-17 -7.8,-18" fill="none" stroke="#ffe6a6" strokeWidth="0.5" opacity="0.45" />
        </g>
        <g className="cn-buho-penacho cn-buho-penacho-r">
          <path d="M9.6,-9.6 C11.4,-14.6 10,-18.6 7.6,-19.4 C7,-16 6.2,-12.6 5,-10.2 Z"
            fill="#171030" stroke="#ffcf5a" strokeWidth="0.7" strokeOpacity="0.6" />
          <path d="M9,-11.4 C9.8,-14.6 9,-17 7.8,-18" fill="none" stroke="#ffe6a6" strokeWidth="0.5" opacity="0.45" />
        </g>

        {/* DISCO FACIAL con reborde oscuro (el rasgo que lo hace currucutú) */}
        <path d="M0,-16.4 C-7.4,-16.8 -11.4,-12 -11,-6 C-10.6,-0.6 -5.6,2.6 0,2.6 C5.6,2.6 10.6,-0.6 11,-6 C11.4,-12 7.4,-16.8 0,-16.4 Z"
          fill="#1c1338" stroke="#0f0a24" strokeWidth="1.6" strokeOpacity="0.95" />
        <path d="M0,-16.4 C-7.4,-16.8 -11.4,-12 -11,-6 C-10.6,-0.6 -5.6,2.6 0,2.6 C5.6,2.6 10.6,-0.6 11,-6 C11.4,-12 7.4,-16.8 0,-16.4 Z"
          fill="none" stroke="#ffcf5a" strokeWidth="0.7" strokeOpacity="0.5" />
        {/* plumitas radiales del disco */}
        <g stroke="#ffe6a6" strokeWidth="0.45" fill="none" opacity="0.32">
          <path d="M-8.6,-11.4 C-6.6,-10 -5.4,-8.6 -4.8,-7.2" />
          <path d="M-9.8,-6.4 C-7.4,-6 -6,-5.4 -5,-4.6" />
          <path d="M-8.4,-1.4 C-6.4,-2 -5,-2.6 -4.2,-3.4" />
          <path d="M8.6,-11.4 C6.6,-10 5.4,-8.6 4.8,-7.2" />
          <path d="M9.8,-6.4 C7.4,-6 6,-5.4 5,-4.6" />
          <path d="M8.4,-1.4 C6.4,-2 5,-2.6 4.2,-3.4" />
        </g>
        {/* cejas crípticas: la expresión seria del cazador */}
        <path d="M-8.6,-10.2 C-6.6,-12.4 -2.6,-12.6 -1,-10.6 M8.6,-10.2 C6.6,-12.4 2.6,-12.6 1,-10.6"
          fill="none" stroke="#0f0a24" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />

        {/* OJOS AMARILLOS FRONTALES ENORMES */}
        <circle cx="-4.4" cy="-6.4" r="4.3" fill="#04160f" stroke="#ffd76a" strokeWidth="1.1" />
        <circle cx="4.4" cy="-6.4" r="4.3" fill="#04160f" stroke="#ffd76a" strokeWidth="1.1" />
        <circle cx="-4.4" cy="-6.4" r="2.7" fill="#ffd76a" style={{ filter: 'drop-shadow(0 0 5px #ffd76a)' }} />
        <circle cx="4.4" cy="-6.4" r="2.7" fill="#ffd76a" style={{ filter: 'drop-shadow(0 0 5px #ffd76a)' }} />
        <circle cx="-4.4" cy="-6.4" r="1.35" fill="#04160f" />
        <circle cx="4.4" cy="-6.4" r="1.35" fill="#04160f" />
        <circle cx="-3.4" cy="-7.6" r="0.75" fill="#eafff6" />
        <circle cx="5.4" cy="-7.6" r="0.75" fill="#eafff6" />
        {/* párpados (parpadeo) */}
        <circle className="cn-buho-parpado" cx="-4.4" cy="-6.4" r="4.3" fill="#1c1338" />
        <circle className="cn-buho-parpado" cx="4.4" cy="-6.4" r="4.3" fill="#1c1338" />

        {/* pico ganchudo entre los ojos */}
        <path d="M-1.7,-3.4 C-1.4,-1 -0.7,0.6 0,1.6 C0.7,0.6 1.4,-1 1.7,-3.4 Z" fill="#ffcf5a" />
        <path d="M0,0.4 C-0.5,1 -0.2,1.8 0.4,1.6" fill="none" stroke="#ffe6a6" strokeWidth="0.5" opacity="0.8" />
      </g>
    </g>
  );
}

/* Murciélago nectarívoro (Glossophaga soricina): alas membranosas abiertas,
   hocico largo y lengua de glow; en vuelo. Acento violeta. */
function AvatarMurcielago() {
  return (
    <g className="cn-av-vuela" filter="url(#cn-glow1)">
      <path className="cn-ala-mur" d="M-2,-2 C-9,-8 -19,-8 -24,-2 C-20,-2.6 -16,-1.4 -14,1.6 C-12,-0.6 -9.5,-0.4 -8,1.4 C-6,-0.4 -4,-0.4 -2,1 Z" fill="#1c1338" stroke="#c78bff" strokeWidth="0.8" strokeOpacity="0.7" />
      <path className="cn-ala-mur" style={{ animationDelay: '-0.05s' }} d="M2,-2 C9,-8 19,-8 24,-2 C20,-2.6 16,-1.4 14,1.6 C12,-0.6 9.5,-0.4 8,1.4 C6,-0.4 4,-0.4 2,1 Z" fill="#1c1338" stroke="#c78bff" strokeWidth="0.8" strokeOpacity="0.7" />
      <ellipse cx="0" cy="0.5" rx="3.2" ry="5.4" fill="#171030" stroke="#c78bff" strokeWidth="0.8" strokeOpacity="0.6" />
      {/* cabeza + orejas */}
      <circle cx="0" cy="-5" r="3" fill="#1c1338" stroke="#c78bff" strokeWidth="0.7" strokeOpacity="0.6" />
      <path d="M-2.4,-7 L-3.6,-10.4 L-1,-8 Z" fill="#1c1338" stroke="#c78bff" strokeWidth="0.6" strokeOpacity="0.6" />
      <path d="M2.4,-7 L3.6,-10.4 L1,-8 Z" fill="#1c1338" stroke="#c78bff" strokeWidth="0.6" strokeOpacity="0.6" />
      {/* hocico largo + lengua */}
      <path d="M-1.2,-3 L1.2,-3 L0,1 Z" fill="#c78bff" opacity="0.9" />
      <path d="M0,1 L0,4.2" stroke="#f0d9ff" strokeWidth="0.9" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 3px #e6c6ff)' }} />
      {/* ojos */}
      <circle cx="-1.2" cy="-5.2" r="0.7" fill="#f0d9ff" style={{ filter: 'drop-shadow(0 0 3px #e6c6ff)' }} />
      <circle cx="1.2" cy="-5.2" r="0.7" fill="#f0d9ff" style={{ filter: 'drop-shadow(0 0 3px #e6c6ff)' }} />
    </g>
  );
}

/* Luciérnaga / cocuyo (Lampyridae): escarabajo con élitros oscuros, antenas y
   abdomen bioluminiscente pulsante. Acento lima. */
function AvatarLuciernaga() {
  return (
    <g className="cn-av-flota">
      <g filter="url(#cn-glow1)">
        <circle className="cn-luz-halo" cx="7" cy="4" r="7" fill="#d8ff6a" opacity="0.4" filter="url(#cn-blur3)" />
        {/* élitros */}
        <ellipse cx="-0.5" cy="-1" rx="6.8" ry="4.6" fill="#171030" stroke="#c6ff4f" strokeWidth="0.8" strokeOpacity="0.7" />
        <path d="M-0.5,-5.4 L-0.5,3.4" stroke="#9dff3f" strokeWidth="0.7" opacity="0.6" />
        {/* pronoto / cabeza */}
        <circle cx="-6.5" cy="-2.6" r="2.6" fill="#1c1338" stroke="#c6ff4f" strokeWidth="0.7" strokeOpacity="0.6" />
        {/* antenas */}
        <path d="M-8,-4 C-11,-6.4 -13.5,-6.4 -15.5,-5.2 M-8,-2.8 C-11,-4 -13.5,-3.4 -15.5,-2.2" stroke="#c6ff4f" strokeWidth="0.7" fill="none" strokeLinecap="round" />
        {/* abdomen bioluminiscente */}
        <ellipse className="cn-luz" cx="7" cy="3.4" rx="3.4" ry="2.8" fill="#f6ffb0" style={{ filter: 'drop-shadow(0 0 6px #d8ff6a)' }} />
        <circle cx="7" cy="3.4" r="1.3" fill="#ffffff" opacity="0.9" />
        {/* patitas */}
        <path d="M-3,3 l-1.6,3 M0,4 l-0.4,3 M3,3.4 l1,3" stroke="#9dff3f" strokeWidth="0.7" strokeLinecap="round" />
      </g>
    </g>
  );
}

/* Marteja / mono nocturno (Aotus lemurinus): único primate nocturno de
   Colombia. Cabeza redonda dominada por OJOS ENORMES reflectantes con glow
   (rasgo diagnóstico), arcos faciales oscuros, orejas redondas casi ocultas y
   cola larga colgante; arborícola encogido. Acento naranja. */
function AvatarMarteja() {
  return (
    <g className="cn-av-flota" filter="url(#cn-glow1)">
      <ellipse cx="0" cy="15" rx="12" ry="3" fill="#000" opacity="0.35" />
      {/* cola larga enroscada */}
      <path d="M10,8 C18,8 21,2 19,-4 C18,-6 15,-6 16,-3" fill="none" stroke="#ff9d4f" strokeWidth="1.8" strokeLinecap="round" opacity="0.8" />
      {/* cuerpo compacto encogido */}
      <path d="M-9,12 C-11,4 -7,-2 0,-2 C7,-2 11,4 10,11 C9,14 4,15 -2,15 C-6,15 -8,14 -9,12 Z" fill="#171030" stroke="#ff9d4f" strokeWidth="0.9" strokeOpacity="0.6" />
      {/* brazos que abrazan */}
      <path d="M-7,3 C-4,7 4,7 7,3" fill="none" stroke="#2a1e50" strokeWidth="2.4" strokeLinecap="round" opacity="0.85" />
      {/* patas */}
      <path d="M-5,14 L-5,9 M4,14 L4,9" stroke="#0f0a24" strokeWidth="2.8" strokeLinecap="round" />
      {/* cabeza redonda */}
      <circle cx="0" cy="-7" r="7.5" fill="#1c1338" stroke="#ff9d4f" strokeWidth="0.9" strokeOpacity="0.6" />
      {/* orejitas redondas casi ocultas */}
      <circle cx="-6.5" cy="-11" r="1.6" fill="#1c1338" stroke="#ff9d4f" strokeWidth="0.6" strokeOpacity="0.6" />
      <circle cx="6.5" cy="-11" r="1.6" fill="#1c1338" stroke="#ff9d4f" strokeWidth="0.6" strokeOpacity="0.6" />
      {/* arcos faciales oscuros (patrón de Aotus) */}
      <path d="M-7,-9.4 C-5,-12.4 -1,-12.4 0,-9.2 M0,-9.2 C1,-12.4 5,-12.4 7,-9.4" fill="none" stroke="#2a1e50" strokeWidth="1.4" opacity="0.75" />
      {/* OJOS ENORMES reflectantes (rasgo diagnóstico) */}
      <circle cx="-3.4" cy="-7" r="3.7" fill="#04160f" stroke="#ffcf5a" strokeWidth="1" />
      <circle cx="3.4" cy="-7" r="3.7" fill="#04160f" stroke="#ffcf5a" strokeWidth="1" />
      <circle cx="-3.4" cy="-7" r="2.4" fill="#ffb54f" style={{ filter: 'drop-shadow(0 0 5px #ffb54f)' }} />
      <circle cx="3.4" cy="-7" r="2.4" fill="#ffb54f" style={{ filter: 'drop-shadow(0 0 5px #ffb54f)' }} />
      <circle cx="-2.5" cy="-7.9" r="0.85" fill="#eafff6" />
      <circle cx="4.3" cy="-7.9" r="0.85" fill="#eafff6" />
      {/* naricita + boca */}
      <ellipse cx="0" cy="-2.6" rx="1.6" ry="1.2" fill="#ffd0a0" opacity="0.7" />
      <circle cx="0" cy="-3" r="0.6" fill="#04160f" />
    </g>
  );
}

/* Gurre / armadillo (Dasypus novemcinctus): caparazón abombado con bandas,
   hocico largo, orejas tubulares y cola cónica. Acento menta. */
function AvatarArmadillo() {
  return (
    <g className="cn-av-camina" filter="url(#cn-glow1)">
      <ellipse cx="0" cy="13" rx="16" ry="3" fill="#000" opacity="0.38" />
      <path d="M-13,6 C-19,7 -22,4 -23.5,1" fill="none" stroke="#6fe6c0" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
      {/* caparazón */}
      <path d="M-13,9 C-14,-1 -6,-7 3,-7 C11,-7 15,-1 15,7 C15,10 10,12 0,12 C-8,12 -12,11 -13,9 Z" fill="#141a3a" stroke="#6fe6c0" strokeWidth="0.9" strokeOpacity="0.65" />
      {/* bandas */}
      <path d="M-6,-6 C-7,-1 -7,6 -6,11" stroke="#8ff0d4" strokeWidth="0.8" fill="none" opacity="0.55" />
      <path d="M-1,-7 C-2,-1 -2,7 -1,12" stroke="#8ff0d4" strokeWidth="0.8" fill="none" opacity="0.55" />
      <path d="M4,-7 C3,-1 3,7 4,12" stroke="#8ff0d4" strokeWidth="0.8" fill="none" opacity="0.55" />
      <path d="M9,-5 C9.5,0 9.5,7 9,11" stroke="#8ff0d4" strokeWidth="0.8" fill="none" opacity="0.5" />
      <path d="M-10,3 C-6,1 8,1 13,4" stroke="#8ff0d4" strokeWidth="0.7" fill="none" opacity="0.4" />
      <path d="M-8,11 L-8,7 M2,12 L2,7.5 M10,10 L10,6" stroke="#0f0a24" strokeWidth="3" strokeLinecap="round" />
      {/* cabeza + hocico largo */}
      <path d="M13,-1 C19,-2 24,0 25.4,3 C26,4.4 25,5.4 23.4,5 C22.4,3 19,2 15,2.6 C13.6,2.8 13,0.8 13,-1 Z" fill="#1c2350" stroke="#6fe6c0" strokeWidth="0.8" strokeOpacity="0.6" />
      {/* orejas tubulares */}
      <path d="M9,-5 C8,-11 13,-12 14,-7 C13,-5.5 11,-5 9,-5 Z" fill="#1c2350" stroke="#6fe6c0" strokeWidth="0.7" strokeOpacity="0.6" />
      <circle cx="16.6" cy="0" r="1" fill="#04160f" />
      <circle cx="16.6" cy="0" r="1" fill="none" stroke="#6fe6c0" strokeWidth="0.6" />
      <circle cx="16.9" cy="-0.4" r="0.35" fill="#eafff6" />
      <circle cx="24.8" cy="3.6" r="1" fill="#8ff0d4" opacity="0.9" />
    </g>
  );
}

/* Tigrillo / oncilla (Leopardus tigrinus): felino pequeño agazapado, orejas
   puntudas, ojos de pupila vertical con glow, rosetas y cola anillada.
   Acento coral. */
function AvatarTigrillo() {
  return (
    <g className="cn-av-flota" filter="url(#cn-glow1)">
      <ellipse cx="0" cy="13" rx="16" ry="3" fill="#000" opacity="0.38" />
      <path d="M13,7 C20,6 23,1 21,-4 C20,-6 17,-6 18,-3" fill="none" stroke="#ff7d5a" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
      <path d="M18.6,3.2 l2,0.6 M19.8,-0.8 l2,0.5" stroke="#ffb59a" strokeWidth="0.8" strokeLinecap="round" opacity="0.7" />
      <path d="M-13,9 C-15,3 -9,-3 0,-4 C9,-4 14,1 14,7 C14,11 8,12 -3,12 C-9,12 -12,11 -13,9 Z" fill="#171030" stroke="#ff7d5a" strokeWidth="0.9" strokeOpacity="0.6" />
      {/* rosetas */}
      <circle cx="-4" cy="2" r="1.2" fill="none" stroke="#ff7d5a" strokeWidth="0.7" opacity="0.6" />
      <circle cx="2" cy="4" r="1.1" fill="none" stroke="#ff7d5a" strokeWidth="0.7" opacity="0.55" />
      <circle cx="7" cy="1" r="1" fill="none" stroke="#ff7d5a" strokeWidth="0.7" opacity="0.5" />
      <path d="M-8,11 L-8,7 M-1,12 L-1,7.5 M7,11 L7,6.5" stroke="#0f0a24" strokeWidth="3" strokeLinecap="round" />
      {/* cabeza */}
      <circle cx="-10" cy="-5" r="6" fill="#1c1338" stroke="#ff7d5a" strokeWidth="0.9" strokeOpacity="0.6" />
      {/* orejas puntudas */}
      <path d="M-14,-9 L-15.5,-14 L-11,-11 Z" fill="#1c1338" stroke="#ff7d5a" strokeWidth="0.7" strokeOpacity="0.6" />
      <path d="M-6,-9 L-4.5,-14 L-9,-11 Z" fill="#1c1338" stroke="#ff7d5a" strokeWidth="0.7" strokeOpacity="0.6" />
      {/* ojos con pupila vertical */}
      <ellipse cx="-12" cy="-5" rx="1.5" ry="2" fill="#04160f" stroke="#ffd76a" strokeWidth="0.7" />
      <ellipse cx="-8" cy="-5" rx="1.5" ry="2" fill="#04160f" stroke="#ffd76a" strokeWidth="0.7" />
      <path d="M-12,-6.2 L-12,-3.8 M-8,-6.2 L-8,-3.8" stroke="#ffd76a" strokeWidth="0.7" style={{ filter: 'drop-shadow(0 0 3px #ffd76a)' }} />
      {/* hocico + nariz */}
      <path d="M-11.4,-2 L-8.6,-2 L-10,-0.2 Z" fill="#ffb59a" opacity="0.85" />
      <path d="M-9.4,-0.6 C-6.4,-0.2 -4.4,-0.8 -3.4,-1.8" stroke="#eafff6" strokeWidth="0.5" fill="none" opacity="0.6" />
    </g>
  );
}

/* Cóndor de los Andes (Vultur gryphus): silueta de gran ala planeando con
   primarias abiertas en dedos, gorguera blanca y cabeza calva con carúncula.
   DIURNO — el vigía del valle. Acento azul pálido. */
function AvatarCondor() {
  return (
    <g className="cn-av-planea" filter="url(#cn-glow1)">
      {/* ala izquierda con dedos */}
      <path d="M-3,-1 C-9,-5 -16,-6 -22,-4 L-23.4,-2.4 L-20.6,-2.2 L-21.6,-0.6 L-19,-0.6 L-19.6,1 L-16.4,0.5 C-11,1 -6,0.6 -3,1.8 Z" fill="#141a3a" stroke="#bfe3ff" strokeWidth="0.9" strokeOpacity="0.65" />
      {/* ala derecha con dedos */}
      <path d="M3,-1 C9,-5 16,-6 22,-4 L23.4,-2.4 L20.6,-2.2 L21.6,-0.6 L19,-0.6 L19.6,1 L16.4,0.5 C11,1 6,0.6 3,1.8 Z" fill="#141a3a" stroke="#bfe3ff" strokeWidth="0.9" strokeOpacity="0.65" />
      {/* nervadura del ala */}
      <path d="M-4,0 C-9,-2.4 -15,-3 -20,-2.6 M4,0 C9,-2.4 15,-3 20,-2.6" fill="none" stroke="#dbf0ff" strokeWidth="0.7" opacity="0.5" />
      {/* cuerpo + cola en cuña */}
      <path d="M-3.4,-1 C-3.4,-3.2 3.4,-3.2 3.4,-1 C3.4,3 1.4,6.4 0,9 C-1.4,6.4 -3.4,3 -3.4,-1 Z" fill="#171030" stroke="#bfe3ff" strokeWidth="0.8" strokeOpacity="0.6" />
      {/* gorguera blanca */}
      <ellipse cx="0" cy="-2.6" rx="3.6" ry="1.9" fill="#eafff6" opacity="0.92" />
      {/* cabeza calva */}
      <circle cx="0" cy="-6.4" r="2.2" fill="#1c1338" stroke="#bfe3ff" strokeWidth="0.7" strokeOpacity="0.6" />
      {/* carúncula (cresta del macho) */}
      <path d="M-0.4,-8.4 C-0.8,-10.6 1,-10.8 0.9,-8.8 Z" fill="#bfe3ff" opacity="0.7" />
      {/* pico */}
      <path d="M1.8,-6.6 L4.4,-6.1 L2,-5.1 Z" fill="#dbf0ff" />
      <circle cx="0.8" cy="-6.8" r="0.55" fill="#04160f" />
      <circle cx="1" cy="-7" r="0.22" fill="#eafff6" />
    </g>
  );
}

const AVATAR = {
  zariguya: AvatarZariguya,
  buho: AvatarBuho,
  murcielago: AvatarMurcielago,
  luciernaga: AvatarLuciernaga,
  marteja: AvatarMarteja,
  armadillo: AvatarArmadillo,
  tigrillo: AvatarTigrillo,
  condor: AvatarCondor,
};

/**
 * CriaturaNocturnaAvatar — un avatar aislado en su propio SVG (chip o héroe),
 * mismo contrato que GuardianAvatar de GuardianEspiritu.
 * @param {{ id: string, size?: number }} props
 */
export function CriaturaNocturnaAvatar({ id, size = 64 }) {
  const Cuerpo = AVATAR[id] || AvatarZariguya;
  return (
    <svg viewBox="-26 -24 52 46" width={size} height={size} aria-hidden="true" focusable="false">
      <CriaturasNocturnasDefs />
      <Cuerpo />
    </svg>
  );
}

export { byId as criaturaNocturnaById };
