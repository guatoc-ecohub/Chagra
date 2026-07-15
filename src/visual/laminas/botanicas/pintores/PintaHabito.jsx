/*
 * PintaHabito — la MATA ENTERA, a escala, con su medida al lado.
 *
 * Es la Fig. 1 de toda lámina de la colección y la que contesta las dos
 * preguntas que se hacen antes que ninguna otra: "¿qué tan grande es?" y
 * "¿cómo se para?". De ahí sale el trabajo — si trepa hay que tutorar, si
 * macolla se divide, si es hierba gigante no se poda como árbol.
 *
 * LA ESCALA NO ES OPCIONAL. Toda mata va contra una silueta humana de 1,65 m
 * y una barra de escala. Sin eso la lámina miente por omisión: el cacao (6 m)
 * y el tomate de árbol (3 m) dibujados del mismo tamaño en la página hacen
 * creer que son matas parecidas.
 *
 * Sobre el follaje de los árboles: la lámina NO dibuja las cuatro mil hojas
 * de un aguacate. Resuelve la copa con silueta y textura y manda el detalle
 * al recuadro de la Fig. 2 — así lo hace la lámina clásica y así se lee.
 * Fingir cada hoja de un árbol de 8 m es de aficionado y además ilegible.
 */
import React, { useId, useMemo } from 'react';
import { generador } from '../nucleo/rng.js';
import { TINTA, PLUMA, PAPEL, SUELO, LAVADO, VERDE_POR_PISO, FRUTO } from '../nucleo/paletaLamina.js';
import { puntillismo, puntosAPath, sombraDeCilindro, sombraDeVolumen } from '../nucleo/trama.js';
import { habito, siluetaHumana } from '../geometria/habito.js';
import { hoja } from '../geometria/hoja.js';
import { idSvg, Trazo } from './organos.jsx';

/** Una hoja chica para colgar del tallo. Se dibuja simplificada a propósito:
 *  en el hábito importa la POSICIÓN (la filotaxia), no el detalle — el
 *  detalle tiene su propia figura. */
function HojaDeHabito({ spec, semilla, len, verde, rot = 0 }) {
  const geo = useMemo(() => {
    const r = generador(semilla);
    const forma = spec.compuesta ? 'ovada' : spec.forma;
    return hoja({
      forma: forma === 'palmatilobada' ? 'palmatilobada' : forma,
      lobulos: spec.lobulos,
      abertura: spec.abertura,
      seno: spec.seno,
      anchoLobulo: spec.anchoLobulo,
      borde: spec.borde,
      nervadura: spec.nervadura === 'palmada' ? 'palmada' : 'pinnada',
      len,
      ancho: len * (spec.esbeltez ?? 0.35),
      rng: r,
    });
  }, [spec, semilla, len]);
  return (
    <g transform={`rotate(${rot})`}>
      <path d={geo.d} fill={verde.haz} stroke={TINTA.plena} strokeWidth={PLUMA.contorno * 0.6} strokeLinejoin="round" />
      <path d={geo.nervios.principal} fill="none" stroke={verde.sombra} strokeWidth={PLUMA.vena} />
    </g>
  );
}

/**
 * @param {Object} props.especie el registro completo
 * @param {number} [props.altoPx] alto del dibujo del hábito
 * @param {boolean} [props.escala] mostrar silueta humana + barra
 */
