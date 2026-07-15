/*
 * LaminaBotanica — el PLIEGO. Acá se junta todo.
 *
 * Una lámina de esta colección es un pliego de proporción A (1000 × 1414, la
 * misma raíz de dos del papel de verdad) con seis figuras numeradas, una
 * banda de ciclo y una banda de señales. El orden de lectura está pensado
 * para cómo se para un campesino frente a una mata desconocida:
 *
 *   Fig. 1 — LA MATA a escala.   ¿Qué tan grande es? ¿Cómo se para?
 *   Fig. 2 — LA RAÍZ.            ¿Qué hay abajo? ¿Cómo se siembra?
 *   Fig. 3 — LA HOJA, haz y ENVÉS. Lo que se mira primero y donde vive
 *                                  casi toda enfermedad.
 *   Fig. 4 — LA FLOR.            Quién la visita, cuándo carga.
 *   Fig. 5 — EL FRUTO EN CORTE.  Por qué el cultivo es lo que es.
 *   EL CICLO — cuánto hay que esperar, con los tiempos reales.
 *   LAS SEÑALES — sana contra enferma. ES EL USO: se pone la hoja al lado.
 *
 * La banda de señales va abajo y va grande porque es la razón de la lámina.
 * Todo lo anterior es contexto para poder leerla.
 *
 * PROCEDENCIA A LA VISTA: cada lámina lleva su sello (corpus verificado /
 * botánica general / hueco declarado). La colección se audita en la cara. Un
 * cuaderno que no marca su incertidumbre pide una fe que no se ganó — y estas
 * láminas van a manos de gente que va a tomar decisiones de plata con ellas.
 */
import React, { useId } from 'react';
import { TINTA, PAPEL, PLUMA, SINTOMA, LAVADO } from './nucleo/paletaLamina.js';
import { generador } from './nucleo/rng.js';
import { puntillismo, puntosAPath, borron } from './nucleo/trama.js';
import { suave } from './nucleo/trazo.js';
import { NOMBRE_SISTEMA } from './geometria/raiz.js';
import { PintaHoja, PintaRaiz, PintaFlor, PintaFruto, idSvg } from './pintores/organos.jsx';
import { PintaHabito, Cota } from './pintores/PintaHabito.jsx';
import { Texto, Fig, Binomio, BarraEscala, Seccion, Parrafo, SelloFuente } from './pintores/tipografia.jsx';

const W = 1000;
const H = 1414;
const M = 54; // margen del pliego

/* ------------------------------------------------------------------ */
/* EL PAPEL                                                            */
/* ------------------------------------------------------------------ */

/** El pliego: crema, con su grano y sus motas. El papel NO es blanco — un
 *  fondo blanco delata la pantalla y, en campo, encandila bajo el sol. */
