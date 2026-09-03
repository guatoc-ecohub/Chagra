import React from 'react';
import { blob, HOJA } from './formasHoja.js';
import {
  HojaBase,
  HojaMini,
  ClorosisHierro,
  Pliego,
  Lupa,
  Vineta,
} from './motivosDano.jsx';
import {
  PLIEGO,
  TINTA,
  HOJA_SANA,
  ENFERMEDAD,
  DEFICIENCIA,
  CATEGORIA,
} from './paletaDano.js';

/**
 * LaminaLlave — las tres pruebas que se hacen con la mano, sin comprar nada.
 *
 * `LaminaDiferencial` enseña a VER los tres daños. Esta enseña a DECIDIR, y
 * son cosas distintas: en el lote uno no tiene la lámina al lado para
 * comparar, tiene la mata y dos manos. Así que la llave se reparte en tres
 * pruebas concretas, en orden de qué tan barato es hacerlas:
 *
 *   1. EL DOBLEZ  → ¿va parejo a lado y lado? Entonces es hambre.
 *      (La simetría es la pista más fuerte que hay, y la más ignorada. Ni el
 *      bicho ni el hongo saben de simetría: el bicho come por donde llegó y
 *      el hongo brota donde le cayó la gota. Solo la mata —que reparte la
 *      comida por igual a los dos lados del nervio— produce daño simétrico.
 *      Por eso el doblez decide, y decide gratis.)
 *
 *   2. EL DEDO    → ¿le puede seguir el borde? Entonces tiene forma: hongo.
 *
 *   3. LA EDAD    → ¿cuáles hojas? Las viejas primero = nitrógeno (la mata se
 *      lo puede mover y se lo quita a las de abajo). Las nuevas = hierro (no
 *      se mueve, y el cogollo se queda sin). Ese detalle decide qué abonar.
 *
 * Es lámina de decisión, no de catálogo: cada prueba termina en un veredicto.
 *
 * @param {Object} props
 * @param {string} [props.className] clases extra sobre el <svg> raíz.
 */

const W = 420;
const H = 458;

/* La mancha de la prueba del dedo y su calco: MISMA semilla, así el trazo
   punteado va paralelo al borde de verdad — como el dedo, que puede seguirlo
   justamente porque el borde existe. */
const MANCHA = blob({ cx: 0, cy: 0, r: 14, semilla: 5, lobulos: 3, rugosidad: 0.12 });
const CALCO = blob({ cx: 0, cy: 0, r: 19.5, semilla: 5, lobulos: 3, rugosidad: 0.12 });
/* el halo tampoco es un círculo: se lo presta a la misma semilla */
const HALO = blob({ cx: 0, cy: 0, r: 24, semilla: 5, lobulos: 3, rugosidad: 0.14 });

/** Una rama con tres pares de hojas: abajo las viejas, arriba el cogollo. */
function Rama({ x, y, viejasAmarillas }) {
  const verde = HOJA_SANA.haz;
  const amarillo = viejasAmarillas ? DEFICIENCIA.nitroViejo : DEFICIENCIA.hierroLamina;
  /* pisos: 0 = abajo (las viejas) … 2 = arriba (el cogollo) */
  const pisos = [0, 1, 2];
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 0 C 1 -18 -1 -36 0 -56" fill="none" stroke={HOJA_SANA.tallo} strokeWidth="2.6" strokeLinecap="round" />
      {pisos.map((p) => {
        const py = -6 - p * 21;
        /* nitrógeno castiga abajo; hierro castiga arriba */
        const amarilla = viejasAmarillas ? p === 0 : p === 2;
        const tinte = amarilla ? amarillo : verde;
        const venaVerde = amarilla && !viejasAmarillas; // la redecilla es del hierro
        return (
          <g key={p}>
            <HojaMini x={0} y={py} rot={-118} escala={0.2} tinte={tinte} venaVerde={venaVerde} />
            <HojaMini x={0} y={py} rot={118} escala={0.2} tinte={tinte} venaVerde={venaVerde} />
          </g>
        );
      })}
      {/* el cogollito de la punta */}
      <path d="M0 -56 q3 -5 0 -9 q-3 4 0 9Z" fill={viejasAmarillas ? verde : amarillo} stroke={HOJA_SANA.borde} strokeWidth="0.5" />
    </g>
  );
}