export function PintaHabito({ especie, altoPx = 300, escala = true }) {
  const uid = idSvg(useId());
  const verde = VERDE_POR_PISO[especie.piso] || VERDE_POR_PISO.templado;
  const semilla = `${especie.id}-habito`;

  const geo = useMemo(() => {
    const r = generador(semilla);
    return habito(especie.porte.tipo, r, especie.porte);
  }, [semilla, especie.porte]);

  /* La escala real: cuántos px mide un metro EN ESTA lámina. Sale de la
     altura declarada de la especie, así que el dibujo y la cota nunca se
     pueden desincronizar — es la misma cuenta. */
  const pxPorMetro = altoPx / especie.alturaM;
  const humano = useMemo(() => siluetaHumana(1.65 * pxPorMetro), [pxPorMetro]);

  const cilindro = useMemo(() => {
    const r = generador(`${semilla}-cil`);
    const caja = { x: -12, y: -geo.alto, w: 24, h: geo.alto };
    return puntosAPath(puntillismo(r, caja, sombraDeCilindro('u', 0.34), { intentos: Math.round(geo.alto * 1.1) }));
  }, [semilla, geo.alto]);

  const tex = useMemo(() => {
    const r = generador(`${semilla}-copa`);
    if (!geo.copa) return null;
    const caja = { x: -altoPx * 0.5, y: -altoPx, w: altoPx, h: altoPx * 0.6 };
    return puntosAPath(puntillismo(r, caja, sombraDeVolumen(0.34, 0.32), { intentos: 1400, rMin: 0.5, rMax: 1.3 }));
  }, [semilla, geo.copa, altoPx]);

  const tinta = { stroke: TINTA.plena, strokeWidth: PLUMA.contorno, strokeLinejoin: 'round' };

  return (
    <g>
      {/* LA SILUETA: la regla. Va detrás, en gris muy pálido, para medir sin
          competirle al dibujo — es un instrumento, no un personaje. */}
      {escala && (
        <g transform={`translate(${-altoPx * 0.42} 0)`} opacity="0.2">
          <path d={humano.d} fill={TINTA.fantasma} />
          <path d={humano.brazo} fill="none" stroke={TINTA.fantasma} strokeWidth="1.2" />
        </g>
      )}

      {/* LA LÍNEA DEL SUELO: media colección se entiende sabiendo qué queda
          arriba y qué queda abajo. */}
      <path d={`M${-altoPx * 0.55} 0 L${altoPx * 0.55} 0`} stroke={SUELO.linea} strokeWidth="1.1" opacity="0.8" />

      {/* ÁRBOL — copa por masa y textura, no hoja por hoja */}
      {geo.copa && (
        <>
          <defs>
            <clipPath id={`${uid}-copa`}>
              <path d={geo.copa} />
            </clipPath>
          </defs>
          {geo.ramas?.map((b, i) => (
            <path key={i} d={b.d} fill="none" stroke={SUELO.corteza} strokeWidth={PLUMA.contorno * 2.2} strokeLinecap="round" />
          ))}
          <path d={geo.copa} fill={verde.haz} opacity="0.82" />
          <g clipPath={`url(#${uid}-copa)`}>
            <Trazo d={tex} fill={verde.sombra} opacity="0.4" />
          </g>
          <path d={geo.copa} fill="none" stroke={TINTA.plena} strokeWidth={PLUMA.contorno * 0.8} strokeDasharray="0.1 3.2" strokeLinecap="round" opacity="0.8" />
        </>
      )}

      {/* TALLO / TRONCO */}
      {geo.tallo && (
        <>
          <defs>
            <clipPath id={`${uid}-tallo`}>
              <path d={geo.tallo} />
            </clipPath>
          </defs>
          <path d={geo.tallo} fill={geo.copa ? SUELO.corteza : LAVADO.hazTemplado} {...tinta} />
          <g clipPath={`url(#${uid}-tallo)`}>
            <Trazo d={cilindro} fill={TINTA.suave} opacity="0.3" />
          </g>
        </>
      )}

      {/* PSEUDOTALLO del plátano: LAS VAINAS. Sin estas líneas se lee como
          tronco, y la lámina estaría mintiendo sobre qué es un plátano — no
          es árbol, es una hierba de 4-8 m hecha de vainas enrolladas. */}
      {geo.vainas?.map((v, i) => (
        <path key={i} d={v} fill="none" stroke={TINTA.media} strokeWidth="0.5" opacity="0.6" />
      ))}

      {/* NUDOS de la gramínea + las RAÍCES ZANCUDAS del maíz (las que el
          aporque entierra: por eso se aporca el maíz) */}
      {geo.anillos?.map((y, i) => (
        <path key={i} d={`M-5 ${y.toFixed(1)} L5 ${y.toFixed(1)}`} stroke={TINTA.plena} strokeWidth="1" />
      ))}
      {geo.fulcreas?.map((f, i) => (
        <path key={i} d={f.d} fill="none" stroke={SUELO.raiz} strokeWidth="1.8" strokeLinecap="round" />
      ))}

      {/* TUTOR — la trepadora se dibuja CON su tutor: sin él, el dibujo estaría
          mintiendo sobre el trabajo que exige. */}
      {geo.tutor && (
        <>
          <rect x={-geo.tutor.ancho} y={-geo.tutor.alto} width={geo.tutor.ancho * 2} height={geo.tutor.alto} fill={SUELO.cortezaClara} stroke={TINTA.media} strokeWidth="0.5" opacity="0.9" />
          <path d={geo.guia} fill="none" stroke={LAVADO.hazTemplado} strokeWidth="2.2" strokeLinecap="round" />
          <path d={geo.guia} fill="none" stroke={TINTA.media} strokeWidth="0.5" />
        </>
      )}

      {/* GUÍA de la rastrera + sus zarcillos */}
      {geo.rastrera && (
        <>
          <path d={geo.guia} fill="none" stroke={LAVADO.hazCalido} strokeWidth="2.6" strokeLinecap="round" />
          <path d={geo.guia} fill="none" stroke={TINTA.media} strokeWidth="0.5" />
          {geo.zarcillos?.map((z, i) => (
            <path key={i} d={z.d} fill="none" stroke={verde.sombra} strokeWidth="0.8" strokeLinecap="round" />
          ))}
        </>
      )}

      {/* RAMAS del arbusto (las bandolas del café: las que cargan) */}
      {geo.ramas &&
        !geo.copa &&
        geo.ramas.map((b, i) => (
          <g key={i}>
            <path d={b.d} fill="none" stroke={LAVADO.hazTemplado} strokeWidth={PLUMA.contorno * 1.6} strokeLinecap="round" />
            <path d={b.d} fill="none" stroke={TINTA.media} strokeWidth="0.5" />
            {b.hojas?.map((h, k) => (
              <g key={k} transform={`translate(${(b.ex * (0.25 + (k / b.hojas.length) * 0.7)).toFixed(1)} ${(b.y - b.l * 0.12 * (k / b.hojas.length)).toFixed(1)})`}>
                <HojaDeHabito spec={especie.hoja} semilla={`${semilla}-r${i}-${k}`} len={altoPx * 0.075} verde={verde} rot={h.rot + (b.s < 0 ? 180 : 0)} />
              </g>
            ))}
          </g>
        ))}

      {/* COJINES FLORALES del cacao: la CAULIFLORÍA. Flores y mazorcas SOBRE
          EL TRONCO — por eso el machete no va ahí: cada cojín cortado es
          cosecha perdida por años. */}
      {geo.cojines?.map((c, i) => (
        <g key={i}>
          <circle cx={c.s * 5} cy={c.y} r={c.r} fill={FRUTO.petalo} stroke={TINTA.media} strokeWidth="0.4" />
          {i % 3 === 0 && (
            <ellipse cx={c.s * 12} cy={c.y + 6} rx="4" ry="7" fill={FRUTO.ambar} stroke={TINTA.plena} strokeWidth="0.5" transform={`rotate(${c.s * 18} ${c.s * 12} ${c.y + 6})`} />
          )}
        </g>
      ))}

      {/* PENCAS del plátano: nacen enrolladas, se abren, y el viento las RASGA
          entre las venas. Una hoja adulta rasgada NO está enferma — hizo su
          trabajo. Se dibuja rasgada para que nadie la confunda con daño. */}
      {geo.pencas?.map((p, i) => (
        <g key={i} transform={`translate(0 ${p.y.toFixed(1)}) rotate(${p.rot.toFixed(0)})`}>
          <g transform={`scale(${p.esc.toFixed(2)})`}>
            <HojaDeHabito spec={especie.hoja} semilla={`${semilla}-p${i}`} len={altoPx * 0.42} verde={verde} />
            {p.rasgada && (
              <g opacity="0.9">
                {[0.3, 0.5, 0.68, 0.84].map((t, k) => (
                  <path
                    key={k}
                    d={`M${(altoPx * 0.42 * t).toFixed(1)} 0 L${(altoPx * 0.42 * t + 3).toFixed(1)} ${((k % 2 === 0 ? 1 : -1) * altoPx * 0.42 * 0.3).toFixed(1)}`}
                    stroke={PAPEL.base}
                    strokeWidth="1.6"
                  />
                ))}
              </g>
            )}
          </g>
        </g>
      ))}

      {/* HOJAS sobre el tallo, EN SU FILOTAXIA. El café va OPUESTO y el
          aguacate ALTERNO: esa sola diferencia los separa a diez metros. */}
      {geo.hojas?.map((h, i) => (
        <g key={i} transform={`translate(${(h.x ?? 0).toFixed(1)} ${h.y.toFixed(1)})`}>
          <g transform={`rotate(${(h.rot + (h.lado < 0 ? 180 : 0)).toFixed(0)}) scale(${Math.abs(h.esc).toFixed(2)} ${(h.lado < 0 ? -1 : 1) * Math.abs(h.esc)})`}>
            <HojaDeHabito spec={especie.hoja} semilla={`${semilla}-h${i}`} len={altoPx * 0.13} verde={verde} />
          </g>
        </g>
      ))}
    </g>
  );
}

/** Cota vertical con flechas: la altura de la mata, en metros, dibujada. */
export function Cota({ x, y0, y1, texto }) {
  return (
    <g>
      <path d={`M${x} ${y0} L${x} ${y1}`} stroke={TINTA.fantasma} strokeWidth="0.6" />
      <path d={`M${x - 3} ${y0 + 4} L${x} ${y0} L${x + 3} ${y0 + 4}`} fill="none" stroke={TINTA.fantasma} strokeWidth="0.6" />
      <path d={`M${x - 3} ${y1 - 4} L${x} ${y1} L${x + 3} ${y1 - 4}`} fill="none" stroke={TINTA.fantasma} strokeWidth="0.6" />
      <text
        x={x - 4}
        y={(y0 + y1) / 2}
        fontFamily="'Palatino Linotype', Palatino, Georgia, serif"
        fontSize="9.5"
        fill={TINTA.fantasma}
        textAnchor="middle"
        transform={`rotate(-90 ${x - 4} ${(y0 + y1) / 2})`}
      >
        {texto}
      </text>
    </g>
  );
}
