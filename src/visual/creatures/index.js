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
/* OsoAndino (el café) ARCHIVADO (operador): rechazado por feo. Queda exportado
   por compatibilidad/historia, pero NO se surfacea (fuera del registro
   CREATURES). La dirección vigente es OsoGuardian, más abajo. */
export { OsoAndino } from './OsoAndino.jsx';
/* OsoAnteojos ARCHIVADO (operador, 2026-07-18: "casi feíto como el anterior")
   — igual que el OsoAndino café. El componente queda exportado por
   compatibilidad, pero NO se surfacea (fuera del registro CREATURES). */
export { OsoAnteojos } from './OsoAnteojos.jsx';
export {
  OSO_ANTEOJOS_PALETA, OSO_ANTEOJOS_PROPORCION, OSO_ANTEOJOS_SLUG, PERFIL_OSO_ANTEOJOS,
} from './osoAnteojosIdentidad.js';
/* EL OSO DE ANTEOJOS EN SU DIRECCIÓN VIGENTE — EL GUARDIÁN NEGRO DE LA LUNA
   (base: el avatar aprobado del selector del guardián, dashboard/
   GuardianEspiritu → AvatarOso: azabache azulado + luna creciente en el pecho
   + aros de luz + menta medida), elevado a proporciones de ADULTO (cabeza
   chica sobre joroba de hombros, hocico presente, ojos-almendra serenos,
   garras) para que deje de leer infantil. Identidad como datos: jamás
   arrastra three al bundle base — igual que jaguarIdentidad. */
export { OsoGuardian } from './OsoGuardian.jsx';
export {
  OSO_GUARDIAN_PALETA, OSO_GUARDIAN_PROPORCION, OSO_GUARDIAN_RUANA_ANCLA,
  OSO_GUARDIAN_SLUG, OSO_GUARDIAN_TINTA, PERFIL_OSO_GUARDIAN,
} from './osoGuardianIdentidad.js';
/* EL OSO DEL BASTÓN — Tremarctos ornatus en su CUARTA dirección: el CAMINANTE
   de los Andes de la referencia aprobada (Cuphead de día: erguido, sonrisa
   amplia, guantes crema, botas de trocha) con su firma — el BASTÓN FLORECIDO
   (frailejón + orquídea, ver OSO_BASTON_FLORA) más alto que él. Su gesto
   `florece` es su ecología (dispersor de semillas) hecha estado visual. */
export { OsoBaston } from './OsoBaston.jsx';
/* La IDENTIDAD del oso del bastón como datos (paleta tierra + verde dominante,
   proporciones, su CONTRATO DE SILUETA, la botánica del bastón, presencia 3D
   y perfil de clima). Solo datos: jamás arrastra three al bundle base — igual
   que osoGuardianIdentidad/luciernagaIdentidad. */
export {
  OSO_BASTON_FIRMA, OSO_BASTON_FLORA, OSO_BASTON_PALETA, OSO_BASTON_PRESENCIA,
  OSO_BASTON_PROPORCION, OSO_BASTON_SLUG, OSO_BASTON_TINTA, PERFIL_OSO_BASTON,
} from './osoBastonIdentidad.js';
export { RanaAndina } from './RanaAndina.jsx';
export { Ardilla } from './Ardilla.jsx';
export { Jaguar } from './Jaguar.jsx';
export { ChivitoTrazado } from './ChivitoTrazado.jsx';
export { LuciernagaTrazado } from './LuciernagaTrazado.jsx';
/* La IDENTIDAD del jaguar como datos (paleta leonada + rosetas, proporciones y
   su perfil de clima). Solo datos: jamás arrastra three al bundle base — igual
   que abejaIdentidad/faunaAndina. */
export { JAGUAR_PALETA, JAGUAR_PROPORCION, JAGUAR_SLUG, PERFIL_JAGUAR, JAGUAR_PODER_KART } from './jaguarIdentidad.js';
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
/* EL MOMENTO de los perros guardianes (Dante el beagle y Oliver el dálmata):
   el cruce 3D↔2D (PerroTransicion, calca del molde AbejaTransicion), la forma
   héroe dibujada (PerroHeroe), el overlay maestro (MomentoGuardianes), la
   máquina de estados de la escena como datos (escenaGuardianes) y la señal
   DOM→canvas (senalPerrosGuardianes — la lee HatoMovil). Overlay DOM puro,
   cero three en el bundle base — ver "CABLEADO" en MomentoGuardianes.jsx. */
