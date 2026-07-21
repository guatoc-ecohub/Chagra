/*
 * tramaAndina — el ADN de la MANO en Chagra: por qué una cosa hecha a mano
 * se ve hecha a mano, expresado como números y funciones puras.
 *
 * Chagra ya tiene el vocabulario 2D del telar (`../artesaniaAndina.js`: rombos,
 * grecas, franjas, siluetas de vasija) y la paleta madre (`../paleta/`). Lo que
 * NO tenía es la respuesta a la pregunta de fondo: ¿qué separa un objeto de
 * fábrica de uno que salió de un taller campesino? Este módulo la codifica en
 * TRES REGLAS, extraídas de mirar cestería, loza de La Chamba, cabuya y guadua:
 *
 *   1. NADA ES PERFECTAMENTE RECTO. El poste se inclina un pelito, la boca de
 *      la olla ondula, la pared del canasto respira. El temblor es CONTINUO y
 *      de baja frecuencia (la mano corrige despacio), jamás ruido blanco (eso
 *      es un render dañado, no una mano).
 *   2. EL REMATE SE VE. Una cosa de fábrica termina en un corte limpio; una
 *      cosa tejida termina en un borde MÁS GORDO (el rollo del canasto, el
 *      nudo de la soga) o en un cruce que se pasa de largo (la vara del marco
 *      que sobresale de la esquina, la amarra que lo ata). El final del
 *      trabajo es visible y se celebra.
 *   3. LA GRAVEDAD ES LA FIRMA. La cuerda cuelga, la fibra se vence, la panza
 *      de la olla cae. Lo hecho a mano convive con el peso; lo hecho a
 *      máquina lo niega con tensión perfecta.
 *
 * Este archivo es three-free A PROPÓSITO (mismo contrato que artesaniaAndina):
 * las constantes y perfiles sirven igual a un SVG 2D, a un lathe 3D o a un
 * borde CSS. El costo de three lo paga solo quien importa geometrías.
 *
 * LÍMITE ÉTICO (heredado del 2D y vigente aquí): solo formas del OFICIO
 * (tejer, tornear, trenzar, amarrar) — nada de iconografía sagrada ni motivos
 * identitarios de un pueblo específico.
 */
import { rngArtesania } from '../artesaniaAndina.js';
import {
  ACENTOS,
  TIERRAS,
  NEUTROS,
  VERDES,
  mezclar,
} from '../paleta/paletaMadre.js';

/* ------------------------------------------------------------------ */
/* LA MANO — cuánto tiembla, cuánto se vence, cuánto se pasa de largo. */
/* Amplitudes RELATIVAS a la pieza (radio o largo), no absolutas: una  */
/* olla grande tiembla en proporción igual que una taza.               */
/* ------------------------------------------------------------------ */
export const MANO = {
  /* regla 1 — el temblor continuo */
  temblorRadial: 0.022, // ± del radio en cestería/guadua (se nota, no marea)
  temblorPerfil: 0.014, // ± del radio en loza (el torno perdona más que la aguja)
  inclinacionPoste: 0.05, // rad máx de desplome de un poste hincado a barra

  /* regla 2 — el remate visible */
  cruceMarco: 0.07, // fracción del lado que la vara sobresale de la esquina
  remateRollo: 1.08, // el borde rematado es ~8% más gordo que el cuerpo

  /* regla 3 — la gravedad */
  vencimientoCuerda: 0.13, // comba de una soga templada (fracción del vano)
};

/* ------------------------------------------------------------------ */
/* FIBRAS Y BARROS — los colores del taller, DERIVADOS de la paleta    */
/* madre (regla de la casa: ni un hex nuevo; todo pariente con fuente).*/
/* ------------------------------------------------------------------ */
export const FIBRAS = {
  /* fique / cabuya: el tan dorado del costal y la soga */
  fique: TIERRAS.vega,
  fiqueOscuro: mezclar(TIERRAS.vega, NEUTROS.tinta, 0.38),
  fiqueClaro: mezclar(TIERRAS.vega, NEUTROS.hueso, 0.3),
  /* lana cruda / algodón: el fondo del telar */
  lanaCruda: NEUTROS.cal,
  /* guadua curada: tan con el verde apenas despidiéndose */
  guadua: mezclar(TIERRAS.vega, VERDES.calido, 0.35),
  guaduaNudo: mezclar(mezclar(TIERRAS.vega, VERDES.calido, 0.35), NEUTROS.tinta, 0.25),
  /* loza negra ahumada (estilo La Chamba): negro CÁLIDO, nunca #000 */
  chamba: mezclar(NEUTROS.tinta, TIERRAS.siembra, 0.35),
  chambaBrillo: mezclar(mezclar(NEUTROS.tinta, TIERRAS.siembra, 0.35), TIERRAS.camino, 0.35),
  /* barro cocido sin ahumar: la terracota del torno */
  barroCocido: mezclar(TIERRAS.siembra, ACENTOS.cochinilla, 0.3),
};

/* Los acentos de guarda tejida, en el orden rítmico del textil
   (cálido → luminoso → frío → vegetal). A cucharadas, como manda la paleta. */
export const GUARDA_ACENTOS = [
  ACENTOS.cochinilla,
  ACENTOS.maizTextil,
  ACENTOS.indigo,
  VERDES.paramoSage,
];

