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
/* El roster y el buscador por id conviven a propósito con los componentes: son
   los DATOS de estas mismas criaturas y la vitrina los pinta sin duplicarlos.
   Eso rompe `react-refresh/only-export-components` (deuda que ya venía en el
   archivo, no la introduce este cambio): solo cuesta un full-reload en dev. */
// eslint-disable-next-line react-refresh/only-export-components
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
   lanilla clara. Y el gesto que le gana el corazón a una niña de once: las
   CRÍAS cargadas en el lomo, agarradas con sus manitos.

   ── POR QUÉ ESTÁ ERGUIDA: EL PROBLEMA DEL GURRE ─────────────────────────────
   Puestas lado a lado y reducidas a 64 px, la zarigüeya y el gurre eran EL
   MISMO BICHO: dos masas oscuras horizontales con hocico largo al frente. Y la
   cola nacía tan arriba del lomo que se leía como un ala flotando, cuando la
   cola prensil desnuda es justo el rasgo que la delata.

   La DR `distinguir-visualmente-zariguya-de-armadillo` (gemini, 2026-06-19)
   resuelve las dos cosas, y esto es lo que quedó dibujado aquí:

     · LA ACCIÓN ANTES QUE LA FORMA. Dos criaturas parecidas se separan mejor
       por lo que HACEN. El gurre escarba: cuerpo bajo, pegado al suelo, nariz
       enterrada. La zarigüeya HUSMEA ERGUIDA: se incorpora sobre los cuartos
       traseros, el eje del cuerpo se para en diagonal y el hocico apunta
       ARRIBA, leyendo el aire. Una masa horizontal contra una vertical: a 64 px
       ya no hay forma de confundirlas.
     · EXAGERACIÓN SELECTIVA DEL RASGO DIAGNÓSTICO. La cola prensil ahora nace
       BAJA, en la propia grupa, con su base peluda que la ancla al cuerpo —
       nunca suelta en el aire—, barre el suelo y remata en GANCHO enroscado
       hacia arriba. Esa S es la firma que ningún armadillo tiene: la del gurre
       es cónica, rígida y recta hacia atrás.
     · CONTRASTE DE LENGUAJE DE FORMAS. La zarigüeya es toda curva orgánica y
       pelo de guardia que rompe la silueta; el gurre es domo rígido segmentado.
       Las orejas grandes, redondeadas y desnudas asoman altas en el contorno,
       contra la oreja tubular chica del gurre.
     · LAS MANOS RECOGIDAS contra el pecho — lo que hace un marsupial cuando se
       para a oler — dejan el frente despejado y suben todavía más el eje.

   Las CRÍAS ganan con la postura: sobre el lomo en diagonal quedan escalonadas
   como en una escalera y se ven las tres enteras, no encimadas.
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

      {/* la sombra es CORTA y está bajo la grupa: sentada apoya poco suelo (el
          gurre, tendido, derrama sombra a lo largo). Otra pista de postura. */}
      <ellipse cx="-4" cy="15.2" rx="11" ry="2.6" fill="#000" opacity="0.36" />

      <g className="cn-zari">
        {/* ── COLA PRENSIL DESNUDA — el rasgo diagnóstico, exagerado.
               Nace BAJA en la grupa (no del lomo: eso la hacía ala), barre el
               suelo hacia atrás y remata en GANCHO enroscado hacia arriba. Va
               adelgazando: gruesa en la base, fina en la punta que agarra. ── */}
        <g className="cn-zari-cola">
          <path d="M-7.2,11.4 C-11.8,12.6 -16.8,12.4 -19.8,9.4
                   C-22.6,6.6 -22,1.8 -18.6,0.4 C-16.8,-0.4 -15.4,0.8 -16,2
                   C-17.8,2 -19.4,3.4 -19.2,5.6 C-19,8.4 -15.6,10 -11.4,9.2
                   C-9.8,8.9 -8.4,8.7 -7.2,8.7 Z"
            fill="#1c2350" stroke="#9ff0ff" strokeWidth="0.85" strokeOpacity="0.65" />
          {/* anillado escamoso de la cola pelona */}
          <g stroke="#d8f6ff" strokeWidth="0.5" fill="none" opacity="0.42">
            <path d="M-10.2,11.5 C-10.4,10.4 -10.4,9.6 -10.2,8.9" />
            <path d="M-13.6,11.7 C-13.9,10.6 -14,9.8 -13.8,9.1" />
            <path d="M-17,10.9 C-17.6,9.9 -17.9,9.2 -17.8,8.5" />
            <path d="M-19.6,8.4 C-20.4,7.8 -20.8,7.4 -21,6.8" />
            <path d="M-20.9,4.6 C-21.5,4.4 -21.8,4 -21.9,3.6" />
            <path d="M-19,1.6 C-19.3,1 -19.4,0.6 -19.3,0.2" />
          </g>
          {/* base peluda: donde el pelo de guardia todavía cubre la cola y la
              ANCLA al cuerpo. Sin esta pieza la cola se lee pegada aparte. */}
          <path d="M-6.4,11.8 C-9.4,12.2 -11.4,11.4 -12.2,9.4 C-10.2,9.6 -8.2,9.4 -6.4,8.6 Z"
            fill="#171030" stroke="#9ff0ff" strokeWidth="0.6" strokeOpacity="0.5" />
        </g>

        <g filter={`url(#${boilId})`}>
          {/* ── CUERPO ERGUIDO: sentada sobre los cuartos traseros, el eje sube
                 en diagonal hacia el pecho. Pera inclinada, no barril. ── */}
          <path d="M-9.8,13.2 C-13,9.2 -12.6,2.4 -8.2,-2.4
                   C-4.6,-6.4 -0.4,-8.6 3.6,-9
                   C6.6,-9.3 8.4,-7.2 7.8,-4.4
                   C7.2,-1.2 4.8,3 2.2,7.2
                   C0.4,10.4 -1.6,13.4 -4.4,13.8
                   C-6.6,14 -8.8,13.9 -9.8,13.2 Z"
            fill="#171030" stroke="#9ff0ff" strokeWidth="0.9" strokeOpacity="0.6" />

          {/* lanilla clara del vientre: ahora corre por el FRENTE del pecho,
              que es donde da la luz cuando el animal se para */}
          <path d="M-7.4,12.4 C-3.6,13.4 -0.2,10.2 2.4,5.4 C4.6,1.4 6.4,-2.6 6.8,-5.2
                   C7.4,-2 5,3 2,8 C0,11.4 -3.8,14 -7.4,12.4 Z"
            fill="#eafff6" opacity="0.2" />

          {/* PELO DE GUARDIA largo y desgreñado: mechones que rompen la
              silueta a lo largo del LOMO en diagonal */}
          <g stroke="#9ff0ff" strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.5">
            <path d="M-11.8,8.4 C-13.8,8.6 -14.8,8.4 -15.6,7.8" />
            <path d="M-12.4,4.2 C-14.4,3.8 -15.4,3.2 -16,2.4" />
            <path d="M-11.6,0.4 C-13.2,-0.8 -14,-1.8 -14.2,-2.8" />
            <path d="M-9,-3.2 C-10.2,-4.8 -10.6,-6 -10.4,-7" />
            <path d="M-5.8,-6.2 C-6.4,-8 -6.4,-9.2 -5.8,-10.2" />
            <path d="M-2,-8.2 C-2.2,-10 -1.8,-11.2 -1,-12" />
            <path d="M1.8,-9 C2,-10.6 2.6,-11.6 3.6,-12.2" />
            <path d="M5.4,-8 C6.4,-9.2 7.2,-9.8 8.2,-10" />
          </g>
          {/* textura interna del pelaje: el pelo cae siguiendo la diagonal */}
          <g stroke="#d8f6ff" strokeWidth="0.55" fill="none" opacity="0.3">
            <path d="M-9.2,7.6 C-8.4,4.4 -6.4,0.8 -3.4,-2.4" />
            <path d="M-6.4,10.4 C-5,7.2 -2.6,3.4 0.4,0.2" />
            <path d="M-8.6,2.2 C-6.6,-1 -3.8,-4.2 -0.4,-6.4" />
          </g>
        </g>

        {/* ── PATAS TRASERAS PLANTÍGRADAS: cargan todo el peso de la sentada,
               con la planta entera apoyada y los deditos abiertos ── */}
        <path d="M-6.6,11.6 C-7.6,12.8 -8,13.6 -7.8,14.4" stroke="#0f0a24" strokeWidth="3.2" strokeLinecap="round" fill="none" />
        <path d="M-10.4,14.6 L-3.8,14.6" stroke="#0f0a24" strokeWidth="2.6" strokeLinecap="round" />
        <g stroke="#9ff0ff" strokeWidth="0.7" strokeLinecap="round" opacity="0.65">
          <path d="M-10.2,14.9 L-11.2,15.7" /><path d="M-8.2,15.1 L-8.6,16.1" />
          <path d="M-6.2,15.1 L-6,16.1" /><path d="M-4.2,14.9 L-3.4,15.7" />
        </g>

        {/* ── MANOS RECOGIDAS contra el pecho: lo que hace un marsupial cuando
               se para a oler. Cortas, con garras finas, colgando. ── */}
        <g stroke="#0f0a24" strokeWidth="2.2" strokeLinecap="round" fill="none">
          <path d="M4.4,-3.6 C5.4,-1.6 5.6,-0.2 5.2,1" />
          <path d="M1.6,-1 C2.4,0.8 2.6,2.2 2.2,3.4" />
        </g>
        <g stroke="#9ff0ff" strokeWidth="0.6" strokeLinecap="round" opacity="0.7">
          <path d="M5,1.4 L5.6,2.4" /><path d="M5.2,1.6 L4.8,2.6" />
          <path d="M2,3.8 L2.6,4.8" /><path d="M2.2,4 L1.8,5" />
        </g>

        {/* ── LAS CRÍAS AL LOMO: el gesto. Escalonadas sobre la diagonal del
               lomo, cada una acostada en el ángulo de la espalda — así se ven
               las tres enteras, como en una escalera. ── */}
        <g className="cn-zari-cria">
          <ZariguyaCria x={-11.4} y={8.6} escala={0.95} rot={-72} />
        </g>
        <g className="cn-zari-cria cn-zari-cria-b">
          <ZariguyaCria x={-13.4} y={2.6} escala={0.95} rot={-46} />
        </g>
        <g className="cn-zari-cria cn-zari-cria-c">
          <ZariguyaCria x={-9.6} y={-5.4} escala={0.9} rot={-20} />
        </g>

        {/* ── CABEZA que HUSMEA EL AIRE: el hocico sube en diagonal, las orejas
               grandes y desnudas asoman altas en la silueta ── */}
        <g className="cn-zari-hocico">
          {/* OREJAS GRANDES, REDONDEADAS Y DESNUDAS — asoman altas sobre el
              cráneo y son media silueta del bicho. Contra la oreja tubular
              chica del gurre, es de las lecturas más rápidas a 64 px. */}
          <path d="M1,-12.4 C0,-17.4 4.6,-19.6 6.6,-15.8 C6.2,-13.4 3.6,-12.2 1,-12.4 Z"
            fill="#141a3a" stroke="#9ff0ff" strokeWidth="0.7" strokeOpacity="0.6" />
          <path d="M2.4,-13.4 C2,-16.4 4.4,-17.6 5.4,-15.4 C4.8,-14.2 3.6,-13.4 2.4,-13.4 Z"
            fill="#ffc0dc" opacity="0.22" />
          <path d="M6.4,-14 C6,-19.6 11.4,-21.2 12.6,-16.6 C11.6,-14.6 9,-13.8 6.4,-14 Z"
            fill="#1c1338" stroke="#9ff0ff" strokeWidth="0.7" strokeOpacity="0.7" />
          <path d="M7.8,-15 C7.8,-18.4 10.4,-19.4 11.2,-16.8 C10.4,-15.6 9,-15 7.8,-15 Z"
            fill="#ffc0dc" opacity="0.28" />

          {/* CRÁNEO con volumen + HOCICO LARGO Y PUNTUDO que sale de él y sube
              a leer el aire. El cráneo primero: sin bulto el hocico se lee como
              un pico de ave clavado al cuello. */}
          <path d="M1.4,-8.6
                   C0.6,-12.8 3.6,-16 7.8,-15.8
                   C10.2,-15.7 12,-14.8 12.9,-13.2
                   C14.8,-13.9 17,-15.2 18.9,-16.4
                   C20.1,-17.1 21,-16.2 20.4,-15
                   C19.1,-14.4 16.5,-12.9 14,-11.7
                   C11.4,-10.4 8.4,-9 6.2,-7.2
                   C4.4,-6.1 1.9,-6.9 1.4,-8.6 Z"
            fill="#1c1338" stroke="#9ff0ff" strokeWidth="0.85" strokeOpacity="0.65" />
          {/* cara pálida del marsupial (la máscara clara sobre el hocico) */}
          <path d="M5.4,-9.8 C8,-12.6 11.4,-13 15.6,-14.6 C12.6,-12.2 9.6,-10.6 6.8,-8.8 Z"
            fill="#eafff6" opacity="0.32" />
          {/* mejilla: pelo de guardia también en la cara */}
          <g stroke="#9ff0ff" strokeWidth="0.6" strokeLinecap="round" fill="none" opacity="0.4">
            <path d="M3.2,-6.8 C2.6,-5.4 2.4,-4.6 2.4,-3.8" />
            <path d="M1.6,-11 C0.4,-11.6 -0.4,-11.8 -1.2,-11.6" />
          </g>

          {/* trufa rosada, en la punta que lee el aire */}
          <ellipse cx="19.6" cy="-15.7" rx="1.4" ry="1.1" fill="#ffc0dc" opacity="0.95"
            transform="rotate(-28 19.6 -15.7)"
            style={{ filter: 'drop-shadow(0 0 3px rgba(255,192,220,0.8))' }} />
          <path d="M19.2,-15 L18.6,-14.4" stroke="#0f0a24" strokeWidth="0.4" strokeLinecap="round" opacity="0.7" />

          {/* VIBRISAS (el marsupial lee el mundo con ellas) */}
          <g className="cn-zari-bigote">
            <g stroke="#eafff6" strokeWidth="0.45" fill="none" opacity="0.6" strokeLinecap="round">
              <path d="M17.8,-16.6 C18.6,-18.4 18.8,-19.8 18.6,-21.2" />
              <path d="M18.8,-16.2 C20.2,-17.4 21.2,-18.2 22,-18.8" />
              <path d="M19.6,-14.4 C21.2,-14.2 22.2,-13.8 23,-13.2" />
              <path d="M18.2,-13.6 C19.2,-12.4 19.8,-11.4 20,-10.2" />
            </g>
          </g>

          {/* ojo: cuenta negra con anillo neón y brillo de linterna */}
          <circle cx="6.6" cy="-11.8" r="1.55" fill="#04160f" />
          <circle cx="6.6" cy="-11.8" r="1.55" fill="none" stroke="#9ff0ff" strokeWidth="0.7"
            style={{ filter: 'drop-shadow(0 0 3px #9ff0ff)' }} />
          <circle cx="7" cy="-12.3" r="0.5" fill="#eafff6" />
        </g>
      </g>
    </g>
  );
}

/* Cría de zarigüeya agarrada al lomo de la madre: cuerpito, hocico ya puntudo,
   orejas desnudas, manito que agarra el pelo y colita pelona. Miniatura fiel —
   la cría de Didelphis es la madre en pequeño, no un muñeco redondo.
   `rot` inclina la cría para que se acueste sobre el ángulo del lomo: con la
   madre erguida la espalda es una diagonal, y una cría horizontal encima se
   leería pegada como calcomanía. El dibujo no cambia, solo su apoyo. */
function ZariguyaCria({ x, y, escala = 1, rot = 0 }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${escala})`}>
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

// eslint-disable-next-line react-refresh/only-export-components
export { byId as criaturaNocturnaById };
