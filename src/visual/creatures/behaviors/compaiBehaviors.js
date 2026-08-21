/*
 * compaiBehaviors — FACADE de re-export de los sistemas de comportamiento
 * del compAI/Angelita.
 *
 * Hoy ese comportamiento vive repartido en 7 fuentes que nacieron por
 * separado (el agente conversacional, el núcleo portable del valle en
 * `public/valle/compai/`, el idle vivo de los 8 bichos rubber-hose, el
 * lip-sync, la entrada épica y el cruce 2D→3D). Este archivo NO mueve ni
 * edita NINGUNA de esas fuentes — solo las importa y las reexpone agrupadas
 * por categoría, para que quien quiera "todo el comportamiento del compAI"
 * tenga un solo punto de entrada sin tener que saber en qué archivo vive
 * cada pieza.
 *
 * Sumadas después, 2 fuentes más (mismo criterio: se agrupan DENTRO de la
 * categoría existente, no crean una categoría nueva): AngelitaSalida.jsx —
 * el espejo de la entrada, dentro de `entrada` — y RevelacionMistica.jsx —
 * aparecer/desaparecer con barrido, dentro de `transicion`.
 *
 * ⚠️ COLISIÓN DE NOMBRES (la razón de que esto NO se aplane a top-level):
 * `MOMENTOS_IDLE`, `elegirMomentoIdle` y `duracionDeMomento` EXISTEN EN DOS
 * FUENTES DISTINTAS, con CONTENIDO DISTINTO:
 *   - `agente/angelitaEstados.js`       → repertorio del AGENTE (9 momentos
 *     idle: el que anima a Angelita cuando conversa dentro de la PWA).
 *   - `public/valle/compai/gestos.js`   → repertorio NÚCLEO DEL VALLE (14
 *     momentos, compartido con 3d.guatoc.co — trae guiño, estira, bosteza,
 *     rascanuca, cabecea, voltereta, mirausted, cuenta, que el agente NO
 *     tiene). `angelitaEstados.js` alguna vez tuvo su propia copia de 9; hoy
 *     el núcleo del valle es una evolución posterior e independiente, no un
 *     superset — por eso NO se puede "quedarse con uno solo" sin perder
 *     información real.
 * Si esos tres nombres se reexportaran sueltos en el nivel superior, el
 * segundo import pisaría al primero en silencio. La solución es agrupar TODO
 * en objetos anidados por categoría (`estados.*` para el agente, `idle.*`
 * para el núcleo del valle): cada fuente se importa bajo su propio alias de
 * módulo (`* as angelitaEstados`, `* as gestosNucleo`) y los objetos se arman
 * a mano más abajo, así el nombre nunca choca.
 *
 * Los dos módulos de `public/valle/compai/` (gestos.js, idleMachine.js) son
 * ESM puros verificados: `export const` / `export function` / `export
 * default`, CERO imports, sin dependencias de DOM/three/React (confirmado
 * con `node --check` + lectura completa). Se importan directo por ruta
 * relativa, exactamente igual que cualquier otro archivo de `src/` — no
 * hace falta ningún workaround de carga dinámica ni de script-tag; si te
 * asaltó la duda al verlos venir de `public/`, ya está resuelta.
 */

import * as angelitaEstados from '../../agente/angelitaEstados.js';
import * as gestosNucleo from '../../../../public/valle/compai/gestos.js';
import * as idleMachine from '../../../../public/valle/compai/idleMachine.js';
import * as vidaEstados from '../vidaEstados.js';
import { useVidaIdle, useRitmoPropio, useMiradaUsted, prefiereQuietud } from '../useVidaIdle.js';
import * as lipSyncCore from '../lipSyncCore.js';
import { useLipSync } from '../useLipSync.js';
import { AngelitaEntrada, esDiaSoleado } from '../../agente/AngelitaEntrada.jsx';
import { AngelitaSalida } from '../../agente/AngelitaSalida.jsx';
import AbejaTransicion, {
  AlMontarEscena,
  CRUCE_ATRAPA_MS,
  CRUCE_ENTRAR_MS,
  CRUCE_VOLVER_MS,
  CRUCE_SUELTA_MS,
} from '../AbejaTransicion.jsx';
import { RevelacionMistica } from '../RevelacionMistica.jsx';

/** ESTADOS — el repertorio del AGENTE conversacional (angelitaEstados.js):
 * los 10 estados canónicos ('acompana', 'escuchando', 'pensando'…), sus
 * mapas de pose/cejas/aria, la confianza del modo científico, y SU idle
 * propio (9 momentos, distinto del idle del núcleo — ver aviso arriba). */