export {
  default as PerroTransicion,
  PERRO_APAGA_3D_MS, PERRO_CRUCE_HEROE_MS, PERRO_RENACE_3D_MS,
  PERRO_CRUCE_NORMAL_MS, ESCALON_PERROS_MS,
} from './PerroTransicion.jsx';
export { PerroHeroe } from './PerroHeroe.jsx';
export { default as MomentoGuardianes, POSICIONES_GUARDIANES } from './MomentoGuardianes.jsx';
export {
  FASES_GUARDIANES, GUION_GUARDIA, MONTE_GUARDIANES,
  duracionFase, useEscenaGuardianes,
} from './escenaGuardianes.js';
export {
  usePerrosGuardianes, setModoPerro, setAlertaHacia, resetPerrosGuardianes,
  RAZAS_GUARDIANES,
} from './senalPerrosGuardianes.js';
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
/* LA GALLINA CRIOLLA — el animal de patio que faltaba en el elenco (44
   criaturas y ninguna gallina): la del gallinero que camina, la que escarba
   detrás del ganado y rompe el ciclo de la larva. Dos plumajes (colorada y
   clara sarabiada) para que la parvada no se vea clonada. */
export { Gallina } from './Gallina.jsx';
/* LA ZARIGÜEYA (chucha/fara/runcho) — el MARSUPIAL NOCTURNO de la finca: LA
   QUE CARGA. El personaje base LLEVA LAS CRÍAS AL LOMO (no es un adorno que se
   agrega después: es su firma de SILUETA y es conducta real de Didelphis —
   salen del marsupio a los ~70 días y viajan en la espalda mientras la madre
   forrajea). Su firma no depende del color: crías al lomo, hocico en cuña,
   cola prensil desnuda con gancho y orejas grandes redondas — todo sobrevive
   al test de negro sobre blanco (ver ZARIGUYA_FIRMA). */
export { Zariguya } from './Zariguya.jsx';
/* La IDENTIDAD de la zarigüeya como datos (paleta ceniza + cara pálida + piel
   rosada desnuda, proporciones, su perfil de clima y —explícito— su CONTRATO
   DE SILUETA). Solo datos: jamás arrastra three al bundle base — igual que
   dantaIdentidad/jaguarIdentidad. */
export {
  ZARIGUYA_FIRMA, ZARIGUYA_PALETA, ZARIGUYA_PRESENCIA, ZARIGUYA_PROPORCION,
  ZARIGUYA_SLUG, ZARIGUYA_TINTA, PERFIL_ZARIGUYA,
} from './zariguyaIdentidad.js';
/* LA ZARIGÜEYA GEMINI (2026-08-24, `feat/zariguya-gemini-integra`) — el SET
   estilo grabado/tinta aprobado por el operador (2026-08-23) hecho lámina
   viva: la hero naturalista (lápiz+brújula, patas reales) horneada en capas
   + cola de rig del despiece + las poses plenas del set (escucha ×4,
   ver-lupa, cute, muerta) según el estado del agente. Es la cara ACTUAL del
   AGENTE (`ChagraAgentAvatarZariguya`); `CREATURES.zariguya` (fauna del
   valle/selector de criaturas) sigue en `ZariguyaLaminaViva` hasta que esa
   superficie se migre — trabajo aparte, mismo set. */
export { default as ZariguyaGeminiLaminaViva } from './ZariguyaGeminiLaminaViva.jsx';
/* LA LUCIÉRNAGA (cocuyo) — el ESCARABAJO bioluminiscente de la finca: la GUÍA
   nocturna, científica y BIOINDICADORA (la misma familia de personaje-guía que
   la abeja Angelita). Su LINTERNA es un medidor vivo del cambio climático (prop
   `eco`): late fuerte con ecosistema sano, titila débil con degradación. Fiel a
   que es un escarabajo con escudo (pronoto), no una mosca ni una abeja. */
export { Luciernaga } from './Luciernaga.jsx';
/* La IDENTIDAD de la luciérnaga como datos (paleta bioluminiscente + proporciones
   + su CONTRATO DE SILUETA + los estados de la linterna-bioindicador + presencia
   3D + perfil de clima). Solo datos: jamás arrastra three al bundle base — igual
   que zariguyaIdentidad/jaguarIdentidad. */
export {
  LUCIERNAGA_FIRMA, LUCIERNAGA_PALETA, LUCIERNAGA_PRESENCIA, LUCIERNAGA_PROPORCION,
  LUCIERNAGA_SLUG, LUCIERNAGA_TINTA, LUCIERNAGA_ESTADOS_ECO, PERFIL_LUCIERNAGA,
} from './luciernagaIdentidad.js';
/* EL MAÍZ COMPAÑERO — Zea mays, la mata madre de la milpa: LA QUE ALIMENTA.
   El avatar-planta ('maiz' en useAgentAvatarType) hecho personaje rubber-hose:
   ARRAIGADO (no viaja — el único del elenco sin pies: tiene montículo y
   raíces), mecido por la brisa (cada hoja a su compás), coronado por el
   penacho que VIBRA al reaccionar, con la mazorca al costado como carga y
   regalo. Su firma sobrevive al negro sobre blanco (ver MAIZ_FIRMA). */
