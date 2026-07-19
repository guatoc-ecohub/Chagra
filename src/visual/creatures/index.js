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
/* EL OSO DE ANTEOJOS EN SU VERSIÓN BUENA — NEGRO BIOPUNK (la dirección
   aprobada por el operador: azabache azulado + aros crema luminosos + acentos
   menta medidos; ver dashboard/GuardianEspiritu → AvatarOso). El OsoAndino
   café de arriba queda archivado (decisión del operador: no surfacear); este
   es EL oso de primera clase para valle/mundos. Identidad como datos: jamás
   arrastra three al bundle base — igual que jaguarIdentidad. */
export { OsoAnteojos } from './OsoAnteojos.jsx';
export {
  OSO_ANTEOJOS_PALETA, OSO_ANTEOJOS_PROPORCION, OSO_ANTEOJOS_SLUG, PERFIL_OSO_ANTEOJOS,
} from './osoAnteojosIdentidad.js';
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
export { Borugo } from './Borugo.jsx';
/* La IDENTIDAD del borugo como datos (paleta parda + motas crema, proporciones y
   su perfil de clima). El 9º y ÚLTIMO bicho — el ANIMAL DE CIERRE. Solo datos:
   jamás arrastra three al bundle base — igual que jaguarIdentidad/abejaIdentidad. */
export { BORUGO_PALETA, BORUGO_PROPORCION, BORUGO_SLUG, PERFIL_BORUGO } from './borugoIdentidad.js';
export { Danta } from './Danta.jsx';
/* La IDENTIDAD de la danta como datos (paleta lanuda + borde blanco de orejas/
   labios, proporciones y su perfil de clima). La emblemática que faltaba en el
   bosque — la JARDINERA que siembra al andar. Solo datos: jamás arrastra three
   al bundle base — igual que borugoIdentidad/jaguarIdentidad. */
export { DANTA_PALETA, DANTA_PROPORCION, DANTA_SLUG, PERFIL_DANTA } from './dantaIdentidad.js';
export { Condor } from './Condor.jsx';
export { Dalmata } from './Dalmata.jsx';
/* La IDENTIDAD del dálmata como datos (paleta blanco+manchas negras redondas,
   proporciones atléticas y su perfil de clima). El perro ALTO y moteado de la
   casa. Solo datos: jamás arrastra three al bundle base — igual que
   jaguarIdentidad/borugoIdentidad. */
export { DALMATA_PALETA, DALMATA_PROPORCION, DALMATA_SLUG, PERFIL_DALMATA } from './dalmataIdentidad.js';
export { Beagle } from './Beagle.jsx';
/* La IDENTIDAD del beagle como datos (paleta TRICOLOR silla-negra/blanco/
   canela, proporciones bajitas y orejonas y su perfil de clima). El sabueso
   BAJITO de la casa — la anti-silueta del dálmata. Solo datos: jamás arrastra
   three al bundle base — igual que dalmataIdentidad. */
export { BEAGLE_PALETA, BEAGLE_PROPORCION, BEAGLE_SLUG, PERFIL_BEAGLE } from './beagleIdentidad.js';
/* La IDENTIDAD del cóndor como datos (paleta azabache + coberteras plateadas +
   collar de plumón, proporciones y su perfil de clima). EL EMBLEMA DEL PÁRAMO —
   el señor del viento que casi no aletea. Solo datos: jamás arrastra three al
   bundle base — igual que dantaIdentidad/borugoIdentidad. */
export { CONDOR_PALETA, CONDOR_PROPORCION, CONDOR_SLUG, PERFIL_CONDOR } from './condorIdentidad.js';
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
/* EL TRÍO DE CONTROL BIOLÓGICO — los aliados reales de la agroecología que los
   juegos Defensores y Milpa necesitaban como protagonistas: la crisopa (alas
   verdes translúcidas, ojos dorados), la avispita Trichogramma (diminuta pero
   brava, ojos rojos, alas con flecos) y el sírfido (mosca que imita abeja: un
   par de alas, ojos enormes, antenitas mínimas). Fauna benéfica REAL con
   binomio verificado — misma fundación rubber-hose que Mariposa/Escarabajo. */
export { Crisopa } from './Crisopa.jsx';
export { Trichogramma } from './Trichogramma.jsx';
export { Sirfido } from './Sirfido.jsx';
/* EL ENT DEL PÁRAMO — el árbol-guardián que enseña (frailejón gigante). NO es un
   bicho: es el corazón del "Bosque Vivo". Hereda la MISMA fundación transversal
   (line-boil, lip-sync, modo-poder=guardián, clima) adaptada a su escala y su
   lentitud. Su voz-maestra (el guion de botánica/clima/conservación/caza) vive
   en useEntGuion (fallback digno hasta que aterrice src/data/entGuion.js). */
export { EntFrailejon } from './EntFrailejon.jsx';
export {
  useEntGuion, resolverGuionEnt, ENT_GUION_PLACEHOLDER, ENT_TEMAS,
} from './useEntGuion.js';

