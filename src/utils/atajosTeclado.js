/**
 * atajosTeclado.js — Atajos de teclado para power users de prod.chagra.app.
 *
 * El extensionista que usa la app 8h/día gana velocidad con atajos.
 * Modal ? para ver todos los atajos disponibles.
 */
const ATAJOS = [
  { tecla: '/', descripcion: 'Buscar en todo el catálogo' },
  { tecla: 'Escape', descripcion: 'Volver al valle' },
  { tecla: 'Ctrl+Enter', descripcion: 'Enviar pregunta al agente' },
  { tecla: '?', descripcion: 'Mostrar esta ayuda de atajos' },
  { tecla: '1', descripcion: 'Ir al directorio de especies' },
  { tecla: '2', descripcion: 'Ir a Mis Cultivos' },
  { tecla: '3', descripcion: 'Ir a Animales' },
  { tecla: '4', descripcion: 'Ir al Agente' },
  { tecla: '5', descripcion: 'Ir al Clima' },
  { tecla: '0', descripcion: 'Ir al Perfil' },
  { tecla: 'Ctrl+B', descripcion: 'Volver al valle (alternativo)' },
];

/** @type {Map<string, () => void>} */
let handlers = new Map();

/**
 * Registra un handler para una tecla. Solo un handler por tecla.
 * @param {string} key
 * @param {() => void} fn
 */
export function onAtajo(key, fn) { handlers.set(key, fn); }

/**
 * @param {string} key
 */
export function offAtajo(key) { handlers.delete(key); }

/**
 * Inicializa el listener global de atajos. Llamar UNA vez en el shell.
 * @param {(ruta: string) => void} navigate
 */
export function initAtajos(navigate) {
  const NUMEROS = ['directorio', 'mundo_cultivos', 'animales', null, 'agente', 'clima_boletin', null, null, null, 'perfil'];

  window.addEventListener('keydown', (e) => {
    // No disparar si el foco está en un input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    // Escape → volver al valle
    if (e.key === 'Escape') { navigate('valle3d'); return; }

    // 0-9 → rutas rápidas
    if (e.key >= '0' && e.key <= '9' && !e.ctrlKey && !e.metaKey) {
      const idx = parseInt(e.key, 10);
      const ruta = NUMEROS[idx];
      if (ruta) { e.preventDefault(); navigate(ruta); return; }
    }

    // ? → mostrar atajos
    if (e.key === '?' && !e.ctrlKey) { handlers.get('?')?.(); return; }

    // Ctrl+Enter → agente
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { handlers.get('agentSend')?.(); return; }

    // Ctrl+B → valle alternativo
    if (e.key === 'b' && e.ctrlKey) { navigate('valle3d'); return; }
  });
}

export { ATAJOS };
