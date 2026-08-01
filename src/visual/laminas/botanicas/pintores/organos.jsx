/*
 * organos — los PINTORES: de geometría a tinta sobre papel.
 *
 * La geometría (../geometria) no sabe de color ni de React: devuelve `d`s y
 * datos. Acá se decide cómo se pinta, y el orden de capas NO es negociable —
 * es el orden del grabado clásico, y cambiarlo delata al aficionado:
 *
 *   1. LAVADO  — la acuarela aguada, plana, sin borde.
 *   2. PUNTILLISMO — el volumen, por densidad de puntos (nunca por degradé).
 *   3. NERVADURA — la estructura, con su jerarquía de peso.
 *   4. SÍNTOMA — la lesión, encima del tejido sano (porque eso ES).
 *   5. CONTORNO — la plumilla, SIEMPRE de último y siempre encima.
 *
 * Todo lo que va adentro del órgano se RECORTA contra su silueta (clipPath):
 * más barato que calcularlo y sin una sola fuga. Los ids salen de `useId`,
 * así una misma lámina puede repetirse en la página sin colisionar.
 *
 * Determinismo: los pintores reciben `semilla` (string) y arman su rng
 * adentro, en `useMemo`. Misma semilla → misma lámina, siempre. Un cuaderno
 * de campo no puede cambiar de dibujo entre dos miradas.
 */
import React, { useId, useMemo } from 'react';
import { generador } from '../nucleo/rng.js';
import { TINTA, PLUMA, PAPEL, SUELO, FRUTO, VERDE_POR_PISO, LAVADO, SINTOMA } from '../nucleo/paletaLamina.js';
import { puntillismo, puntosAPath, sombraDeHoja, sombraDeVolumen, tramado, pelusa } from '../nucleo/trama.js';
import { hoja, hojaCompuesta } from '../geometria/hoja.js';
import { raiz } from '../geometria/raiz.js';
import { FLORES } from '../geometria/flor.js';
import { FRUTOS } from '../geometria/fruto.js';
import { SINTOMAS } from '../geometria/sintoma.js';

/* ------------------------------------------------------------------ */
/* Utilidades de pintura                                               */
/* ------------------------------------------------------------------ */

/** `useId` de React devuelve ids con dos puntos (`:r0:`). Sirven de sobra en
 *  un navegador, pero estas láminas también se capturan con rsvg (el harness
 *  visual de la casa) y ahí el `:` en un `url(#…)` es pólvora mojada. Se los
 *  quitamos: la unicidad la sigue dando React, y el id queda rsvg-safe — que
 *  es requisito de la librería, no un lujo (ver ../README.md). */
export const idSvg = (id) => `lb${id.replace(/[^a-zA-Z0-9_-]/g, '')}`;

/** Un trazo que se calla cuando no tiene nada que decir.
 *
 *  No todo sistema de nervadura llena los tres órdenes: la PARALELA del maíz
 *  no tiene venillas de tercer orden (corre de base a punta sin ramificar —
 *  por eso la hoja se rasga a lo largo), la PALMADA no usa el segundo, y la
 *  pinnada sortea las suyas. Sin esta guarda, esas láminas emiten `<path d="">`:
 *  invisible en pantalla, pero es un nodo muerto en un documento que además se
 *  imprime y se captura con rsvg. Una lámina no lleva trazos vacíos, igual que
 *  no lleva palabras de relleno. */
export const Trazo = ({ d, ...p }) => (d ? <path d={d} {...p} /> : null);

/** Pinta las capas que devuelve un síntoma. Resuelve el centinela 'PAPEL'
 *  (el hueco comido: se pinta del color del papel, porque es un agujero y
 *  por el agujero se ve la mesa). */
function Capas({ capas }) {
  return capas.map((c, i) => (
    <path
      key={i}
      d={c.d}
      fill={c.fill === 'PAPEL' ? PAPEL.base : (c.fill ?? 'none')}
      stroke={c.stroke ?? 'none'}
      strokeWidth={c.sw ?? 0}
      strokeLinecap={c.cap ?? 'butt'}
      opacity={c.op ?? 1}
    />
  ));
}

/** El verde de la especie según su piso térmico (regla de la paleta madre:
 *  a más altura, menos saturación y más plata adentro). */
const verdeDe = (piso) => VERDE_POR_PISO[piso] || VERDE_POR_PISO.templado;

/* ------------------------------------------------------------------ */
/* HOJA                                                                */
/* ------------------------------------------------------------------ */

