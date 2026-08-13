/*
 * tipografia — el APARATO de la lámina: rótulos, figuras, cotas, escala.
 *
 * Una lámina botánica es mitad dibujo y mitad aparato crítico, y el aparato
 * es lo que la vuelve un documento en vez de una ilustración. Las
 * convenciones de acá tienen doscientos años y no se discuten:
 *
 *   - EL BINOMIO VA EN CURSIVA y con su autoridad en redonda: *Solanum
 *     tuberosum* L. No es pedantería — es lo que permite que un campesino de
 *     Boyacá y un agrónomo de Nariño hablen de la misma mata cuando cada uno
 *     la llama distinto. La lámina también trae los nombres regionales, en
 *     versalitas, porque ésos son los que la gente usa de verdad.
 *   - LAS FIGURAS SE NUMERAN (Fig. 1, Fig. 2…) y se citan en el pie. Sin
 *     número, un detalle es un adorno; con número, es una referencia.
 *   - EL RÓTULO NO TOCA EL DIBUJO. Va afuera y llega con un HILO finísimo que
 *     termina en un punto sobre el órgano. Meter texto encima del dibujo tapa
 *     justo lo que se quiere enseñar.
 *   - EL TEXTO PESA MENOS QUE EL DIBUJO. Tinta `rotulo`, nunca `plena`.
 *
 * Tipografía: serif, siempre. Una lámina en palo seco se lee como infografía
 * de aeropuerto. Y el papel es crema: bajo el sol andino, un blanco puro
 * encandila y no se puede comparar una hoja contra la pantalla.
 */
import React from 'react';
import { TINTA, PAPEL, PLUMA } from '../nucleo/paletaLamina.js';

/* La pila serif: sin webfonts (la lámina no pide red y debe sobrevivir a un
   celular sin datos en la montaña, que es donde se usa). */
export const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, 'Times New Roman', serif";

/** Texto base de la lámina. */
export function Texto({ x, y, children, tam = 11, peso = 400, cursiva = false, color = TINTA.rotulo, ancla = 'start', letra = 0, op = 1, mayus = false }) {
  return (
    <text
      x={x}
      y={y}
      fontFamily={SERIF}
      fontSize={tam}
      fontWeight={peso}
      fontStyle={cursiva ? 'italic' : 'normal'}
      fill={color}
      textAnchor={ancla}
      letterSpacing={letra}
      opacity={op}
      style={mayus ? { textTransform: 'uppercase' } : undefined}
    >
      {children}
    </text>
  );
}

/**
 * Rótulo con HILO GUÍA: el texto vive afuera y un hilo lo lleva al órgano,
 * terminando en un punto. Es LA convención de la lámina científica.
 *
 * @param {number[]} props.desde [x,y] donde arranca el texto
 * @param {number[]} props.hasta [x,y] el punto sobre el órgano
 * @param {'izq'|'der'} props.lado hacia dónde se alinea el texto
 */
export function Rotulo({ desde, hasta, texto, nota, lado = 'der', tam = 10.5 }) {
  const [tx, ty] = desde;
  const [px, py] = hasta;
  /* El hilo hace un codo: sale horizontal del texto y después va al punto.
     El codo es lo que lo hace legible cuando hay ocho rótulos en la página —
     un manojo de diagonales cruzadas es ruido, no aparato. */
  const codoX = lado === 'der' ? tx - 8 : tx + 8;
  const d = `M${codoX} ${ty - 3} L${(codoX + px) / 2} ${ty - 3} L${px} ${py}`;
  return (
    <g>
      <path d={d} fill="none" stroke={TINTA.fantasma} strokeWidth={PLUMA.hilo} opacity="0.85" />
      <circle cx={px} cy={py} r="1.5" fill={TINTA.rotulo} />
      <Texto x={tx} y={ty} tam={tam} ancla={lado === 'der' ? 'start' : 'end'}>
        {texto}
      </Texto>
      {nota && (
        <Texto x={tx} y={ty + tam * 1.05} tam={tam * 0.82} color={TINTA.fantasma} ancla={lado === 'der' ? 'start' : 'end'} cursiva>
          {nota}
        </Texto>
      )}
    </g>
  );
}

/** El número de figura. Va pegado a su dibujo, arriba a la izquierda. */
export function Fig({ x, y, n, titulo, nota }) {
  return (
    <g>
      <Texto x={x} y={y} tam={10.5} peso={700} color={TINTA.rotulo} letra={0.4}>
        {`Fig. ${n}.`}
      </Texto>
      <Texto x={x + 30} y={y} tam={10.5} color={TINTA.rotulo}>
        {titulo}
      </Texto>
      {nota && (
        <Texto x={x} y={y + 12} tam={9} color={TINTA.fantasma} cursiva>
          {nota}
        </Texto>
      )}
    </g>
  );
}

