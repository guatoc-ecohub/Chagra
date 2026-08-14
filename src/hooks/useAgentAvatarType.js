import { useEffect, useState, useCallback } from 'react';
import { LLAVE_COMPANERO, LLAVES_HEREDADAS, leerCompanero, escribirCompanero } from '../compai/nucleo/elenco.js';

const STORAGE_KEY = 'chagra:agent-avatar-type';

// Las llaves que un evento 'storage' de OTRA pestaña puede tocar y que nos
// interesan: la canónica (#96, compai/nucleo/elenco.js) y la vieja de este
// mismo stack. 'guatoc.guia' también dispara refresco — es la del otro lado
// (3d.guatoc.co) — así una elección allá se refleja aquí sin recargar.
const LLAVES_RELEVANTES = new Set([LLAVE_COMPANERO, STORAGE_KEY, ...LLAVES_HEREDADAS]);

// 'angelita' = Angelita, la abeja angelita (Tetragonisca angustula). ES el
// agente de Chagra desde 2026-07-16 ("Angelita como el agente, jubila el
// colibrí" — operador; 2026-07-18: el colibrí sale también de las opciones —
// "solo abejita"). El colibrí queda de fauna decorativa en los mundos 3D,
// nunca como cara del agente.
//
// 'zariguya' = la zarigüeya (crías al lomo), 3ra opción (2026-07-25, tras el
// merge de `art(creatures): la zarigüeya entra al elenco — con las crías al
// lomo (#2783)`). Adaptador en ChagraAgentAvatarZariguya.jsx.
//
// 'jaguar', 'oso-baston', 'luciernaga' = elenco unificado (ítem #8 del GAP
// compAI, 2026-08-13): los tres ya tenían cuerpo 2.5D dibujado y ya estaban
// marcados `enPWA:true` en `compai/nucleo/elenco.js` (#96) desde el
// 2026-08-11, pero ningún selector los ofrecía — bug encontrado en la
// re-auditoría del GAP. Adaptadores en ChagraAgentAvatarJaguar.jsx,
// ChagraAgentAvatarOsoBaston.jsx, ChagraAgentAvatarLuciernaga.jsx.
//
// 'chivito-punk' = el chivito de páramo (roster-7, 2026-08-14). Reusa el rig
// F24 del valle (`visual/creatures/arte-valle/`, ver ChivitoPunk.jsx — NO
// `Chivito.jsx`, el billboard decorativo de FaunaCalido.jsx) — no se
// redibujó a mano. Adaptador en ChagraAgentAvatarChivitoPunk.jsx.
//
// 'dante', 'oliver' = roster-8 (2026-08-14). Aún sin arte propio (es de Fable,
// hoy en hold del operador) — entran con `pendienteFable:true` y caen a Angelita
// por el fallback de CompaiTransicion.jsx. Los adaptadores
// ChagraAgentAvatarDante.jsx y ChagraAgentAvatarOliver.jsx NO existen aún — se
// crearán cuando Fable complete sus diseños.
//
// 'guacamaya' SE RETIRÓ del roster el 2026-08-14 (decisión del operador): sigue
// existiendo como slug jubilado (compai/nucleo/elenco.js SLUGS_JUBILADOS,
// migra solo a 'angelita') para que ningún usuario con guacamaya guardado en
// localStorage se quede en un estado inválido, pero ya no es una opción
// elegible aquí ni en AgentAvatarSelector.jsx.
//
// 'maiz' SE RETIRÓ del roster el 2026-08-14 (decisión del operador): sigue
// existiendo como slug jubilado (compai/nucleo/elenco.js SLUGS_JUBILADOS,
// migra solo a 'angelita') para que ningún usuario con maiz guardado en
// localStorage se quede en un estado inválido, pero ya no es una opción
// elegible aquí ni en AgentAvatarSelector.jsx.
export const AVATAR_TYPES = ['angelita', 'zariguya', 'jaguar', 'oso-baston', 'luciernaga', 'chivito-punk', 'dante', 'oliver'];
export const DEFAULT_AVATAR_TYPE = 'angelita';