function Papel({ semilla }) {
  const uid = idSvg(useId());
  const r = generador(`${semilla}-papel`);
  /* foxing: las motas pardas del papel viejo. Poquitas y pálidas: son un
     susurro de materialidad, no una textura de filtro de Instagram. */
  const motas = [];
  for (let i = 0; i < 22; i += 1) {
    motas.push(suave(borron(r, r() * W, r() * H, 2 + r() * 9, 0.6, 9), true, 0.5));
  }
  /* El grano: lo justo para que el papel se sienta papel. Es lo ÚNICO
     decorativo del pliego, así que es lo primero que paga cuando hay que
     recortar peso — 1.400 motas se leen igual que 2.600 y pesan la mitad. */
  const grano = puntosAPath(puntillismo(r, { x: 0, y: 0, w: W, h: H }, () => 0.16, { intentos: 1400, rMin: 0.25, rMax: 0.6 }));
  return (
    <g>
      <rect width={W} height={H} fill={PAPEL.base} />
      <path d={grano} fill={PAPEL.sombra} opacity="0.5" />
      {motas.map((d, i) => (
        <path key={i} d={d} fill={PAPEL.mancha} opacity="0.3" />
      ))}
      {/* el filete del pliego: la lámina clásica siempre va enmarcada */}
      <rect x={M * 0.5} y={M * 0.5} width={W - M} height={H - M} fill="none" stroke={PAPEL.borde} strokeWidth={PLUMA.marco} />
      <rect x={M * 0.5 + 4} y={M * 0.5 + 4} width={W - M - 8} height={H - M - 8} fill="none" stroke={PAPEL.borde} strokeWidth="0.4" opacity="0.7" />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* BANDA DEL CICLO                                                     */
/* ------------------------------------------------------------------ */

/** El ciclo con los TIEMPOS REALES. Es la respuesta a "¿cuánto hay que
 *  esperar?", que es la pregunta que decide si una familia siembra algo o no:
 *  la arracacha de 14 meses y la papa criolla de 4 no son la misma apuesta. */
function BandaCiclo({ especie, x, y, ancho }) {
  const fases = especie.ciclo || [];
  const paso = ancho / Math.max(fases.length, 1);
  return (
    <g>
      <Seccion x={x} y={y} ancho={ancho} titulo="El ciclo" nota={especie.cicloFuente === 'corpus-parcial' ? 'Con huecos declarados: el corpus no da todas las cifras.' : 'Tiempos reales, del corpus.'} />
      <g transform={`translate(0 ${y + 44})`}>
        {/* el hilo del tiempo */}
        <path d={`M${x} 0 L${x + ancho - 10} 0`} stroke={TINTA.fantasma} strokeWidth="0.8" />
        <path d={`M${x + ancho - 10} -3.5 L${x + ancho} 0 L${x + ancho - 10} 3.5`} fill={TINTA.fantasma} />
        {fases.map((f, i) => {
          const cx = x + paso * i + paso * 0.5;
          const sinDato = /sin dato/i.test(f.cuando);
          return (
            <g key={i}>
              <circle cx={cx} cy="0" r="4" fill={sinDato ? PAPEL.base : LAVADO.hazTemplado} stroke={TINTA.rotulo} strokeWidth="0.9" />
              {/* el hueco de dato se dibuja HUECO: se ve que falta */}
              {sinDato && <circle cx={cx} cy="0" r="1.6" fill={TINTA.fantasma} />}
              <Texto x={cx} y={-12} tam={10} peso={700} ancla="middle" color={TINTA.rotulo}>
                {f.fase}
              </Texto>
              <Texto x={cx} y={16} tam={9.5} ancla="middle" color={sinDato ? '#a8752b' : TINTA.suave} cursiva={sinDato}>
                {f.cuando}
              </Texto>
              {f.nota && <Parrafo x={cx - paso * 0.45} y={30} texto={f.nota} ancho={Math.round(paso / 5.2)} tam={8.5} color={TINTA.fantasma} max={3} />}
            </g>
          );
        })}
      </g>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* BANDA DE SEÑALES — el corazón de la lámina                          */
/* ------------------------------------------------------------------ */

/** Una ficha de enfermedad: el órgano enfermo + su nombre + LA SEÑAL.
 *  El campesino pone su hoja al lado de ésta y compara. Por eso el dibujo va
 *  grande y el texto dice DÓNDE mirar, no sólo qué es. */
function FichaSenal({ enf, especie, x, y, ancho, alto }) {
  const enOrgano = enf.cara === 'organo';
  const grav = { alta: '#a8352b', media: '#a8752b', baja: '#6d5946' }[enf.gravedad] || TINTA.fantasma;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={ancho} height={alto} fill={PAPEL.claro} stroke={PAPEL.borde} strokeWidth="0.6" opacity="0.7" rx="2" />

      {/* el dibujo: si la señal está en el órgano cosechado, se dibuja el
          órgano; si está en la hoja, la hoja — y en LA CARA que corresponde.
          El sitio es diagnóstico: roya = envés, y ahí se dibuja. */}
      <g transform={`translate(${ancho * 0.5} ${alto * 0.34})`}>
        {enOrgano ? (
          <g transform="scale(0.82)">
            <PintaFruto spec={especie.fruto} semilla={`${especie.id}-senal-${enf.sintoma}`} sintoma={enf.sintoma} etapa={0.62} />
          </g>
        ) : (
          <g transform={`rotate(-24) translate(${-(especie.hoja.len ?? 80) * 0.34} 0) scale(0.78)`}>
            <PintaHoja
              spec={especie.hoja}
              semilla={`${especie.id}-senal-${enf.sintoma}`}
              piso={especie.piso}
              cara={enf.cara}
              sintoma={enf.sintoma}
              etapa={0.62}
            />
          </g>
        )}
      </g>

      {/* la cara que hay que mirar: dato duro, va marcado */}
      <g transform={`translate(8 ${alto * 0.6})`}>
        <rect x="0" y="-9" width={enf.cara === 'enves' ? 74 : 58} height="13" fill={enf.cara === 'enves' ? SINTOMA.roya : PAPEL.sombra} opacity="0.28" rx="1.5" />
        <Texto x={4} y={0} tam={8.5} peso={700} letra={0.5} color={TINTA.rotulo}>
          {enf.cara === 'enves' ? 'MIRE EL ENVÉS' : enf.cara === 'organo' ? 'HAY QUE PARTIR' : 'EN EL HAZ'}
        </Texto>
      </g>

      <g transform={`translate(8 ${alto * 0.6 + 22})`}>
        <circle cx="2" cy="-3.5" r="2.4" fill={grav} />
        <Texto x={9} y={0} tam={11} peso={700} color={TINTA.rotulo}>
          {enf.nombre}
        </Texto>
        <Texto x={9} y={13} tam={8.5} cursiva color={TINTA.fantasma}>
          {enf.agente}
        </Texto>
        {enf.folk?.length > 0 && (
          <Texto x={9} y={25} tam={8.5} color={TINTA.suave} letra={0.4}>
            {`le dicen: ${enf.folk.join(', ')}`}
          </Texto>
        )}
        <Parrafo x={9} y={40} texto={enf.senal} ancho={Math.round(ancho / 4.15)} tam={9} color={TINTA.rotulo} max={8} />
      </g>

      {/* la alerta y la prueba de campo: lo que convierte la ficha en acción */}
      {(enf.alerta || enf.prueba || enf.umbral || enf.manejo) && (
        <g transform={`translate(8 ${alto - 40})`}>
          <path d={`M0 -8 L${ancho - 16} -8`} stroke={PAPEL.borde} strokeWidth="0.5" />
          <Parrafo
            x={0}
            y={2}
            texto={enf.prueba || enf.umbral || enf.alerta || enf.manejo}
            ancho={Math.round(ancho / 4)}
            tam={8.5}
            color={enf.alerta ? '#a8352b' : TINTA.suave}
            cursiva
            max={4}
          />
        </g>
      )}

      {/* si el dato no está en el corpus, se dice acá y no en letra chica */}
      {enf.sinDato && (
        <g transform={`translate(8 ${alto - 12})`}>
          <Texto x={0} y={0} tam={7.5} color="#a8752b" cursiva>
            {'⚠ dibujo por analogía — no documentado'}
          </Texto>
        </g>
      )}
    </g>
  );
}

/** La banda entera: la SANA de referencia + las fichas de cada señal. */
function BandaSenales({ especie, x, y, ancho, alto }) {
  const enfs = (especie.enfermedades || []).slice(0, 3);
  if (!enfs.length) {
    /* La caña: sin enfermedades documentadas. El hueco se declara en la cara,
       no se disimula con una lámina a medias. */
    return (
      <g>
        <Seccion x={x} y={y} ancho={ancho} titulo="Las señales" />
        <g transform={`translate(${x} ${y + 30})`}>
          <rect width={ancho} height={110} fill={PAPEL.claro} stroke="#a8752b" strokeWidth="0.8" strokeDasharray="4 3" opacity="0.75" rx="2" />
          <Texto x={16} y={26} tam={12} peso={700} color="#a8752b">
            {especie.hueco?.titulo || 'Sin señales documentadas'}
          </Texto>
          <Parrafo x={16} y={44} texto={especie.hueco?.texto || (especie.sinDato || []).join(' ')} ancho={130} tam={9.5} color={TINTA.suave} max={5} />
        </g>
      </g>
    );
  }

  const anchoSana = 168;
  const hueco = 12;
  const anchoFicha = (ancho - anchoSana - hueco * (enfs.length + 1)) / enfs.length;

  return (
    <g>
      <Seccion
        x={x}
        y={y}
        ancho={ancho}
        titulo="Las señales — sana contra enferma"
        nota="Ponga su hoja al lado y compare. El SITIO de la lesión es la mitad del diagnóstico."
      />

      {/* LA SANA — la referencia. Sin ella, comparar es adivinar. */}
      <g transform={`translate(${x} ${y + 30})`}>
        <rect width={anchoSana} height={alto} fill={PAPEL.claro} stroke={TINTA.fantasma} strokeWidth="0.8" opacity="0.7" rx="2" />
        <g transform={`translate(${anchoSana * 0.5} ${alto * 0.34})`}>
          <g transform={`rotate(-24) translate(${-(especie.hoja.len ?? 80) * 0.34} 0) scale(0.78)`}>
            <PintaHoja spec={especie.hoja} semilla={`${especie.id}-sana`} piso={especie.piso} cara="haz" />
          </g>
        </g>
        <g transform={`translate(10 ${alto * 0.6})`}>
          <Texto x={0} y={0} tam={13} peso={700} letra={1.2} color="#4e7a3f">
            SANA
          </Texto>
          <Parrafo
            x={0}
            y={18}
            texto={especie.hoja.nota || 'La hoja sana de esta mata: ése es el patrón contra el que se compara todo lo demás.'}
            ancho={36}
            tam={8.5}
            color={TINTA.suave}
            max={9}
          />
        </g>
      </g>

      {enfs.map((e, i) => (
        <FichaSenal
          key={i}
          enf={e}
          especie={especie}
          x={x + anchoSana + hueco * (i + 1) + anchoFicha * i}
          y={y + 30}
          ancho={anchoFicha}
          alto={alto}
        />
      ))}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* LA LÁMINA                                                           */
/* ------------------------------------------------------------------ */

/**
 * @param {Object} props.especie registro de `./especies`
 * @param {number|string} [props.numero] el número del pliego (Lámina VII)
 * @param {string} [props.className]
 */
export default function LaminaBotanica({ especie, numero, className = '' }) {
  if (!especie) return null;
  const e = especie;
  const ancho = W - M * 2;
  const pxPorMetro = 300 / e.alturaM;

  /* columnas */
  const izq = M;
  const der = 520;
  const anchoDer = W - M - der;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`lam-bot ${className}`.trim()}
      role="img"
      aria-labelledby={`${e.id}-t ${e.id}-d`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title id={`${e.id}-t`}>{`${e.nombre} (${e.cientifico}) — lámina botánica`}</title>
      <desc id={`${e.id}-d`}>
        {`Lámina de cuaderno de campo de ${e.nombre}, ${e.cientifico}, familia ${e.familia}. ` +
          `Piso térmico ${e.piso}, ${e.altitud[0]}-${e.altitud[1]} msnm. Altura hasta ${e.alturaM} m. ` +
          `Muestra la mata a escala, la raíz (${NOMBRE_SISTEMA[e.raiz.tipo] || e.raiz.tipo}), la hoja por haz y envés, la flor, el fruto en corte, ` +
          `el ciclo con sus tiempos y las señales de ${(e.enfermedades || []).map((x) => x.nombre).join(', ') || 'sus enfermedades (no documentadas en el corpus)'}.`}
      </desc>

      <Papel semilla={e.id} />

      {/* ENCABEZADO */}
      <g>
        <Texto x={M} y={40} tam={9} letra={2.4} peso={700} color={TINTA.fantasma}>
          CHAGRA · CUADERNO DE CAMPO
        </Texto>
        <Texto x={W - M} y={40} tam={9} letra={2.4} peso={700} color={TINTA.fantasma} ancla="end">
          {numero ? `LÁMINA ${numero}` : e.piso.toUpperCase()}
        </Texto>
      </g>

      {/* TÍTULO */}
      <g>
        <Texto x={M} y={104} tam={38} peso={700} color={TINTA.rotulo}>
          {e.nombre}
        </Texto>
        <Binomio x={M} y={130} cientifico={e.cientifico} autoridad={e.autoridad} tam={17} />
        <Texto x={M} y={148} tam={10} letra={1.4} color={TINTA.fantasma}>
          {e.familia.toUpperCase()}
        </Texto>

        {/* LOS NOMBRES REGIONALES: los que la gente usa de verdad. Nadie llega
            diciendo "Cucurbita moschata", llega diciendo auyama o zapallo. */}
        {e.regionales?.length > 0 && (
          <g transform={`translate(${W - M} 96)`}>
            <Texto x={0} y={0} tam={8.5} letra={1.2} color={TINTA.fantasma} ancla="end">
              TAMBIÉN LE DICEN
            </Texto>
            <Texto x={0} y={16} tam={12.5} color={TINTA.rotulo} ancla="end">
              {e.regionales.join(' · ')}
            </Texto>
          </g>
        )}
        <g transform={`translate(${W - M} 132)`}>
          <Texto x={0} y={0} tam={10.5} color={TINTA.suave} ancla="end">
            {`${e.altitud[0]}–${e.altitud[1]} msnm · óptimo ${e.altitudOptima[0]}–${e.altitudOptima[1]}`}
          </Texto>
          <g transform="translate(-118 12)">
            <SelloFuente x={0} y={0} fuente={e.fuente} />
          </g>
        </g>
        <path d={`M${M} 162 L${W - M} 162`} stroke={TINTA.fantasma} strokeWidth="0.8" opacity="0.7" />
        {e.notaNombre && (
          <Parrafo x={M} y={176} texto={e.notaNombre} ancho={118} tam={9} color={TINTA.fantasma} cursiva max={2} />
        )}
      </g>

      {/* ── FIG. 1 · LA MATA ─────────────────────────────────────── */}
      <g>
        <Fig x={izq} y={210} n="1" titulo="La mata, a escala" nota={e.porteNota ? null : 'Silueta humana de 1,65 m.'} />
        <g transform={`translate(${izq + 210} 560)`}>
          <PintaHabito especie={e} altoPx={300} escala />
          <Cota x={-172} y0={-300} y1={0} texto={`${e.alturaM} m`} />
        </g>
        <BarraEscala x={izq + 8} y={578} pxPorMetro={pxPorMetro} metros={1} />
        {e.porteNota && <Parrafo x={izq} y={606} texto={e.porteNota} ancho={62} tam={9} color={TINTA.suave} max={6} />}
      </g>

      {/* ── FIG. 2 · LA RAÍZ ─────────────────────────────────────── */}
      <g>
        <Fig x={izq} y={686} n="2" titulo="La raíz" nota={NOMBRE_SISTEMA[e.raiz.tipo]} />
        <g transform={`translate(${izq + 210} 716)`}>
          <g transform="scale(0.78)">
            <PintaRaiz spec={e.raiz} semilla={e.id} />
          </g>
        </g>
        {e.raiz.nota && <Parrafo x={izq} y={848} texto={e.raiz.nota} ancho={62} tam={9} color={TINTA.suave} max={7} />}
      </g>

      {/* ── FIG. 3 · LA HOJA (haz y envés) ───────────────────────── */}
      <g>
        <Fig
          x={der}
          y={210}
          n="3"
          titulo="La hoja — haz y envés"
          nota={`${e.hoja.compuesta || e.hoja.forma} · borde ${e.hoja.borde} · nervadura ${e.hoja.nervadura} · ${e.hoja.filotaxia}`}
        />
        {/* HAZ y ENVÉS juntos, siempre. Media enfermedad sólo se ve por
            debajo, y el que sólo mira el haz llega tarde. */}
        <g transform={`translate(${der + 100} 320)`}>
          <g transform="rotate(-16)">
            <PintaHoja spec={e.hoja} semilla={e.id} piso={e.piso} cara="haz" />
          </g>
          <Texto x={-16} y={78} tam={9} letra={1} color={TINTA.fantasma}>
            HAZ
          </Texto>
        </g>
        <g transform={`translate(${der + 100} 440)`}>
          <g transform="rotate(-16)">
            <PintaHoja spec={e.hoja} semilla={`${e.id}-b`} piso={e.piso} cara="enves" />
          </g>
          <Texto x={-16} y={78} tam={9} letra={1} color={TINTA.fantasma}>
            ENVÉS
          </Texto>
        </g>
        {e.hoja.nota && <Parrafo x={der} y={520} texto={e.hoja.nota} ancho={62} tam={9} color={TINTA.suave} max={6} />}
      </g>

      {/* ── FIG. 4 · LA FLOR ─────────────────────────────────────── */}
      <g>
        <Fig x={der} y={592} n="4" titulo="La flor" />
        <g transform={`translate(${der + 100} 650)`}>
          <PintaFlor spec={e.flor} semilla={e.id} escala={1.5} />
        </g>
        {e.flor.nota && <Parrafo x={der + 190} y={620} texto={e.flor.nota} ancho={40} tam={8.5} color={TINTA.suave} max={9} />}
      </g>

      {/* ── FIG. 5 · EL FRUTO EN CORTE ───────────────────────────── */}
      <g>
        <Fig x={der} y={716} n="5" titulo={`${e.fruto.organo} — en corte`} />
        <g transform={`translate(${der + 100} 790)`}>
          <PintaFruto spec={e.fruto} semilla={e.id} />
        </g>
        {e.fruto.nota && <Parrafo x={der + 190} y={744} texto={e.fruto.nota} ancho={40} tam={8.5} color={TINTA.suave} max={11} />}
      </g>

      {/* ── EL CICLO ─────────────────────────────────────────────── */}
      <BandaCiclo especie={e} x={M} y={890} ancho={ancho} />

      {/* ── LAS SEÑALES ──────────────────────────────────────────── */}
      <BandaSenales especie={e} x={M} y={1010} ancho={ancho} alto={306} />

      {/* PIE */}
      <g>
        <path d={`M${M} ${H - 46} L${W - M} ${H - 46}`} stroke={TINTA.fantasma} strokeWidth="0.6" opacity="0.6" />
        <Parrafo
          x={M}
          y={H - 32}
          texto={e.climaNota || e.lugar || ''}
          ancho={92}
          tam={8.5}
          color={TINTA.fantasma}
          cursiva
          max={2}
        />
        <Texto x={W - M} y={H - 32} tam={8.5} color={TINTA.fantasma} ancla="end">
          {`Fig. 1 la mata · 2 la raíz · 3 la hoja · 4 la flor · 5 el fruto`}
        </Texto>
        {e.sinDato?.length > 0 && (
          <Texto x={W - M} y={H - 20} tam={8} color="#a8752b" ancla="end" cursiva>
            {`Huecos declarados: ${e.sinDato.length}`}
          </Texto>
        )}
      </g>
    </svg>
  );
}
