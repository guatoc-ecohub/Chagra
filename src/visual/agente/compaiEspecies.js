/*
 * Registro base de los compai elegibles.
 *
 * Este módulo es deliberadamente aburrido: solo describe contratos. No
 * importa React, Three ni un rig concreto. La capa visual común y los
 * adaptadores leen estos datos para que el roster, las poses y las
 * capacidades no se vuelvan otra colección de decisiones dispersas.
 */
import { ELENCO, TAMANO_CANONICO } from '../../compai/nucleo/elenco.js';
import {
  ESTADOS_DE_PERFIL,
  POSE_DE_ESTADO,
  validarPerfilDeEstados,
} from './angelitaEstados.js';
import { PERFILES as PERFILES_CLIMA } from '../creatures/creatureClimaCuerpo.js';
import { IDLE_PERFILES } from '../creatures/creatureIdle.js';

const congelar = (valor) => {
  if (!valor || typeof valor !== 'object' || Object.isFrozen(valor)) return valor;
  Object.values(valor).forEach(congelar);
  return Object.freeze(valor);
};

const capacidad = (estrategia, detalle = {}) => ({ estrategia, ...detalle });

const POSES_AIRE = {
  ...POSE_DE_ESTADO,
  caminando: 'vuela',
};

const POSES_SUELO = {
  ...POSE_DE_ESTADO,
  acompana: 'anda',
  pensando: 'anda',
  respondiendo: 'anda',
  preocupada: 'anda',
  'no-se': 'anda',
  invita: 'anda',
  husmea: 'anda',
  caminando: 'camina',
};

/*
 * Las coordenadas son anclas normalizadas del montaje, no coordenadas del
 * dibujo. El chrome las convierte a porcentajes y cada rig conserva su arte.
 */
const ANCLAS = {
  aire: {
    cara: { x: 0.68, y: 0.35 },
    boca: { x: 0.73, y: 0.43 },
    poi: { x: 0.84, y: 0.73 },
    escala: 1,
  },
  suelo: {
    cara: { x: 0.66, y: 0.32 },
    boca: { x: 0.7, y: 0.42 },
    poi: { x: 0.84, y: 0.75 },
    escala: 1,
  },
};

const VARIABLES_CHROME = (medio) => ({
  '--agt-cara-x': `${ANCLAS[medio].cara.x * 100}%`,
  '--agt-cara-y': `${ANCLAS[medio].cara.y * 100}%`,
  '--agt-boca-x': `${ANCLAS[medio].boca.x * 100}%`,
  '--agt-boca-y': `${ANCLAS[medio].boca.y * 100}%`,
  '--agt-poi-x': `${ANCLAS[medio].poi.x * 100}%`,
  '--agt-poi-y': `${ANCLAS[medio].poi.y * 100}%`,
  '--agt-escala': String(ANCLAS[medio].escala),
});

const DEFINICIONES = {
  angelita: {
    creatureSlug: 'abeja-angelita',
    medio: 'aire',
    capacidades: {
      cara: capacidad('native'),
      visema: capacidad('native'),
      clima: capacidad('native'),
      guia: capacidad('overlay'),
      entrada: capacidad('native'),
      marcha: capacidad('vuela'),
    },
  },
  jaguar: {
    creatureSlug: 'jaguar',
    medio: 'suelo',
    capacidades: {
      cara: capacidad('native'),
      visema: capacidad('native'),
      clima: capacidad('overlay'),
      guia: capacidad('overlay'),
      entrada: capacidad('native'),
      marcha: capacidad('camina'),
    },
  },
  'oso-baston': {
    creatureSlug: 'oso-baston',
    medio: 'suelo',
    capacidades: {
      cara: capacidad('native'),
      visema: capacidad('native'),
      clima: capacidad('native'),
      guia: capacidad('overlay'),
      entrada: capacidad('native'),
      marcha: capacidad('camina'),
    },
  },
  zariguya: {
    creatureSlug: 'zariguya',
    medio: 'suelo',
    capacidades: {
      cara: capacidad('native'),
      visema: capacidad('native'),
      clima: capacidad('overlay'),
      guia: capacidad('overlay'),
      entrada: capacidad('native'),
      marcha: capacidad('camina'),
    },
  },
  luciernaga: {
    creatureSlug: 'luciernaga',
    medio: 'aire',
    capacidades: {
      cara: capacidad('native'),
      visema: capacidad('native'),
      clima: capacidad('native'),
      guia: capacidad('overlay'),
      entrada: capacidad('native'),
      marcha: capacidad('vuela'),
    },
  },
  'chivito-punk': {
    creatureSlug: 'chivito-punk',
    medio: 'aire',
    capacidades: {
      cara: capacidad('native'),
      visema: capacidad('native'),
      clima: capacidad('overlay'),
      guia: capacidad('overlay'),
      entrada: capacidad('native'),
      marcha: capacidad('vuela'),
    },
  },
  guacamaya: {
    creatureSlug: 'guacamaya',
    medio: 'aire',
    capacidades: {
      cara: capacidad('native'),
      visema: capacidad('native'),
      clima: capacidad('overlay'),
      guia: capacidad('overlay'),
      entrada: capacidad('native'),
      marcha: capacidad('vuela'),
    },
  },
};