/* ── SISTEMA DE PERSONAJES (transversal, species-agnostic) ───────────────────
   La FUNDACIÓN que heredan los 9 bichos: lip-sync, modo poder, prop-por-mundo,
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
// VIDA v2 (la vara de Angelita en los 8): idle-cerebro species-agnostic +
// ritmo propio de parpadeo + la mirada que reconoce. Los bichos ya la traen
// por dentro (default ON); se exporta para hosts que quieran dirigirla.
export {
  VIDA_REPERTORIO, MOMENTO_POSE,
  elegirMomentoVida, duracionDeMomentoVida, duracionDeDescanso, crearRitmoPropio,
} from './vidaEstados.js';
export { useVidaIdle, useRitmoPropio, useMiradaUsted, prefiereQuietud } from './useVidaIdle.js';

import AbejaAngelita from './AbejaAngelita.jsx';
import Colibri from './Colibri.jsx';
import OsoAndino from './OsoAndino.jsx';
import OsoAnteojos from './OsoAnteojos.jsx';
import RanaAndina from './RanaAndina.jsx';
import Perezoso from './Perezoso.jsx';
import Ardilla from './Ardilla.jsx';
import Jaguar from './Jaguar.jsx';
import Morrocoy from './Morrocoy.jsx';
import Borugo from './Borugo.jsx';
import Danta from './Danta.jsx';
import Condor from './Condor.jsx';
import Dalmata from './Dalmata.jsx';
import Beagle from './Beagle.jsx';
import Lombriz from './Lombriz.jsx';
import Mariposa from './Mariposa.jsx';
import Escarabajo from './Escarabajo.jsx';
import Crisopa from './Crisopa.jsx';
import Trichogramma from './Trichogramma.jsx';
import Sirfido from './Sirfido.jsx';
import EntFrailejon from './EntFrailejon.jsx';

/* Registro consultable: slug → componente + binomio verificado. */
export const CREATURES = {
  'abeja-angelita': { Component: AbejaAngelita, nombre: 'Abeja angelita', cientifico: 'Tetragonisca angustula' },
  colibri: { Component: Colibri, nombre: 'Colibrí chillón', cientifico: 'Colibri coruscans' },
  'oso-andino': { Component: OsoAndino, nombre: 'Oso andino', cientifico: 'Tremarctos ornatus' },
  // La VERSIÓN BUENA del oso (negro biopunk, aprobada por el operador). El
  // 'oso-andino' café de arriba queda archivado; surfacear ESTE.
  'oso-anteojos': { Component: OsoAnteojos, nombre: 'Oso de anteojos', cientifico: 'Tremarctos ornatus' },
  'rana-andina': { Component: RanaAndina, nombre: 'Rana arlequín andina', cientifico: 'Atelopus spp.' },
  perezoso: { Component: Perezoso, nombre: 'Perezoso de tres dedos', cientifico: 'Bradypus variegatus' },
  ardilla: { Component: Ardilla, nombre: 'Ardilla de cola roja', cientifico: 'Notosciurus granatensis' },
  jaguar: { Component: Jaguar, nombre: 'Jaguar', cientifico: 'Panthera onca' },
  morrocoy: { Component: Morrocoy, nombre: 'Morrocoy de patas rojas', cientifico: 'Chelonoidis carbonarius' },
  /* BORUGO ARCHIVADO (operador, 2026-07-18): dibujo rechazado por feo — fuera
     del registro para que NADA data-driven lo surfacee (avatar-selector, fauna
     ambiental, vecinos del valle). El componente queda por si se rehace. */
  danta: { Component: Danta, nombre: 'Danta de páramo', cientifico: 'Tapirus pinchaque' },
  condor: { Component: Condor, nombre: 'Cóndor de los Andes', cientifico: 'Vultur gryphus' },
  // Los perros de la casa (razas reconocibles: el alto moteado y el bajito orejón).
  dalmata: { Component: Dalmata, nombre: 'Dálmata', cientifico: 'Canis lupus familiaris' },
  beagle: { Component: Beagle, nombre: 'Beagle', cientifico: 'Canis lupus familiaris' },
  lombriz: { Component: Lombriz, nombre: 'Lombriz de tierra', cientifico: 'Martiodrilus crassus' },
  mariposa: { Component: Mariposa, nombre: 'Mariposa pasionaria', cientifico: 'Dione juno' },
  escarabajo: { Component: Escarabajo, nombre: 'Escarabajo estercolero', cientifico: 'Dichotomius belus' },
  // El trío de control biológico (aliados reales de Defensores y Milpa).
  crisopa: { Component: Crisopa, nombre: 'Crisopa', cientifico: 'Chrysoperla externa' },
  trichogramma: { Component: Trichogramma, nombre: 'Avispita Trichogramma', cientifico: 'Trichogramma' },
  sirfido: { Component: Sirfido, nombre: 'Mosca de las flores (sírfido)', cientifico: 'Syrphidae' },
  // El árbol-maestro del Bosque Vivo (flora, no fauna): el frailejón guardián.
  'ent-frailejon': { Component: EntFrailejon, nombre: 'El Ent del páramo', cientifico: 'Espeletia sp.' },
};
