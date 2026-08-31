/**
 * useAngelitaHusmeador — Hook para husmear mundos automáticamente.
 *
 * Facilita la integración del husmeo proactivo de Angelita al detectar
 * cambios de mundo (vistas) y llamar a entrarMundo() con los datos apropiados.
 *
 * Este hook está diseñado para usarse en componentes de nivel superior como
 * AgentFab o App, sin modificar su lógica interna.
 *
 * @module hooks/useAngelitaHusmeador
 */
import { useEffect, useRef } from 'react';
import useAngelitaStore from '../store/useAngelitaStore';
import { mundoDePantalla } from '../services/angelitaInteligencia';
import { datosFinca } from '../compai/nucleo/datosFinca.js';
import { estaOcupado } from '../services/compaiOcupado.js';

/**
 * Hook que husmea mundos automáticamente al montar o cambiar de vista.
 *
 * @param {Object} opts
 * @param {string|null} [opts.pantalla] - Vista actual (para detectar mundo).
 * @param {boolean} [opts.activo=true] - Si el husmeo está activo.
 * @param {number} [opts.cooldownMs=20000] - Cooldown entre husmeos (default 20s).
 */
export function useAngelitaHusmeador({ pantalla = null, activo = true, cooldownMs = 20000 } = {}) {
  const entrarMundo = useAngelitaStore((s) => s.entrarMundo);
  const ultimoMundo = useRef(null);
  const ultimoHusmeoMs = useRef(0);

  useEffect(() => {
    if (!activo || !pantalla) return;

    const mundo = mundoDePantalla(pantalla);
    if (!mundo) return;

    const ahoraMs = Date.now();

    // Solo husmea si:
    // 1. Es un mundo diferente al último
    // 2. Ha pasado el cooldown desde el último husmeo general
    const esMundoDiferente = mundo !== ultimoMundo.current;
    const pasoCooldown = ahoraMs - ultimoHusmeoMs.current >= cooldownMs;

    if (!esMundoDiferente && !pasoCooldown) return;

    // No husmear si ya hay algo activo (aviso, celebra, etc.)
    const estadoActual = useAngelitaStore.getState().estado;
    if (estadoActual !== 'calma') return;

    // Obtener datos del mundo
    const datosMundo = datosFinca(mundo);

    // Llamar a entrarMundo con el mundo y datos
    entrarMundo(mundo, datosMundo, { ocupado: estaOcupado() });

    // Actualizar controles
    ultimoMundo.current = mundo;
    ultimoHusmeoMs.current = ahoraMs;
  }, [pantalla, activo, cooldownMs, entrarMundo]);
}

export default useAngelitaHusmeador;
