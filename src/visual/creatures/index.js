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
export { Ardilla } from './Ardilla.jsx';
export { Jaguar } from './Jaguar.jsx';
/* La IDENTIDAD del jaguar como datos (paleta leonada + rosetas, proporciones y
   su perfil de clima). Solo datos: jamás arrastra three al bundle base — igual
   que abejaIdentidad/faunaAndina. */
export { JAGUAR_PALETA, JAGUAR_PROPORCION, JAGUAR_SLUG, PERFIL_JAGUAR } from './jaguarIdentidad.js';
export { Morrocoy } from './Morrocoy.jsx';
/* La IDENTIDAD del morrocoy como datos (paleta bronce + escudos hexagonales,
   proporciones y su perfil de clima). Solo datos: jamás arrastra three al bundle
   base — igual que jaguarIdentidad/faunaAndina. */
export { MORROCOY_PALETA, MORROCOY_PROPORCION, MORROCOY_SLUG, PERFIL_MORROCOY } from './morrocoyIdentidad.js';
/* La IDENTIDAD del trío andino como datos (paletas + proporciones). Solo datos:
   jamás arrastra three al bundle base — igual que abejaIdentidad. */
export {
  OSO_PALETA, OSO_PROPORCION,
  COLIBRI_PALETA, COLIBRI_PROPORCION,
  RANA_PALETA, RANA_PROPORCION,
  ARDILLA_PALETA, ARDILLA_PROPORCION, FAUNA_TINTA,
} from './faunaAndina.js';
export { Perezoso, PEREZOSO_PALETA, PEREZOSO_PROPORCION } from './Perezoso.jsx';
export { Lombriz } from './Lombriz.jsx';
export { Mariposa } from './Mariposa.jsx';
export { Escarabajo } from './Escarabajo.jsx';

/* ── SISTEMA DE PERSONAJES (transversal, species-agnostic) ───────────────────
   La FUNDACIÓN que heredan los 8 bichos: lip-sync, modo poder, prop-por-mundo,
   ropa por clima+hora y el line-boil. Cada bicho = parámetros (aura, perfil,
   props), no código duplicado. Estrenado por Angelita; fable engancha el resto. */
// Lip-sync 2D por RMS del TTS.
export { useLipSync } from './useLipSync.js';
export {
  VISEMA, UMBRAL_RMS, DEBOUNCE_MS,
  visemaDesdeRMS, rmsDeMuestras, crearDebounceVisema, visemaFallback,
} from './lipSyncCore.js';
export { BocaVisema, RH_BOCA } from './_rubberhose.jsx';
// Transformación "modo poder".
export { AuraPoder } from './AuraPoder.jsx';
export {
  AURA_POR_BICHO, AURA_DEFECTO, CLASE_PODER, PODER_MS,
  auraDeBicho, usePoderTemporal,
} from './transformacion.js';
// Prop-por-mundo (herramienta en la mano al entrar a cada mundo).
export { PROP_POR_MUNDO, PROPS_CONOCIDOS, propDeMundo, mundoTieneProp } from './propsPorMundo.js';
export { PropEnMano, DIBUJO_PROP } from './PropEnMano.jsx';
// Ropa/cuerpo por clima+hora (ruana/sombrero/sudor) + su dibujo.
export {
  ROPA_PERFIL_POR_BICHO, ROPA_PERFIL_DEFECTO, ROPA_NEUTRA,
  ropaDeClima, ropaDeClimaBicho, ropaPerfilDeBicho,
} from './creatureClimaCuerpo.js';
export { AccesoriosClima } from './AccesoriosClima.jsx';
// Line-boil (contorno que vibra, años 30).
export { LineBoilFilter, BOIL_SEEDS } from './LineBoilFilter.jsx';

import AbejaAngelita from './AbejaAngelita.jsx';
import Colibri from './Colibri.jsx';
import OsoAndino from './OsoAndino.jsx';
import RanaAndina from './RanaAndina.jsx';
import Perezoso from './Perezoso.jsx';
import Ardilla from './Ardilla.jsx';
import Jaguar from './Jaguar.jsx';
import Morrocoy from './Morrocoy.jsx';
import Lombriz from './Lombriz.jsx';
import Mariposa from './Mariposa.jsx';
import Escarabajo from './Escarabajo.jsx';

/* Registro consultable: slug → componente + binomio verificado. */
export const CREATURES = {
  'abeja-angelita': { Component: AbejaAngelita, nombre: 'Abeja angelita', cientifico: 'Tetragonisca angustula' },
  colibri: { Component: Colibri, nombre: 'Colibrí chillón', cientifico: 'Colibri coruscans' },
  'oso-andino': { Component: OsoAndino, nombre: 'Oso andino', cientifico: 'Tremarctos ornatus' },
  'rana-andina': { Component: RanaAndina, nombre: 'Rana arlequín andina', cientifico: 'Atelopus spp.' },
  perezoso: { Component: Perezoso, nombre: 'Perezoso de tres dedos', cientifico: 'Bradypus variegatus' },
  ardilla: { Component: Ardilla, nombre: 'Ardilla de cola roja', cientifico: 'Notosciurus granatensis' },
  jaguar: { Component: Jaguar, nombre: 'Jaguar', cientifico: 'Panthera onca' },
  morrocoy: { Component: Morrocoy, nombre: 'Morrocoy de patas rojas', cientifico: 'Chelonoidis carbonarius' },
  lombriz: { Component: Lombriz, nombre: 'Lombriz de tierra', cientifico: 'Martiodrilus crassus' },
  mariposa: { Component: Mariposa, nombre: 'Mariposa pasionaria', cientifico: 'Dione juno' },
  escarabajo: { Component: Escarabajo, nombre: 'Escarabajo estercolero', cientifico: 'Dichotomius belus' },
};