export { MaizCompai } from './MaizCompai.jsx';
/* La IDENTIDAD del maíz como datos (paleta milpa + proporciones + firma de
   silueta + PRESENCIA 3D + perfil de clima — sequía 0.95: la seca se le nota
   de una). Solo datos: jamás arrastra three al bundle base — igual que
   zariguyaIdentidad/abejaIdentidad. */
export {
  MAIZ_FIRMA, MAIZ_PALETA, MAIZ_PRESENCIA, MAIZ_PROPORCION, MAIZ_SLUG,
  MAIZ_TINTA, PERFIL_MAIZ,
} from './maizIdentidad.js';
/* EL ENT DEL PÁRAMO — el árbol-guardián que enseña (frailejón gigante). NO es un
   bicho: es el corazón del "Bosque Vivo". Hereda la MISMA fundación transversal
   (line-boil, lip-sync, modo-poder=guardián, clima) adaptada a su escala y su
   lentitud. Su voz-maestra (el guion de botánica/clima/conservación/caza) vive
   en useEntGuion (fallback digno hasta que aterrice src/data/entGuion.js). */
export { EntFrailejon } from './EntFrailejon.jsx';
/* ── TINTA NUEVA (2026-08-31, bases aprobadas por el operador) ────────────────
   El chivito de páramo (normal + cresta punk cuando ACTÚA) y la luciérnaga DE
   PIE (lápiz + libro + linterna encendida), dibujados a mano — línea limpia +
   planos de color, cero trazado. El registro CREATURES sigue apuntando a las
   láminas (`ChivitoPunkLaminaViva` / `LuciernagaLaminaViva`) hasta que el
   operador juzgue la tinta y ordene el cambio — trabajo aparte, misma regla
   que la zarigüeya (#2613 → trazado). */
export { ChivitoTinta } from './ChivitoTinta.jsx';
export { CHIVITO_TINTA_PALETA, PERFIL_CHIVITO_TINTA } from './chivitoTintaIdentidad.js';
export { LuciernagaTinta } from './LuciernagaTinta.jsx';
export { LUCIERNAGA_TINTA_PALETA } from './luciernagaTintaIdentidad.js';
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
// LA LEY rubber-hose como datos: tinta/blancos canónicos, easings por fase,
// compás del line-boil, períodos co-primos del idle y el registro
// rubber-hose-vs-realista. GUIA humana: src/visual/GUIA-RUBBERHOSE.md.
export {
  RH_SPEC_TINTA, RH_SPEC_PUPILA, RH_SPEC_HUESO, RH_SPEC_GUANTE,
  RH_SPEC_CHISPA, RH_SPEC_CHAPETA, RH_SPEC_BOCA, RH_SPEC_LENGUA,
  RH_EASE, RH_LINE_BOIL, RH_PERIODOS, RH_REGISTRO, esRubberhose,
} from './rubberhoseSpec.js';

/* API composable de comportamiento: una criatura nueva puede reutilizar
   gestos, clima, idle, lip-sync, política y transición sin importar cada
   primitivo por separado. */
export {
  aplicarComportamientos,
  aplicarGesto,
  celebrar,
  reposar,
  senalar,
  respirar,
  resolverPoliticaR1R5,
  configurarTransicion,
} from './comportamientos/index.js';

import AbejaAngelita from './AbejaAngelita.jsx';
import Colibri from './Colibri.jsx';
/* OsoAndino y OsoAnteojos NO se importan acá a propósito: están archivados y
   fuera del registro CREATURES. Solo entra el guardián. */
import OsoGuardian from './OsoGuardian.jsx';
import RanaAndina from './RanaAndina.jsx';
import Perezoso from './Perezoso.jsx';
import Ardilla from './Ardilla.jsx';
/* EL JAGUAR DEL ELENCO = JaguarTrazado (decisión operador 2026-08-24,
   DEFINITIVA): la lámina AUTO-TRAZADA a tinta sobre el esqueleto de huesos
   reemplaza a `JaguarLaminaViva` (la PNG recortada en capas, rechazada — el
   pecho raster no aguanta el corte). Drop-in like-for-like: mismo <div
   data-creature="jaguar" role="img">, misma cadencia (jaguarHuesos.css).
   `JaguarLaminaViva.jsx` NO se borra (huérfano GATED, por historia). */
