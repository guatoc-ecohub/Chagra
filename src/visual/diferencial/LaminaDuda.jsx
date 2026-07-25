import React from 'react';
import { prngDe } from './formasHoja.js';
import { tubo } from './formasBicho.js';
import { HojaBase, ClorosisNitrogeno, Pliego } from './motivosDano.jsx';
import { PLIEGO, TINTA, DEFICIENCIA, CATEGORIA } from './paletaDano.js';

/**
 * LaminaDuda — cuando NO se puede saber sin ver la mata de cerca.
 *
 * Esta es la lámina que casi ninguna cartilla se atreve a hacer, y es la más
 * honesta de las tres. Todo material de campo enseña a diagnosticar; casi
 * ninguno enseña a RECONOCER QUE NO SE SABE. Y esa es una destreza de campo,
 * no una falla: un fitopatólogo tampoco diagnostica a ciegas — por eso mismo
 * existen las visitas de campo.
 *
 * El caso no es inventado para el ejemplo: es el que más se repite en el
 * corpus. Una mata que amarillea PAREJA, hojas viejas primero, sin manchas y
 * sin bichos, puede ser:
 *   - falta de NITRÓGENO → se arregla con abono; o
 *   - NEMATODO del nudo (Meloidogyne) en la raíz → amarillea igualito.
 *
 * Y por arriba NO SE DISTINGUEN. Por eso las dos hojas de esta lámina son,
 * a propósito, el MISMO dibujo: el mismo componente, la misma semilla, el
 * mismo trazo. No es pereza — es el argumento. Si el dibujante pudiera
 * hacerlas distintas, la lámina estaría mintiendo.
 *
 * Pero la lámina no se queda en la duda, porque la duda sin salida es
 * parálisis: abajo está la salida, que es barata y la puede hacer cualquiera
 * — sacar una matica y mirarle la raíz. Ahí sí se distinguen, y sin lupa.
 *
 * Las agallas van calcadas de `public/plaga-images/meloidogyne.jpg`: son
 * engrosamientos DE la raíz misma (la raíz pasa POR dentro del nudo, como
 * cuentas ensartadas en una pita), no bolitas pegadas por fuera que uno pueda
 * desprender. Ese detalle es el diagnóstico.
 *
 * @param {Object} props
 * @param {string} [props.className] clases extra sobre el <svg> raíz.
 */

const W = 420;
const H = 458;
const IZQ = 110;
const DER = 310;
const BASE_Y = 200;
const ESC = 0.82;

/* ------------------------------------------------------------------ */
/* LA RAÍZ — sana contra anudada                                       */
/* ------------------------------------------------------------------ */
const LARGO_RAIZ = 104;

/* 70 muestras, no 30: cada agalla es una campana angosta, y con pocas
   muestras el bulto sale lavado — la raíz parece ondulada en vez de anudada,
   que es exactamente lo que NO hay que dibujar. */
const ejeRaiz = (() => {
  const pts = [];
  const N = 70;
  for (let i = 0; i < N; i += 1) {
    const t = i / (N - 1);
    pts.push({ x: Math.sin(t * 2.5) * 7, y: t * LARGO_RAIZ });
  }
  return pts;
})();

/** La raíz pivotante se va afinando hacia la punta. */
const grosorBase = (t) => 3.3 * (1 - t * 0.74);

/** Una campana suave: el bulto de una agalla. */
const bulto = (t, c, w, h) => h * Math.exp(-((t - c) ** 2) / (2 * w * w));

/* Los nudos NO son parejos ni están a la misma distancia: el nematodo pica
   donde le queda cómodo. Un rosario regular se leería como decoración. */
const AGALLAS = [
  { c: 0.15, w: 0.032, h: 2.4 },
  { c: 0.33, w: 0.038, h: 3.8 },
  { c: 0.45, w: 0.026, h: 1.7 },
  { c: 0.63, w: 0.035, h: 3.1 },
  { c: 0.79, w: 0.028, h: 2.2 },
  { c: 0.9, w: 0.022, h: 1.2 },
];

const RAIZ_SANA = tubo(ejeRaiz, grosorBase);
const RAIZ_ANUDADA = tubo(ejeRaiz, (t) =>
  grosorBase(t) * (1 + AGALLAS.reduce((s, a) => s + bulto(t, a.c, a.w, a.h), 0)),
);

/** Las raicitas finas: la mata come por ahí.
 *  En la sana son muchas y largas; con nematodo quedan pocas y mochas —
 *  el bicho le arruinó la boca a la mata, por eso amarillea aunque haya
 *  abono en el suelo. Ese es el porqué, y es lo que hay que entender. */