const rosterPwa = Object.entries(ELENCO)
  .filter(([, ficha]) => ficha.enPWA)
  .map(([avatarType]) => avatarType);

const faltanteEnRegistro = rosterPwa.find((avatarType) => !DEFINICIONES[avatarType]);
const entradaFueraDeRoster = Object.keys(DEFINICIONES)
  .find((avatarType) => !rosterPwa.includes(avatarType));

if (faltanteEnRegistro || entradaFueraDeRoster) {
  throw new Error(
    `Registro compai desalineado: ${faltanteEnRegistro || entradaFueraDeRoster}`,
  );
}

const crearEntrada = (avatarType) => {
  const base = DEFINICIONES[avatarType];
  const ficha = ELENCO[avatarType];
  const poses = base.medio === 'aire' ? POSES_AIRE : POSES_SUELO;
  const anclas = ANCLAS[base.medio];

  validarPerfilDeEstados(poses, base.creatureSlug);
  if (!IDLE_PERFILES[base.creatureSlug]) {
    // eslint-disable-next-line chagra-i18n/no-hardcoded-spanish
    throw new Error(`Perfil idle inexistente para ${base.creatureSlug}`);
  }
  if (!PERFILES_CLIMA[base.creatureSlug]) {
    // eslint-disable-next-line chagra-i18n/no-hardcoded-spanish
    throw new Error(`Perfil clima inexistente para ${base.creatureSlug}`);
  }

  return congelar({
    avatarType,
    creatureSlug: base.creatureSlug,
    nombre: ficha.nombre,
    nombreAccesible: ficha.nombre,
    medio: base.medio,
    posePorEstado: { ...poses },
    capacidades: base.capacidades,
    anclas: { ...anclas },
    variables: VARIABLES_CHROME(base.medio),
    tamano: TAMANO_CANONICO,
    idlePerfil: base.creatureSlug,
    climaPerfil: base.creatureSlug,
  });
};

const REGISTRO = Object.fromEntries(rosterPwa.map((avatarType) => [
  avatarType,
  crearEntrada(avatarType),
]));

export const AVATAR_TYPES_PWA = Object.freeze([...rosterPwa]);
export const COMPAI_ESPECIES = congelar(REGISTRO);
export const ESPECIES_COMPAI = COMPAI_ESPECIES;
export const REGISTRO_COMPAI = COMPAI_ESPECIES;
export const REGISTRO_ESPECIES = COMPAI_ESPECIES;
export const ESPECIE_COMPAI_DEFECTO = COMPAI_ESPECIES.angelita;

const POR_CREATURE_SLUG = Object.freeze(
  Object.fromEntries(Object.values(COMPAI_ESPECIES).map((perfil) => [
    perfil.creatureSlug,
    perfil,
  ])),
);

/** Devuelve un perfil canónico o null para que el caller decida su fallback. */
export function obtenerEspecieCompai(especie) {
  if (typeof especie !== 'string') return null;
  const clave = especie.trim();
  return COMPAI_ESPECIES[clave] || POR_CREATURE_SLUG[clave] || null;
}

/** Resuelve una especie desconocida al perfil visual seguro de Angelita. */
export function resolverEspecieCompai(especie) {
  return obtenerEspecieCompai(especie) || ESPECIE_COMPAI_DEFECTO;
}

export const perfilDeEspecie = resolverEspecieCompai;
export const getCompaiEspecie = obtenerEspecieCompai;
export const resolverCompaiEspecie = resolverEspecieCompai;

/* Guarda el contrato útil para consumidores y tests sin exponer mutación. */
export const ESTADOS_COMPAI_REGISTRADOS = ESTADOS_DE_PERFIL;

export default COMPAI_ESPECIES;
