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
 *
 * NIVEL PERSONAJE: murciélago, gurre y tigrillo dejaron de ser siluetas-chip y
 * son personajes completos (anatomía diagnóstica real, peso, gesto y animación
 * rubber-hose andina — boil steps ~12fps, parpadeo irregular, mirada co-prima;
 * clases cn-* nuevas al final de criaturas-nocturnas.css).
 */
import './criaturas-nocturnas.css';

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

/* Zarigüeya (Didelphis marsupialis): cuadrúpedo de hocico puntudo, orejas
   grandes y cola pelona prensil enroscada; contorno cian glacial. */
function AvatarZariguya() {
  return (
    <g className="cn-av-camina" filter="url(#cn-glow1)">
      <ellipse cx="0" cy="14" rx="16" ry="3" fill="#000" opacity="0.38" />
      <path d="M-12,6 C-20,8 -22,2 -18,-2 C-16,-4 -13,-3 -14,0" fill="none" stroke="#9ff0ff" strokeWidth="1.6" strokeLinecap="round" opacity="0.85" />
      <path d="M-13,8 C-15,1 -9,-4 0,-4 C9,-4 14,1 14,7 C14,11 8,13 -2,13 C-9,13 -12,12 -13,8 Z" fill="#171030" stroke="#9ff0ff" strokeWidth="0.9" strokeOpacity="0.6" />
      <path d="M-10,-1 C-3,-5 8,-4 13,2" fill="none" stroke="#d8f6ff" strokeWidth="0.9" opacity="0.5" />
      <path d="M-8,12 L-8,7 M0,13 L0,7.5 M8,11 L8,6.5" stroke="#0f0a24" strokeWidth="3.2" strokeLinecap="round" />
      {/* orejas grandes */}
      <path d="M6,-4 C4,-10 10,-11 11,-6 C10,-4.5 8,-4 6,-4 Z" fill="#1c1338" stroke="#9ff0ff" strokeWidth="0.7" strokeOpacity="0.6" />
      <path d="M11,-4 C9,-10 15,-11 16,-6 C15,-4.5 13,-4 11,-4 Z" fill="#1c1338" stroke="#9ff0ff" strokeWidth="0.7" strokeOpacity="0.6" />
      {/* cabeza + hocico puntudo a la derecha */}
      <path d="M11,-1 C17,-2 22,1 24.4,4 C25,5.4 24,6.5 22.4,6 C22,4 18.5,2.5 14.5,3 C12.6,3.2 11,1 11,-1 Z" fill="#1c1338" stroke="#9ff0ff" strokeWidth="0.8" strokeOpacity="0.6" />
      {/* cara pálida del marsupial */}
      <path d="M13,-0.5 C15,-1 17,-0.6 18,1 C16.5,2 14.5,1.6 13,0.6 Z" fill="#eafff6" opacity="0.5" />
      <circle cx="24" cy="4.2" r="1.15" fill="#ffc0dc" opacity="0.9" />
      <circle cx="15.4" cy="1" r="1.15" fill="#04160f" />
      <circle cx="15.4" cy="1" r="1.15" fill="none" stroke="#9ff0ff" strokeWidth="0.7" />
      <circle cx="15.8" cy="0.6" r="0.4" fill="#eafff6" />
    </g>
  );
}

/* Currucutú (Megascops choliba): búho compacto de penachos, disco facial y ojos
   enormes ámbar con glow; posado. Acento dorado. */
function AvatarBuho() {
  return (
    <g className="cn-av-flota" filter="url(#cn-glow1)">
      <ellipse cx="0" cy="15" rx="12" ry="2.6" fill="#000" opacity="0.38" />
      <path d="M-10,13 C-12,2 -8,-10 0,-11 C8,-10 12,2 10,13 C7,16 -7,16 -10,13 Z" fill="#171030" stroke="#ffcf5a" strokeWidth="0.9" strokeOpacity="0.55" />
      {/* barrado del pecho */}
      <path d="M-5,2 Q0,4 5,2 M-6,6 Q0,8 6,6 M-5,10 Q0,12 5,10" fill="none" stroke="#ffe6a6" strokeWidth="0.8" opacity="0.45" />
      {/* penachos */}
      <path d="M-9,-8 L-6,-15.5 L-3,-8 Z" fill="#1c1338" stroke="#ffcf5a" strokeWidth="0.7" strokeOpacity="0.6" />
      <path d="M9,-8 L6,-15.5 L3,-8 Z" fill="#1c1338" stroke="#ffcf5a" strokeWidth="0.7" strokeOpacity="0.6" />
      {/* disco facial */}
      <ellipse cx="0" cy="-5" rx="9" ry="8" fill="#1c1338" stroke="#ffcf5a" strokeWidth="0.7" strokeOpacity="0.45" />
      {/* ojos enormes */}
      <circle cx="-3.6" cy="-5" r="3.4" fill="#04160f" stroke="#ffd76a" strokeWidth="1" />
      <circle cx="3.6" cy="-5" r="3.4" fill="#04160f" stroke="#ffd76a" strokeWidth="1" />
      <circle cx="-3.6" cy="-5" r="1.7" fill="#ffd76a" style={{ filter: 'drop-shadow(0 0 4px #ffd76a)' }} />
      <circle cx="3.6" cy="-5" r="1.7" fill="#ffd76a" style={{ filter: 'drop-shadow(0 0 4px #ffd76a)' }} />
      <circle cx="-3" cy="-5.7" r="0.55" fill="#eafff6" />
      <circle cx="4.2" cy="-5.7" r="0.55" fill="#eafff6" />
      {/* pico */}
      <path d="M-1.4,-2 L1.4,-2 L0,1.6 Z" fill="#ffcf5a" />
      {/* garras */}
      <path d="M-4,14 l0,2 M4,14 l0,2" stroke="#ffcf5a" strokeWidth="1.4" strokeLinecap="round" />
    </g>
  );
}