/* ------------------------------------------------------------------ */
/* temblorMano — LA función de la regla 1.                             */
/* Devuelve f(ángulo, y) ∈ ~[-1, 1]: suma de DOS armónicos enteros en  */
/* el ángulo (enteros → la costura del lathe cierra sin escalón) y un  */
/* vaivén lento en la altura. Determinista por seed: la misma olla     */
/* tiembla igual en cada visita — es SU olla, no ruido.                */
/* ------------------------------------------------------------------ */
export function temblorMano(seed = 7) {
  const r = rngArtesania(seed);
  const f1 = 2 + Math.floor(r() * 2); // 2..3 lóbulos grandes
  const f2 = f1 + 2 + Math.floor(r() * 2); // 4..6 lóbulos finos
  const p1 = r() * Math.PI * 2;
  const p2 = r() * Math.PI * 2;
  const p3 = r() * Math.PI * 2;
  const fy = 1.4 + r() * 1.8; // qué tan rápido corrige la mano al subir
  return (angulo, y = 0) =>
    Math.sin(angulo * f1 + p1 + y * fy) * 0.55 +
    Math.sin(angulo * f2 + p2 - y * fy * 0.7) * 0.3 +
    Math.sin(y * fy * 2.3 + p3) * 0.15;
}

/* ------------------------------------------------------------------ */
/* combaCuerda — LA función de la regla 3.                             */
/* Cuánto cae la soga en t ∈ [0,1] del vano: parábola 4t(1−t), la      */
/* catenaria de los pobres (indistinguible a este tamaño y gratis).    */
/* ------------------------------------------------------------------ */
export function combaCuerda(t) {
  return 4 * t * (1 - t);
}

/* ------------------------------------------------------------------ */
/* GUADUA — el material estructural propio. Su identidad son los NUDOS:*/
/* anillos que interrumpen el canuto a paso casi-regular (casi: es una */
/* planta, no un perfil de aluminio) y el tronco que adelgaza al subir.*/
/* ------------------------------------------------------------------ */

/** Alturas de los nudos de una guadua de `alto`, con el paso vivo de la mata. */
export function nudosGuadua(alto, { paso = 0.26, seed = 7 } = {}) {
  const r = rngArtesania(seed);
  const ys = [];
  let y = alto * paso * (0.5 + r() * 0.4);
  while (y < alto * 0.93) {
    ys.push(y);
    y += alto * paso * (0.8 + r() * 0.4);
  }
  return ys;
}

/**
 * Perfil [radio, y] de una guadua lista para lathe: base asentada, canuto que
 * adelgaza ~14% hacia arriba, y en cada nudo el anillo característico (+14%
 * de radio en una banda angosta). El corte superior queda plano: la guadua
 * trabajada se corta, no se astilla.
 * @returns {{ puntos: Array<[number, number]>, nudos: number[] }}
 */
export function perfilGuadua(alto = 1.6, radio = 0.05, { seed = 7 } = {}) {
  const nudos = nudosGuadua(alto, { seed });
  const banda = Math.min(alto * 0.02, radio * 0.6);
  const radioEn = (y) => radio * (1 - 0.14 * (y / alto));
  const puntos = [
    [0, 0],
    [radio, 0],
  ];
  for (const ny of nudos) {
    const rN = radioEn(ny);
    puntos.push([rN, ny - banda]);
    puntos.push([rN * 1.14, ny]); // el anillo del nudo — la firma de la guadua
    puntos.push([rN, ny + banda]);
  }
  puntos.push([radioEn(alto), alto]);
  puntos.push([0, alto]);
  return { puntos, nudos };
}

/* ------------------------------------------------------------------ */
/* CESTERÍA EN ESPIRAL — el canasto de rollo (werregue/esparto leído   */
/* solo como TÉCNICA): la fibra sube enrollada en vueltas apiladas.    */
/* En silueta eso es un perfil FESTONEADO: cada vuelta es una pancita. */
/* ------------------------------------------------------------------ */

/**
 * Perfil [radio, y] NORMALIZADO (y ∈ 0..1, radio relativo) de un canasto de
 * rollo: base asentada, pared que abre con ganas y frena (el hombro alto de
 * la proporción andina), cada vuelta marcada como festón, y el REMATE de la
 * regla 2: la última vuelta más gorda (el rollo del borde) y el labio que
 * entra apenas — el canasto abraza lo que guarda.
 */
export function perfilCanasto({ vueltas = 7, baseR = 0.52, bocaR = 1 } = {}) {
  const h = 1 / vueltas;
  const pared = (t) => baseR + (bocaR - baseR) * Math.sin(t * Math.PI * 0.55);
  const puntos = [
    [0, 0],
    [baseR * 0.85, 0],
  ];
  for (let i = 0; i < vueltas; i += 1) {
    const y0 = i * h;
    const ym = y0 + h * 0.5;
    const r = pared(ym);
    const rollo = i === vueltas - 1 ? MANO.remateRollo : 1; // regla 2
    puntos.push([r * 0.94, y0 + h * 0.1]);
    puntos.push([r * rollo, ym]); // la pancita de la vuelta
    puntos.push([r * 0.94 * rollo, y0 + h * 0.9]);
  }
  puntos.push([pared(1) * 0.86, 1]); // el labio entra: abraza
  return puntos;
}