import JaguarTrazado from './JaguarTrazado.jsx';
import Morrocoy from './Morrocoy.jsx';
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
import Gallina from './Gallina.jsx';
/* LA ZARIGÜEYA DEL ELENCO = ZariguyaTrazado (decisión operador 2026-08-25,
   DEFINITIVA): la lámina AUTO-TRAZADA a tinta sobre el esqueleto de huesos
   (clip-regiones, método aprobado del jaguar) reemplaza a `ZariguyaLaminaViva`
   y al SET GEMINI. Drop-in like-for-like: mismo <div data-creature="zariguya"
   role="img">, cadencia propia (zariguyaTrazado/zariguyaHuesos.css) y CUERPO
   ENTERO en todos los estados (cero salto a close-up de cabeza). TAMAÑO
   conservado (ZARIGUYA_PRESENCIA sin cambios). `ZariguyaLaminaViva.jsx` y
   `ZariguyaGeminiLaminaViva.jsx` NO se borran (huérfanos, por historia). */
import ZariguyaTrazado from './ZariguyaTrazado.jsx';
import LuciernagaLaminaViva from './LuciernagaLaminaViva.jsx';
import OsoBastonLaminaViva from './OsoBastonLaminaViva.jsx';
import ChivitoPunkLaminaViva from './ChivitoPunkLaminaViva.jsx';
import MaizCompai from './MaizCompai.jsx';
import EntFrailejon from './EntFrailejon.jsx';

/* Registro consultable: slug → componente + binomio verificado. */
export const CREATURES = {
  'abeja-angelita': { Component: AbejaAngelita, nombre: 'Abeja angelita', cientifico: 'Tetragonisca angustula' },
  colibri: { Component: Colibri, nombre: 'Colibrí chillón', cientifico: 'Colibri coruscans' },
  /* EL OSO: 'oso-guardian' es la ÚNICA dirección aprobada por el operador (el
     guardián negro con la luna en el pecho). Los otros dos quedaron ARCHIVADOS
     por feos y NO se surfacean: 'oso-andino' (OsoAndino.jsx, el café) y
     'oso-anteojos' (OsoAnteojos.jsx). Fuera del registro para que NADA
     data-driven los muestre — avatar-selector, fauna ambiental, vecinos del
     valle (mismo patrón que el borugo). Los componentes quedan en disco por
     historia, por si alguna vez se rehacen. */
  'oso-guardian': { Component: OsoGuardian, nombre: 'Oso de anteojos', cientifico: 'Tremarctos ornatus' },
  // La dirección CAMINANTE del mismo oso (la referencia Cuphead aprobada):
  // erguido, botas y guantes, y el bastón florecido — el dispersor de semillas.
  'oso-baston': { Component: OsoBastonLaminaViva, nombre: 'Oso del bastón', cientifico: 'Tremarctos ornatus' },
  'rana-andina': { Component: RanaAndina, nombre: 'Rana arlequín andina', cientifico: 'Atelopus spp.' },
  perezoso: { Component: Perezoso, nombre: 'Perezoso de tres dedos', cientifico: 'Bradypus variegatus' },
  ardilla: { Component: Ardilla, nombre: 'Ardilla de cola roja', cientifico: 'Notosciurus granatensis' },
  jaguar: { Component: JaguarTrazado, nombre: 'Jaguar', cientifico: 'Panthera onca' },
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
  // El animal de patio de la casa campesina (el del gallinero que camina).
  gallina: { Component: Gallina, nombre: 'Gallina criolla', cientifico: 'Gallus gallus domesticus' },
  // El marsupial nocturno de la finca (la que sale de noche a limpiar la
  // huerta — con las crías al lomo).
  zariguya: { Component: ZariguyaTrazado, nombre: 'Zarigüeya (chucha)', cientifico: 'Didelphis marsupialis' },
  // El escarabajo bioluminiscente de la finca (la guía que lee la noche — su
  // linterna es un medidor vivo del cambio climático).
  luciernaga: { Component: LuciernagaLaminaViva, nombre: 'Luciérnaga (cocuyo)', cientifico: 'Lampyridae' },
  'chivito-punk': { Component: ChivitoPunkLaminaViva, nombre: 'Chivito de páramo', cientifico: 'Oxypogon guerinii' },
  // La mata madre de la milpa (flora compañera, como el Ent): el avatar-planta
  // arraigado que se mece, alimenta y corona en espiga.
  maiz: { Component: MaizCompai, nombre: 'Planta de maíz', cientifico: 'Zea mays' },
  // El árbol-maestro del Bosque Vivo (flora, no fauna): el frailejón guardián.
  'ent-frailejon': { Component: EntFrailejon, nombre: 'El Ent del páramo', cientifico: 'Espeletia sp.' },
};