function raicillas({ sana, semilla }) {
  const rnd = prngDe(semilla);
  const n = sana ? 16 : 7;
  const salidas = [];
  for (let i = 0; i < n; i += 1) {
    const t = 0.12 + (i / n) * 0.82 + (rnd() - 0.5) * 0.04;
    const { p, nor } = RAIZ_SANA.en(t);
    const lado = i % 2 === 0 ? 1 : -1;
    const largo = sana ? 7 + rnd() * 9 : 2.6 + rnd() * 3;
    const caida = 4 + rnd() * 5;
    salidas.push(
      `M${p.x.toFixed(2)} ${p.y.toFixed(2)} q${(nor.x * largo * lado * 0.7).toFixed(2)} ${(caida * 0.5).toFixed(2)} ${(nor.x * largo * lado).toFixed(2)} ${caida.toFixed(2)}`,
    );
  }
  return salidas;
}

const PELOS_SANA = raicillas({ sana: true, semilla: 4 });
const PELOS_MALA = raicillas({ sana: false, semilla: 9 });

/* Los tonos de la raíz, de `meloidogyne.jpg`: crema marfil, nada de "café
   tierra" — una raíz viva recién sacada es casi blanca. */
const RAIZ = {
  carne: '#dbcaa5',
  sombra: '#bfa980',
  linea: '#8e7551',
};
/* la agalla va un punto más amarilla y turgente que la raíz sana */
const AGALLA_TONO = '#d6c185';

