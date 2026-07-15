/*
 * formasBicho — la geometría del gusano.
 *
 * Este es el elemento con más riesgo de arruinar la lámina: un gusano mal
 * dibujado convierte una lámina de campo en una caricatura, y ahí se pierde
 * la autoridad de todo lo demás. Así que NO se dibuja "a ojo" como un fideo
 * con carita: se construye como en un dibujo de entomología.
 *
 * Método (mirando `spodoptera_frugiperda.jpg` y `mocis_latipes.jpg`):
 *   1. Un EJE curvo (la larva descansa en C sobre la hoja, nunca recta).
 *   2. Un TUBO alrededor del eje: el contorno se genera desplazando cada
 *      punto por su NORMAL, con un perfil de grosor que adelgaza en los dos
 *      extremos. Así el cuerpo tiene volumen real y sigue la curva.
 *   3. Las BANDAS longitudinales no son rayas rectas: son el mismo eje
 *      desplazado a una fracción del grosor, así que se curvan con el bicho.
 *      Esto es lo que hace que se lea como un animal y no como un macarrón.
 *   4. Los anillos de los segmentos, las pináculas (los puntos negros con
 *      seta) y la cápsula cefálica con su "Y" invertida pálida.
 *
 * Lo que NO lleva, a propósito: ojos con brillito, boca, sonrisa. Un gusano
 * de verdad no tiene cara. La lámina enseña a RECONOCERLO, no a quererlo.
 */
import { curvaAbierta, curvaCerrada, prngDe } from './formasHoja.js';

/**
 * Tubo sobre un eje: dado un eje y un perfil de grosor, devuelve el contorno
 * cerrado y una función para sacar cualquier franja longitudinal.
 *
 * @param {Array<{x:number,y:number}>} eje puntos del eje, en orden.
 * @param {(t:number)=>number} grosor media anchura en t (0..1 a lo largo).
 */
export function tubo(eje, grosor) {
  const n = eje.length;
  const normales = eje.map((p, i) => {
    const a = eje[Math.max(0, i - 1)];
    const b = eje[Math.min(n - 1, i + 1)];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: -dy / len, y: dx / len };
  });

  /** Franja longitudinal a `k` (-1 = un flanco, 0 = el eje, 1 = el otro). */
  const franja = (k, desde = 0, hasta = 1) => {
    const pts = [];
    for (let i = 0; i < n; i += 1) {
      const t = i / (n - 1);
      if (t < desde || t > hasta) continue;
      const w = grosor(t) * k;
      pts.push({ x: eje[i].x + normales[i].x * w, y: eje[i].y + normales[i].y * w });
    }
    return curvaAbierta(pts, 1);
  };

  /* contorno: un flanco de ida, el otro de vuelta. Los extremos quedan
     redondeados solos porque el grosor tiende a cero ahí. */
  const ida = [];
  const vuelta = [];
  for (let i = 0; i < n; i += 1) {
    const t = i / (n - 1);
    const w = grosor(t);
    ida.push({ x: eje[i].x + normales[i].x * w, y: eje[i].y + normales[i].y * w });
    vuelta.push({ x: eje[i].x - normales[i].x * w, y: eje[i].y - normales[i].y * w });
  }
  const contorno = curvaCerrada([...ida, ...vuelta.reverse()], 0.9);

  /** Punto del eje + su normal en t (para posar patas, anillos, cabeza). */
  const en = (t) => {
    const i = Math.min(n - 1, Math.max(0, Math.round(t * (n - 1))));
    return { p: eje[i], nor: normales[i], w: grosor(i / (n - 1)) };
  };

  return { contorno, franja, en, normales };
}

/**
 * Construye el gusano completo.
 *
 * @param {Object} [cfg]
 * @param {number} [cfg.largo] largo total del cuerpo.
 * @param {number} [cfg.grueso] media anchura máxima.
 * @param {number} [cfg.arco] cuánto se enrosca en C (0 = recto).
 * @param {number} [cfg.segmentos] anillos del cuerpo.
 * @param {number} [cfg.semilla]
 */