/** Una lámina foliar suelta (o un foliolo). Es la unidad de pintura. */
function Lamina({ geo, verde, cara, spec, sintoma, etapa, cid }) {
  /* HAZ vs ENVÉS no son el mismo verde: el envés siempre es más pálido y más
     gris. Pintarlos iguales es EL error del aficionado — y acá además tiene
     consecuencia práctica, porque media enfermedad sólo se ve por el envés. */
  const relleno = cara === 'enves' ? (spec.envesGlauco ? LAVADO.glauco : verde.enves) : verde.haz;

  const puntos = useMemo(() => {
    const r = generador(`${cid}-stipple`);
    return puntosAPath(puntillismo(r, geo.caja, sombraDeHoja(cara === 'enves' ? -1 : 1), { intentos: Math.round((geo.caja.w * geo.caja.h) / 22) }));
  }, [cid, geo, cara]);

  const lesion = useMemo(() => {
    if (!sintoma || !SINTOMAS[sintoma]) return null;
    const r = generador(`${cid}-${sintoma}-${etapa}`);
    return SINTOMAS[sintoma](r, geo.caja, { etapa, cara });
  }, [cid, sintoma, etapa, geo, cara]);

  const vello = useMemo(() => {
    if (!spec.pubescente) return null;
    const r = generador(`${cid}-vello`);
    return pelusa(r, geo.contorno, 2.4, 4);
  }, [cid, spec.pubescente, geo]);

  return (
    <>
      <defs>
        <clipPath id={cid}>
          <path d={geo.d} />
        </clipPath>
      </defs>

      {/* 1 · LAVADO */}
      <path d={geo.d} fill={relleno} />

      <g clipPath={`url(#${cid})`}>
        {/* 2 · PUNTILLISMO */}
        <Trazo d={puntos} fill={verde.sombra} opacity={cara === 'enves' ? 0.34 : 0.5} />

        {/* 3 · NERVADURA — con su jerarquía de peso: la lámina se lee por el
            grosor de la línea, no por el color. En el ENVÉS la nervadura
            RESALTA (va en relieve) y por eso se pinta más marcada: es otra
            razón para voltear la hoja. */}
        <Trazo d={geo.nervios.terciario} fill="none" stroke={TINTA.suave} strokeWidth={PLUMA.vena * 0.8} opacity={0.6} />
        <Trazo d={geo.nervios.secundario} fill="none" stroke={TINTA.media} strokeWidth={PLUMA.vena} opacity={cara === 'enves' ? 0.95 : 0.75} />
        <Trazo d={geo.nervios.principal} fill="none" stroke={TINTA.media} strokeWidth={PLUMA.nervio} strokeLinecap="round" />

        {/* 4 · SÍNTOMA */}
        {lesion && <Capas capas={lesion.capas} />}
      </g>

      {/* pubescencia: carácter diagnóstico real (tomate de árbol, uchuva,
          curuba *mollissima*), nunca adorno. Va FUERA del clip: los pelos
          sobresalen del borde — para eso son pelos. */}
      {vello && <path d={vello} fill="none" stroke={TINTA.fantasma} strokeWidth={PLUMA.vello} opacity={0.75} />}

      {/* 5 · CONTORNO */}
      <path d={geo.d} fill="none" stroke={TINTA.plena} strokeWidth={PLUMA.contorno} strokeLinejoin="round" />
    </>
  );
}

/**
 * PintaHoja — hoja simple, palmatilobada o compuesta, según el spec de la
 * especie. El spec manda: si dice trifoliolada, salen tres foliolos.
 *
 * @param {Object} props.spec  `especie.hoja`
 * @param {string} props.semilla
 * @param {number} [props.len] largo del nervio (por defecto el del spec)
 * @param {'haz'|'enves'} [props.cara]
 * @param {string} [props.piso]
 * @param {string} [props.sintoma] clave de SINTOMAS
 * @param {number} [props.etapa] 0..1 el avance de la lesión
 */
