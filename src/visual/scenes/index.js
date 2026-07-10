/*
 * Librería visual de ESCENAS BASE de Chagra (scenes). Fuente única y reutilizable
 * de los "decorados" que se repiten en el home vivo y los mockups. Antes de
 * re-armar una capa de cielo, un parallax, el guardián-espíritu, el papel kraft
 * o la finca-organismo, búscalo aquí.
 *
 * Hermana de `src/visual/creatures` (fauna) y `src/visual/effects` (técnicas de
 * cine): misma filosofía y mismo contrato de reuso (componente parametrizable +
 * este barrel + README + `scenes.css` compartida, cero dependencias nuevas, ids
 * `useId`, reduced-motion-safe).
 *
 * Piezas:
 *   1. `scenes.css` — clases `scn-*` + custom props `--scn-*` (cielo, pulso,
 *      kraft, parallax, guardián). Importala UNA vez donde la uses.
 *   2. Componentes (este barrel): `CapaCielo`, `Parallax`, `GuardianEspirituBase`,
 *      `SceneFincaOrganismo`, + sus helpers.
 */

// ── Capa cielo paramétrica ───────────────────────────────────────────────────
export { default as CapaCielo, Sky, CieloDefs, WashSolBajo } from './CieloParametrico.jsx';
export {
  cieloEscena,
  tonoLuz,
  esNoche,
  esCubierto,
  CIELOS_ESCENA,
  CIELOS_TEMA,
} from './_cielo.js';

// ── Parallax multicapa (motor de MontanaMundosCine) ──────────────────────────
export { default as Parallax } from './Parallax.jsx';
export { CAPAS_PARALLAX, transformCapa, useViewport } from './_parallax.js';

// ── Guardián-espíritu base ───────────────────────────────────────────────────
export { default as GuardianEspirituBase, EspirituDefs } from './GuardianEspirituBase.jsx';

// ── Escena finca-organismo (con pulso) ───────────────────────────────────────
export { default as SceneFincaOrganismo } from './SceneFincaOrganismo.jsx';

/* Ritmo del latido/respiración de la finca-organismo (= `--scn-beat` en
   scenes.css y `--fvo-beat`/`--motion-beat` en el resto del repo). Útil desde JS
   cuando una escena necesita sincronizar un timing sin leer el CSS. */
export const SCN_BEAT_MS = 5200;

/* Receta de papel kraft: la clase compartida de `scenes.css`. Se re-tiñe con las
   custom props `--scn-kraft-angle/-color/-grano/-paso`; el modificador
   `.scn-kraft--fino` da la trama vertical finísima de papel. */
export const SCN_KRAFT_CLASS = 'scn-kraft';

import CapaCielo from './CieloParametrico.jsx';
import Parallax from './Parallax.jsx';
import GuardianEspirituBase from './GuardianEspirituBase.jsx';
import SceneFincaOrganismo from './SceneFincaOrganismo.jsx';

/* Registro consultable: slug → componente + qué es + de dónde salió. */
export const SCENES = {
  'capa-cielo': {
    Component: CapaCielo,
    nombre: 'Capa cielo paramétrica',
    clave: 'sol/luna/estrellas/nubes/niebla/lluvia por hora y clima reales',
    origen: 'FincaVivaHero (subcomponente Sky, compartido por las 3 escenas)',
  },
  parallax: {
    Component: Parallax,
    nombre: 'Parallax multicapa',
    clave: 'motor de cámara por capas (f<1 lejos, f>1 cerca)',
    origen: 'MontanaMundosCine (Montaña de los Mundos, pasada cine)',
  },
  'guardian-espiritu': {
    Component: GuardianEspirituBase,
    nombre: 'Guardián-espíritu base',
    clave: 'avatar de fauna como espíritu, con glow por acento',
    origen: 'GuardianEspiritu (mockup avatar-biopunk)',
  },
  'finca-organismo': {
    Component: SceneFincaOrganismo,
    nombre: 'Finca organismo',
    clave: 'finca bioluminiscente con corazón-semilla que late',
    origen: 'SceneFincaOrganismo (escena-home-biopunk-v2)',
  },
};
