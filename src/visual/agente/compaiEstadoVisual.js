import { estadoCanonico, POSE_DE_ESTADO } from './angelitaEstados.js';

// El movimiento se expresa con el mismo estado transversal, pero la pose
// respeta el medio de cada cuerpo: los voladores avanzan en vuelo.
export const COMPAI_VOLADORES = new Set([
  'angelita',
  'luciernaga',
  'guacamaya',
  'chivito-punk',
]);

const STATE_DE_ESTADO = {
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
};

/**
 * Resuelve el contrato visual común sin conocer el dibujo de cada especie.
 * `estado` conserva los diez estados canónicos; `state` mantiene compatibles
 * los rigs de cuatro estados y `pose` describe la actuación observable.
 */
export function resolverEstadoVisualCompai(especie, estado) {
  if (estado === 'caminando') {
    return {
      estado: 'caminando',
      state: 'caminando',
      pose: COMPAI_VOLADORES.has(especie) ? 'vuela' : 'camina',
    };
  }

  const canonico = estadoCanonico(estado);
  const poseAngelita = POSE_DE_ESTADO[canonico] || 'vuela';
  const pose = COMPAI_VOLADORES.has(especie) || poseAngelita !== 'vuela'
    ? poseAngelita
    : 'anda';

  return {
    estado: canonico,
    state: STATE_DE_ESTADO[canonico] || 'idle',
    pose,
  };
}

export default resolverEstadoVisualCompai;
