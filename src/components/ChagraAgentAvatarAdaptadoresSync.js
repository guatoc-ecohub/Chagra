/*
 * Mapa SÍNCRONO de adaptadores — SOLO dev/test (gate 087).
 *
 * POR QUÉ existe este archivo: el dispatcher (`ChagraAgentAvatar.jsx`) tiene
 * dos mapas — PROD (`React.lazy` por especie: solo se paga el rig del avatar
 * elegido) y DEV (síncrono, para que tests/jsdom inspeccionen el SVG en el
 * mismo tick). Mientras los imports estáticos del mapa DEV vivieron EN el
 * dispatcher, el bundler no podía podarlos en prod (el package.json no declara
 * `sideEffects` y la cadena trae CSS + payloads SVG top-level): los 7 rigs de
 * tinta (~3 MB) terminaban en el grafo de arranque aunque el mapa no se usara.
 *
 * Ahora el dispatcher solo referencia ESTE módulo desde una rama muerta en
 * prod (`if (!import.meta.env.PROD) await import(...)`): la rama se elimina
 * en build y con ella la única referencia estática a los adaptadores. En
 * dev/test el top-level await resuelve antes de que monte la app, así que el
 * contrato síncrono de los tests NO cambia.
 */
import ChagraAgentAvatarAngelita from './ChagraAgentAvatarAngelita';
import ChagraAgentAvatarZariguya from './ChagraAgentAvatarZariguya';
import ChagraAgentAvatarJaguar from './ChagraAgentAvatarJaguar';
import ChagraAgentAvatarOsoBaston from './ChagraAgentAvatarOsoBaston';
import ChagraAgentAvatarLuciernaga from './ChagraAgentAvatarLuciernaga';
import ChagraAgentAvatarGuacamaya from './ChagraAgentAvatarGuacamaya';
import ChagraAgentAvatarChivitoPunk from './ChagraAgentAvatarChivitoPunk';

/* Mismas claves que COMPAI_ESPECIES → ADAPTADORES_PROD (ver dispatcher). */
export const ADAPTADORES_SYNC = Object.freeze({
    angelita: ChagraAgentAvatarAngelita,
    zariguya: ChagraAgentAvatarZariguya,
    jaguar: ChagraAgentAvatarJaguar,
    'oso-baston': ChagraAgentAvatarOsoBaston,
    luciernaga: ChagraAgentAvatarLuciernaga,
    guacamaya: ChagraAgentAvatarGuacamaya,
    'chivito-punk': ChagraAgentAvatarChivitoPunk,
});
