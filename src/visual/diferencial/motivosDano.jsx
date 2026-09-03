import React, { useId } from 'react';
import { HOJA, blob, polvoRoya, frass as frassDe, mezclarHex } from './formasHoja.js';
import { GUSANO } from './formasBicho.js';
import {
  HOJA_SANA,
  PLAGA,
  ENFERMEDAD,
  DEFICIENCIA,
  TINTA,
  PLIEGO,
} from './paletaDano.js';

/*
 * motivosDano — las piezas sueltas del diferencial, para que las tres láminas
 * dibujen LA MISMA hoja y LAS MISMAS marcas.
 *
 * Regla de oro de este módulo: ninguna marca es una figura de geometría
 * limpia. En la naturaleza no hay círculos perfectos. Cada mancha sale de
 * `blob()` (contorno lobulado) o de nubes de granos con semilla fija. Un
 * círculo naranja plano sería un dibujo inventado; el polvo de la roya de la
 * foto es GRANO, y así se pinta acá.
 */

/** useId trae ':' y eso rompe los url(#..) de SVG. Lo limpiamos. */
function usarId(prefijo) {
  return `${prefijo}-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
}

/* ------------------------------------------------------------------ */
/* LA HOJA                                                             */
/* ------------------------------------------------------------------ */

/**
 * La hoja de café, base de los tres paneles. SIEMPRE la misma geometría.
 *
 * @param {Object} props
 * @param {Array<string>} [props.mordidas] paths de lo que se comió el bicho
 *   (se recortan de la lámina Y reciben su filo pardo cicatrizado).
 * @param {React.ReactNode} [props.children] marcas SOBRE la lámina (manchas,
 *   clorosis): van recortadas al contorno, no se salen de la hoja.
 * @param {React.ReactNode} [props.encima] lo que se posa sobre la hoja y sí
 *   puede sobresalir del borde (el bicho, el excremento).
 * @param {'haz'|'enves'} [props.cara]
 * @param {string} [props.tinteLamina] color de la lámina (para la clorosis).
 */
export function HojaBase({
  mordidas = [],
  ventanas = [],
  children,
  encima,
  cara = 'haz',
  tinteLamina,
  conBrillo = true,
}) {
  const uid = usarId('hoja');
  const clip = `${uid}-clip`;
  const mask = `${uid}-mask`;
  const grad = `${uid}-grad`;
  const desenfoque = `${uid}-blur`;
  const clipVent = `${uid}-vent`;
  /* mordidas y ventanas se comen la lámina igual; la diferencia es que en la
     ventana el bicho dejó el costillar de venas parado. */
  const huecos = [...mordidas, ...ventanas];

  const esEnves = cara === 'enves';
  const base = tinteLamina || (esEnves ? HOJA_SANA.envesFondo : HOJA_SANA.haz);
  const hondo = tinteLamina
    ? mezclarHex(tinteLamina, HOJA_SANA.hazHondo, 0.25)
    : esEnves
      ? mezclarHex(HOJA_SANA.envesFondo, HOJA_SANA.hazHondo, 0.3)
      : HOJA_SANA.hazHondo;

  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <path d={HOJA.contorno} />
        </clipPath>
        <mask id={mask}>
          {/* blanco = hoja que sigue ahí; negro = lo que se comieron */}
          <rect x="-80" y="-170" width="160" height="200" fill="#fff" />
          {huecos.map((d, i) => (
            <path key={i} d={d} fill="#000" />
          ))}
        </mask>
        {ventanas.length > 0 && (
          <clipPath id={clipVent}>
            {ventanas.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </clipPath>
        )}
        <linearGradient id={grad} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor={hondo} />
          <stop offset="0.55" stopColor={base} />
          <stop offset="1" stopColor={mezclarHex(base, HOJA_SANA.brillo, 0.28)} />
        </linearGradient>
        <filter id={desenfoque} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>

      <g mask={`url(#${mask})`}>
        {/* la lámina */}
        <path d={HOJA.contorno} fill={`url(#${grad})`} />

        <g clipPath={`url(#${clip})`}>
          {/* Los SURCOS: la lámina es abullonada, así que la vena se lee
              como un canal hundido y no como una raya encima. */}
          <g fill="none" stroke={HOJA_SANA.venaSurco} strokeLinecap="round" opacity={esEnves ? 0.22 : 0.34}>
            <path d={HOJA.nervioCentral} strokeWidth="4.2" />
            {HOJA.laterales.map((v, i) => (
              <path key={i} d={v.d} strokeWidth="1.9" />
            ))}
          </g>

          {/* las venas: en el café van MÁS CLARAS que la lámina */}
          <g fill="none" stroke={HOJA_SANA.vena} strokeLinecap="round">
            {HOJA.laterales.map((v, i) => (
              <path key={i} d={v.d} strokeWidth={esEnves ? 0.95 : 0.7} opacity="0.92" />
            ))}
            {/* los lazos broquidódromos: la vena NO llega al borde */}
            {HOJA.lazos.map((d, i) => (
              <path key={i} d={d} strokeWidth="0.5" opacity="0.55" />
            ))}
            <path d={HOJA.nervioCentral} strokeWidth={esEnves ? 2.3 : 1.7} opacity="0.95" />
          </g>

          {/* el lustre del haz (la hoja de café brilla) */}
          {conBrillo && !esEnves && (
            <path
              d={blob({ cx: -9, cy: -84, r: 15, semilla: 3, lobulos: 2, rugosidad: 0.4, alargue: 0.55 })}
              fill={HOJA_SANA.brillo}
              opacity="0.28"
              filter={`url(#${desenfoque})`}
            />
          )}

          {/* las marcas del daño */}
          {children}
        </g>

        <path d={HOJA.contorno} fill="none" stroke={HOJA_SANA.borde} strokeWidth="1.05" />
      </g>

      {/* LA VENTANA — el bicho se comió lo blandito de entre las venas y dejó
          el costillar parado, como un encaje. Es de las firmas más claras del
          masticador: ningún hongo respeta la nervadura de esa manera, y
          ninguna deficiencia hace huecos. Las venas van resecas y pardas
          porque quedaron al aire. */}
      {ventanas.length > 0 && (
        <g clipPath={`url(#${clipVent})`} fill="none" strokeLinecap="round">
          {HOJA.laterales.map((v, i) => (
            <path key={i} d={v.d} stroke={PLAGA.mordidaFilo} strokeWidth="1.5" opacity="0.85" />
          ))}
          {HOJA.laterales.map((v, i) => (
            <path key={`c${i}`} d={v.d} stroke={mezclarHex(HOJA_SANA.vena, PLAGA.mordidaHalo, 0.5)} strokeWidth="0.8" />
          ))}
          {HOJA.lazos.map((d, i) => (
            <path key={`l${i}`} d={d} stroke={PLAGA.mordidaFilo} strokeWidth="0.7" opacity="0.7" />
          ))}
        </g>
      )}

      {/* EL FILO DE LA MORDIDA — el detalle que hace creíble el dibujo.
          Una hoja mordida no queda cortada a tijera: la herida cicatriza y
          deja un filito pardo con un halo amarillo.

          Ojo a la composición, que es sutil: el filo va montado JUSTO sobre
          el borde del mordisco, así que la mitad de la línea caería sobre el
          hueco — sobre el papel, donde ya no hay hoja — y se vería flotando.
          La herida solo existe del lado donde todavía hay lámina. Por eso el
          grupo lleva las DOS cosas: recortado al contorno (que no se salga de
          la hoja) y con la máscara del mordisco (que borra la mitad que caía
          en el hueco). Como solo sobrevive la mitad de cada línea, los
          grosores van al doble. */}
      {huecos.length > 0 && (
        <g clipPath={`url(#${clip})`} mask={`url(#${mask})`} fill="none" strokeLinejoin="round">
          {huecos.map((d, i) => (
            <path key={`h${i}`} d={d} stroke={PLAGA.mordidaHalo} strokeWidth="4.6" opacity="0.42" />
          ))}
          {huecos.map((d, i) => (
            <path key={`f${i}`} d={d} stroke={PLAGA.mordidaFilo} strokeWidth="2.6" opacity="0.95" />
          ))}
        </g>
      )}

      {/* pecíolo */}
      <path d="M0 0 C 0.4 5 0.2 9 -0.4 13" fill="none" stroke={HOJA_SANA.peciolo} strokeWidth="2.6" strokeLinecap="round" />

      {encima}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* ENFERMEDAD · ROYA — el polvo naranja                                */
/* ------------------------------------------------------------------ */

/**
 * Las pústulas de roya en el ENVÉS: polvillo, no pintura.
 * Calcado de `public/plaga-images/hemileia_vastatrix.jpg`.
 */
export function PolvoRoya({ manchas }) {
  const uid = usarId('roya');
  const blur = `${uid}-blur`;
  return (
    <g>
      <defs>
        <filter id={blur} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {/* 1. el amarilleo clorótico: la hoja ya perdió el verde ahí debajo,
             y el borde es DIFUSO (no tiene línea) */}
      <g filter={`url(#${blur})`} opacity="0.75">
        {manchas.map((m, i) => (
          <path
            key={i}
            d={blob({ cx: m.cx, cy: m.cy, r: m.r * 1.5, semilla: m.semilla + 40, lobulos: 3, rugosidad: 0.26, alargue: m.alargue })}
            fill={ENFERMEDAD.royaHalo}
          />
        ))}
      </g>

      {/* 2. EL POLVO. Grano por grano: así se ve la cúrcuma regada de la foto */}
      {manchas.map((m, i) => {
        const { granos, sueltas } = polvoRoya({
          cx: m.cx,
          cy: m.cy,
          r: m.r,
          semilla: m.semilla,
          densidad: m.densidad || 150,
          alargue: m.alargue,
        });
        return (
          <g key={i}>
            {/* la sombra del montoncito: el polvo tiene espesor */}
            <path
              d={blob({ cx: m.cx, cy: m.cy, r: m.r * 0.86, semilla: m.semilla, lobulos: 3, rugosidad: 0.24, alargue: m.alargue })}
              fill={ENFERMEDAD.royaPalido}
              opacity="0.5"
            />
            {granos.map((g, k) => (
              <circle
                key={k}
                cx={g.x}
                cy={g.y}
                r={g.r}
                fill={mezclarHex(ENFERMEDAD.royaCentro, ENFERMEDAD.royaPalido, Math.min(1, g.tono * 1.1))}
                opacity={g.op}
              />
            ))}
            {/* el polvo que ya se regó: la pista de que la cosa avanza */}
            {sueltas.map((g, k) => (
              <circle key={`s${k}`} cx={g.x} cy={g.y} r={g.r} fill={ENFERMEDAD.royaMedio} opacity={g.op} />
            ))}
          </g>
        );
      })}
    </g>
  );
}

/** Lo que se ve por el HAZ de la misma hoja con roya: solo una mancha
 *  amarilla, sin gracia. Por eso hay que VOLTEAR la hoja. */
export function RoyaPorElHaz({ manchas }) {
  const uid = usarId('royahaz');
  const blur = `${uid}-blur`;
  return (
    <g>
      <defs>
        {/* Poquito desenfoque: la mancha del haz NO tiene borde (por eso no
            dice qué es), pero sí es una MANCHA. Con mucho desenfoque parece
            una fuga de luz en la foto y deja de leerse como daño. */}
        <filter id={blur} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>
      <g filter={`url(#${blur})`}>
        {manchas.map((m, i) => (
          <g key={i}>
            {/* la mancha clorótica: redondeada y bien amarilla, pero SIN borde
                — de lejos es lo único que se ve, y no dice qué es. */}
            <path
              d={blob({ cx: m.cx, cy: m.cy, r: m.r * 1.45, semilla: m.semilla + 40, lobulos: 3, rugosidad: 0.26, alargue: m.alargue })}
              fill={ENFERMEDAD.royaHazMancha}
            />
            <path
              d={blob({ cx: m.cx, cy: m.cy, r: m.r * 1.05, semilla: m.semilla + 40, lobulos: 3, rugosidad: 0.24, alargue: m.alargue })}
              fill={mezclarHex(ENFERMEDAD.royaHazMancha, ENFERMEDAD.royaPalido, 0.5)}
            />
            {/* el naranja que se alcanza a asomar por el haz cuando la cosa
                ya está avanzada: la pista de que hay que voltearla */}
            <path
              d={blob({ cx: m.cx, cy: m.cy, r: m.r * 0.46, semilla: m.semilla + 9, lobulos: 3, rugosidad: 0.3, alargue: m.alargue })}
              fill={ENFERMEDAD.royaMedio}
              opacity="0.45"
            />
          </g>
        ))}
      </g>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* ENFERMEDAD · LA MANCHA CON PATRÓN                                   */
/* ------------------------------------------------------------------ */

/**
 * Mancha de hierro / ojo de gallo (Cercospora coffeicola).
 * Calcada de `public/plaga-images/cercospora_coffeicola.jpg`: halo amarillo
 * brillante, borde OSCURO Y DEFINIDO, centro gris ceniza. Esta es LA figura
 * de "la enfermedad tiene forma": se puede dibujar su borde con el dedo.
 */
export function ManchaCercospora({ cx, cy, r, semilla = 5 }) {
  const uid = usarId('cerco');
  const blur = `${uid}-blur`;
  return (
    <g>
      <defs>
        <filter id={blur} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.9" />
        </filter>
      </defs>
      {/* halo amarillo: difuso hacia afuera, pero rodea toda la mancha */}
      <path
        d={blob({ cx, cy, r: r * 1.85, semilla: semilla + 3, lobulos: 3, rugosidad: 0.14 })}
        fill={ENFERMEDAD.cercoHalo}
        opacity="0.85"
        filter={`url(#${blur})`}
      />
      {/* el cuerpo de la lesión: BORDE DEFINIDO (aquí sí hay línea) */}
      <path
        d={blob({ cx, cy, r, semilla, lobulos: 3, rugosidad: 0.1 })}
        fill={ENFERMEDAD.cercoCentro}
        stroke={ENFERMEDAD.cercoBorde}
        strokeWidth="0.85"
      />
      {/* el centro se seca y se aclara (ceniza) */}
      <path
        d={blob({ cx: cx - r * 0.08, cy: cy - r * 0.06, r: r * 0.52, semilla: semilla + 11, lobulos: 3, rugosidad: 0.16 })}
        fill={ENFERMEDAD.cercoCentroPalido}
        opacity="0.9"
      />
      <circle cx={cx + r * 0.12} cy={cy + r * 0.1} r={r * 0.16} fill={ENFERMEDAD.cercoBorde} opacity="0.5" />
    </g>
  );
}

/**
 * La lesión con ANILLOS CONCÉNTRICOS (tipo Alternaria, `alternaria_solani.jpg`).
 * El "tiro al blanco". Dato fino de la foto que casi nadie dibuja: la lesión
 * SE FRENA en la vena y se vuelve angular — el hongo no puede cruzar la
 * nervadura. Ningún bicho hace eso. Eso es patrón puro.
 */
export function ManchaAnillos({ cx, cy, r, semilla = 8 }) {
  const uid = usarId('anillo');
  const blur = `${uid}-blur`;
  return (
    <g>
      <defs>
        <filter id={blur} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.7" />
        </filter>
      </defs>
      <path
        d={blob({ cx, cy, r: r * 1.5, semilla: semilla + 2, lobulos: 3, rugosidad: 0.2 })}
        fill={ENFERMEDAD.anilloHalo}
        opacity="0.7"
        filter={`url(#${blur})`}
      />
      <path
        d={blob({ cx, cy, r, semilla, lobulos: 4, rugosidad: 0.16 })}
        fill={ENFERMEDAD.anilloFondo}
        stroke={ENFERMEDAD.anilloLinea}
        strokeWidth="0.7"
      />
      {/* los anillos: el hongo avanza a tirones, un anillo por empujón */}
      {[0.78, 0.58, 0.38, 0.2].map((k, i) => (
        <path
          key={i}
          d={blob({ cx, cy, r: r * k, semilla: semilla + i * 7, lobulos: 4, rugosidad: 0.13 })}
          fill="none"
          stroke={ENFERMEDAD.anilloLinea}
          strokeWidth="0.55"
          opacity={0.72 - i * 0.08}
        />
      ))}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* DEFICIENCIA · LA CLOROSIS                                           */
/* ------------------------------------------------------------------ */

/**
 * Clorosis intervenal de HIERRO: la lámina amarillea y la nervadura SE QUEDA
 * VERDE. Queda una redecilla verde sobre amarillo — ordenada, simétrica, sin
 * bicho y sin borde. Ataca las hojas NUEVAS (el hierro no se mueve dentro de
 * la mata: la hoja vieja no se lo puede prestar al cogollo).
 *
 * Se dibuja al revés que las otras marcas: la lámina ya viene amarilla desde
 * `HojaBase tinteLamina`, y acá se repone EL VERDE que sobrevive pegado a la
 * vena. Eso es exactamente lo que pasa en la mata.
 */
export function ClorosisHierro() {
  const uid = usarId('fe');
  const blur = `${uid}-blur`;
  return (
    <g>
      <defs>
        <filter id={blur} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
      </defs>
      {/* el corredor verde a lado y lado de cada vena: ancho, difuso, SIN
          borde. Si tuviera borde sería una mancha, y esto no es una mancha. */}
      <g filter={`url(#${blur})`} fill="none" strokeLinecap="round" opacity="0.9">
        <path d={HOJA.nervioCentral} stroke={DEFICIENCIA.hierroVenaHalo} strokeWidth="5" />
        {HOJA.laterales.map((v, i) => (
          <path key={i} d={v.d} stroke={DEFICIENCIA.hierroVenaHalo} strokeWidth="3.2" />
        ))}
        {HOJA.lazos.map((d, i) => (
          <path key={`l${i}`} d={d} stroke={DEFICIENCIA.hierroVenaHalo} strokeWidth="1.8" opacity="0.6" />
        ))}
      </g>
      {/* la vena misma, verde franco. Fina: en la mata el amarillo MANDA y el
          verde queda solo pegadito a la nervadura — si el verde ocupa media
          hoja, ya no se lee como clorosis sino como hoja sana con manchas. */}
      <g fill="none" stroke={DEFICIENCIA.hierroVena} strokeLinecap="round">
        <path d={HOJA.nervioCentral} strokeWidth="2" />
        {HOJA.laterales.map((v, i) => (
          <path key={i} d={v.d} strokeWidth="1.15" />
        ))}
        {HOJA.lazos.map((d, i) => (
          <path key={`l${i}`} d={d} strokeWidth="0.65" opacity="0.75" />
        ))}
      </g>
    </g>
  );
}

/**
 * Clorosis de NITRÓGENO: la hoja amarillea PAREJA y entera.
 *
 * Es el daño más aburrido de dibujar y el más importante de reconocer: no
 * hay nada. No hay mancha, no hay borde, no hay halo, no hay bicho. Solo una
 * hoja que se apagó de a poquito, un tono más clara desde la punta.
 *
 * Y ataca las hojas VIEJAS primero, porque el nitrógeno la mata sí lo sabe
 * mover: se lo quita a las de abajo para dárselo a los cogollos. Esa es la
 * diferencia con el hierro, que no se mueve y por eso pega en las NUEVAS.
 *
 * Ojo — este dibujo tiene un gemelo peligroso: así mismo se ve una mata con
 * nematodo en la raíz. Ver `LaminaDuda`.
 */
export function ClorosisNitrogeno() {
  const uid = usarId('nitro');
  const grad = `${uid}-g`;
  return (
    <g>
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={DEFICIENCIA.nitroViejo} />
          <stop offset="0.55" stopColor={DEFICIENCIA.nitroMedio} stopOpacity="0.5" />
          <stop offset="1" stopColor={DEFICIENCIA.nitroVerdeQueQueda} stopOpacity="0.55" />
        </linearGradient>
      </defs>
      {/* el apagón, de la punta hacia la base: SIN una sola línea de borde */}
      <path d={HOJA.contorno} fill={`url(#${grad})`} />
      {/* la nervadura apenas se insinúa: acá NO se queda verde como en el
          hierro — se va apagando con toda la hoja, y por eso no hay redecilla */}
      <g fill="none" stroke={DEFICIENCIA.nitroVerdeQueQueda} strokeLinecap="round" opacity="0.28">
        <path d={HOJA.nervioCentral} strokeWidth="1.6" />
        {HOJA.laterales.map((v, i) => (
          <path key={i} d={v.d} strokeWidth="0.7" />
        ))}
      </g>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* PLAGA · EL BICHO Y SU RASTRO                                        */
/* ------------------------------------------------------------------ */

/** El excremento del gusano: barrilitos, no puntos. */
export function Frass({ cx, cy, n = 9, radio = 5, semilla = 31 }) {
  const bolitas = frassDe({ cx, cy, n, radio, semilla });
  return (
    <g>
      {bolitas.map((b, i) => (
        <g key={i} transform={`translate(${b.x} ${b.y}) rotate(${b.rot})`}>
          <rect x={-b.w / 2} y={-b.h / 2} width={b.w} height={b.h} rx={b.h * 0.42} fill={PLAGA.frass} />
          <rect x={-b.w / 2} y={-b.h / 2} width={b.w} height={b.h * 0.4} rx={b.h * 0.2} fill={PLAGA.frassClaro} opacity="0.55" />
        </g>
      ))}
    </g>
  );
}

/**
 * El gusano. Dibujo de entomología, no personaje: sin ojos, sin boca.
 * Bandas longitudinales que siguen la curva del cuerpo, anillos por segmento,
 * pináculas con seta, cápsula cefálica con la "Y" invertida pálida.
 */
export function Gusano({ x = 0, y = 0, rot = 0, escala = 1, bicho = GUSANO }) {
  const uid = usarId('gus');
  const grad = `${uid}-grad`;
  const clip = `${uid}-clip`;
  const cab = bicho.cabeza;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${escala})`}>
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={PLAGA.cuerpoClaro} />
          <stop offset="0.5" stopColor={PLAGA.cuerpo} />
          <stop offset="1" stopColor={mezclarHex(PLAGA.cuerpo, PLAGA.banda, 0.55)} />
        </linearGradient>
        <clipPath id={clip}>
          <path d={bicho.contorno} />
        </clipPath>
      </defs>

      {/* sombra de contacto: el bicho pesa sobre la hoja */}
      <path d={bicho.contorno} fill={PLAGA.banda} opacity="0.2" transform="translate(0.6 1.4)" />

      {/* las patas asoman por debajo del cuerpo */}
      <g stroke={PLAGA.pata} strokeLinecap="round" fill="none">
        {bicho.patas.map((p, i) => (
          <path
            key={i}
            d={`M${p.x.toFixed(2)} ${p.y.toFixed(2)} q${(p.dx * 0.5).toFixed(2)} ${(p.dy * 0.7).toFixed(2)} ${p.dx.toFixed(2)} ${p.dy.toFixed(2)}`}
            strokeWidth={p.tipo === 'toracica' ? 0.75 : 1.25}
            opacity={p.tipo === 'toracica' ? 1 : 0.9}
          />
        ))}
      </g>

      <path d={bicho.contorno} fill={`url(#${grad})`} />

      <g clipPath={`url(#${clip})`}>
        {/* bandas longitudinales: se curvan CON el cuerpo (por eso el gusano
            se lee como animal y no como macarrón pintado a rayas) */}
        <path d={bicho.franja(0.62)} fill="none" stroke={PLAGA.banda} strokeWidth={bicho.grueso * 0.34} opacity="0.75" />
        <path d={bicho.franja(-0.66)} fill="none" stroke={PLAGA.banda} strokeWidth={bicho.grueso * 0.3} opacity="0.62" />
        <path d={bicho.franja(0.1)} fill="none" stroke={PLAGA.bandaFina} strokeWidth={bicho.grueso * 0.16} opacity="0.6" />
        <path d={bicho.franja(0.34)} fill="none" stroke={PLAGA.cuerpoClaro} strokeWidth={bicho.grueso * 0.12} opacity="0.7" />
        <path d={bicho.franja(-0.34)} fill="none" stroke={PLAGA.cuerpoClaro} strokeWidth={bicho.grueso * 0.1} opacity="0.55" />

        {/* anillos de los segmentos */}
        <g fill="none" stroke={PLAGA.banda} strokeWidth="0.32" opacity="0.5">
          {bicho.anillos.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      </g>

      {/* pináculas con su seta */}
      <g>
        {bicho.pinaculas.map((p, i) => (
          <g key={i}>
            <path
              d={`M${p.x.toFixed(2)} ${p.y.toFixed(2)} L${p.seta.x.toFixed(2)} ${p.seta.y.toFixed(2)}`}
              stroke={PLAGA.banda}
              strokeWidth="0.24"
              opacity="0.75"
            />
            <circle cx={p.x} cy={p.y} r={p.r} fill={PLAGA.cabeza} opacity="0.85" />
          </g>
        ))}
      </g>

      <path d={bicho.contorno} fill="none" stroke={PLAGA.banda} strokeWidth="0.4" opacity="0.8" />

      {/* la cabeza: cápsula dura, oscura, sin cara */}
      <g>
        <circle cx={cab.x} cy={cab.y} r={cab.r} fill={PLAGA.cabeza} />
        <circle cx={cab.x} cy={cab.y} r={cab.r} fill="none" stroke={mezclarHex(PLAGA.cabeza, '#000000', 0.3)} strokeWidth="0.3" />
        {/* la "Y" invertida pálida de la frente: la firma del cogollero */}
        <path
          d={`M${cab.x - cab.r * 0.45} ${cab.y - cab.r * 0.5} L${cab.x - cab.r * 0.05} ${cab.y + cab.r * 0.1} M${cab.x - cab.r * 0.05} ${cab.y + cab.r * 0.1} L${cab.x + cab.r * 0.42} ${cab.y - cab.r * 0.5} M${cab.x - cab.r * 0.05} ${cab.y + cab.r * 0.1} L${cab.x - cab.r * 0.02} ${cab.y + cab.r * 0.72}`}
          fill="none"
          stroke={PLAGA.cabezaMarca}
          strokeWidth="0.42"
          strokeLinecap="round"
          opacity="0.9"
        />
      </g>
    </g>
  );
}

/**
 * Hoja miniatura: la misma silueta, en chiquito y barata.
 *
 * Para dibujar una mata entera (seis hojas o más) no sirve `HojaBase`: cada
 * una traería sus filtros, su máscara y sus gradientes, y una lámina con doce
 * hojas se vuelve un archivo absurdo para un teléfono de gama baja. Esta usa
 * EL MISMO contorno (así la mata se ve de la misma obra) con dos trazos.
 *
 * @param {string} props.tinte color de la lámina.
 * @param {boolean} [props.venaVerde] la nervadura se queda verde (hierro).
 */
export function HojaMini({ x, y, rot = 0, escala = 0.26, tinte, venaVerde = false }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${escala})`}>
      <path d={HOJA.contorno} fill={tinte} stroke={HOJA_SANA.borde} strokeWidth="2.6" />
      {venaVerde && (
        <g fill="none" stroke={DEFICIENCIA.hierroVena} strokeLinecap="round" opacity="0.95">
          <path d={HOJA.nervioCentral} strokeWidth="5" />
          {HOJA.laterales.map((v, i) => (
            <path key={i} d={v.d} strokeWidth="3" />
          ))}
        </g>
      )}
      {!venaVerde && (
        <path d={HOJA.nervioCentral} fill="none" stroke={HOJA_SANA.venaSurco} strokeWidth="3" opacity="0.4" />
      )}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* PIEZAS DEL PLIEGO (papel, rótulos, lupa)                            */
/* ------------------------------------------------------------------ */

/** El pliego de papel del cuaderno. Mismo papel que `laminas/`. */
export function Pliego({ w, h }) {
  return (
    <g>
      <rect x="2" y="2" width={w - 4} height={h - 4} rx="10" fill={PLIEGO.papel} stroke={PLIEGO.borde} strokeWidth="2" />
      <rect x="8" y="8" width={w - 16} height={h - 16} rx="7" fill="none" stroke={PLIEGO.bordeSuave} strokeWidth="1" />
      <path d={`M${w - 8} ${h - 26} L${w - 26} ${h - 8} L${w - 8} ${h - 8} Z`} fill={PLIEGO.dobles} stroke="#d0bb8a" strokeWidth="0.8" />
    </g>
  );
}

/** Rótulo con línea guía y puntico, igual que en las láminas de la casa. */
export function Rotulo({ tx, ty, anchor = 'start', texto, nota = null, guia, tinta = TINTA.media, tam = 10 }) {
  const ta = /** @type {'start' | 'middle' | 'end'} */ (anchor);
  return (
    <g>
      {guia && <path d={guia.d} fill="none" stroke={TINTA.guia} strokeWidth="0.8" />}
      {guia && <circle cx={guia.px} cy={guia.py} r="1.5" fill={TINTA.punto} />}
      <text x={tx} y={ty} textAnchor={ta} fontSize={tam} fontWeight="700" fill={tinta}>
        {texto}
      </text>
      {nota && (
        <text x={tx} y={Number(ty) + tam + 0.5} textAnchor={ta} fontSize={tam - 1.6} fontStyle="italic" fill={TINTA.suave}>
          {nota}
        </text>
      )}
    </g>
  );
}

/**
 * Viñeta de texto: un puntico del color de la categoría y una o dos líneas.
 * SVG no reparte el texto solo, así que las líneas vienen ya partidas a mano
 * (es una lámina, no un párrafo: cada línea está medida para su columna).
 *
 * @param {Array<string|{fuerte:string,resto:string}>} props.lineas
 *   Un string es una línea normal; `{fuerte, resto}` arranca en negrilla —
 *   la palabra que hay que llevarse a la memoria va en negrilla.
 */
export function Vineta({ x, y, color, lineas, tam = 7.6, interlinea = 9.4 }) {
  return (
    <g>
      <circle cx={x + 1.6} cy={y - 2.5} r="1.5" fill={color} />
      {lineas.map((l, i) => (
        <text key={i} x={x + 7} y={y + i * interlinea} fontSize={tam} fill={TINTA.media}>
          {typeof l === 'string' ? (
            l
          ) : (
            <>
              <tspan fontWeight="800" fill={color}>
                {l.fuerte}
              </tspan>
              <tspan>{l.resto}</tspan>
            </>
          )}
        </text>
      ))}
    </g>
  );
}

/**
 * La lupa: el recuadro redondo del detalle.
 * En una lámina botánica el detalle NO es un zoom del mismo dibujo — se
 * vuelve a dibujar con más información, que es justo lo que uno gana al
 * acercar la cara a la mata. Así se hace acá.
 */
export function Lupa({ cx, cy, r, titulo, children, tinta = TINTA.media }) {
  const uid = usarId('lupa');
  const clip = `${uid}-clip`;
  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill={PLIEGO.papelHondo} />
      <g clipPath={`url(#${clip})`}>{children}</g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={TINTA.guia} strokeWidth="1.3" />
      <circle cx={cx} cy={cy} r={r - 2.2} fill="none" stroke={PLIEGO.borde} strokeWidth="0.7" opacity="0.8" />
      {titulo && (
        <text x={cx} y={cy + r + 11} textAnchor="middle" fontSize="8" fontWeight="700" fill={tinta} letterSpacing="0.04em">
          {titulo}
        </text>
      )}
    </g>
  );
}
