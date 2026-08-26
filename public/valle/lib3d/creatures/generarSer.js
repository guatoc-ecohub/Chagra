import * as THREE from 'three';

const FICHA_VACIA = Object.freeze({
  nombreComun: '',
  nombreCientifico: '',
  rol: '',
  pisoTermico: '',
  riesgo: '',
});

const REGISTROS = new Map();

function normalizarFicha(ficha = {}, meta = {}) {
  const base = typeof ficha === 'object' && ficha ? ficha : {};
  return {
    ...FICHA_VACIA,
    nombreComun: base.nombreComun || meta.nombreComun || '',
    nombreCientifico: base.nombreCientifico || meta.nombreCientifico || '',
    rol: base.rol || meta.rol || '',
    pisoTermico: base.pisoTermico || meta.pisoTermico || '',
    riesgo: base.riesgo || meta.riesgo || '',
  };
}

function normalizarPuntos(puntos = []) {
  if (!Array.isArray(puntos)) return [];
  return puntos.map((p) => {
    if (!p || typeof p !== 'object') return p;
    const posicion = Array.isArray(p.posicion) ? [...p.posicion] : [0, 0, 0];
    return {
      ...p,
      posicion,
    };
  });
}

function esObject3D(obj) {
  return obj instanceof THREE.Object3D || Boolean(obj?.isObject3D);
}

/**
 * Contrato único del bestiario.
 *
 * Hoy las tres criaturas existentes llaman a este helper como finalizador:
 * les deja la salida estandarizada sin tocar la anatomía que ya estaba bien.
 * Para agregar una cuarta criatura:
 * 1. modelar su geometría con `anatomia.js`;
 * 2. devolver `grupo`, `puntos`, `animar` y `ficha`;
 * 3. pasar `especie`, `reino`, `estilo` y `nivelDetalle` por acá.
 */
export function crearSer({
  especie = '',
  reino = '',
  estilo = '',
  nivelDetalle = 2,
  grupo = null,
  puntos = [],
  animar = null,
  ficha = {},
  metrosPorUnidad = 1,
} = {}) {
  if (!grupo) {
    const registro = REGISTROS.get(especie);
    if (!registro) {
      throw new Error(`generarSer: no hay constructor registrado para "${especie}"`);
    }
    return registro({ especie, reino, estilo, nivelDetalle });
  }

  if (!esObject3D(grupo)) {
    throw new Error(`generarSer: el grupo de "${especie || 'ser'}" debe ser THREE.Object3D`);
  }

  return {
    grupo,
    puntos: normalizarPuntos(puntos),
    animar: typeof animar === 'function' ? animar : () => {},
    ficha: normalizarFicha(ficha, { especie, reino, estilo, nivelDetalle }),
    metrosPorUnidad,
    especie,
    reino,
    estilo,
    nivelDetalle,
  };
}

export function registrarSer(especie, constructor) {
  if (!especie || typeof constructor !== 'function') {
    throw new Error('generarSer: registrarSer necesita especie y constructor');
  }
  REGISTROS.set(especie, constructor);
}