/* Murciélago nectarívoro (Glossophaga soricina) — PERSONAJE COMPLETO.
   Pose: cernido de alimentación sobre una flor nocturna, con la LENGUA
   larguísima extensible (el rasgo diagnóstico) metida en la corola — la
   polinización pasando en vivo. El ala de un murciélago es una MANO: húmero,
   muñeca con pulgar-garfio y cuatro dedos larguísimos como huesos visibles
   dentro del patagio festoneado (nada de ala de pájaro). Uropatagio entre las
   patas, hoja nasal en el hocico, polen dorado pegado al hocico. Vuelo de
   aleteo rápido y errático (cernido irregular, nunca planeo). Acento violeta. */
function AvatarMurcielago() {
  return (
    <g filter="url(#cn-glow1)">
      {/* ── flor nocturna anclada (abre al oscurecer): campana pálida ── */}
      <path d="M20,22 C18.4,17.8 16.4,14.6 14.4,12.4" fill="none" stroke="#6fe6c0" strokeWidth="1" strokeLinecap="round" opacity="0.45" />
      <path d="M17.6,17.4 C19.4,17 20.8,17.6 21.6,18.8 C20,19.4 18.4,18.8 17.6,17.4 Z" fill="#6fe6c0" opacity="0.35" />
      {/* pétalos traseros abriéndose hacia el visitante */}
      <path d="M13.2,10.8 C11,9.4 9.6,7.4 9.4,5.6 C10.9,5.8 12.5,7.1 13.6,8.9 Z" fill="#eafff6" opacity="0.72" stroke="#c78bff" strokeWidth="0.5" strokeOpacity="0.4" />
      <path d="M13.2,10.8 C12.4,8.4 12.6,6.2 13.9,4.7 C14.9,6.2 15.1,8.3 14.5,10.2 Z" fill="#eafff6" opacity="0.6" stroke="#c78bff" strokeWidth="0.5" strokeOpacity="0.4" />
      <path d="M13.2,10.8 C14.9,9.8 16.7,9.6 18.1,10.3 C17.2,11.5 15.4,11.9 13.8,11.7 Z" fill="#eafff6" opacity="0.66" stroke="#c78bff" strokeWidth="0.5" strokeOpacity="0.4" />
      {/* estambres con antera dorada: ahí queda el polen */}
      <path d="M13,10.6 C11.6,9 10.6,7.6 10,6.4" fill="none" stroke="#f0d9ff" strokeWidth="0.5" opacity="0.7" />
      <circle cx="9.8" cy="6.2" r="0.55" fill="#ffd76a" style={{ filter: 'drop-shadow(0 0 2.5px #ffd76a)' }} />
      {/* ── ala LEJANA (subiendo, en contrafase): la mano foreshortened ── */}
      <g className="cn-mur-ala-far" style={{ transformBox: 'fill-box', transformOrigin: '8% 96%' }}>
        <path d="M0,-3 C2.2,-6.8 4.4,-10.4 6.5,-13.5 C9,-15 11.2,-16.4 13.5,-17.5 C13.2,-15.3 14.5,-13.5 16,-12 C14.7,-10.2 14.1,-8.4 14,-6.5 C11,-4.4 7,-2.6 4,-2 C2.6,-1.8 1,-2.2 0,-3 Z" fill="#171030" opacity="0.85" stroke="#c78bff" strokeWidth="0.6" strokeOpacity="0.4" />
        <path d="M6.5,-13.5 C9,-15 11.2,-16.4 13.5,-17.5 M6.5,-13.5 C9.6,-13.3 13,-12.6 16,-12 M6.5,-13.5 C8.9,-11.4 11.6,-8.8 14,-6.5" fill="none" stroke="#c78bff" strokeWidth="0.5" strokeOpacity="0.45" />
      </g>
      {/* ── el cuerpo: cernido errático (nunca en el mismo compás que la lengua) ── */}
      <g className="cn-mur-cierne">
        {/* torso peludito con boil de respiración */}
        <g className="cn-boil">
          <path d="M-2.2,-4.6 C0.4,-3 0.6,0 -1.6,1.6 C-4,3.2 -8,2 -10.4,-0.6 C-12,-2.6 -11.4,-5.4 -9,-6.6 C-6.6,-7.6 -4,-6.4 -2.2,-4.6 Z" fill="#171030" stroke="#c78bff" strokeWidth="0.9" strokeOpacity="0.6" />
          {/* lomo iluminado + ticks de pelaje */}
          <path d="M-9.6,-5.6 C-7.4,-6.6 -5,-6.2 -3.4,-4.8" fill="none" stroke="#eafff6" strokeWidth="0.7" opacity="0.45" />
          <path d="M-9.8,-2.4 l-1,0.8 M-7.6,0.2 l-0.9,0.9 M-4.8,1.2 l-0.7,1" stroke="#c78bff" strokeWidth="0.5" strokeLinecap="round" opacity="0.4" />
        </g>
        {/* patas + UROPATAGIO (membrana entre las patas, rasgo real) */}
        <path d="M-9.8,0.6 L-11,3.5 M-8.4,1.4 L-8,4.5" stroke="#0f0a24" strokeWidth="1.1" strokeLinecap="round" />
        <path d="M-11,3.5 C-10.4,5.9 -9,6.4 -8,4.5 C-8.6,3.4 -10,3 -11,3.5 Z" fill="#1c1338" stroke="#c78bff" strokeWidth="0.6" strokeOpacity="0.5" />
        {/* cabeza inclinada hacia la flor */}
        <circle cx="2" cy="0" r="3.1" fill="#1c1338" stroke="#c78bff" strokeWidth="0.8" strokeOpacity="0.6" />
        {/* orejas medianas SEPARADAS (no de orejón) */}
        <path d="M0.4,-2.6 C-0.8,-6.4 1.6,-7.6 2.6,-4.6 C2.4,-3.5 1.6,-2.8 0.4,-2.6 Z" fill="#1c1338" stroke="#c78bff" strokeWidth="0.6" strokeOpacity="0.6" />
        <path d="M3.4,-2.9 C3.4,-6.6 6,-6.9 6.4,-4.2 C5.7,-3.2 4.6,-2.8 3.4,-2.9 Z" fill="#1c1338" stroke="#c78bff" strokeWidth="0.6" strokeOpacity="0.6" />
        <path d="M1.2,-4.6 C1.4,-3.9 1.4,-3.4 1.2,-3 M4.6,-4.8 C4.7,-4.1 4.7,-3.6 4.5,-3.2" stroke="#f0d9ff" strokeWidth="0.4" fill="none" opacity="0.5" />
        {/* hocico ALARGADO de nectarívoro con hoja nasal */}
        <path d="M3.2,-1.6 C6,-0.8 7.8,1.4 8.4,4 C8.6,4.9 7.8,5.4 7,4.9 C5.4,3.8 3.6,2 2.6,0.2 Z" fill="#1c1338" stroke="#c78bff" strokeWidth="0.7" strokeOpacity="0.6" />
        <path d="M7.5,3.2 L8.8,4.2 L7.4,4.8 Z" fill="#c78bff" opacity="0.9" />
        {/* ojo de goma: pupila grande, iris con glow, catchlight vivo */}
        <g className="cn-parpadeo">
          <circle cx="3.6" cy="0.4" r="1.25" fill="#04160f" stroke="#c78bff" strokeWidth="0.6" />
          <g className="cn-mirada">
            <circle cx="3.7" cy="0.5" r="0.75" fill="#e6c6ff" style={{ filter: 'drop-shadow(0 0 3px #e6c6ff)' }} />
            <circle cx="3.4" cy="0.1" r="0.34" fill="#eafff6" />
          </g>
        </g>
        {/* LA LENGUA: extensible, con glow, lamiendo el néctar (dasharray) */}
        <path className="cn-mur-lengua" pathLength="10" d="M7.6,5.2 C9.4,6.6 11.2,8.4 12.8,10.4" fill="none" stroke="#f0d9ff" strokeWidth="1.15" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 3.5px #e6c6ff)' }} />
        {/* polen dorado pegado al hocico: se lo lleva a la próxima flor */}
        <circle cx="6.6" cy="3.1" r="0.4" fill="#ffd76a" opacity="0.9" style={{ filter: 'drop-shadow(0 0 2px #ffd76a)' }} />
        <circle cx="7.5" cy="4.3" r="0.3" fill="#ffd76a" opacity="0.75" />
      </g>
      {/* pétalo delantero: tapa la punta de la lengua → se ve ADENTRO de la flor */}
      <path d="M11.4,9.4 C12.4,11 14.2,11.8 16,11.4 C14.6,12.6 12.4,12.2 11,10.6 Z" fill="#eafff6" opacity="0.82" stroke="#c78bff" strokeWidth="0.5" strokeOpacity="0.45" />
      {/* motas de polen en el aire entre flor y hocico */}
      <circle className="cn-mur-polen" cx="11.2" cy="7.2" r="0.45" fill="#ffd76a" />
      <circle className="cn-mur-polen" style={{ animationDelay: '-1.3s' }} cx="9.2" cy="4.6" r="0.35" fill="#e6c6ff" />
      {/* ── ala CERCANA: la MANO desplegada — húmero, muñeca, pulgar y 4 dedos ── */}
      <g className="cn-mur-ala" style={{ transformBox: 'fill-box', transformOrigin: '94% 90%' }}>
        {/* patagio: membrana festoneada colgada de los dedos */}
        <path d="M-3,-4 C-6.6,-7.2 -10,-10.6 -13,-13 C-16.6,-13.6 -20.2,-13.5 -23.5,-13.2 C-22.6,-11 -23.4,-8.6 -24.8,-7.6 C-22.6,-6 -21.4,-4.2 -20.8,-2.2 C-18.6,-1.6 -16.6,0 -15,1.8 C-13.2,1.4 -11.2,1.2 -9.6,1.6 C-7.4,-0.6 -5,-2.2 -3,-4 Z" fill="#1c1338" fillOpacity="0.94" stroke="#c78bff" strokeWidth="0.8" strokeOpacity="0.7" />
        {/* el brazo (húmero + radio) hasta la muñeca */}
        <path d="M-3,-4 C-6.6,-7.2 -10,-10.6 -13,-13" fill="none" stroke="#c78bff" strokeWidth="1.2" strokeLinecap="round" opacity="0.85" />
        {/* pulgar con garfio libre en la muñeca (con eso se agarra) */}
        <path d="M-13,-13 L-14.2,-15" stroke="#eafff6" strokeWidth="0.8" strokeLinecap="round" opacity="0.85" />
        {/* los CUATRO dedos larguísimos: huesos visibles dentro de la membrana */}
        <path d="M-13,-13 C-16.6,-13.5 -20.2,-13.4 -23.5,-13.2 M-13,-13 C-17,-11.4 -21.4,-9.4 -24.8,-7.6 M-13,-13 C-15.8,-9.6 -18.6,-5.6 -20.8,-2.2 M-13,-13 C-14.2,-8.6 -14.8,-3 -15,1.8" fill="none" stroke="#c78bff" strokeWidth="0.7" strokeLinecap="round" opacity="0.8" />
        {/* nudillos de la muñeca: la articulación de la mano-ala */}
        <circle cx="-13" cy="-13" r="0.7" fill="#eafff6" opacity="0.8" />
      </g>
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

/* Gurre / armadillo (Dasypus novemcinctus) — PERSONAJE COMPLETO.
   Pose: la nariz AL SUELO, husmeando y escarbando — su gesto de siempre.
   Anatomía real: caparazón óseo con escudo escapular y pélvico RÍGIDOS y
   exactamente NUEVE bandas móviles en la cintura (cuéntelas: de ahí el
   nombre), hocico largo cónico, orejas tubulares erguidas, cola anillada que
   se afina, garras delanteras ENORMES de excavador. La tierra vuela con cada
   zarpazo: así airea el suelo de la finca. Acento menta. */
function AvatarArmadillo() {
  return (
    <g filter="url(#cn-glow1)">
      <ellipse cx="-1" cy="14.2" rx="17" ry="2.8" fill="#000" opacity="0.38" />
      {/* montículo de tierra recién escarbada bajo la nariz */}
      <path d="M12.5,13.6 C14,11.8 17.5,11.6 19.5,13.2 C17,13.9 14.5,14 12.5,13.6 Z" fill="#1c2350" stroke="#6fe6c0" strokeWidth="0.5" strokeOpacity="0.4" />
      {/* tierra que vuela con el zarpazo (misma cadencia del escarbe) */}
      <g className="cn-gurre-tierra">
        <circle cx="11.6" cy="11.4" r="0.6" fill="#8ff0d4" opacity="0.9" />
        <circle cx="10" cy="12.4" r="0.45" fill="#1c2350" stroke="#6fe6c0" strokeWidth="0.4" />
        <circle cx="12.8" cy="10.2" r="0.35" fill="#8ff0d4" opacity="0.7" />
      </g>
      <g className="cn-av-camina">
        {/* cola anillada que se AFINA (dos tramos: grueso → punta fina) */}
        <path d="M-14,6 C-18.6,6.8 -21.8,8.6 -23.6,11" fill="none" stroke="#6fe6c0" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
        <path d="M-23.6,11 C-24.4,12 -24.9,12.8 -25.2,13.4" fill="none" stroke="#6fe6c0" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
        <path d="M-16.6,6.1 l-0.5,1.9 M-19.2,7 l-0.7,1.8 M-21.5,8.4 l-0.9,1.6 M-23.3,10.4 l-1,1.3" stroke="#0f0a24" strokeWidth="0.8" strokeLinecap="round" opacity="0.85" />
        {/* patas lejanas (en penumbra) */}
        <path d="M-9.5,10 L-9.5,13.6 M5.5,7.5 L5.5,13.2" stroke="#0f0a24" strokeWidth="2.6" strokeLinecap="round" opacity="0.8" />
        {/* ── el caparazón: respira con boil de goma ── */}
        <g className="cn-boil">
          <path d="M-14.5,10 C-17,3 -14,-4 -7.5,-7 C-2,-9.2 4,-8.6 8,-5.4 C10.6,-3.2 12,-0.4 12.2,2.6 C12.3,4.6 11,5.8 9,6.2 C3,7.8 -3,9.6 -8,11.2 C-11.5,11.4 -13.8,11 -14.5,10 Z" fill="#141a3a" stroke="#6fe6c0" strokeWidth="0.9" strokeOpacity="0.65" />
          {/* filo del lomo iluminado: el volumen del domo */}
          <path d="M-12.6,1 C-10,-4.4 -4.6,-7.6 1.4,-7.6" fill="none" stroke="#eafff6" strokeWidth="0.7" opacity="0.4" />
          {/* borde del escudo ESCAPULAR (rígido, adelante) */}
          <path d="M5.2,-7.9 C4.4,-3.4 4.6,1.6 5.8,6.9" fill="none" stroke="#8ff0d4" strokeWidth="0.9" opacity="0.7" />
          {/* borde del escudo PÉLVICO (rígido, atrás) */}
          <path d="M-5.8,-7.5 C-6.6,-1.6 -6.4,4.4 -5.4,10.4" fill="none" stroke="#8ff0d4" strokeWidth="0.9" opacity="0.7" />
          {/* las NUEVE bandas móviles de la cintura — exactamente nueve */}
          {Array.from({ length: 9 }, (_, i) => {
            const x = -4.6 + i * 1.15;
            return (
              <path
                key={i}
                d={`M${x.toFixed(2)},-7.6 C${(x - 0.7).toFixed(2)},-2.4 ${(x - 0.5).toFixed(2)},3.2 ${(x + 0.4).toFixed(2)},${(9.2 - i * 0.28).toFixed(2)}`}
                fill="none" stroke="#8ff0d4" strokeWidth="0.6" opacity={i % 2 ? 0.42 : 0.58}
              />
            );
          })}
          {/* escamas (escudos poligonales) punteadas sobre los escudos rígidos */}
          <path d="M-11.5,3 l1.2,-0.4 M-10.8,-1.6 l1.2,-0.3 M-9,-4.8 l1.2,-0.2 M7.6,-3.4 l1.1,0.5 M8.8,0 l1.1,0.5 M8.6,3.4 l1.1,0.3" stroke="#6fe6c0" strokeWidth="0.5" strokeLinecap="round" opacity="0.45" />
        </g>
        {/* patas cercanas: cortas y macizas de excavador */}
        <path d="M-11,10.8 L-11,14 M2.5,8.6 L2.5,13.8" stroke="#0f0a24" strokeWidth="3" strokeLinecap="round" />
        {/* ── cabeza husmeando: baja hasta el suelo, olfatea con vaho ── */}
        <g className="cn-gurre-nariz" style={{ transformBox: 'fill-box', transformOrigin: '12% 18%' }}>
          {/* cuello + cabeza con placas y hocico largo CÓNICO hasta la tierra */}
          <path d="M10.6,1.4 C13.4,2 16,4.4 18.2,7.6 C19.4,9.4 20.3,11.2 20.8,12.6 C21.1,13.5 20.2,14.1 19.3,13.5 C17.3,12.1 14.6,10 12.6,7.8 C11.2,6.2 10.4,3.6 10.6,1.4 Z" fill="#1c2350" stroke="#6fe6c0" strokeWidth="0.8" strokeOpacity="0.6" />
          {/* placas de la frente (el gurre lleva casco propio) */}
          <path d="M11.8,3.4 C13.2,3.8 14.6,4.9 15.8,6.4 M12.8,2.6 C13.6,2.9 14.4,3.5 15.2,4.3" fill="none" stroke="#8ff0d4" strokeWidth="0.5" opacity="0.5" />
          {/* orejas TUBULARES erguidas (dos tubos, no conos) */}
          <path d="M10.4,1.6 C9.8,-3.2 12,-4.2 12.8,-0.6 C12.2,0.6 11.4,1.3 10.4,1.6 Z" fill="#1c2350" stroke="#6fe6c0" strokeWidth="0.7" strokeOpacity="0.65" />
          <path d="M8.2,1.2 C7.6,-2.8 9.7,-3.8 10.4,-0.6 C9.9,0.4 9.1,1 8.2,1.2 Z" fill="#1c2350" stroke="#6fe6c0" strokeWidth="0.7" strokeOpacity="0.65" />
          <path d="M11.3,-2.6 C11.5,-1.7 11.5,-0.9 11.4,-0.2" fill="none" stroke="#8ff0d4" strokeWidth="0.4" opacity="0.55" />
          {/* ojito concentrado en el oficio (párpado a media asta) */}
          <g className="cn-parpadeo">
            <circle cx="14.2" cy="6" r="1" fill="#04160f" stroke="#6fe6c0" strokeWidth="0.6" />
            <circle cx="14.5" cy="5.7" r="0.35" fill="#eafff6" />
            <path d="M13.2,5.2 C13.9,4.9 14.7,4.9 15.3,5.3" fill="none" stroke="#1c2350" strokeWidth="0.7" />
          </g>
          {/* nariz rosada contra la tierra + vaho de husmeo subiendo */}
          <circle cx="20.2" cy="12.9" r="0.75" fill="#8ff0d4" opacity="0.95" style={{ filter: 'drop-shadow(0 0 2.5px #8ff0d4)' }} />
          <g className="cn-gurre-vaho">
            <circle cx="21.4" cy="11.6" r="0.4" fill="#eafff6" />
            <circle cx="22.2" cy="10.4" r="0.3" fill="#eafff6" />
          </g>
        </g>
        {/* ── la GARRA excavadora: enorme, en pleno zarpazo ── */}
        <g className="cn-gurre-pala" style={{ transformBox: 'fill-box', transformOrigin: '28% 10%' }}>
          <path d="M9.4,5.6 C11,6.6 12.4,8.4 13.2,10.6" fill="none" stroke="#0f0a24" strokeWidth="2.6" strokeLinecap="round" />
          {/* tres garras GRANDES de pala (el rasgo del oficio) */}
          <path d="M13,10 L15.4,10.6 M13.3,10.9 L15.6,11.9 M13.1,11.7 L15,12.9" stroke="#eafff6" strokeWidth="0.9" strokeLinecap="round" opacity="0.9" />
        </g>
      </g>
    </g>
  );
}

/* Roseta ABIERTA del tigrillo: anillo INTERRUMPIDO de borde oscuro con el
   centro leonado — el patrón real de Leopardus tigrinus (no lunar cerrado de
   jaguar). Reutilizable en cualquier parte del cuerpo con escala y giro. */
function RosetaAbierta({ cx, cy, s = 1, rot = 0 }) {
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${rot}) scale(${s})`}>
      <circle r="0.75" fill="#ffb066" opacity="0.48" />
      <path d="M-1.1,-0.45 C-0.6,-1.15 0.4,-1.25 1.05,-0.7" fill="none" stroke="#ff7d5a" strokeWidth="0.6" strokeLinecap="round" opacity="0.6" />
      <path d="M1.1,0.4 C0.6,1.05 -0.4,1.2 -1,0.65" fill="none" stroke="#ff7d5a" strokeWidth="0.6" strokeLinecap="round" opacity="0.45" />
    </g>
  );
}

/* Tigrillo / oncilla (Leopardus tigrinus) — PERSONAJE COMPLETO.
   Felino PEQUEÑO (menos de 3 kg, tamaño de gato casero — NO un jaguar
   chiquito): cabeza pequeña y redondeada, hocico corto, ojos grandes cuya
   pupila se abre REDONDA en la noche, orejas amplias con la mancha blanca en
   el dorso, rosetas abiertas de borde oscuro y centro leonado, y la cola
   anillada casi tan larga como el cuerpo. Pose: agazapado ACECHANDO, con el
   peso cargado atrás y un paso furtivo congelado. Acento coral. */
function AvatarTigrillo() {
  return (
    <g filter="url(#cn-glow1)">
      <ellipse cx="-1" cy="14" rx="16" ry="2.6" fill="#000" opacity="0.38" />
      <g className="cn-tigri-acecha">
        {/* ── cola LARGA anillada (casi tan larga como el cuerpo) ── */}
        <g className="cn-tigri-cola" style={{ transformBox: 'fill-box', transformOrigin: '0% 100%' }}>
          {/* rim neón bajo la cola para que no se funda con la noche */}
          <path d="M11.8,6.2 C17,5.8 20.8,3 21.4,-2.4" fill="none" stroke="#ff7d5a" strokeWidth="3.3" strokeLinecap="round" opacity="0.3" />
          <path d="M11.8,6.2 C17,5.8 20.8,3 21.4,-2.4" fill="none" stroke="#1c1338" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M12,5.2 C16.6,4.8 20,2.2 20.6,-2.2" fill="none" stroke="#ff7d5a" strokeWidth="0.5" opacity="0.55" />
          {/* anillos oscuros de la cola */}
          <path d="M14.6,4.6 l0.5,2.2 M17.2,3.4 l0.9,2 M19.4,1.2 l1.4,1.4 M20.6,-1 l1.7,0.6" stroke="#0f0a24" strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />
          {/* la punta: latigazo propio del cazador (flick súbito) */}
          <g className="cn-tigri-colatip" style={{ transformBox: 'fill-box', transformOrigin: '100% 100%' }}>
            <path d="M21.4,-2.4 C21.7,-5 21,-7.2 19.2,-7.8" fill="none" stroke="#ff7d5a" strokeWidth="3" strokeLinecap="round" opacity="0.3" />
            <path d="M21.4,-2.4 C21.7,-5 21,-7.2 19.2,-7.8" fill="none" stroke="#1c1338" strokeWidth="2" strokeLinecap="round" />
            <path d="M21.5,-4.4 l1.6,-0.2" stroke="#0f0a24" strokeWidth="1.1" strokeLinecap="round" opacity="0.9" />
            <circle cx="19.1" cy="-7.7" r="1.05" fill="#0f0a24" stroke="#ff7d5a" strokeWidth="0.6" strokeOpacity="0.85" />
          </g>
        </g>
        {/* ── cuerpo liviano agazapado: pecho a ras de tierra, peso ATRÁS ── */}
        <g className="cn-boil">
          <path d="M-12.6,9.6 C-13.8,7 -12.6,4.8 -9.6,4.4 C-5.4,3.8 -1.2,3 2.6,1.8 C6.4,0.6 10.4,1.4 12.2,4.4 C13.6,6.8 13.2,9.4 11,10.8 C7.4,13 -4,13.2 -9.8,12.2 C-11.6,11.9 -12.2,11 -12.6,9.6 Z" fill="#171030" stroke="#ff7d5a" strokeWidth="0.9" strokeOpacity="0.6" />
          {/* la anca coilada: el resorte del salto cargado */}
          <path d="M4.6,3.2 C8.8,2.6 11.6,4.6 11.8,8 C11.9,10.2 10.4,11.8 8.2,12.2" fill="none" stroke="#ff7d5a" strokeWidth="0.7" opacity="0.45" />
          {/* línea del lomo iluminada */}
          <path d="M-10.4,5.2 C-5.6,4.2 -0.6,3.2 3.4,2.2" fill="none" stroke="#eafff6" strokeWidth="0.6" opacity="0.35" />
          {/* omóplato del paso furtivo: rompe la hogaza, marca el hombro */}
          <path d="M-9.6,5.2 C-8,6.2 -7.3,8.2 -8,10.4" fill="none" stroke="#ff7d5a" strokeWidth="0.65" opacity="0.4" />
          {/* rosetas ABIERTAS de centro leonado (patrón diagnóstico) */}
          <RosetaAbierta cx={-6.2} cy={7} s={0.9} rot={-10} />
          <RosetaAbierta cx={-1.5} cy={5.6} s={1} rot={18} />
          <RosetaAbierta cx={3} cy={7.4} s={1.05} rot={-14} />
          <RosetaAbierta cx={7.8} cy={5.2} s={1.1} rot={10} />
          <RosetaAbierta cx={9.6} cy={8.8} s={0.85} rot={-22} />
          <RosetaAbierta cx={-9.3} cy={9.4} s={0.7} rot={6} />
        </g>
        {/* pata trasera plantada (el peso vive aquí) */}
        <path d="M11.4,8.6 C11.8,10.8 10.4,12 8.4,12.6" fill="none" stroke="#0f0a24" strokeWidth="2.2" strokeLinecap="round" />
        <ellipse cx="7.8" cy="12.8" rx="1.7" ry="0.9" fill="#1c1338" stroke="#ff7d5a" strokeWidth="0.5" strokeOpacity="0.6" />
        {/* patas delanteras: una plantada, la otra ALZADA a mitad de paso furtivo */}
        <path d="M-11.6,8.8 C-12,10.2 -12.1,11.4 -12,12.4" fill="none" stroke="#0f0a24" strokeWidth="2.2" strokeLinecap="round" />
        <ellipse cx="-12" cy="12.7" rx="1.5" ry="0.85" fill="#1c1338" stroke="#ff7d5a" strokeWidth="0.5" strokeOpacity="0.6" />
        <path d="M-8.6,9.4 C-8.2,10.4 -8.1,11.2 -8.2,11.9" fill="none" stroke="#0f0a24" strokeWidth="2.2" strokeLinecap="round" />
        <ellipse cx="-8.3" cy="12.1" rx="1.4" ry="0.8" fill="#1c1338" stroke="#ff7d5a" strokeWidth="0.5" strokeOpacity="0.6" />
        {/* manchitas sólidas en las patas (allá la roseta se vuelve punto) */}
        <circle cx="-11" cy="10.6" r="0.4" fill="#ff7d5a" opacity="0.5" />
        <circle cx="10.2" cy="10.8" r="0.4" fill="#ff7d5a" opacity="0.5" />
        {/* pelaje del pecho: ticks crema */}
        <path d="M-12.2,6.6 l-1.2,0.7 M-12.6,8.2 l-1.3,0.4" stroke="#eafff6" strokeWidth="0.5" strokeLinecap="round" opacity="0.5" />
        {/* ── cabeza PEQUEÑA y redondeada, baja, empujada adelante ── */}
        <circle cx="-15.5" cy="0.2" r="4.1" fill="#1c1338" stroke="#ff7d5a" strokeWidth="0.9" strokeOpacity="0.6" />
        {/* cuello que la une al pecho, con su rim coral para no romper el contorno */}
        <path d="M-12.4,2.8 C-11.2,3.6 -10.2,4.4 -9.4,5.2" fill="none" stroke="#1c1338" strokeWidth="3.4" strokeLinecap="round" />
        <path d="M-13.2,1.2 C-11.8,1.9 -10.6,2.9 -9.6,4" fill="none" stroke="#ff7d5a" strokeWidth="0.6" strokeLinecap="round" opacity="0.55" />
        {/* oreja LEJANA: se ve el dorso → la mancha BLANCA (ocelo) visible */}
        <path d="M-18.2,-2.9 C-19.8,-7.2 -16.2,-8.6 -14.7,-4.4 C-15.6,-3.3 -16.9,-2.8 -18.2,-2.9 Z" fill="#1c1338" stroke="#ff7d5a" strokeWidth="0.7" strokeOpacity="0.6" />
        <circle cx="-16.9" cy="-4.9" r="0.7" fill="#eafff6" opacity="0.8" />
        {/* oreja CERCANA: amplia, redondeada, parada de cacería */}
        <path d="M-13.4,-3.1 C-12.2,-7.5 -9.4,-7.1 -10.3,-3.4 C-11.3,-2.6 -12.4,-2.6 -13.4,-3.1 Z" fill="#1c1338" stroke="#ff7d5a" strokeWidth="0.7" strokeOpacity="0.6" />
        <path d="M-12.6,-4 C-12,-5.6 -11.2,-5.8 -10.9,-4.4" fill="none" stroke="#ffb59a" strokeWidth="0.5" opacity="0.6" />
        {/* manchitas de la frente (rayitas, no rosetas: la cabeza va punteada) */}
        <path d="M-16.6,-3 l0.5,1 M-15.2,-3.4 l0.3,1.1 M-13.9,-3 l0.1,1" stroke="#ff7d5a" strokeWidth="0.5" strokeLinecap="round" opacity="0.55" />
        {/* ── OJOS GRANDES de noche: pupila abierta REDONDA (no rendija) ── */}
        <g className="cn-parpadeo">
          <circle cx="-17" cy="-0.6" r="1.6" fill="#04160f" stroke="#ffd76a" strokeWidth="0.7" />
          <circle cx="-13.8" cy="-0.9" r="1.6" fill="#04160f" stroke="#ffd76a" strokeWidth="0.7" />
          <circle cx="-17" cy="-0.6" r="1.05" fill="#ffd76a" style={{ filter: 'drop-shadow(0 0 4px #ffd76a)' }} />
          <circle cx="-13.8" cy="-0.9" r="1.05" fill="#ffd76a" style={{ filter: 'drop-shadow(0 0 4px #ffd76a)' }} />
          <g className="cn-mirada">
            <circle cx="-17" cy="-0.6" r="0.72" fill="#0d0620" />
            <circle cx="-13.8" cy="-0.9" r="0.72" fill="#0d0620" />
            <circle cx="-17.3" cy="-1" r="0.32" fill="#eafff6" />
            <circle cx="-14.1" cy="-1.3" r="0.32" fill="#eafff6" />
          </g>
        </g>
        {/* hocico CORTO de gato: bump chico, nariz coral, boquita */}
        <ellipse cx="-18.4" cy="1.7" rx="1.9" ry="1.5" fill="#1c1338" stroke="#ff7d5a" strokeWidth="0.6" strokeOpacity="0.5" />
        <ellipse cx="-18.4" cy="1.8" rx="1.2" ry="0.9" fill="#eafff6" opacity="0.22" />
        <path d="M-19.7,0.9 L-18.3,0.9 L-19,2 Z" fill="#ffb59a" opacity="0.95" />
        <path d="M-19,2 C-18.7,2.6 -18,2.8 -17.4,2.5" fill="none" stroke="#eafff6" strokeWidth="0.45" opacity="0.6" />
        {/* bigotes */}
        <path d="M-19.4,1.9 C-21,1.7 -22.4,1.9 -23.4,2.4 M-19.2,2.5 C-20.7,2.9 -21.9,3.5 -22.8,4.2" fill="none" stroke="#eafff6" strokeWidth="0.4" strokeLinecap="round" opacity="0.55" />
      </g>
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
