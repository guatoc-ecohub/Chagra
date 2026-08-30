import ChagraAgentAvatarAngelita from './ChagraAgentAvatarAngelita';
import ChagraAgentAvatarZariguya from './ChagraAgentAvatarZariguya';
import ChagraAgentAvatarJaguar from './ChagraAgentAvatarJaguar';
import ChagraAgentAvatarOsoBaston from './ChagraAgentAvatarOsoBaston';
import ChagraAgentAvatarLuciernaga from './ChagraAgentAvatarLuciernaga';
import ChagraAgentAvatarGuacamaya from './ChagraAgentAvatarGuacamaya';
import ChagraAgentAvatarChivitoPunk from './ChagraAgentAvatarChivitoPunk';
import useAgentAvatarType from '../hooks/useAgentAvatarType.js';
import CompaiAgente from '../visual/agente/CompaiAgente.jsx';
import {
    ESPECIE_COMPAI_DEFECTO,
    COMPAI_ESPECIES,
    obtenerEspecieCompai,
} from '../visual/agente/compaiEspecies.js';
import { estadoCanonico } from '../visual/agente/angelitaEstados.js';

/**
 * ChagraAgentAvatar — wrapper que delega según preferencia del usuario
 * (localStorage `chagra:agent-avatar-type`). Drop-in compatible — todos
 * los call-sites siguen usando `<ChagraAgentAvatar .../>` sin cambios.
 *
 * Decisiones del operador:
 *   - 2026-05-27: usuario debe poder elegir avatar.
 *   - 2026-07-16: "Angelita como el agente, jubila el colibrí". La cara del
 *     agente pasa a ser Angelita (la abeja angelita, con idle-cerebro, mirada
 *     y lip-sync).
 *   - 2026-07-18: el colibrí sale TAMBIÉN de las opciones ("solo abejita").
 *     Los slugs viejos 'colibri'/'colibri_svg' migran a Angelita en el hook,
 *     sin acción del usuario. El colibrí queda de fauna decorativa en los
 *     mundos 3D — nunca como cara del agente.
 *
 * UI de cambio vive en ProfileScreen → Apariencia → Avatar del agente.
 *
 * Mismas props que los avatares hijos: state, size, withLabel, onClick,
 * onDoubleClick, glow, className, ariaLabel (+ visema/confianza que
 * Angelita entiende y el resto ignora).
 *
 * API "rica": `estado` conserva el vocabulario completo de
 * `angelitaEstados.js` para cualquier especie. Los adaptadores de los siete
 * compai reciben el mismo contrato, y cada cuerpo decide cómo representar la
 * actuación sin que este dispatcher la reduzca a cuatro estados.
 *
 * 3ra opción (2026-07-25): 'zariguya' — la zarigüeya (crías al lomo, PR
 * #2783), adaptador en ChagraAgentAvatarZariguya.jsx.
 *
 * 4ta-6ta opción (2026-08-13, ítem #8 del GAP compAI — elenco unificado):
 * 'jaguar', 'oso-baston', 'luciernaga' — ya tenían cuerpo 2.5D y ya estaban
 * `enPWA:true` en el núcleo (#96) pero ningún selector los ofrecía.
 *
 * ROSTER A 7 (2026-08-14, decisión del operador): 'maiz' SE RETIRÓ (migra
 * solo a Angelita, ver `compai/nucleo/elenco.js` SLUGS_JUBILADOS) y entraron
 * los últimos dos, 'guacamaya' y 'chivito-punk' — reusan el rig F24 del
 * valle (`visual/creatures/GuacamayaCompai.jsx`/`ChivitoPunk.jsx`, NO
 * `Guacamaya.jsx` — ese ya existía como billboard decorativo de
 * FaunaCalido.jsx), no se redibujaron a mano. Los 7: angelita, jaguar,
 * oso-baston, zariguya, luciernaga, chivito-punk, guacamaya.
 *
 * El registro visual común (`COMPAI_ESPECIES`) es la única fuente para saber
 * qué perfil está activo. Un slug inválido usa el perfil seguro de Angelita;
 * los siete slugs registrados tienen adaptador y no tienen fallback propio.
 */
const ADAPTADOR_POR_ESPECIE = {
    angelita: ChagraAgentAvatarAngelita,
    zariguya: ChagraAgentAvatarZariguya,
    jaguar: ChagraAgentAvatarJaguar,
    'oso-baston': ChagraAgentAvatarOsoBaston,
    luciernaga: ChagraAgentAvatarLuciernaga,
    guacamaya: ChagraAgentAvatarGuacamaya,
    'chivito-punk': ChagraAgentAvatarChivitoPunk,
};

const STATE_DE_ESTADO_RICO = Object.freeze({
    acompana: 'idle',
    escuchando: 'listening',
    pensando: 'thinking',
    respondiendo: 'speaking',
    contenta: 'speaking',
    preocupada: 'listening',
    'no-se': 'thinking',
    senala: 'thinking',
    invita: 'speaking',
    husmea: 'thinking',
    caminando: 'caminando',
});

const ESTADO_RICO_DE_STATE = Object.freeze({
    idle: 'acompana',
    listening: 'escuchando',
    // eslint-disable-next-line chagra-i18n/no-hardcoded-spanish
    thinking: 'pensando',
    // eslint-disable-next-line chagra-i18n/no-hardcoded-spanish
    speaking: 'respondiendo',
    caminando: 'caminando',
});

const faltante = Object.keys(COMPAI_ESPECIES).find((especie) => !ADAPTADOR_POR_ESPECIE[especie]);
if (faltante) {
    throw new Error(`Dispatcher compai sin adaptador registrado: ${faltante}`);
}

function estadoRicoDeEntrada(estado, state) {
    if (estado !== undefined) {
        // `estadoCanonico` no conoce locomoción conversacional: conservarla
        // aquí evita que caminando vuelva silenciosamente a acompana.
        return estado === 'caminando' ? 'caminando' : estadoCanonico(estado);
    }
    return ESTADO_RICO_DE_STATE[state] || 'acompana';
}

/** Resuelve el perfil y el adaptador exclusivamente desde el slug elegido. */
function resolverAvatarCompai(especie) {
    const perfil = obtenerEspecieCompai(especie) || ESPECIE_COMPAI_DEFECTO;
    return {
        perfil,
        Adaptador: ADAPTADOR_POR_ESPECIE[perfil.avatarType],
    };
}

export default function ChagraAgentAvatar({ estado = undefined, state = undefined, ...props }) {
    const [type] = useAgentAvatarType();
    const { perfil, Adaptador } = resolverAvatarCompai(type);
    const estadoEntrada = estadoRicoDeEntrada(estado, state);
    const stateEntrada = STATE_DE_ESTADO_RICO[estadoEntrada] || state;

    return (
        <CompaiAgente
            {...props}
            especie={perfil.avatarType}
            estado={estadoEntrada}
            state={stateEntrada}
            chrome={false}
            adaptador={Adaptador}
        />
    );
}