/** El binomio: cursiva + autoridad en redonda. */
export function Binomio({ x, y, cientifico, autoridad, tam = 17, ancla = 'start' }) {
  return (
    <text x={x} y={y} fontFamily={SERIF} fontSize={tam} fill={TINTA.rotulo} textAnchor={ancla}>
      <tspan fontStyle="italic">{cientifico}</tspan>
      {autoridad && (
        <tspan fontStyle="normal" fontSize={tam * 0.68} fill={TINTA.fantasma}>
          {` ${autoridad}`}
        </tspan>
      )}
    </text>
  );
}

/** BARRA DE ESCALA — mitades alternadas, como toda barra científica. Sin esto
 *  la lámina miente por omisión: el cacao y el tomate de árbol dibujados del
 *  mismo tamaño harían creer que son matas parecidas. */
export function BarraEscala({ x, y, pxPorMetro, metros = 1, alto = 5 }) {
  const largo = pxPorMetro * metros;
  const rotulo = metros >= 1 ? `${metros} m` : `${Math.round(metros * 100)} cm`;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="0" y="0" width={largo / 2} height={alto} fill={TINTA.rotulo} />
      <rect x={largo / 2} y="0" width={largo / 2} height={alto} fill={PAPEL.claro} />
      <rect x="0" y="0" width={largo} height={alto} fill="none" stroke={TINTA.rotulo} strokeWidth="0.7" />
      <Texto x={largo + 6} y={alto} tam={9.5} color={TINTA.fantasma}>
        {rotulo}
      </Texto>
    </g>
  );
}

/** Encabezado de sección dentro de la lámina (EL CICLO, LAS SEÑALES): una
 *  versalita con su filete. El filete separa sin gritar. */
export function Seccion({ x, y, ancho, titulo, nota }) {
  return (
    <g>
      <Texto x={x} y={y} tam={10} peso={700} letra={1.8} color={TINTA.rotulo}>
        {titulo.toUpperCase()}
      </Texto>
      <path d={`M${x} ${y + 5.5} L${x + ancho} ${y + 5.5}`} stroke={TINTA.fantasma} strokeWidth="0.6" opacity="0.6" />
      {nota && (
        <Texto x={x} y={y + 17} tam={9.5} color={TINTA.fantasma} cursiva>
          {nota}
        </Texto>
      )}
    </g>
  );
}

/** Párrafo con quiebre de línea manual: SVG no reflowea, así que el texto se
 *  parte acá por conteo de caracteres. Rústico y suficiente — el alternativo
 *  es <foreignObject>, que rompe la captura rsvg del harness. */
export function Parrafo({ x, y, texto, ancho = 60, tam = 9.5, interlinea = 1.35, color = TINTA.rotulo, cursiva = false, max = 99 }) {
  const palabras = String(texto).split(/\s+/);
  const lineas = [];
  let linea = '';
  for (const p of palabras) {
    if ((linea + ' ' + p).trim().length > ancho) {
      lineas.push(linea.trim());
      linea = p;
    } else {
      linea = `${linea} ${p}`;
    }
  }
  if (linea.trim()) lineas.push(linea.trim());
  return (
    <text x={x} y={y} fontFamily={SERIF} fontSize={tam} fill={color} fontStyle={cursiva ? 'italic' : 'normal'}>
      {lineas.slice(0, max).map((l, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : tam * interlinea}>
          {l}
        </tspan>
      ))}
    </text>
  );
}

/** Sello de PROCEDENCIA: qué tan firme es el dato de esta lámina. Es la
 *  pieza más honesta de la colección — declara si lo dibujado sale del corpus
 *  verificado, de botánica general, o si hay hueco. Un cuaderno que no marca
 *  su propia incertidumbre le pide al lector una fe que no se ganó. */
export function SelloFuente({ x, y, fuente }) {
  const M = {
    corpus: { t: 'Verificado en corpus', c: '#4e7a3f' },
    'corpus+botanica': { t: 'Corpus + botánica general', c: '#6d5946' },
    'corpus-parcial': { t: 'Corpus parcial — hay huecos', c: '#a8752b' },
    botanica: { t: 'Botánica general — no en corpus', c: '#8d7862' },
  };
  const m = M[fuente] || M.botanica;
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx="3" cy="-3" r="2.6" fill={m.c} opacity="0.85" />
      <Texto x={10} y={0} tam={8.5} color={TINTA.fantasma} letra={0.3}>
        {m.t}
      </Texto>
    </g>
  );
}
