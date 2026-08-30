import { useMemo } from 'react';
import {
  perfilDeEspecie,
} from './compaiEspecies.js';
import {
  ariaDeEstado,
  estadoCanonico,
  nivelDeConfianza,
} from './angelitaEstados.js';
import './compai-agente.css';

const ESTADO_LOCOMOTOR = 'caminando';

function prefiereQuietud() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function estadoVisible(estado) {
  return estado === ESTADO_LOCOMOTOR ? ESTADO_LOCOMOTOR : estadoCanonico(estado);
}

function valorClima(clima) {
  if (typeof clima === 'string') return clima;
  if (clima && typeof clima === 'object') return clima.estado || clima.tipo || undefined;
  return undefined;
}

function atributosDeCapacidades(capacidades) {
  return Object.fromEntries(Object.entries(capacidades).map(([nombre, capacidad]) => [
    `data-agt-capacidad-${nombre}`,
    capacidad.estrategia,
  ]));
}

/**
 * Capa visual común de un compañero.
 *
 * El cuerpo sigue siendo responsabilidad del adaptador que recibe `perfil`,
 * `estado` y `pose`. Esta capa solo resuelve el contrato transversal y monta
 * el chrome que puede acompañar a cualquier rig, sin conocer su arte.
 */
export function CompaiAgente({
  especie = 'angelita',
  estado = 'acompana',
  visema = null,
  confianza = null,
  clima = null,
  enso = 'neutro',
  direccion = 'derecha',
  animated = true,
  reducedMotion = false,
  tier = undefined,
  adaptador = undefined,
  Adaptador: AdaptadorProp = undefined,
  adapter = undefined,
  chrome = true,
  preserveRigAnimation = false,
  children = null,
  className = '',
  style = undefined,
  title = undefined,
  ...rest
}) {
  const perfil = useMemo(() => perfilDeEspecie(especie), [especie]);
  const estadoResuelto = estadoVisible(estado);
  const pose = perfil.posePorEstado[estadoResuelto] || perfil.posePorEstado.acompana;
  const climaResuelto = valorClima(clima);
  const nivelConfianza = nivelDeConfianza(confianza);
  const quieto = Boolean(reducedMotion) || prefiereQuietud();
  const animado = Boolean(animated) && !quieto;
  const aria = title || (estadoResuelto === ESTADO_LOCOMOTOR
    ? `${perfil.nombreAccesible} caminando`
    : ariaDeEstado(estadoResuelto, perfil.nombreAccesible));
  const Adaptador = adaptador || AdaptadorProp || adapter;
  const variables = perfil.variables;
  const atributosCapacidad = atributosDeCapacidades(perfil.capacidades);

  const propsDelAdaptador = {
    ...rest,
    especie: perfil.avatarType,
    creatureSlug: perfil.creatureSlug,
    estado: estadoResuelto,
    pose,
    visema,
    confianza,
    clima,
    enso,
    direccion,
    animated: preserveRigAnimation ? Boolean(animated) : animado,
    reducedMotion: quieto,
    tier,
    capacidades: perfil.capacidades,
    perfil,
    idlePerfil: perfil.idlePerfil,
    climaPerfil: perfil.climaPerfil,
    title,
    className,
    style,
    'data-creature': perfil.creatureSlug,
    'data-agt-especie': perfil.avatarType,
    'data-agt-estado': estadoResuelto,
    'data-pose': pose,
    'data-visema': visema || undefined,
    'data-clima': climaResuelto,
    'data-tier': tier || undefined,
  };

  const cuerpo = Adaptador ? <Adaptador {...propsDelAdaptador} /> : children;

  if (!chrome) return cuerpo;

  return (
    <span
      className={`compai-agente ${className}`.trim()}
      style={{ ...variables, ...style }}
      role="group"
      aria-label={aria}
      data-agt-especie={perfil.avatarType}
      data-agt-creature={perfil.creatureSlug}
      data-agt-medio={perfil.medio}
      data-agt-estado={estadoResuelto}
      data-agt-pose={pose}
      data-agt-visema={visema || undefined}
      data-agt-confianza={nivelConfianza || undefined}
      data-agt-clima={climaResuelto}
      data-agt-enso={enso || undefined}
      data-agt-direccion={direccion || undefined}
      data-agt-animado={animado ? '1' : '0'}
      data-agt-reduced-motion={quieto ? '1' : undefined}
      data-agt-loop={animado && tier !== 'bajo' ? '1' : '0'}
      data-agt-tier={tier || undefined}
      {...atributosCapacidad}
    >
      <span className="compai-agente__chrome" aria-hidden="true">
        <span className="compai-agente__halo compai-agente__loop" data-agt-chrome="confianza" />
        <span className="compai-agente__feedback compai-agente__escucha" data-agt-chrome="escucha" />
        <span className="compai-agente__feedback compai-agente__respuesta" data-agt-chrome="respuesta" />
        <span className="compai-agente__feedback compai-agente__pensamiento" data-agt-chrome="pensamiento" />
        <span className="compai-agente__feedback compai-agente__alerta" data-agt-chrome="alerta" />
        <span className="compai-agente__feedback compai-agente__guia" data-agt-chrome="guia" />
        <span className="compai-agente__feedback compai-agente__visema" data-agt-chrome="visema" />
        <span className="compai-agente__feedback compai-agente__clima" data-agt-chrome="clima" />
      </span>
      <span className="compai-agente__cuerpo">
        {cuerpo}
      </span>
    </span>
  );
}

export default CompaiAgente;
