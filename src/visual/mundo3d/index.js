/*
 * src/visual/mundo3d — EL FRAMEWORK DE MUNDOS (2D + 3D data-driven).
 *
 * Un solo host `<Mundo>` monta CUALQUIER mundo de la finca eligiendo un ARQUETIPO
 * por datos y cruzándolo con el device-tier: dioramas 3D (cutaway/flujo/recinto/
 * estratos/valle) o arquetipos 2D de primera clase (mirror/lamina/infografia/
 * ficha/valle2d). Sumar un mundo = una entrada en `mundoData.js` + assets de la
 * librería visual; NUNCA código de escena nuevo.
 *
 *   import Mundo, { MUNDO, ARQUETIPOS, resolverMundo, decidirTier } from '.../visual/mundo3d';
 *
 * IMPORTANTE (code-split): este barrel NO importa `three`/`@react-three`. Los
 * dioramas 3D (carpeta `escenas/`) y su hook `useEntradaAbeja` se cargan PEREZOSO
 * desde `<Mundo>` (chunk `vendor-three`), así que importar el barrel NO infla el
 * bundle base. Para montar un arquetipo 3D suelto (p. ej. el storybook), impórtelo
 * con `React.lazy(() => import('.../mundo3d/escenas/EscenaCutaway.jsx'))`.
 */

// El host (2D estático + 3D perezoso adentro).
export { default } from './Mundo.jsx';
export { default as Mundo } from './Mundo.jsx';
export { default as Mundo2D } from './Mundo2D.jsx';

// Datos + arquetipos + resolución (three-free, seguros en el bundle base).
export { MUNDO, MUNDO_IDS } from './mundoData.js';
export { mundosPorPisoTermico } from './mundosPorPisoTermico.js';
export {
  ARQUETIPOS, ARQUETIPOS_KEYS, ARQUETIPOS_3D, ARQUETIPOS_2D, esArquetipo3D,
} from './arquetipos.js';
export { resolverMundo, tinteDeMundo, tituloDeMundo, emojiDeMundo } from './resolverMundo.js';
export { decidirTier, permite3D, perfilDeTier } from './deviceTier.js';

// Navegación valle ↔ mundos (three-free): la máquina de fases + el viaje DOM.
export { useNavegacionMundos, puedeEntrarAlMundo } from './useNavegacionMundos.js';
export { default as TransicionMundo, VIAJE_MS } from './TransicionMundo.jsx';
// Entrada a un mundo como MURAL New Donk (dolly + aplane ortográfico) para el
// flujo vivo valle→mundo — alternativa al velo, mismo contrato de timers JS.
export {
  default as TransicionNewDonk,
  ND_VIAJE_MS,
  ND_MITAD_MS,
  ND_APLANE_MS,
} from './TransicionNewDonk.jsx';

// Háptica táctil (three-free, DR-3D-HAPTICA): pulsos semánticos por evento del
// framework — no-op silencioso donde no hay Vibration API (iOS/Safari, FF129+).
export { default as useHaptics, PATRONES_HAPTICOS } from './useHaptics.js';

// Sonido ambiental 0-KB (three-free, spec S3): paletas sonoras por mundo
// sintetizadas con WebAudio — sin assets. Opt-in (default OFF), solo tras
// gesto del usuario; bajo reduced-motion queda el lecho estático, sin eventos.
export {
  default as useAudioMundo, PALETAS_SONORAS, activarAudioPorGesto, soportaAudio,
} from './useAudioMundo.js';

// Espejo vivo del dato real (three-free, auditoría §5b): arma el `estadoFinca`
// REAL (salud, clima, ENSO, cosecha reciente, hato) desde los servicios
// anti-fabricación que ya existen. El host <Mundo> lo cose solo; se exporta para
// quien quiera pasar `estadoFinca` a mano.
export { default as useFincaViva } from './useFincaViva.js';

// Invitación de PRIMER USO del sonido (three-free): ya vive dentro del host
// <Mundo> (app y vitrinas por igual); se exporta por si un mockup la monta suelta.
export { default as InvitacionAudioMundo } from './InvitacionAudioMundo.jsx';