function Raiz({ x, y, anudada }) {
  const cuerpo = anudada ? RAIZ_ANUDADA : RAIZ_SANA;
  const pelos = anudada ? PELOS_MALA : PELOS_SANA;
  return (
    <g transform={`translate(${x} ${y})`}>
      <g fill="none" stroke={RAIZ.linea} strokeLinecap="round" opacity="0.9">
        {pelos.map((d, i) => (
          <path key={i} d={d} strokeWidth={anudada ? 0.7 : 0.85} />
        ))}
      </g>
      <path d={cuerpo.contorno} fill={anudada ? AGALLA_TONO : RAIZ.carne} stroke={RAIZ.linea} strokeWidth="0.9" />
      {/* el lomo iluminado: la raíz es un cilindro, no una cinta */}
      <path d={cuerpo.franja(-0.42)} fill="none" stroke="#f0e6cb" strokeWidth="1.1" opacity="0.7" />
      <path d={cuerpo.franja(0.55)} fill="none" stroke={RAIZ.sombra} strokeWidth="1.3" opacity="0.55" />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* LA LÁMINA                                                           */
/* ------------------------------------------------------------------ */
export default function LaminaDuda({ className } = {}) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-labelledby="lamduda-t lamduda-d"
      className={['w-full h-auto select-none', className].filter(Boolean).join(' ')}
      data-testid="lamina-duda"
      style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
    >
      <title id="lamduda-t">Cuando no se puede saber: la misma hoja amarilla puede ser hambre o nematodo</title>
      <desc id="lamduda-d">
        Lámina de cuaderno de campo sobre el límite del diagnóstico. Arriba, dos hojas de café
        amarillas exactamente iguales: una rotulada ¿le falta nitrógeno? y la otra ¿o tiene nematodo?
        Entre las dos, un signo de pregunta: por arriba no se distinguen y no se puede saber. Abajo,
        la salida: sacar una matica y mirarle la raíz. Se dibujan dos raíces: la sana, lisa y con
        muchas raicitas finas, y la del nematodo, con nudos o agallas engrosados en la raíz misma y
        con pocas raicitas. Al pie, la regla: cuando no alcanza a ver, lo correcto no es adivinar.
      </desc>

      <Pliego w={W} h={H} />

      <text x="16" y="26" fontSize="16.5" fontWeight="800" fill={TINTA.fuerte}>
        Cuando NO se puede saber
      </text>
      <text x="404" y="17" textAnchor="end" fontSize="8.5" fontStyle="italic" fill={TINTA.guia}>
        cuaderno de campo
      </text>
      <text x="404" y="28" textAnchor="end" fontSize="8.5" fill={TINTA.suave}>
        el límite honesto
      </text>
      <text x="16" y="39" fontSize="9" fontStyle="italic" fill={TINTA.suave}>
        Saber hasta dónde alcanza la vista también es saber de campo.
      </text>
      <line x1="14" y1="44" x2="406" y2="44" stroke={PLIEGO.borde} strokeWidth="1" />

      {/* ---------- las dos hojas: EL MISMO DIBUJO, a propósito ---------- */}
      <g transform={`translate(${IZQ} ${BASE_Y}) scale(${ESC})`}>
        <HojaBase tinteLamina={DEFICIENCIA.nitroViejo} conBrillo={false}>
          <ClorosisNitrogeno />
        </HojaBase>
      </g>
      <g transform={`translate(${DER} ${BASE_Y}) scale(${ESC})`}>
        <HojaBase tinteLamina={DEFICIENCIA.nitroViejo} conBrillo={false}>
          <ClorosisNitrogeno />
        </HojaBase>
      </g>

      {/* el signo de pregunta en la mitad: la lámina admite que no sabe */}
      <text x="210" y="152" textAnchor="middle" fontSize="46" fontWeight="800" fill={CATEGORIA.duda.tinta} opacity="0.5">
        ?
      </text>
      <text x="210" y="172" textAnchor="middle" fontSize="8" fontStyle="italic" fill={CATEGORIA.duda.tinta}>
        la misma
      </text>
      <text x="210" y="182" textAnchor="middle" fontSize="8" fontStyle="italic" fill={CATEGORIA.duda.tinta}>
        hoja
      </text>

      <text x={IZQ} y="220" textAnchor="middle" fontSize="9.5" fontWeight="800" fill={CATEGORIA.deficiencia.tinta}>
        ¿le falta nitrógeno?
      </text>
      <text x={IZQ} y="230" textAnchor="middle" fontSize="7.5" fontStyle="italic" fill={TINTA.suave}>
        amarillo parejo, las viejas primero
      </text>
      <text x={DER} y="220" textAnchor="middle" fontSize="9.5" fontWeight="800" fill={CATEGORIA.plaga.tinta}>
        ¿o tiene nematodo?
      </text>
      <text x={DER} y="230" textAnchor="middle" fontSize="7.5" fontStyle="italic" fill={TINTA.suave}>
        amarillo parejo, las viejas primero
      </text>

      {/* ---------- el veredicto honesto ---------- */}
      <rect x="14" y="240" width="392" height="26" rx="5" fill={CATEGORIA.duda.chip} fillOpacity="0.2" stroke={CATEGORIA.duda.tinta} strokeWidth="0.9" strokeDasharray="4 3" />
      <text x="210" y="251" textAnchor="middle" fontSize="9" fontWeight="800" fill={CATEGORIA.duda.tinta}>
        POR ARRIBA SON LA MISMA HOJA. DE AQUÍ NO SE PUEDE SACAR EL DIAGNÓSTICO.
      </text>
      <text x="210" y="261" textAnchor="middle" fontSize="7.6" fontStyle="italic" fill={TINTA.media}>
        Y no pasa nada: quiere decir que todavía falta un dato, no que usted no sepa mirar.
      </text>

      {/* ---------- la salida ---------- */}
      <text x="16" y="284" fontSize="10" fontWeight="800" fill={TINTA.fuerte} letterSpacing="0.05em">
        LA SALIDA
      </text>
      <text x="72" y="284" fontSize="8.6" fontStyle="italic" fill={TINTA.suave}>
        — saque una matica de la orilla del lote y mírele la raíz. Ahí sí se ve, y sin lupa.
      </text>

      {/* línea del suelo */}
      <line x1="40" y1="296" x2="380" y2="296" stroke={TINTA.guia} strokeWidth="1.1" strokeDasharray="5 4" opacity="0.8" />

      <Raiz x={IZQ} y={296} anudada={false} />
      <Raiz x={DER} y={296} anudada />

      <text x={IZQ} y="416" textAnchor="middle" fontSize="9.5" fontWeight="800" fill={CATEGORIA.deficiencia.tinta}>
        raíz lisa y con barbas
      </text>
      <text x={IZQ} y="426" textAnchor="middle" fontSize="7.5" fill={TINTA.media}>
        era hambre → abone con materia
      </text>
      <text x={IZQ} y="435" textAnchor="middle" fontSize="7.5" fill={TINTA.media}>
        orgánica y espere 2 o 3 semanas.
      </text>

      <text x={DER} y="416" textAnchor="middle" fontSize="9.5" fontWeight="800" fill={CATEGORIA.plaga.tinta}>
        raíz con nudos
      </text>
      <text x={DER} y="426" textAnchor="middle" fontSize="7.5" fill={TINTA.media}>
        era nematodo → el nudo es la raíz
      </text>
      <text x={DER} y="435" textAnchor="middle" fontSize="7.5" fill={TINTA.media}>
        hinchada, no se desprende.
      </text>

      <text x="210" y="450" textAnchor="middle" fontSize="8" fontStyle="italic" fontWeight="700" fill={CATEGORIA.duda.tinta}>
        Si no alcanza a ver, no adivine: acérquese, voltee la hoja, saque la mata — o mande la foto.
      </text>
    </svg>
  );
}