export function construirGusano(cfg = {}) {
  const { largo = 46, grueso = 3.5, arco = 0.46, segmentos = 12, semilla = 21 } = cfg;
  const rnd = prngDe(semilla);

  /* El eje: una C abierta. La larva se recoge; el extremo de la cabeza baja
     un poco más porque está comiendo pegada a la lámina. */
  const N = 40;
  const eje = [];
  for (let i = 0; i < N; i += 1) {
    const t = i / (N - 1);
    const ang = (t - 0.5) * Math.PI * arco;
    eje.push({
      x: t * largo,
      y: Math.sin(ang) * largo * 0.17 + Math.sin(t * Math.PI) * -largo * 0.05,
    });
  }

  /* Perfil del grosor: el tórax (donde están las patas verdaderas) es más
     angosto que el abdomen; el abdomen es el grueso; y el final se redondea.
     Ese engrosamiento hacia atrás es lo que hace que NO parezca un macarrón. */
  const grosor = (t) => {
    const cuerpo = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.72)), 0.42);
    const abdomen = 0.82 + 0.18 * Math.sin(Math.min(1, t * 1.4) * Math.PI * 0.8);
    return grueso * cuerpo * abdomen;
  };

  const t2 = tubo(eje, grosor);

  /* Anillos de los segmentos: arquitos transversales, más juntos adelante. */
  const anillos = [];
  for (let s = 1; s <= segmentos; s += 1) {
    const t = 0.1 + (s / (segmentos + 1)) * 0.86;
    const { p, nor, w } = t2.en(t);
    const a = { x: p.x + nor.x * w * 0.92, y: p.y + nor.y * w * 0.92 };
    const b = { x: p.x - nor.x * w * 0.92, y: p.y - nor.y * w * 0.92 };
    /* leve arco: el anillo abraza el cuerpo cilíndrico */
    const cx = p.x + (nor.y * w) * 0.22;
    const cy = p.y - (nor.x * w) * 0.22;
    anillos.push(`M${a.x.toFixed(2)} ${a.y.toFixed(2)}Q${cx.toFixed(2)} ${cy.toFixed(2)} ${b.x.toFixed(2)} ${b.y.toFixed(2)}`);
  }

  /* Pináculas: los puntos oscuros con seta. En Spodoptera van en trapecio
     sobre cada segmento; se ven clarito en la foto. */
  const pinaculas = [];
  for (let s = 2; s <= segmentos - 1; s += 1) {
    const t = 0.1 + (s / (segmentos + 1)) * 0.86;
    const { p, nor, w } = t2.en(t);
    for (const k of [-0.52, 0.52]) {
      const jitter = (rnd() - 0.5) * 0.3;
      pinaculas.push({
        x: p.x + nor.x * w * k + jitter,
        y: p.y + nor.y * w * k + jitter,
        r: 0.3 + rnd() * 0.12,
        /* La seta: un pelito que sale del punto, hacia afuera. Corta: si se
           alarga, el bicho se ve plumoso — parece una espiga de trigo y no
           una larva. La larva tiene pelos, pero se le ven poco. */
        seta: {
          x: p.x + nor.x * w * (k * 1.34),
          y: p.y + nor.y * w * (k * 1.34),
        },
      });
    }
  }

  /* Patas: 3 pares torácicas (verdaderas, con garra) + falsas patas
     abdominales (los ventosones) + las anales. Van del lado del vientre. */
  const patas = [];
  const ladoVientre = -1;
  for (const t of [0.14, 0.2, 0.26]) {
    const { p, nor, w } = t2.en(t);
    patas.push({
      x: p.x + nor.x * w * ladoVientre * 0.85,
      y: p.y + nor.y * w * ladoVientre * 0.85,
      dx: nor.x * 2.6 * ladoVientre,
      dy: nor.y * 2.6 * ladoVientre,
      tipo: 'toracica',
    });
  }
  for (const t of [0.46, 0.56, 0.66, 0.76, 0.93]) {
    const { p, nor, w } = t2.en(t);
    patas.push({
      x: p.x + nor.x * w * ladoVientre * 0.8,
      y: p.y + nor.y * w * ladoVientre * 0.8,
      dx: nor.x * 2.2 * ladoVientre,
      dy: nor.y * 2.2 * ladoVientre,
      tipo: 'falsa',
    });
  }

  /* La cabeza: cápsula redonda, oscura y dura, un poco más angosta que el
     cuerpo, inclinada hacia la hoja. */
  const cab = t2.en(0.035);
  const cabeza = {
    x: cab.p.x - 1.1,
    y: cab.p.y + 0.35,
    r: grueso * 0.86,
    /* la "Y" invertida pálida de la frente: la firma del cogollero */
    y_invertida: true,
  };

  return { ...t2, eje, grosor, anillos, pinaculas, patas, cabeza, largo, grueso };
}

/** El gusano de la lámina: uno solo, calculado una vez. */
export const GUSANO = construirGusano({ largo: 46, grueso: 4.5, arco: 0.46, semilla: 21 });
