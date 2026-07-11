/*
 * Registro consultable de la FAUNA BENÉFICA rubber-hose: slug → componente +
 * binomio verificado + ROL funcional. Mismo espíritu que `CREATURES` en
 * index.js, pero en módulo aparte para no tocar el barrel (lo cablea Opus).
 *
 * Antes de dibujar un aliado de la finca en estilo rubber-hose, búscalo aquí.
 */
import {
  MariquitaRubber,
  AbejorroRubber,
  LombrizRubber,
  EscarabajoRubber,
} from './FaunaRubberhose.jsx';

export const FAUNA_RUBBER = {
  'mariquita-rubber': {
    Component: MariquitaRubber,
    nombre: 'Mariquita',
    cientifico: 'Hippodamia convergens',
    rol: 'controla plagas',
  },
  'abejorro-rubber': {
    Component: AbejorroRubber,
    nombre: 'Abejorro',
    cientifico: 'Bombus atratus',
    rol: 'poliniza',
  },
  'lombriz-rubber': {
    Component: LombrizRubber,
    nombre: 'Lombriz',
    cientifico: 'Martiodrilus crassus',
    rol: 'airea el suelo',
  },
  'escarabajo-rubber': {
    Component: EscarabajoRubber,
    nombre: 'Escarabajo estercolero',
    cientifico: 'Dichotomius belus',
    rol: 'descompone',
  },
};