export function PintaHoja({ spec, semilla, len, cara = 'haz', piso = 'templado', sintoma = null, etapa = 0.6, peciolo = true }) {
  const uid = idSvg(useId());
  const verde = verdeDe(piso);
  const largo = len ?? spec.len ?? 80;

  const geo = useMemo(() => {
    const r = generador(`${semilla}-hoja`);
    if (spec.compuesta) {
      return { compuesta: hojaCompuesta({ ...spec, tipo: spec.compuesta, len: largo, rng: r }) };
    }
    return { simple: hoja({ ...spec, len: largo, ancho: largo * (spec.esbeltez ?? 0.35), rng: r }) };
  }, [semilla, spec, largo]);

  if (geo.compuesta) {
    const { foliolos, raquis, zarcillo } = geo.compuesta;
    return (
      <g>
        {/* el raquis: el eje de la hoja compuesta. No es un tallo — es parte
            de LA MISMA hoja, y por eso se cae entero de una pieza. */}
        <path d={raquis} fill="none" stroke={TINTA.media} strokeWidth={PLUMA.nervio * 1.3} strokeLinecap="round" />
        {foliolos.map((f, i) => (
          <g key={i} transform={`translate(${f.x.toFixed(1)} ${f.y.toFixed(1)}) rotate(${f.rot})`}>
            <Lamina geo={f} verde={verde} cara={cara} spec={spec} sintoma={sintoma} etapa={etapa} cid={`${uid}-f${i}`} />
          </g>
        ))}
        {/* el ZARCILLO de la arveja: su modo de trepar. El haba no lo tiene y
            por eso se para sola. Esa diferencia decide si hay que poner vara. */}
        {zarcillo && <path d={zarcillo} fill="none" stroke={verde.sombra} strokeWidth={PLUMA.nervio} strokeLinecap="round" fillRule="evenodd" />}
      </g>
    );
  }

  const g = geo.simple;
  return (
    <g>
      {peciolo && !g.palmada && (
        <path
          d={`M${(-largo * 0.16).toFixed(1)} 0 L${(g.seno || 0).toFixed(1)} 0`}
          fill="none"
          stroke={spec.peciolo?.includes('rojiz') ? '#8a4a33' : TINTA.media}
          strokeWidth={PLUMA.nervio * 1.5}
          strokeLinecap="round"
        />
      )}
      {peciolo && g.palmada && (
        <path d={`M${(-largo * 0.34).toFixed(1)} 0 L0 0`} fill="none" stroke={spec.peciolo?.includes('rojiz') ? '#8a4a33' : TINTA.media} strokeWidth={PLUMA.nervio * 1.6} strokeLinecap="round" />
      )}
      <Lamina geo={g} verde={verde} cara={cara} spec={spec} sintoma={sintoma} etapa={etapa} cid={uid} />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* RAÍZ                                                                */
/* ------------------------------------------------------------------ */

/**
 * PintaRaiz — el sistema radical. La raíz viva se pinta CLARA (casi hueso),
 * no parda: contra la tierra oscura es como se ve de verdad al abrir un hoyo,
 * y es lo que permite leerla. Una raíz parda sobre tierra parda no enseña.
 */
export function PintaRaiz({ spec, semilla, mostrarTierra = true }) {
  const uid = idSvg(useId());
  const geo = useMemo(() => {
    const r = generador(`${semilla}-raiz`);
    return raiz(spec.tipo, r, spec.op || {});
  }, [semilla, spec]);

  const tierra = useMemo(() => {
    const r = generador(`${semilla}-tierra`);
    return tramado({ x: -140, y: 0, w: 280, h: 150 }, 7, 22, r, 2);
  }, [semilla]);

  return (
    <g>
      {/* LA LÍNEA DEL SUELO: la lámina la marca siempre. Media colección se
          entiende sólo sabiendo qué queda arriba y qué queda abajo. */}
      {mostrarTierra && (
        <>
          <defs>
            <clipPath id={`${uid}-suelo`}>
              <rect x="-140" y="0" width="280" height="150" />
            </clipPath>
          </defs>
          <g clipPath={`url(#${uid}-suelo)`} opacity="0.28">
            <path d={tierra} fill="none" stroke={SUELO.cuerpo} strokeWidth="0.5" />
          </g>
          <path d="M-140 0 L140 0" stroke={SUELO.linea} strokeWidth="1.2" opacity="0.9" />
        </>
      )}

      {/* las raicillas: cuerpo claro + contorno finito */}
      <path d={geo.d} fill={SUELO.raiz} stroke={TINTA.media} strokeWidth={PLUMA.vena} strokeLinejoin="round" />

      {/* ESTOLONES + TUBÉRCULOS (papa, ulluco): el estolón se dibuja distinto
          de la raíz A PROPÓSITO — es un cordón de TALLO, y de él cuelga el
          tubérculo. Ver los dos sistemas juntos en el mismo dibujo es toda la
          lección: el manojo de raíces por un lado, el estolón por el otro. */}
      {geo.estolones && <path d={geo.estolones} fill="none" stroke={SUELO.cortezaClara} strokeWidth="1.8" strokeLinecap="round" />}
      {geo.tuberculos?.map((t, i) => (
        <g key={i} transform={`translate(${t.x.toFixed(1)} ${t.y.toFixed(1)}) rotate(${t.rot.toFixed(0)})`}>
          <ellipse rx={t.rx} ry={t.ry} fill={SUELO.pulpaClara} stroke={TINTA.plena} strokeWidth={PLUMA.contorno * 0.8} />
          {/* los OJOS: las yemas. Son la prueba de que esto es tallo. */}
          {[-0.45, 0.1, 0.55].map((f, k) => (
            <path
              key={k}
              d={`M${(f * t.rx).toFixed(1)} ${(-t.ry * 0.5).toFixed(1)} a2 2 0 1 0 0.1 0`}
              fill="none"
              stroke={TINTA.media}
              strokeWidth="0.5"
            />
          ))}
        </g>
      ))}

      {/* NÓDULOS de las leguminosas: rosados = fijando; grises = fallando.
          Se rajan con la uña y se sabe al instante. Dato de manejo, no
          anatomía de adorno. */}
      {geo.nodulos?.map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r={n.r} fill={SINTOMA.salmon} stroke={TINTA.media} strokeWidth="0.4" opacity="0.95" />
      ))}

      {/* CORMO (plátano): el tallo subterráneo del que salen los hijuelos. */}
      {geo.tipo === 'cormo' && (
        <>
          <path d={geo.raices} fill={SUELO.raiz} stroke={TINTA.media} strokeWidth={PLUMA.vena} />
          <path d={geo.d} fill={SUELO.cortezaClara} stroke={TINTA.plena} strokeWidth={PLUMA.contorno} />
          {geo.brotes?.map((b, i) => (
            <g key={i}>
              <path
                d={`M${b.x.toFixed(1)} ${b.y.toFixed(1)} l${(b.s * 2).toFixed(1)} ${(-b.alto).toFixed(1)}`}
                stroke={LAVADO.brote}
                strokeWidth="5"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d={`M${b.x.toFixed(1)} ${b.y.toFixed(1)} l${(b.s * 2).toFixed(1)} ${(-b.alto).toFixed(1)}`}
                stroke={TINTA.media}
                strokeWidth="0.5"
                fill="none"
              />
            </g>
          ))}
        </>
      )}

      {/* MACOLLA (cebolla, caña): los bulbillos que se dividen para sembrar. */}
      {geo.bulbos?.map((b, i) => (
        <ellipse key={i} cx={b.x} cy={b.y} rx={b.rx} ry={b.ry} fill={PAPEL.claro} stroke={TINTA.plena} strokeWidth={PLUMA.contorno * 0.8} />
      ))}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* FLOR                                                                */
/* ------------------------------------------------------------------ */

/** PintaFlor — el arquetipo de la familia. Ver `../geometria/flor.js`: la
 *  flor delata el parentesco y el parentesco predice el manejo. */
export function PintaFlor({ spec, semilla, escala = 1 }) {
  const uid = idSvg(useId());
  const geo = useMemo(() => {
    const r = generador(`${semilla}-flor`);
    const f = FLORES[spec.tipo] || FLORES.solanacea;
    return f(r, spec.op || {});
  }, [semilla, spec]);

  const [c1, c2] = spec.color || [FRUTO.petalo, FRUTO.antera];
  const trazo = { stroke: TINTA.plena, strokeWidth: PLUMA.contorno * 0.75, strokeLinejoin: 'round' };

  return (
    <g transform={`scale(${escala})`}>
      {/* SOLANÁCEA — corola rotácea + EL CONO DE ANTERAS. Ese cono es la firma
          de la familia: papa, tomate, tomate de árbol, uchuva. Del cono el
          polen sale por poros, y por eso lo saca el abejorro vibrando. */}
      {(geo.tipo === 'solanacea' || geo.tipo === 'campanulada') && (
        <>
          {geo.caliz?.map((s, i) => (
            <ellipse key={i} rx={geo.r * 0.12} ry={s.largo} transform={`rotate(${s.rot}) translate(0 ${-s.largo * 0.6})`} fill={LAVADO.hazTemplado} opacity="0.9" {...trazo} strokeWidth="0.4" />
          ))}
          <path d={geo.corola} fill={c1} {...trazo} />
          {geo.maculas?.map((m, i) => (
            <ellipse key={i} rx={m.rx} ry={m.ry} transform={`rotate(${m.rot}) translate(0 ${-m.d})`} fill={c2} opacity="0.85" />
          ))}
          {geo.anteras?.map((a, i) => (
            <ellipse key={i} rx={a.ancho ?? geo.r * 0.09} ry={a.largo * 0.5} transform={`rotate(${a.rot}) translate(0 ${-a.largo * 0.5})`} fill={FRUTO.antera} stroke={TINTA.media} strokeWidth="0.35" />
          ))}
          {geo.conoR && <circle r={geo.conoR} fill={FRUTO.ambar} stroke={TINTA.media} strokeWidth="0.4" />}
          {geo.estilo && <path d={`M0 0 L0 ${-geo.estilo}`} stroke={TINTA.media} strokeWidth="0.7" fill="none" />}
        </>
      )}

      {/* PAPILIONÁCEA — de perfil, que es como se entiende: de frente la
          quilla no se ve y se pierde el sentido de la flor. */}
      {geo.tipo === 'papilionacea' && (
        <>
          <path d={geo.caliz} fill={LAVADO.hazTemplado} {...trazo} strokeWidth="0.5" />
          <path d={geo.quilla} fill={c1} opacity="0.9" {...trazo} strokeWidth="0.5" />
          <path d={geo.ala} fill={c1} {...trazo} strokeWidth="0.5" />
          {geo.mancha && <ellipse cx={geo.mancha.cx} cy={geo.mancha.cy} rx={geo.mancha.rx} ry={geo.mancha.ry} fill={c2} />}
          <path d={geo.estandarte} fill={c1} {...trazo} />
        </>
      )}

      {/* Pétalos sueltos: rubiácea (café), rosácea (mora), laurácea, cacao. */}
      {(geo.tipo === 'rubiacea' || geo.tipo === 'rosacea' || geo.tipo === 'lauracea' || geo.tipo === 'cauliflora') && (
        <>
          {geo.sepalos?.map((p, i) => (
            <ellipse key={`s${i}`} rx={p.rx} ry={p.ry} cy={p.cy} transform={`rotate(${p.rot})`} fill={LAVADO.hazTemplado} opacity="0.8" stroke={TINTA.media} strokeWidth="0.35" />
          ))}
          {(geo.petalos || geo.tepalos)?.map((p, i) => (
            <ellipse key={i} rx={p.rx} ry={p.ry} cy={p.cy} transform={`rotate(${p.rot})`} fill={c1} {...trazo} strokeWidth="0.5" />
          ))}
          {geo.estambres?.map((e, i) => (
            <g key={i} transform={`rotate(${e.rot})`}>
              <path d={`M0 0 L0 ${-e.largo}`} stroke={TINTA.suave} strokeWidth="0.4" fill="none" />
              <circle cy={-e.largo} r="0.9" fill={FRUTO.antera} />
            </g>
          ))}
          {geo.anteras?.map((a, i) => (
            <g key={`a${i}`} transform={`rotate(${a.rot})`}>
              <path d={`M0 0 L0 ${-a.largo}`} stroke={TINTA.suave} strokeWidth="0.4" fill="none" />
              <ellipse cy={-a.largo} rx="0.7" ry="1.6" fill={FRUTO.antera} />
            </g>
          ))}
          {geo.estilo && <path d={`M0 0 L0 ${-geo.estilo}`} stroke={TINTA.media} strokeWidth="0.6" fill="none" />}
          {geo.tubo && <ellipse cy={geo.tubo.largo * 0.5} rx={geo.tubo.ancho} ry={geo.tubo.largo * 0.5} fill={c1} {...trazo} strokeWidth="0.5" />}
          <circle r={geo.r * 0.13} fill={FRUTO.antera} stroke={TINTA.media} strokeWidth="0.3" />
        </>
      )}

      {/* PASIFLORA — la curuba: TUBO LARGO y colgante. La forma cuenta quién
          la visita: sin colibrí no hay curuba. */}
      {geo.tipo === 'pasiflora' && (
        <>
          <path d={`M0 ${-geo.tubo.largo} L0 0`} stroke={c1} strokeWidth={geo.tubo.ancho * 2} strokeLinecap="round" fill="none" />
          <path d={`M0 ${-geo.tubo.largo} L0 0`} stroke={TINTA.media} strokeWidth="0.5" fill="none" opacity="0.6" />
          {geo.sepalos.map((p, i) => (
            <ellipse key={`s${i}`} rx={p.rx} ry={p.ry} cy={p.cy} transform={`rotate(${p.rot})`} fill={c2} opacity="0.85" stroke={TINTA.media} strokeWidth="0.4" />
          ))}
          {geo.petalos.map((p, i) => (
            <ellipse key={i} rx={p.rx} ry={p.ry} cy={p.cy} transform={`rotate(${p.rot})`} fill={c1} {...trazo} strokeWidth="0.5" />
          ))}
          {geo.corona.map((c, i) => (
            <path key={`c${i}`} d={`M0 0 L0 ${-c.largo}`} transform={`rotate(${c.rot})`} stroke={FRUTO.indigo} strokeWidth="0.5" fill="none" opacity="0.8" />
          ))}
          <circle r={geo.r * 0.16} fill={LAVADO.hazTemplado} stroke={TINTA.media} strokeWidth="0.4" />
        </>
      )}

      {/* CUCURBITÁCEA — MONOICA: las dos flores, lado a lado. Aprender a
          distinguirlas responde el "botó la flor y no cargó": lo que botó
          eran los machos, y eso es normal. */}
      {geo.tipo === 'cucurbitacea' && (
        <>
          <g transform={`translate(${-geo.r * 1.5} 0)`}>
            <path d={`M0 ${geo.r * 0.5} L0 ${geo.macho.pedunculo}`} stroke={LAVADO.hazCalido} strokeWidth="2.4" fill="none" />
            <path d={geo.macho.corola} fill={c1} {...trazo} strokeWidth="0.6" />
            <circle r={geo.macho.anteras} fill={FRUTO.ambar} stroke={TINTA.media} strokeWidth="0.4" />
          </g>
          <g transform={`translate(${geo.r * 1.5} 0)`}>
            <path d={geo.hembra.corola} fill={c1} {...trazo} strokeWidth="0.6" />
            <circle r={geo.hembra.estigma} fill={FRUTO.ambar} stroke={TINTA.media} strokeWidth="0.4" />
            {/* EL OVARIO ÍNFERO: la ahuyamita ya puesta debajo de la flor. */}
            <ellipse cy={geo.hembra.ovario.cy} rx={geo.hembra.ovario.rx} ry={geo.hembra.ovario.ry} fill={LAVADO.hazCalido} {...trazo} strokeWidth="0.6" />
          </g>
        </>
      )}

      {/* UMBELA (arracacha) y GLOBOSA (cebolla). */}
      {geo.tipo === 'umbela' && (
        <>
          {geo.brazos.map((b, i) => (
            <g key={i}>
              <path d={`M0 0 L${b.x.toFixed(1)} ${b.y.toFixed(1)}`} stroke={TINTA.suave} strokeWidth="0.6" fill="none" />
              {b.flores?.map((f, k) => (
                <circle key={k} cx={b.x + Math.cos(f.a) * f.rr} cy={b.y + Math.sin(f.a) * f.rr * 0.6} r="1.5" fill={c1} stroke={TINTA.media} strokeWidth="0.3" />
              ))}
            </g>
          ))}
        </>
      )}
      {geo.tipo === 'globosa' && (
        <>
          <path d={`M0 0 L0 ${geo.r * 2.4}`} stroke={LAVADO.hazTemplado} strokeWidth="3" fill="none" />
          {geo.flores.map((f, i) => (
            <circle key={i} cx={f.x} cy={f.y} r={f.r} fill={c1} stroke={TINTA.media} strokeWidth="0.3" />
          ))}
        </>
      )}

      {/* PANÍCULA (maíz, caña, yuca): sin pétalos. Sólo raquis, ramas y
          anteras colgando del viento. */}
      {geo.tipo === 'panicula' && (
        <>
          <path d={geo.eje} stroke={c1} strokeWidth="1.6" fill="none" />
          {geo.brazos.map((b, i) => (
            <g key={i}>
              <path d={b.d} stroke={c1} strokeWidth="0.9" fill="none" />
              {geo.plumosa && <path d={b.d} stroke={c2} strokeWidth="3.4" fill="none" opacity="0.25" />}
              {b.anteras?.map((a, k) => (
                <ellipse key={k} cx={b.s * b.l * a.t} cy={b.y - b.l * 0.4 * a.t} rx="0.8" ry={a.largo * 0.5} fill={c2} opacity="0.9" />
              ))}
            </g>
          ))}
        </>
      )}

      {/* MUSA — la bellota/chira con su bráctea morada. */}
      {geo.tipo === 'musa' && (
        <>
          <path d={geo.bractea} fill={c1} {...trazo} />
          <path d={`M0 ${(geo.largo * 0.2).toFixed(1)} q${(geo.largo * 0.16).toFixed(1)} 4 ${(geo.largo * 0.3).toFixed(1)} 0`} fill="none" stroke={c2} strokeWidth="1.4" />
        </>
      )}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* FRUTO                                                               */
/* ------------------------------------------------------------------ */

/**
 * PintaFruto — el órgano cosechado y su CORTE. El corte es la mitad de una
 * lámina botánica y lo que la foto no puede dar: la foto muestra la cáscara,
 * el corte muestra por qué el cultivo es lo que es.
 */
export function PintaFruto({ spec, semilla, sintoma = null, etapa = 0.6 }) {
  const uid = idSvg(useId());
  const geo = useMemo(() => {
    const r = generador(`${semilla}-fruto`);
    const f = FRUTOS[spec.tipo] || FRUTOS.baya;
    return f(r, spec.op || {});
  }, [semilla, spec]);

  const col = spec.color || { piel: FRUTO.verdeFruto, pulpa: SUELO.pulpaClara };
  const trazo = { stroke: TINTA.plena, strokeWidth: PLUMA.contorno, strokeLinejoin: 'round' };
  const fino = { stroke: TINTA.media, strokeWidth: PLUMA.vena, fill: 'none' };

  const volumen = useMemo(() => {
    const r = generador(`${semilla}-fruto-vol`);
    return puntosAPath(puntillismo(r, geo.caja, sombraDeVolumen(), { intentos: Math.round((geo.caja.w * geo.caja.h) / 20) }));
  }, [semilla, geo]);

  const lesion = useMemo(() => {
    if (!sintoma || !SINTOMAS[sintoma]) return null;
    const r = generador(`${semilla}-fruto-${sintoma}-${etapa}`);
    return SINTOMAS[sintoma](r, geo.caja, { etapa, cara: 'organo' });
  }, [semilla, sintoma, etapa, geo]);

  /* El tramado del CORTE: un corte anatómico se rellena con LÍNEAS, no con
     puntos. Así, de un vistazo, se distingue lo cortado de lo entero — es
     convención de lámina científica, no gusto. */
  const corte = useMemo(() => {
    const r = generador(`${semilla}-corte`);
    return tramado(geo.caja, 3.4, 38, r, 0.6);
  }, [semilla, geo]);

  return (
    <g>
      <defs>
        <clipPath id={`${uid}-cuerpo`}>
          <path d={geo.piel || geo.cascara || geo.contorno || geo.valva || geo.tusa || geo.dedo || geo.fuera || geo.peridermis || geo.caliz || 'M0 0'} />
        </clipPath>
      </defs>

      {/* TUBÉRCULO — con OJOS y médula ESTRELLADA: la prueba de que es tallo */}
      {geo.tipo === 'tuberculo' && (
        <>
          <path d={geo.piel} fill={col.piel} {...trazo} />
          <g clipPath={`url(#${uid}-cuerpo)`}>
            <Trazo d={corte} fill="none" stroke={TINTA.fantasma} strokeWidth="0.3" opacity="0.35" />
          </g>
          <path d={geo.corteza} fill={col.pulpa} {...fino} />
          <path d={geo.medula} fill={PAPEL.claro} opacity="0.75" {...fino} />
          {geo.ojos.map((o, i) => (
            <g key={i} transform={`translate(${o.x.toFixed(1)} ${o.y.toFixed(1)}) rotate(${o.rot.toFixed(0)})`}>
              <path d={`M${-o.r} 0 a${o.r} ${o.r * 0.7} 0 1 1 ${o.r * 2} 0`} fill="none" stroke={TINTA.plena} strokeWidth="0.7" />
              <circle r={o.r * 0.4} fill={TINTA.media} />
            </g>
          ))}
          <circle cx={geo.ombligo.x} cy={geo.ombligo.y} r={geo.ombligo.r} fill={SUELO.cortezaClara} stroke={TINTA.media} strokeWidth="0.4" />
          {lesion && (
            <g clipPath={`url(#${uid}-cuerpo)`}>
              <Capas capas={lesion.capas} />
            </g>
          )}
        </>
      )}

      {/* RAÍZ TUBEROSA — con CORDÓN FIBROSO y SIN ojos: la prueba de que es raíz */}
      {geo.tipo === 'raizTuberosa' && (
        <>
          <path d={geo.peridermis} fill={col.piel} {...trazo} />
          <path d={geo.corteza} fill={PAPEL.claro} {...fino} />
          <path d={geo.pulpa} fill={col.pulpa} {...fino} />
          <Trazo d={geo.radios} fill="none" stroke={TINTA.fantasma} strokeWidth="0.3" opacity="0.5" />
          <path d={geo.cordon} fill="none" stroke={TINTA.plena} strokeWidth="1.6" strokeLinecap="round" />
          {lesion && <Capas capas={lesion.capas} />}
        </>
      )}

      {/* BAYA — lóculos, gel y semillas */}
      {geo.tipo === 'baya' && (
        <>
          <path d={geo.piel} fill={col.piel} {...trazo} />
          <path d={geo.pared} fill={col.pulpa} {...fino} />
          {geo.camaras.map((c, i) => (
            <path key={i} d={c.d} fill={PAPEL.claro} opacity="0.7" stroke={TINTA.suave} strokeWidth="0.35" />
          ))}
          <Trazo d={geo.placenta} fill="none" stroke={TINTA.media} strokeWidth="0.6" />
          {geo.semillas.map((s, i) => (
            <ellipse key={i} cx={s.x} cy={s.y} rx={s.rx} ry={s.ry} transform={`rotate(${s.rot.toFixed(0)} ${s.x.toFixed(1)} ${s.y.toFixed(1)})`} fill={SUELO.cortezaClara} stroke={TINTA.media} strokeWidth="0.3" />
          ))}
          {lesion && <Capas capas={lesion.capas} />}
        </>
      )}

      {/* DRUPA DEL CAFÉ — el mapa del beneficio en un solo corte */}
      {geo.tipo === 'drupaCafe' && (
        <>
          <path d={geo.piel} fill={col.piel} {...trazo} />
          <path d={geo.pulpa} fill={col.pulpa} {...fino} />
          <path d={geo.mucilago} fill={PAPEL.claro} opacity="0.85" {...fino} />
          {geo.pergaminos.map((p, i) => (
            <path key={`p${i}`} d={p} transform={`translate(${i === 0 ? -1 : 1} 0)`} fill={PAPEL.sombra} stroke={TINTA.media} strokeWidth="0.4" />
          ))}
          {geo.granos.map((g, i) => (
            <path key={i} d={g} fill={LAVADO.hazCalido} opacity="0.6" stroke={TINTA.plena} strokeWidth="0.7" />
          ))}
          {geo.surco.map((s, i) => (
            <path key={`s${i}`} d={s} fill="none" stroke={TINTA.plena} strokeWidth="0.8" />
          ))}
          {lesion && <Capas capas={lesion.capas} />}
        </>
      )}

      {/* AGUACATE — la semilla ocupa medio fruto */}
      {geo.tipo === 'drupaAguacate' && (
        <>
          <path d={geo.piel} fill={col.piel} {...trazo} />
          <path d={geo.pulpa} fill={col.pulpa} {...fino} />
          <path d={geo.semilla} fill={SUELO.cortezaClara} {...trazo} strokeWidth="0.8" />
          <path d={geo.tegumento} fill="none" stroke={TINTA.fantasma} strokeWidth="0.4" />
          <path d={geo.hendidura} fill="none" stroke={TINTA.media} strokeWidth="0.5" />
          {lesion && <Capas capas={lesion.capas} />}
        </>
      )}

      {/* VAINA — valvas, sutura y granos */}
      {geo.tipo === 'vaina' && (
        <>
          <path d={geo.valva} fill={col.piel} {...trazo} />
          {geo.semillas.map((s, i) => (
            <ellipse key={i} cx={s.x} cy={s.y} rx={s.rx} ry={s.ry} transform={`rotate(${s.rot.toFixed(0)} ${s.x.toFixed(1)} ${s.y.toFixed(1)})`} fill={col.pulpa} stroke={TINTA.plena} strokeWidth="0.6" opacity="0.95" />
          ))}
          <path d={geo.sutura} fill="none" stroke={TINTA.media} strokeWidth="0.6" />
          <path d={geo.pico} fill="none" stroke={TINTA.plena} strokeWidth="0.9" strokeLinecap="round" />
          {lesion && <Capas capas={lesion.capas} />}
        </>
      )}

      {/* MAZORCA — hileras SIEMPRE pares + los cabellos (cada uno = un grano) */}
      {geo.tipo === 'mazorca' && (
        <>
          {geo.barbas.map((b, i) => (
            <path key={i} d={b} fill="none" stroke={FRUTO.ambar} strokeWidth="0.6" opacity="0.75" />
          ))}
          <path d={geo.tusa} fill={PAPEL.sombra} {...trazo} />
          {geo.granos.map((g, i) => (
            <ellipse
              key={i}
              cx={g.x}
              cy={g.y}
              rx={g.rx}
              ry={g.ry}
              fill={geo.morado ? FRUTO.maizMorado : col.piel}
              stroke={TINTA.media}
              strokeWidth="0.35"
              opacity={g.borde ? 0.8 : 1}
            />
          ))}
          {lesion && <Capas capas={lesion.capas} />}
        </>
      )}

      {/* MAZORCA DE CACAO — las semillas en su baba: sin baba no hay chocolate */}
      {geo.tipo === 'mazorcaCacao' && (
        <>
          <path d={geo.cascara} fill={col.piel} {...trazo} />
          <path d={geo.interior} fill={LAVADO.hazCalido} opacity="0.4" {...fino} />
          <path d={geo.mucilago} fill={col.pulpa} {...fino} />
          <path d={geo.placenta} fill="none" stroke={TINTA.media} strokeWidth="0.8" />
          {geo.semillas.map((s, i) => (
            <ellipse key={i} cx={s.x} cy={s.y} rx={s.rx} ry={s.ry} transform={`rotate(${s.rot.toFixed(0)} ${s.x.toFixed(1)} ${s.y.toFixed(1)})`} fill="#7a4a33" stroke={TINTA.plena} strokeWidth="0.5" />
          ))}
          {lesion && <Capas capas={lesion.capas} />}
        </>
      )}

      {/* PLÁTANO — y su corte TRANSVERSAL TRILOBADO: la firma de la Musaceae */}
      {geo.tipo === 'platano' && (
        <>
          <path d={geo.dedo} fill={col.piel} {...trazo} />
          {geo.aristas.map((a, i) => (
            <path key={i} d={a} fill="none" stroke={TINTA.media} strokeWidth="0.5" opacity="0.7" />
          ))}
          <g transform={`translate(${(geo.caja.w * 0.5).toFixed(1)} ${(-geo.caja.h * 0.62).toFixed(1)})`}>
            <path d={geo.transversal.d} fill={col.pulpa} {...trazo} strokeWidth="0.9" />
            <Trazo d={geo.transversal.carpelos} fill="none" stroke={TINTA.suave} strokeWidth="0.5" />
          </g>
          {lesion && <Capas capas={lesion.capas} />}
        </>
      )}

      {/* MORA — polidrupa: cien cáscaras, por eso se magulla */}
      {geo.tipo === 'polidrupa' && (
        <>
          <path d={geo.receptaculo} fill="none" stroke={TINTA.media} strokeWidth="0.8" />
          {geo.drupeolas.map((d, i) => (
            <g key={i}>
              <circle cx={d.x} cy={d.y} r={d.r} fill={col.piel} stroke={TINTA.plena} strokeWidth="0.5" />
              <circle cx={d.x - d.r * 0.28} cy={d.y - d.r * 0.3} r={d.r * 0.24} fill={PAPEL.claro} opacity="0.4" />
            </g>
          ))}
          {lesion && <Capas capas={lesion.capas} />}
        </>
      )}

      {/* CAÑA — nudos, entrenudos, yemas y el corte con los haces REGADOS
          (monocotiledónea: no hace anillos como el tronco de un árbol) */}
      {geo.tipo === 'cana' && (
        <>
          <rect x={geo.tallo.x} y={geo.tallo.y} width={geo.tallo.w} height={geo.tallo.h} fill={col.piel} {...trazo} />
          {geo.anillos.map((a, i) => (
            <path key={i} d={`M${geo.tallo.x} ${a.y.toFixed(1)} L${(geo.tallo.x + geo.tallo.w).toFixed(1)} ${a.y.toFixed(1)}`} stroke={TINTA.plena} strokeWidth="1.1" fill="none" />
          ))}
          {geo.yemas.map((y, i) => (
            <ellipse key={i} cx={y.s * geo.tallo.w * 0.3} cy={y.y + y.r} rx={y.r * 0.7} ry={y.r} fill={SUELO.cortezaClara} stroke={TINTA.plena} strokeWidth="0.5" />
          ))}
          <g transform={`translate(${(geo.tallo.w * 2.2).toFixed(1)} ${(-geo.tallo.h * 0.3).toFixed(1)})`}>
            <circle r={geo.transversal.r} fill={col.pulpa} {...trazo} />
            {geo.transversal.haces.map((h, i) => (
              <circle key={i} cx={h.x} cy={h.y} r={h.r} fill={TINTA.suave} opacity="0.7" />
            ))}
          </g>
        </>
      )}

      {/* TUBO — la cebolla en corte: HUECA. Eso es *fistulosum*. */}
      {geo.tipo === 'tubo' && (
        <>
          <path d={geo.fuera} fill={col.piel} {...trazo} />
          <path d={geo.dentro} fill={PAPEL.base} {...trazo} strokeWidth="0.8" />
        </>
      )}

      {/* AHUYAMA — la cavidad seminal y la carne gruesa */}
      {geo.tipo === 'cucurbita' && (
        <>
          <path d={geo.cascara} fill={col.piel} {...trazo} />
          <path d={geo.carne} fill={col.pulpa} {...fino} />
          <path d={geo.cavidad} fill={PAPEL.claro} opacity="0.75" {...fino} />
          {geo.semillas.map((s, i) => (
            <ellipse key={i} cx={s.x} cy={s.y} rx={s.rx} ry={s.ry} transform={`rotate(${s.rot.toFixed(0)} ${s.x.toFixed(1)} ${s.y.toFixed(1)})`} fill={PAPEL.sombra} stroke={TINTA.media} strokeWidth="0.35" />
          ))}
          {lesion && <Capas capas={lesion.capas} />}
        </>
      )}

      {/* UCHUVA — el farolillo: el empaque que le puso la mata */}
      {geo.tipo === 'farolillo' && (
        <>
          <circle cy={geo.baya.cy} r={geo.baya.r} fill={col.piel} stroke={TINTA.plena} strokeWidth="0.7" />
          {/* el cáliz va TRANSLÚCIDO y ENCIMA: así se ve la baya adentro, que
              es exactamente como se ve en la mata a contraluz */}
          <path d={geo.caliz} fill={PAPEL.sombra} opacity="0.62" {...trazo} />
          <Trazo d={geo.costillas} fill="none" stroke={TINTA.media} strokeWidth="0.45" opacity="0.8" />
          {lesion && <Capas capas={lesion.capas} />}
        </>
      )}

      {/* volumen: el puntillismo va de último en los cuerpos redondos, para
          que la sombra caiga sobre TODO lo pintado y no sobre una sola capa */}
      {['baya', 'drupaCafe', 'drupaAguacate', 'cucurbita', 'mazorcaCacao', 'tuberculo'].includes(geo.tipo) && (
        <g clipPath={`url(#${uid}-cuerpo)`} opacity="0.3">
          <Trazo d={volumen} fill={TINTA.suave} />
        </g>
      )}
    </g>
  );
}