export const estados = {
  ESTADOS_ANGELITA: angelitaEstados.ESTADOS_ANGELITA,
  estadoCanonico: angelitaEstados.estadoCanonico,
  POSE_DE_ESTADO: angelitaEstados.POSE_DE_ESTADO,
  CEJAS_DE_ESTADO: angelitaEstados.CEJAS_DE_ESTADO,
  ARIA_DE_ESTADO: angelitaEstados.ARIA_DE_ESTADO,
  MOMENTOS_IDLE: angelitaEstados.MOMENTOS_IDLE,
  elegirMomentoIdle: angelitaEstados.elegirMomentoIdle,
  duracionDeMomento: angelitaEstados.duracionDeMomento,
  NIVELES_CONFIANZA: angelitaEstados.NIVELES_CONFIANZA,
  nivelDeConfianza: angelitaEstados.nivelDeConfianza,
};

/** IDLE — el repertorio ocioso del NÚCLEO DEL VALLE (gestos.js, 14 momentos,
 * el mismo que corre en 3d.guatoc.co) más la máquina de pose/perfiles por
 * especie del rig del valle (idleMachine.js: respira, mira, aseo, gesto). */
export const idle = {
  MOMENTOS_IDLE: gestosNucleo.MOMENTOS_IDLE,
  elegirMomentoIdle: gestosNucleo.elegirMomentoIdle,
  elegirSinRepetir: gestosNucleo.elegirSinRepetir,
  duracionDeMomento: gestosNucleo.duracionDeMomento,
  IDLE_PERFILES: idleMachine.IDLE_PERFILES,
  IDLE_NEUTRO: idleMachine.IDLE_NEUTRO,
  idleDeCompai: idleMachine.idleDeCompai,
  miraDeCompai: idleMachine.miraDeCompai,
  semillaDe: idleMachine.semillaDe,
  azar01: idleMachine.azar01,
};

/** VIDA — el idle vivo species-agnostic de los 8 bichos rubber-hose
 * (vidaEstados.js: repertorio por especie) más el reloj/hooks que lo montan
 * en React (useVidaIdle.js). */
export const vida = {
  VIDA_REPERTORIO: vidaEstados.VIDA_REPERTORIO,
  MOMENTO_POSE: vidaEstados.MOMENTO_POSE,
  elegirMomentoVida: vidaEstados.elegirMomentoVida,
  duracionDeMomentoVida: vidaEstados.duracionDeMomentoVida,
  duracionDeDescanso: vidaEstados.duracionDeDescanso,
  crearRitmoPropio: vidaEstados.crearRitmoPropio,
  useVidaIdle,
  useRitmoPropio,
  useMiradaUsted,
  prefiereQuietud,
};

/** ENTRADA — la entrada épica de Angelita al abrir la app, más su ESPEJO de
 * salida (AngelitaSalida.jsx: se despide contenta y encoge hasta desaparecer,
 * el mismo lenguaje de ang-crece leído en reversa). */
export const entrada = { AngelitaEntrada, esDiaSoleado, AngelitaSalida };

/** HABLAR — lip-sync 2D por energía RMS (lipSyncCore.js: lógica pura) más
 * el hook que la cablea al audio real (useLipSync.js). */
export const hablar = {
  VISEMA: lipSyncCore.VISEMA,
  UMBRAL_RMS: lipSyncCore.UMBRAL_RMS,
  DEBOUNCE_MS: lipSyncCore.DEBOUNCE_MS,
  visemaDesdeRMS: lipSyncCore.visemaDesdeRMS,
  rmsDeMuestras: lipSyncCore.rmsDeMuestras,
  crearDebounceVisema: lipSyncCore.crearDebounceVisema,
  visemaFallback: lipSyncCore.visemaFallback,
  useLipSync,
};

/** TRANSICIÓN — el cruce 2D→3D de Angelita (overlay DOM del handoff en
 * Mundo.jsx). `criatura`/`size` (props nuevas, ver AbejaTransicion.jsx) le
 * permiten a CUALQUIER bicho del roster reusar esta misma coreografía. Suma
 * también RevelacionMistica.jsx: aparecer/desaparecer con un barrido místico
 * (CSS mask, sin WebGL), genérico para cualquier compai. */
export const transicion = {
  AbejaTransicion,
  AlMontarEscena,
  CRUCE_ATRAPA_MS,
  CRUCE_ENTRAR_MS,
  CRUCE_VOLVER_MS,
  CRUCE_SUELTA_MS,
  RevelacionMistica,
};

export default { estados, idle, vida, entrada, hablar, transicion };