// Nombre propio para copy que necesita NOMBRAR al compAI elegido (ej. "hábletele
// a X", el rótulo visible de la transición home→conversación). Los ariaLabel
// genéricos de los avatares siguen diciendo "Chagra IA" (convención ya usada
// en WelcomeStatsHero, ChatBubble, AgentHero, InsightProactivoCard, etc.) —
// este mapa es SOLO para los pocos textos que sí necesitan el nombre propio.
export const AVATAR_NOMBRE = {
    angelita: 'Angelita',
    zariguya: 'su zarigüeya',
    jaguar: 'el jaguar',
    'oso-baston': 'el oso de anteojos',
    luciernaga: 'la luciérnaga',
    'chivito-punk': 'el chivito',
    dante: 'Dante',
    oliver: 'Oliver',
};

// Slugs históricos guardados en localStorage de instalaciones viejas:
// ambos colibríes y guacamaya migran a Angelita sin que el usuario haga nada.
const LEGACY_TYPES = { colibri: 'angelita', colibri_svg: 'angelita', guacamaya: 'angelita' };

/**
 * Lee la preferencia con la MISMA precedencia que el núcleo compai (#96: una
 * sola llave canónica cruzando PWA y 3d.guatoc.co) — pero acotada a los seis
 * avatares que hoy tienen cuerpo dibujado en esta PWA (`AVATAR_TYPES`). Si el
 * núcleo devuelve un guía sin arte aquí todavía (dante, oliver), esta
 * PWA cae al default — el otro stack sigue mostrando la elección real.
 */
function readPref() {
    try {
        const canonico = leerCompanero();
        if (canonico && AVATAR_TYPES.includes(canonico)) return canonico;
        // Compatibilidad con instalaciones que sólo tienen la llave vieja de
        // este stack con un slug que el núcleo todavía no conoce (LEGACY_TYPES).
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw && LEGACY_TYPES[raw]) return LEGACY_TYPES[raw];
    } catch {
        // private mode / quota → fallback
    }
    return DEFAULT_AVATAR_TYPE;
}

/**
 * Hook que gestiona el tipo de avatar del agente. Lee la preferencia desde
 * la llave canónica del compañero (compai/nucleo/elenco.js, #96) y permite
 * actualizarla con sincronización entre pestañas mediante eventos 'storage'
 * y 'chagra:agent-avatar-changed'.
 *
 * @returns {[string, Function]} Tupla con [0] tipo de avatar actual, [1] función para actualizarlo (updateType).
 */
export default function useAgentAvatarType() {
    const [type, setType] = useState(readPref);

    useEffect(() => {
        function onStorage(e) {
            if (e.key && LLAVES_RELEVANTES.has(e.key)) setType(readPref());
        }
        function onCustom(e) {
            if (e.detail && AVATAR_TYPES.includes(e.detail)) setType(e.detail);
        }
        window.addEventListener('storage', onStorage);
        window.addEventListener('chagra:agent-avatar-changed', onCustom);
        return () => {
            window.removeEventListener('storage', onStorage);
            window.removeEventListener('chagra:agent-avatar-changed', onCustom);
        };
    }, []);

    const updateType = useCallback((next) => {
        if (!AVATAR_TYPES.includes(next)) return;
        // escribirCompanero deja la llave canónica Y las dos heredadas
        // (incluida STORAGE_KEY) en el mismo valor — así 3d.guatoc.co recibe
        // el cambio sin que esta PWA sepa que ese stack existe.
        escribirCompanero(next);
        setType(next);
        window.dispatchEvent(
            new CustomEvent('chagra:agent-avatar-changed', { detail: next }),
        );
    }, []);

    return [type, updateType];
}
