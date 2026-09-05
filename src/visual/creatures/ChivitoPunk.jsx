/*
 * ChivitoPunk — el chivito de páramo (Oxypogon guerinii) como CUERPO reusado
 * del rig F24 del valle (`~/demos/3d/compai/rigs/chivito.*`), NO redibujado a
 * mano. Mismo criterio y mismas garantías que `GuacamayaCompai.jsx` — leer
 * ese archivo para el detalle completo del enfoque (namespacing de ids,
 * recorte del CSS de página → CSS de rig, limitación de `:host` en light DOM).
 *
 * El slug canónico es `chivito-punk` (colapso `chivito`→`chivito-punk` ya
 * resuelto en `compai/nucleo/elenco.js`, #96) — el rig trae DOS crestas
 * (`#crestaNormal`/`#crestaPunk`) que el CSS original alterna por
 * `:host([data-estado="hablar"])`; en light DOM (sin Shadow DOM) esa regla no
 * aplica todavía, así que por ahora se ve siempre con la cresta normal en
 * reposo — igual que documenta la nota del operador en `elenco.js`: "un solo
 * rig", la cresta punk es el gesto de hablar, no una especie aparte.
 *
 * El CSS llega vía `chivitoCssTexto.js` (snapshot JS de `arte-valle/chivito.css`,
 * copia verbatim del valle), NO `?raw` directo sobre el `.css` — vitest corre
 * con `css:false` (vitest.config.js) e intercepta cualquier import `.css*`
 * (incluido con query `?raw`) devolviendo un módulo vacío solo en tests; ver
 * la nota en `chivitoCssTexto.js`.
 */
import { useId, useMemo } from 'react';
import rigSvg from './arte-valle/chivito.rig.svg?raw';
import defsSvg from './arte-valle/chivito.defs.svg?raw';
import cssCompleto from './arte-valle/chivitoCssTexto.js';
import { idsDeclaradosEnSvg, namespaceSvg, namespaceCss, extraerCssDelRig, hostALigero } from './arte-valle/nsRigValle.js';
import { CHIVITO_SLUG, CHIVITO_NOMBRE } from './chivitoIdentidad.js';
import { CompaiAgente } from '../agente/CompaiAgente.jsx';
import { COMPAI_ESPECIES } from '../agente/compaiEspecies.js';

const MARCADOR_CSS = 'CHIVITO — rig rubber-hose';
const CSS_RIG = `${hostALigero(extraerCssDelRig(cssCompleto, MARCADOR_CSS))}
[data-quieto] *{animation:none!important;transition:none!important}`;
const MARCADO_CRUDO = `${defsSvg}\n${rigSvg}`;
const IDS = idsDeclaradosEnSvg(MARCADO_CRUDO);

/* Bounding box estimada por inspección de coordenadas (no medida con
   navegador real — ver la misma nota en GuacamayaCompai.jsx). El chivito es
   un colibrí, cuerpo más compacto que la guacamaya. */
const VIEWBOX = '-260 -260 520 520';

const ESTADO_DE_STATE = {
  idle: 'acompana',
  // eslint-disable-next-line chagra-i18n/no-hardcoded-spanish
  thinking: 'pensando',
  // eslint-disable-next-line chagra-i18n/no-hardcoded-spanish
  speaking: 'respondiendo',
  listening: 'escuchando',
  caminando: 'caminando',
};

const ESTADO_RIG_DE_ESTADO = {
  acompana: 'idle',
  escuchando: 'idle',
  pensando: 'tejer',
  respondiendo: 'hablar',
  contenta: 'libar',
  preocupada: 'idle',
  'no-se': 'tejer',
  senala: 'senalar',
  invita: 'libar',
  husmea: 'libar',
  caminando: 'idle',
};

const CHIVITO_PERFIL = COMPAI_ESPECIES['chivito-punk'];

/**
 * ChivitoPunk — cuerpo 2.5D. Mismas props base que las demás `creatures/`.
 */
function ChivitoPunkRig({
  state = 'idle',
  estado = 'acompana',
  pose = 'vuela',
  visema = null,
  size = 64,
  animated = true,
  reducedMotion = false,
  tier = undefined,
  clima = null,
  className = '',
  style = undefined,
  title = CHIVITO_NOMBRE,
  ...rest
}) {
  const sufijo = useId().replace(/[:]/g, '');
  const marcado = useMemo(() => namespaceSvg(MARCADO_CRUDO, IDS, sufijo), [sufijo]);
  const css = useMemo(() => namespaceCss(CSS_RIG, IDS, sufijo), [sufijo]);
  const estadoRig = ESTADO_RIG_DE_ESTADO[estado] || ESTADO_DE_STATE[state] || 'idle';
  const quieto = !animated || reducedMotion;
  const climaEstado = typeof clima === 'string' ? clima : clima?.estado || clima?.tipo;

  return (
    <svg
      viewBox={VIEWBOX}
      width={size}
      height={size}
      className={className}
      style={style}
      role="img"
      aria-label={title}
      data-creature={CHIVITO_SLUG}
      data-estado={estadoRig}
      data-agt-estado={estado}
      data-pose={pose}
      data-visema={visema || undefined}
      data-clima={climaEstado || undefined}
      data-tier={tier || undefined}
      {...(quieto ? { 'data-quieto': '' } : null)}
      {...rest}
    >
      <title>{title}</title>
      {css && <style>{css}</style>}
      {/* rig reusado del valle (F24), no redibujado — ver nota de arriba */}
      <g dangerouslySetInnerHTML={{ __html: marcado }} />
    </svg>
  );
}

function AdaptadorChivitoPunk({
  especie: _especie,
  creatureSlug: _creatureSlug,
  capacidades: _capacidades,
  perfil: _perfil,
  idlePerfil: _idlePerfil,
  climaPerfil: _climaPerfil,
  pose,
  estadoLegado = undefined,
  reducedMotion,
  'data-agt-especie': dataEspecie,
  'data-creature': dataCreature,
  'data-agt-estado': dataEstado,
  'data-pose': dataPose,
  'data-visema': dataVisema,
  'data-clima': dataClima,
  'data-tier': dataTier,
  ...props
}) {
  const estadoActual = estadoLegado || dataEstado || 'acompana';
  return (
    <ChivitoPunkRig
      {...props}
      estado={estadoActual}
      pose={pose}
      reducedMotion={reducedMotion}
      data-agt-especie={dataEspecie}
      data-creature={dataCreature}
      data-agt-estado={estadoActual}
      data-pose={dataPose || pose}
      data-visema={dataVisema}
      data-clima={dataClima}
      data-tier={dataTier}
    />
  );
}

/** Fachada compatible del chivito sobre el contrato común Compai. */
export function ChivitoPunk({
  state = 'idle',
  estado = undefined,
  visema = null,
  ...props
}) {
  const estadoEntrada = estado || ESTADO_DE_STATE[state] || 'acompana';
  const visemaEntrada = visema ?? (state === 'speaking' ? 'V2' : null);
  return (
    <CompaiAgente
      {...props}
      estado={estadoEntrada}
      estadoLegado={estadoEntrada}
      visema={visemaEntrada}
      especie={CHIVITO_PERFIL.avatarType}
      chrome={false}
      preserveRigAnimation
      adaptador={AdaptadorChivitoPunk}
    />
  );
}

export { ChivitoPunkRig };
export default ChivitoPunk;
