/*
 * Tokens de la fauna benéfica rubber-hose (Cuphead / Miss Minutes) fusionada
 * con lo andino. Módulo PLANO (sin componentes) para poder compartir paletas y
 * roles entre el kit y las criaturas sin romper el Fast Refresh de Vite.
 *
 * Paleta madura y cálida, con acentos de textil andino: rojo cochinilla, ocre,
 * maíz, índigo. Nunca chillón. INK = la línea de tinta gruesa que "respira".
 */

import { RH_SPEC_TINTA, RH_SPEC_HUESO } from './rubberhoseSpec.js';

/** Línea de tinta rubber-hose: negro cálido (no negro puro). MISMA tinta que
    el kit de los 9 bichos (`rubberhoseSpec.js`) — antes este archivo tenía su
    propia tinta (#241a10) y la fauna benéfica se veía de otra familia. */
export const INK = RH_SPEC_TINTA;

/** Blanco hueso de los ojos de goma / brillos (el mismo blanco-de-ojo de la
    familia; antes #fff8ec, una cuarta variante de blanco sin jerarquía). */
export const HUESO = RH_SPEC_HUESO;

/** Paletas por criatura. `Hi` = luz/brillo de goma; `rombo` = acento andino. */
export const PALETA = {
  mariquita: {
    caparazon: '#d1382b', // rojo cochinilla
    caparazonHi: '#f26150',
    cuerpo: '#1c140b',
    punto: '#1c140b',
    rombo: '#f4c542', // maíz (acento andino en las manchas)
    hoja: '#4c9a3f',
    plaga: '#b7c98a', // pulgón, el rol: control de plagas
  },
  abejorro: {
    pelo: '#f4b41a',
    peloHi: '#ffd35e',
    banda: '#241a10',
    ala: '#e6f4ff',
    polen: '#ffcf3f', // el rol: polinización
    flor: '#e46b9b',
    florCorazon: '#f4c542',
  },
  lombriz: {
    piel: '#d9836a',
    pielHi: '#ff9d7a',
    clitelo: '#f5d9a6', // banda tejida (guarda andina)
    guarda: '#b5532f',
    suelo: '#5a3d28',
    aire: '#cfe8dc', // el rol: airear/nutrir el suelo
  },
  escarabajo: {
    elitro: '#274b39',
    elitroHi: '#5fae7d',
    rombo: '#f4c542', // chakana/rombo andino en el lomo
    bolaWaste: '#6e5238',
    bolaHumus: '#2f2013',
    brote: '#6ac06a', // el rol: descomponer → vida nueva
  },
};

/**
 * Rol funcional de cada aliado, mostrado de forma bella (emblema + cinta).
 * `verbo` = qué hace por la finca; `color` = color de la cinta.
 */
export const ROLES = {
  mariquita: { verbo: 'controla plagas', color: '#3f7d3a' },
  abejorro: { verbo: 'poliniza', color: '#c98a12' },
  lombriz: { verbo: 'airea el suelo', color: '#8a5a3c' },
  escarabajo: { verbo: 'descompone', color: '#3d6b4a' },
};
