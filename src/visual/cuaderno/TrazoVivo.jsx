/* eslint-disable chagra-i18n/no-hardcoded-spanish -- UI español intencional; ADR-050 i18n pendiente */
/*
 * TrazoVivo — las primitivas SVG del cuaderno, dibujadas a mano.
 *
 * Todo lo que en otra app sería un ícono de librería, aquí es un TRAZO:
 * línea que respira, terminales redondas, determinista por seed (la misma
 * hoja prensada se seca igual en cada visita). Cero imágenes, cero fuentes
 * de íconos, cero three — DOM/SVG puro del bundle base.
 *
 * Piezas:
 *   <SubrayadoVivo>  — el subrayado a pulso bajo un título o una fecha.
 *   <GlifoClima>     — sol / nube / lluvia / helada, como los dibuja quien
 *                      apunta el clima en la esquina de la página.
 *   <GlifoMirada>    — los cuatro gestos de OBSERVAR: envés, cogollo,
 *                      suelo, mata vecina. La lupa del campesino son sus
 *                      ojos y sus manos; estos glifos son ese gesto.
 *   <HojaPrensada>   — la hoja seca guardada entre páginas. Es la pieza
 *                      del FRACASO DIGNO: lo que se perdió se guarda, no
 *                      se tacha.
 *   <HiloQueUne>     — el hilo de cabuya que une un eco del cuaderno con
 *                      la anotación que lo despertó.
 *
 * Todos decorativos (aria-hidden): el significado viaja en el texto de la
 * página, nunca solo en el dibujo.
 */
import {
  lineaQueRespira,
  rngArtesania,
} from '../mundo3d/artesaniaAndina.js';
import {
  TINTAS,
  ACENTO_CUADERNO,
  MANO_CUADERNO,
} from './cuadernoTokens.js';

/* ── El subrayado a pulso ──────────────────────────────────────────────── */

/**
 * Subrayado que respira: la raya que uno pasa bajo la fecha con el mismo
 * esfero. Se estira al ancho disponible (preserveAspectRatio none).
 */
