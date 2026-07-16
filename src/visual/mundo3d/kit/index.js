/*
 * kit — EL TOOLKIT 3D COMPARTIDO de Chagra: la superficie única de congruencia.
 *
 * Todas las escenas 3D (dioramas de EscenaBase3D y "mundos vivos" con su propio
 * Canvas) deben verse como UN juego de Switch: mismo suelo, misma niebla, misma
 * luz de la hora del valle, misma paleta madre, misma sombra de contacto, la
 * misma fusión de geometría a prueba del null silencioso. Antes cada escena
 * reinventaba esas piezas y se veían dispares. Este barrel las reúne para que la
 * próxima escena (y la reescritura del valle/bosque) importe UNA cosa:
 *
 *   import {
 *     AtmosferaMundo, useAtmosferaMundo, construirTerreno, ruidoTerreno,
 *     fusionarSeguro, poner, apuntar, hornearFollaje, sembrarEnAnillo,
 *     PALETA, CIELOS, perfilDeTier, SombraContacto, useCicloDia,
 *   } from '@/visual/mundo3d/kit';
 *
 * ⚠️ ESTE BARREL IMPORTA `three`/`@react-three` (vía AtmosferaMundo/SombraContacto/
 * el taller de geometría). NO lo importe desde el barrel three-free de
 * `mundo3d/index.js` ni desde el bundle base: es SOLO para archivos de escena que
 * ya viven en el chunk `vendor-three` (montaje perezoso). Para dato puro
 * three-free (paleta, cielos por hora, device-tier) importe del módulo suelto.
 *
 * Mapa del kit:
 *   · ruido.js        rng/crearRng + ruidoTerreno + ruido3D/ruidoFbm + smoothstep
 *   · geometria.js    fusionarSeguro (¡la única fusión!) + colocación + horneado
 *                     + geometría orgánica + sembrarEnAnillo
 *   · terreno.js      construirTerreno (heightfield con color por vértice)
 *   · atmosfera.js    atmosferaDeFamilia + useAtmosferaMundo (hora viva del valle)
 *   · AtmosferaMundo  el drop-in <color>/<fog>/luces/estrellas/sombras
 *   + re-exports de las piezas madre ya probadas (paleta, cielos, tier, cámara,
 *     transiciones, sombra de contacto, ciclo diurno).
 */

/* ── Azar determinista + ruido ─────────────────────────────────────────────── */
export { rng, crearRng, ruido3D, ruidoFbm, ruidoTerreno, saturar, smoothstep } from './ruido.js';

/* ── Taller de geometría procedural (three-core; safe-merge + shading) ──────── */
export {
  fusionarSeguro, desindexar, poner, apuntar,
  pintarPorVertice, pintarPlano, hornearFollaje, hornearCorteza,
  tuboOrganico, taperLineal, taperTronco, curvaTronco,
  sembrarFollaje, matojoHoja, matojoNube, sembrarEnAnillo,
} from './geometria.js';

/* ── Terreno (heightfield con color por vértice) ────────────────────────────── */
export { construirTerreno } from './terreno.js';

/* ── Atmósfera del mundo (hora viva del valle, lista para cualquier Canvas) ──── */
export { atmosferaDeFamilia, useAtmosferaMundo } from './atmosfera.js';
export { default as AtmosferaMundo } from './AtmosferaMundo.jsx';

/* ── Cielo con domo + color por bandas (la clave estilizada de la toma B) ────── */
export { default as DomoCielo } from './DomoCielo.jsx';
export { crearGradienteBandas, useGradienteBandas } from './bandas.js';

/* ── Paleta madre + cielos por hora (dirección de arte central) ─────────────── */
export { ATMOSFERA, PALETA, CIELOS, BLOOM, mezclar, mezclarCielo } from '../atmosferaMadre.js';
export {
  CIELOS_HORA, HORAS, presetDeHora, franjaDeHoraDecimal, horaDeReloj,
  mezclaHex, mezclarPresets, TRANSICION,
} from '../cielosHoraData.js';

/* ── Ciclo diurno vivo (el reloj compartido) ────────────────────────────────── */
export { default as useCicloDia, horaDecimal, leerCicloParam } from '../useCicloDia.js';

/* ── Device-tier / LOD (el presupuesto por dispositivo) ─────────────────────── */
export { decidirTier, permite3D, perfilDeTier } from '../deviceTier.js';

/* ── Sombra de contacto / AO barato ─────────────────────────────────────────── */
export { SombraContacto } from '../escenas/SombraContacto.jsx';

/* ── Cámara (establishing shot + encuadres por mundo) ───────────────────────── */
export { default as CamaraDirector } from '../escenas/CamaraDirector.jsx';
export {
  ENCUADRES, ENCUADRE_IDS, ENCUADRE_DEFECTO, BEAT_DEFECTO, resolverEncuadre,
} from '../camaraDioramas.js';

/* ── Transiciones Odyssey (barrel DOM-safe; la cámara del cruce va directa) ──── */
export {
  VeloOdyssey, useCruceMundo, VELOS, VELO_IDS, familiaDeVelo, veloDeDestino,
  duracionCruce, momentoCubierto, curvaCruce,
} from '../transiciones/index.js';
