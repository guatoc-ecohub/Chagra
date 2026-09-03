import { lazy, Suspense } from 'react';
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
/* Los adaptadores 2D conservan el contrato síncrono en tests/dev, donde los
   callers históricos inspeccionan el SVG en el mismo tick. En producción se
   cargan después del shell y cada rig queda fuera del chunk de arranque. */
const ADAPTADORES_PROD = {
    angelita: lazy(() => import('./ChagraAgentAvatarAngelita.jsx')),
    zariguya: lazy(() => import('./ChagraAgentAvatarZariguya.jsx')),
    jaguar: lazy(() => import('./ChagraAgentAvatarJaguar.jsx')),
    'oso-baston': lazy(() => import('./ChagraAgentAvatarOsoBaston.jsx')),
    luciernaga: lazy(() => import('./ChagraAgentAvatarLuciernaga.jsx')),
    guacamaya: lazy(() => import('./ChagraAgentAvatarGuacamaya.jsx')),
    'chivito-punk': lazy(() => import('./ChagraAgentAvatarChivitoPunk.jsx')),
};

/* Gate 087 — el mapa DEV síncrono vive en su PROPIO módulo y solo se alcanza
   por esta rama, muerta en build de prod (`import.meta.env.PROD` se resuelve
   a `true` → rolldown elimina la rama y su dynamic import). Antes los
   imports estáticos de ese mapa vivían aquí mismo y el bundler no podía
   podarlos (sin `sideEffects` en package.json, la cadena arrastra CSS y
   payloads SVG top-level), con lo que los 7 rigs de tinta (~3 MB) caían al
   grafo de arranque aunque esta rama nunca corriera en prod. En dev/test el
   top-level await resuelve antes de montar la app: el contrato síncrono de
   los tests no cambia. Evidencia: _gate/087/INFORME-087.md. */
let ADAPTADORES_DEV = null;
if (!import.meta.env.PROD) {
    const { ADAPTADORES_SYNC } = await import('./ChagraAgentAvatarAdaptadoresSync.js');
    ADAPTADORES_DEV = ADAPTADORES_SYNC;
}

const ADAPTADOR_POR_ESPECIE = import.meta.env.PROD ? ADAPTADORES_PROD : ADAPTADORES_DEV;

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
        <Suspense fallback={<span role="img" aria-label="Compañero cargando" data-agt-especie={perfil.avatarType} />}>
            <CompaiAgente
                {...props}
                especie={perfil.avatarType}
                estado={estadoEntrada}
                state={stateEntrada}
                chrome={false}
                adaptador={Adaptador}
            />
        </Suspense>
    );
}