export default function LaminaLlave({ className } = {}) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-labelledby="lamllave-t lamllave-d"
      className={['w-full h-auto select-none', className].filter(Boolean).join(' ')}
      data-testid="lamina-llave"
      style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
    >
      <title id="lamllave-t">La llave: tres pruebas de mano para distinguir plaga, enfermedad y deficiencia</title>
      <desc id="lamllave-d">
        Lámina de cuaderno de campo con tres pruebas. Primera, la prueba del doblez: una hoja amarilla
        con la nervadura verde y una línea de doblez por el nervio; si las dos mitades van igualitas,
        es hambre, porque ni el bicho ni el hongo son simétricos. Segunda, la prueba del dedo: una
        mancha con halo y borde definido, con una línea punteada calcando el borde; si se puede seguir
        el borde, tiene forma y es hongo. Tercera, la prueba de la edad: dos ramas de café; en la
        primera amarillean las hojas viejas de abajo, y eso es falta de nitrógeno; en la segunda
        amarillean las hojas nuevas del cogollo con la nervadura verde, y eso es falta de hierro.
      </desc>

      <Pliego w={W} h={H} />

      <text x="16" y="26" fontSize="16.5" fontWeight="800" fill={TINTA.fuerte}>
        La llave: tres pruebas de mano
      </text>
      <text x="404" y="17" textAnchor="end" fontSize="8.5" fontStyle="italic" fill={TINTA.guia}>
        cuaderno de campo
      </text>
      <text x="404" y="28" textAnchor="end" fontSize="8.5" fill={TINTA.suave}>
        sin comprar nada
      </text>
      <text x="16" y="39" fontSize="9" fontStyle="italic" fill={TINTA.suave}>
        En el lote no hay lámina al lado: hay la mata y dos manos. Con eso basta.
      </text>
      <line x1="14" y1="44" x2="406" y2="44" stroke={PLIEGO.borde} strokeWidth="1" />

      {/* ============ 1. EL DOBLEZ ============ */}
      <text x="16" y="62" fontSize="10.5" fontWeight="800" fill={CATEGORIA.deficiencia.tinta} letterSpacing="0.05em">
        1 · LA PRUEBA DEL DOBLEZ
      </text>
      <text x="178" y="62" fontSize="8.6" fontStyle="italic" fill={TINTA.suave}>
        — dóblela por el nervio.
      </text>

      <g transform="translate(74 178) scale(0.74)">
        <HojaBase tinteLamina={DEFICIENCIA.hierroLamina} conBrillo={false}>
          <ClorosisHierro />
        </HojaBase>
      </g>
      {/* la línea del doblez, sobre el nervio */}
      <g transform="translate(74 178) scale(0.74)">
        <path d={HOJA.nervioCentral} fill="none" stroke={TINTA.fuerte} strokeWidth="1.6" strokeDasharray="5 4" opacity="0.85" />
      </g>
      {/* Un "=" en cada mitad: lo que hay que ver es que las dos son la
          misma. (Primer intento: dos flechas cerrándose sobre el nervio —
          se leían como antenas saliéndole a la hoja.) */}
      <g stroke={TINTA.guia} strokeWidth="1.1" strokeLinecap="round" opacity="0.9">
        <path d="M56 146 h7 M56 150 h7" />
        <path d="M85 146 h7 M85 150 h7" />
      </g>
      <text x="74" y="196" textAnchor="middle" fontSize="7.6" fontStyle="italic" fill={TINTA.suave}>
        las dos mitades, igualitas
      </text>

      <Vineta
        x={152}
        y={84}
        color={CATEGORIA.deficiencia.tinta}
        tam={8.6}
        interlinea={10.4}
        lineas={[
          { fuerte: 'Si va parejo a lado y lado', resto: ' del nervio,' },
          'y sigue la nervadura: es HAMBRE. Abone.',
        ]}
      />
      <Vineta
        x={152}
        y={112}
        color={TINTA.media}
        tam={8.6}
        interlinea={10.4}
        lineas={[
          'Ni el bicho ni el hongo saben de simetría:',
          'el bicho come por donde llegó, y el hongo',
          'brota donde le cayó la gota de agua.',
        ]}
      />
      <Vineta
        x={152}
        y={152}
        color={TINTA.media}
        tam={8.6}
        interlinea={10.4}
        lineas={[
          'La única que reparte parejo es la mata,',
          'porque le manda la misma comida a los',
          'dos lados. Por eso el doblez decide.',
        ]}
      />

      <line x1="14" y1="208" x2="406" y2="208" stroke={PLIEGO.borde} strokeWidth="0.7" strokeDasharray="2 3" />

      {/* ============ 2. EL DEDO ============ */}
      <text x="16" y="226" fontSize="10.5" fontWeight="800" fill={CATEGORIA.enfermedad.tinta} letterSpacing="0.05em">
        2 · LA PRUEBA DEL DEDO
      </text>
      <text x="166" y="226" fontSize="8.6" fontStyle="italic" fill={TINTA.suave}>
        — ¿le puede seguir el borde?
      </text>

      <Lupa cx={74} cy={270} r={31} titulo="TIENE BORDE → HONGO" tinta={CATEGORIA.enfermedad.tinta}>
        <g transform="translate(74 270)">
          <rect x="-40" y="-40" width="80" height="80" fill={HOJA_SANA.haz} />
          <path d={HALO} fill={ENFERMEDAD.cercoHalo} opacity="0.75" />
          <path d={MANCHA} fill={ENFERMEDAD.cercoCentro} stroke={ENFERMEDAD.cercoBorde} strokeWidth="1.1" transform="translate(0 0)" />
          <path
            d={blob({ cx: -1, cy: -1, r: 7.4, semilla: 16, lobulos: 3, rugosidad: 0.16 })}
            fill={ENFERMEDAD.cercoCentroPalido}
            opacity="0.9"
          />
          {/* el calco del dedo: va paralelo al borde porque el borde EXISTE */}
          <path d={CALCO} fill="none" stroke={TINTA.fuerte} strokeWidth="1.2" strokeDasharray="3.5 3" opacity="0.9" />
        </g>
      </Lupa>

      <Vineta
        x={152}
        y={248}
        color={CATEGORIA.enfermedad.tinta}
        tam={8.6}
        interlinea={10.4}
        lineas={[
          { fuerte: 'Si puede calcar el borde', resto: ' con el dedo —' },
          'si tiene halo, orilla clara, anillos, o se',
          'frena en seco en la vena: es HONGO.',
        ]}
      />
      <Vineta
        x={152}
        y={288}
        color={CATEGORIA.deficiencia.tinta}
        tam={8.6}
        interlinea={10.4}
        lineas={[
          { fuerte: 'Si el color se desvanece', resto: ' y usted no' },
          'sabe dónde poner el dedo: NO es mancha.',
          'Es hambre — y el fungicida es plata botada.',
        ]}
      />

      <line x1="14" y1="322" x2="406" y2="322" stroke={PLIEGO.borde} strokeWidth="0.7" strokeDasharray="2 3" />

      {/* ============ 3. LA EDAD ============ */}
      <text x="16" y="340" fontSize="10.5" fontWeight="800" fill={CATEGORIA.deficiencia.tinta} letterSpacing="0.05em">
        3 · LA PRUEBA DE LA EDAD
      </text>
      <text x="178" y="340" fontSize="8.6" fontStyle="italic" fill={TINTA.suave}>
        — ¿cuáles hojas amarillean? Eso dice QUÉ le falta.
      </text>

      <g transform="translate(0 0)">
        <Rama x={64} y={420} viejasAmarillas />
        <Rama x={186} y={420} viejasAmarillas={false} />
      </g>

      {/* rótulos de las dos ramas */}
      <text x="64" y="434" textAnchor="middle" fontSize="8.4" fontWeight="800" fill={CATEGORIA.deficiencia.tinta}>
        NITRÓGENO
      </text>
      <text x="64" y="443" textAnchor="middle" fontSize="7.2" fontStyle="italic" fill={TINTA.suave}>
        amarillean las VIEJAS
      </text>
      <text x="186" y="434" textAnchor="middle" fontSize="8.4" fontWeight="800" fill={CATEGORIA.deficiencia.tinta}>
        HIERRO
      </text>
      <text x="186" y="443" textAnchor="middle" fontSize="7.2" fontStyle="italic" fill={TINTA.suave}>
        amarillean las NUEVAS
      </text>

      <Vineta
        x={244}
        y={362}
        color={CATEGORIA.deficiencia.tinta}
        tam={8.2}
        interlinea={9.8}
        lineas={[
          { fuerte: 'Viejas primero', resto: ' = NITRÓGENO. La mata' },
          'sí lo sabe mover: se lo quita a las de',
          'abajo para darle al cogollo.',
        ]}
      />
      <Vineta
        x={244}
        y={398}
        color={CATEGORIA.deficiencia.tinta}
        tam={8.2}
        interlinea={9.8}
        lineas={[
          { fuerte: 'Nuevas, con la vena verde', resto: ' = HIERRO.' },
          'Ese no se mueve, y el cogollo se queda',
          'sin. Por eso pega arriba y no abajo.',
        ]}
      />
      <text x="244" y="440" fontSize="7.6" fontStyle="italic" fontWeight="700" fill={CATEGORIA.duda.tinta}>
        ¿Amarillo parejo y no sabe cuál? Mírele la raíz.
      </text>
    </svg>
  );
}