export function SubrayadoVivo({ color = TINTAS.fresca, seed = 7, className = '' }) {
  const d = lineaQueRespira(4, 6, 116, 6, {
    amplitud: MANO_CUADERNO.amplitudSubrayado,
    ondas: MANO_CUADERNO.ondasSubrayado,
    seed,
  });
  return (
    <svg
      className={`cv-trazo cv-subrayado ${className}`.trim()}
      viewBox="0 0 120 12"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={MANO_CUADERNO.fino * 1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ── El clima de la esquina ────────────────────────────────────────────── */

function trazosSol(r) {
  /* círculo a pulso + rayos cortos desiguales */
  const rayos = [];
  for (let i = 0; i < 7; i += 1) {
    const a = (i / 7) * Math.PI * 2 + r() * 0.3;
    const largo = 4.5 + r() * 2.5;
    const x1 = 16 + Math.cos(a) * 9;
    const y1 = 16 + Math.sin(a) * 9;
    rayos.push(
      `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${(x1 + Math.cos(a) * largo).toFixed(1)} ${(y1 + Math.sin(a) * largo).toFixed(1)}`,
    );
  }
  return {
    principal: 'M 16 9.5 Q 22.5 10 22.5 16 Q 22 22.5 16 22.5 Q 9.5 22 9.5 16 Q 10 9.5 16 9.5',
    detalle: rayos.join(' '),
  };
}

function trazosNube(r) {
  const sube = (r() - 0.5) * 1.6;
  return {
    principal: `M 6 ${20 + sube} Q 5 14 11 13.5 Q 12.5 8 18 9 Q 24 9.5 24.5 14.5 Q 28 16 26.5 ${20 + sube} Z`,
    detalle: '',
  };
}

function trazosLluvia(r) {
  const nube = trazosNube(r).principal;
  const gotas = [];
  for (let i = 0; i < 3; i += 1) {
    const x = 10 + i * 6 + r() * 2;
    gotas.push(`M ${x} 23 L ${x - 1.6} 28.5`);
  }
  return { principal: nube, detalle: gotas.join(' ') };
}

function trazosHelada(r) {
  /* la estrella de escarcha: seis brazos con remate, ninguno igual */
  const brazos = [];
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2 + r() * 0.18;
    const largo = 9 + r() * 2.5;
    const x2 = 16 + Math.cos(a) * largo;
    const y2 = 16 + Math.sin(a) * largo;
    brazos.push(`M 16 16 L ${x2.toFixed(1)} ${y2.toFixed(1)}`);
    /* el remate: la puntica en cruz de cada brazo */
    const px = 16 + Math.cos(a) * largo * 0.66;
    const py = 16 + Math.sin(a) * largo * 0.66;
    const pa = a + Math.PI / 2;
    brazos.push(
      `M ${(px - Math.cos(pa) * 2.2).toFixed(1)} ${(py - Math.sin(pa) * 2.2).toFixed(1)} L ${(px + Math.cos(pa) * 2.2).toFixed(1)} ${(py + Math.sin(pa) * 2.2).toFixed(1)}`,
    );
  }
  return { principal: '', detalle: brazos.join(' ') };
}

const CLIMAS = {
  sol: { trazos: trazosSol, color: ACENTO_CUADERNO.sol },
  nube: { trazos: trazosNube, color: TINTAS.lapiz },
  lluvia: { trazos: trazosLluvia, color: ACENTO_CUADERNO.lluvia },
  helada: { trazos: trazosHelada, color: ACENTO_CUADERNO.escarcha },
};

/** Claves de clima disponibles (para datos y tests). */
export const CLIMA_TIPOS = Object.keys(CLIMAS);

/**
 * El clima apuntado en la esquina de la página: sol, nube, lluvia o helada,
 * a pulso. `tinta` tiñe el trazo (una página vieja apunta su clima con la
 * misma tinta desteñida del resto).
 */
export function GlifoClima({ tipo = 'sol', tinta, seed = 7, className = '' }) {
  const receta = CLIMAS[tipo] || CLIMAS.sol;
  const { principal, detalle } = receta.trazos(rngArtesania(seed));
  const color = tinta || receta.color;
  return (
    <svg
      className={`cv-trazo cv-glifo-clima ${className}`.trim()}
      viewBox="0 0 32 32"
      aria-hidden="true"
    >
      {principal && (
        <path
          d={principal}
          fill="none"
          stroke={color}
          strokeWidth={MANO_CUADERNO.fino * 1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {detalle && (
        <path
          d={detalle}
          fill="none"
          stroke={color}
          strokeWidth={MANO_CUADERNO.fino}
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

/* ── Los gestos de la mirada ───────────────────────────────────────────── */

function trazosEnves(seed) {
  /* una hoja con la esquina volteada: el gesto de mirar por debajo */
  return {
    cuerpo: 'M 16 5 Q 26 9 25 18 Q 24 26 16 28 Q 8 26 7 18 Q 6 9 16 5 Z',
    volteo: 'M 16 28 Q 21 24 24.5 24.5 Q 21.5 27.5 16 28 Z',
    nervio: lineaQueRespira(16, 7, 16, 26, { amplitud: 1, ondas: 2, seed }),
  };
}

function trazosCogollo(seed) {
  /* el brote: dos hojitas nuevas saliendo del tallo — lo nuevo cuenta la verdad */
  return {
    cuerpo: 'M 12 14 Q 5 10 6.5 4.5 Q 13 6 14.5 12 Z M 20 14 Q 27 10 25.5 4.5 Q 19 6 17.5 12 Z',
    volteo: '',
    nervio: lineaQueRespira(16, 28, 16, 11, { amplitud: 1.4, ondas: 2, seed }),
  };
}

function trazosSuelo(seed) {
  /* la línea de tierra y lo que vive alrededor: puntos de hormiga, costra */
  const r = rngArtesania(seed);
  const puntos = [];
  for (let i = 0; i < 5; i += 1) {
    const x = 6 + i * 5 + r() * 2.5;
    const y = 22 + r() * 5;
    puntos.push(`M ${x.toFixed(1)} ${y.toFixed(1)} l 0.4 0.4`);
  }
  return {
    cuerpo: '',
    volteo: puntos.join(' '),
    nervio: lineaQueRespira(4, 18, 28, 18, { amplitud: 1.6, ondas: 3, seed }),
  };
}

function trazosVecina(seed) {
  /* dos matas lado a lado, una entera y una caída: comparar es media respuesta */
  return {
    cuerpo: 'M 10 26 Q 9 18 10 12 M 10 12 Q 6 10 5.5 6 M 10 12 Q 14 10 14.5 6.5',
    volteo: 'M 22 26 Q 22 21 22.5 17 M 22.5 17 Q 19.5 17 18.5 14.5 M 22.5 17 Q 25 16 27 17.5',
    nervio: lineaQueRespira(4, 27, 28, 27, { amplitud: 1.2, ondas: 2, seed }),
  };
}

const MIRADAS_GLIFO = {
  enves: trazosEnves,
  cogollo: trazosCogollo,
  suelo: trazosSuelo,
  vecina: trazosVecina,
};

/** Claves de mirada disponibles (mismo vocabulario de cuadernoData.MIRADAS). */
export const MIRADA_TIPOS = Object.keys(MIRADAS_GLIFO);

/**
 * El gesto de observar, dibujado: envés (la hoja volteada), cogollo (el
 * brote), suelo (la tierra y sus puntos), vecina (dos matas comparadas).
 */
export function GlifoMirada({ tipo = 'enves', color = TINTAS.fresca, seed = 7, className = '' }) {
  const receta = MIRADAS_GLIFO[tipo] || MIRADAS_GLIFO.enves;
  const { cuerpo, volteo, nervio } = receta(seed);
  return (
    <svg
      className={`cv-trazo cv-glifo-mirada ${className}`.trim()}
      viewBox="0 0 32 32"
      aria-hidden="true"
    >
      {nervio && (
        <path d={nervio} fill="none" stroke={color} strokeWidth={MANO_CUADERNO.fino} strokeLinecap="round" />
      )}
      {cuerpo && (
        <path
          d={cuerpo}
          fill="none"
          stroke={color}
          strokeWidth={MANO_CUADERNO.fino * 1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {volteo && (
        <path d={volteo} fill="none" stroke={color} strokeWidth={MANO_CUADERNO.fino} strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

/* ── La hoja prensada ──────────────────────────────────────────────────── */

/**
 * La hoja seca guardada entre páginas: el fracaso hecho reliquia, no
 * tachón. Determinista por seed: la misma hoja, los mismos nervios, la
 * misma mordida del borde en cada visita.
 */
export function HojaPrensada({ seed = 7, className = '' }) {
  const r = rngArtesania(seed);
  /* el contorno: una hoja de haba con los bordes ya resecos (mordidas) */
  const muescas = [];
  for (let i = 0; i < 3; i += 1) {
    muescas.push(0.7 + r() * 0.6);
  }
  const cuerpo = [
    'M 24 4',
    `Q ${38 + muescas[0] * 3} 12 ${37 - muescas[1] * 2} 26`,
    'Q 35 40 24 46',
    `Q ${12 + muescas[2] * 2} 40 10.5 26`,
    'Q 10 12 24 4 Z',
  ].join(' ');
  const nervioCentral = lineaQueRespira(24, 7, 24, 43, { amplitud: 1.2, ondas: 3, seed: seed + 1 });
  const nervios = [];
  for (let i = 0; i < 4; i += 1) {
    const y = 13 + i * 8;
    const abre = 7 + r() * 3;
    nervios.push(lineaQueRespira(24, y, 24 - abre, y + 5, { amplitud: 0.8, ondas: 2, seed: seed + 2 + i }));
    nervios.push(lineaQueRespira(24, y, 24 + abre, y + 5, { amplitud: 0.8, ondas: 2, seed: seed + 6 + i }));
  }
  return (
    <svg
      className={`cv-trazo cv-hoja-prensada ${className}`.trim()}
      viewBox="0 0 48 48"
      aria-hidden="true"
    >
      <path
        d={cuerpo}
        fill={ACENTO_CUADERNO.hojaPrensada}
        fillOpacity="0.55"
        stroke={ACENTO_CUADERNO.hojaPrensadaNervio}
        strokeWidth={MANO_CUADERNO.fino}
        strokeLinejoin="round"
      />
      <path
        d={`${nervioCentral} ${nervios.join(' ')}`}
        fill="none"
        stroke={ACENTO_CUADERNO.hojaPrensadaNervio}
        strokeWidth={MANO_CUADERNO.fino * 0.8}
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
}

/* ── El hilo que une ───────────────────────────────────────────────────── */

/**
 * El hilo de cabuya que baja del eco a la anotación que lo despertó:
 * vertical, con comba (la gravedad es la firma). Se estira a la altura
 * disponible.
 */
export function HiloQueUne({ color = ACENTO_CUADERNO.hiloOscuro, seed = 7, className = '' }) {
  const d = lineaQueRespira(6, 2, 6, 58, { amplitud: 2.4, ondas: 3, seed });
  return (
    <svg
      className={`cv-trazo cv-hilo-une ${className}`.trim()}
      viewBox="0 0 12 60"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={d} fill="none" stroke={color} strokeWidth={MANO_CUADERNO.fino} strokeLinecap="round" strokeDasharray="5 3" />
    </svg>
  );
}
