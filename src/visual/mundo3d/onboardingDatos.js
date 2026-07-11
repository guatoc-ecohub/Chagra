/*
 * onboardingDatos — datos y persistencia del primer viaje al valle (sin voz).
 *
 * Compañero three-free de `OnboardingDescubrir.jsx` (separado para que el .jsx
 * solo exporte el componente, como pide react-refresh):
 *   · valleYaDescubierto / marcarValleDescubierto / olvidarValleDescubierto —
 *     la constancia del primer recorrido (localStorage, a prueba de storage roto).
 *   · hotspotsDeValle() — las paradas por defecto, derivadas del registro real
 *     (mundos con landmark en el valle) + título/tinte del manifiesto.
 */
import { MUNDO } from './mundoData.js';
import { tinteDeMundo, tituloDeMundo } from './resolverMundo.js';

/* ── Persistencia del primer viaje ─────────────────────────────────────────── */

const LLAVE = 'chagra:valle:descubierto:v1';

/** ¿Ya hizo (o saltó) el primer recorrido? El host decide el montaje con esto. */
export function valleYaDescubierto() {
  try {
    return window.localStorage.getItem(LLAVE) != null;
  } catch {
    return false; // storage roto → mejor ofrecer el recorrido de más
  }
}

/** Deja constancia del recorrido ('completado' | 'saltado'). */
export function marcarValleDescubierto(motivo = 'completado') {
  try {
    window.localStorage.setItem(LLAVE, motivo);
  } catch {
    /* sin storage no hay constancia, y no pasa nada */
  }
}

/** Borra la constancia (para "volver a ver el recorrido" en ajustes). */
export function olvidarValleDescubierto() {
  try {
    window.localStorage.removeItem(LLAVE);
  } catch {
    /* nada */
  }
}

/* ── La lista por defecto: los lugares del valle, desde el registro ────────── */

/* Pista cálida por mundo (una línea, en usted). Fallback genérico abajo. */
const PISTAS = {
  suelo: 'Debajo del pasto hay un mundo trabajando. Aquí lo ve por dentro.',
  agua: 'Siga el camino que baja de la montaña: es el agua de su finca.',
  animales: 'El corral cierra el ciclo: los animales también abonan la tierra.',
  disenio: 'El bosque comestible crece por pisos, como el monte de verdad.',
  cultivos: 'Sus siembras, sus semillas y el calendario viven en la milpa.',
  cafe: 'El cafetal guarda el paso a paso del café, del grano a la taza.',
  abono: 'En esta pila la finca convierte lo que sobra en comida para el suelo.',
  clima: 'La veleta le cuenta el cielo de hoy: lluvia, sol y heladas.',
  sanidad: 'Cuando una mata amanezca enferma, por aquí se le busca el remedio.',
  mercado: 'Aquí se vende, se compra y se guarda la cosecha sin que se dañe.',
};

export const PISTA_GENERICA = 'Acérquese cuando quiera: cada lugar guarda una parte de su finca.';

/* Emoji del mundo: el registro no lo trae a nivel mundo; se toma del primer
   hotspot declarado. Mapa mínimo para mundos sin hotspots (escena:null). */
const EMOJIS = { clima: '⛅' };
const emojiDeMundo = (id) => EMOJIS[id] || MUNDO[id]?.hotspots?.[0]?.emoji || '🌱';

/**
 * Construye la lista de paradas del recorrido desde el registro real
 * (mundos con landmark en el valle), con título/tinte del manifiesto.
 * `excluir`: ids a omitir (p. ej. mundos con gate de perfil no activo).
 */
export function hotspotsDeValle({ excluir = [] } = {}) {
  return Object.entries(MUNDO)
    .filter(([id, d]) => d.valle && !excluir.includes(id))
    .map(([id]) => ({
      id,
      label: tituloDeMundo(id),
      emoji: emojiDeMundo(id),
      tinte: tinteDeMundo(id)[0],
      pista: PISTAS[id] || PISTA_GENERICA,
    }));
}
