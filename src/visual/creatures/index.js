/*
 * Librería visual de PERSONAJES DE FAUNA de la chagra (creatures).
 * Fuente única y reutilizable. Antes de dibujar un bicho, búscalo aquí.
 *
 * Cada componente:
 *   - Modo standalone (por defecto): renderiza su propio <svg> con viewBox,
 *     dimensionado por `size` — ideal para avatares, catálogo, botones.
 *   - Modo `inline`: renderiza solo el <g> para incrustarse en una escena SVG
 *     que ya define su viewBox y su coreografía de entrada/posición.
 *
 * Props comunes: { size, className, inline, animated, title }.
 */
export { AbejaAngelita } from './AbejaAngelita.jsx';
/* La IDENTIDAD de Angelita como datos (paleta chumbe, proporciones, presencia
   3D): la fuente única que comparten su dibujo 2D y su presencia en los mundos
   (useEntradaAbeja). Solo datos — jamás arrastra three al bundle base. */
export { ABEJA_PALETA, ABEJA_PROPORCION, ABEJA_PRESENCIA, ABEJA_TINTA } from './abejaIdentidad.js';
/* El CRUCE 2D→3D de Angelita (overlay DOM puro, cero three — seguro en el
   bundle base). El host de mundos lo monta al entrar/volver; la señal
   `avisarSalidaAbeja` avisa al mesh que la abeja sale (ver AbejaTransicion.jsx,
   sección "CABLEADO EN EL HOST"). */
export {
  default as AbejaTransicion, AlMontarEscena,
  CRUCE_ATRAPA_MS, CRUCE_ENTRAR_MS, CRUCE_VOLVER_MS, CRUCE_SUELTA_MS,
} from './AbejaTransicion.jsx';
export { avisarSalidaAbeja, resetSalidaAbeja, useSalidaAbeja } from './senalSalidaAbeja.js';
export { Colibri } from './Colibri.jsx';
export { OsoAndino } from './OsoAndino.jsx';
export { RanaAndina } from './RanaAndina.jsx';
/* La IDENTIDAD del trío andino como datos (paletas + proporciones). Solo datos:
   jamás arrastra three al bundle base — igual que abejaIdentidad. */
export {
  OSO_PALETA, OSO_PROPORCION,
  COLIBRI_PALETA, COLIBRI_PROPORCION,
  RANA_PALETA, RANA_PROPORCION, FAUNA_TINTA,
} from './faunaAndina.js';
export { Lombriz } from './Lombriz.jsx';
export { Mariposa } from './Mariposa.jsx';
export { Escarabajo } from './Escarabajo.jsx';

import AbejaAngelita from './AbejaAngelita.jsx';
import Colibri from './Colibri.jsx';
import OsoAndino from './OsoAndino.jsx';
import RanaAndina from './RanaAndina.jsx';
import Lombriz from './Lombriz.jsx';
import Mariposa from './Mariposa.jsx';
import Escarabajo from './Escarabajo.jsx';

/* Registro consultable: slug → componente + binomio verificado. */
export const CREATURES = {
  'abeja-angelita': { Component: AbejaAngelita, nombre: 'Abeja angelita', cientifico: 'Tetragonisca angustula' },
  colibri: { Component: Colibri, nombre: 'Colibrí chillón', cientifico: 'Colibri coruscans' },
  'oso-andino': { Component: OsoAndino, nombre: 'Oso andino', cientifico: 'Tremarctos ornatus' },
  'rana-andina': { Component: RanaAndina, nombre: 'Rana arlequín andina', cientifico: 'Atelopus spp.' },
  lombriz: { Component: Lombriz, nombre: 'Lombriz de tierra', cientifico: 'Martiodrilus crassus' },
  mariposa: { Component: Mariposa, nombre: 'Mariposa pasionaria', cientifico: 'Dione juno' },
  escarabajo: { Component: Escarabajo, nombre: 'Escarabajo estercolero', cientifico: 'Dichotomius belus' },
};
