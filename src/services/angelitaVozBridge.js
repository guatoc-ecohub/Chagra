/*
 * angelitaVozBridge — el CABLE entre la cabeza de Angelita y su garganta.
 *
 * La cabeza (angelitaInteligencia vía useAngelitaStore) ya decide QUÉ decir
 * en toda la app: avisos con datos reales, husmeos al entrar a un mundo,
 * celebraciones. Hasta hoy eso salía solo ESCRITO (burbuja del FAB). Este
 * puente escucha el store y manda cada mensaje nuevo a la garganta única
 * (angelitaVoz.decir) con la prioridad que le corresponde:
 *
 *   severidad 'urgente'  → ALERTA   (interrumpe lo que esté sonando)
 *   estado 'husmea'      → AMBIENTE (si ella ya habla, se descarta — el
 *                          comentario de ambiente es del momento)
 *   resto (aviso/celebra)→ NORMAL   (espera su turno)
 *
 * RESPETOS (se chequean AQUÍ, en el borde, no en la cola):
 *   · store.silenciado  — el usuario pidió silencio a Angelita.
 *   · prefs.ttsEnabled  — el toggle global de voz de la app.
 * La cola además aplica sus propios vetos (gesto de autoplay, reduced
 * motion para AMBIENTE) — ver angelitaVoz.js.
 *
 * Idempotente y perezoso: initAngelitaVozBridge() instala UNA sola vez
 * (singleton de módulo); llamadas repetidas son no-op. Se cablea desde
 * AgentFab (el FAB vive en TODA pantalla), con import dinámico para no
 * cargar el stack de voz hasta que la app ya montó.
 */

import useAngelitaStore from '../store/useAngelitaStore';
import usePrefsStore from '../store/usePrefsStore';
import { decir, PRIORIDAD } from './angelitaVoz.js';

let instalado = false;

/** Mapea la decisión viva del store a una prioridad de la garganta. */
export function prioridadDeEstado(estado, severidad) {
  if (severidad === 'urgente') return PRIORIDAD.ALERTA;
  if (estado === 'husmea') return PRIORIDAD.AMBIENTE;
  return PRIORIDAD.NORMAL;
}

/**
 * Instala el puente (una sola vez). Devuelve un no-op de compatibilidad:
 * el puente es un singleton de app, no se desinstala al desmontar un FAB
 * (hay un FAB por pantalla; desinstalar con uno callaría a los demás).
 * @returns {() => void}
 */
export function initAngelitaVozBridge() {
  if (instalado) return () => {};
  instalado = true;

  useAngelitaStore.subscribe((estadoStore, estadoPrevio) => {
    const mensaje = estadoStore.mensaje;
    if (!mensaje || mensaje === estadoPrevio?.mensaje) return;
    if (estadoStore.silenciado) return;
    try {
      if (!usePrefsStore.getState().ttsEnabled) return;
    } catch (_) { return; }
    decir(mensaje, {
      prioridad: prioridadDeEstado(estadoStore.estado, estadoStore.severidad),
      origen: `angelita-store:${estadoStore.estado}`,
    }).catch(() => { /* la garganta nunca rechaza; cinturón por si acaso */ });
  });

  return () => {};
}

export default { initAngelitaVozBridge, prioridadDeEstado };
