/**
 * useCompaiGuiaPantalla — el compAI ELEGIDO explica la pantalla al entrar.
 *
 * Regla de la casa "explicar las funciones de cada pantalla": al entrar a una
 * pantalla cubierta por `compaiExplicaPantallas`, el compAI muestra UNA
 * explicación corta (burbuja + voz). Nada se repite en la misma sesión, nada
 * interrumpe a quien está escribiendo o grabando, y el silencio manual se
 * respeta: si el usuario apagó los avisos, el compAI no se auto-presenta.
 *
 * REGLA "UNO SOLO POR PANTALLA": una pantalla que registró sus propias paradas
 * de guía (`compaiParadasPorPantalla`, p. ej. hoy-en-finca) se explica sola
 * con su recorrido — este hook CEDE (`conParadas` → no mostrar). La fuente de
 * verdad es `compaiExplicaPantallas` + `compaiParadasPorPantalla`; este hook
 * solo decide CUÁNDO, nunca redacta funciones.
 *
 * La decisión de mostrar es PURA (`decidirGuia`) y testeable sin React. El
 * hook solo la dispara: al cambiar de pantalla, espera a que asiente el layout
 * (`demoraMs`) y vuelve a evaluar los guardas en ese momento (nadie escribiendo,
 * sin paradas propias, sin silencio manual, sin sesión ya vista).
 *
 * "Ya vista" vive en sessionStorage (`chagra:compai:guia:<pantalla>`): sobrevive
 * a recargas y a remontajes del FAB (que se desmonta en dashboard/agente), y se
 * reinicia sola al cerrar el navegador — es una cortesía de bienvenida, no una
 * preferencia persistente.
 *
 * @module hooks/useCompaiGuiaPantalla
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { explicacionDePantalla } from '../services/compaiExplicaPantallas.js';
import { tieneParadas } from '../services/compaiParadasPorPantalla.js';
import { estaOcupado } from '../services/compaiOcupado.js';
import useAngelitaStore from '../store/useAngelitaStore.js';

/** Espera antes de presentarse — deja asentar el layout de la pantalla. */
export const DEMORA_DEFECTO_MS = 800;
/** Cuánto tiempo se queda la explicación antes de cerrarse sola. */
export const DURACION_DEFECTO_MS = 9000;

const STORAGE_PREFIX = 'chagra:compai:guia:';

function vistaEnSesion(pantalla) {
  if (!pantalla) return true;
  try {
    return globalThis.sessionStorage?.getItem(`${STORAGE_PREFIX}${pantalla}`) === '1';
  } catch {
    return false;
  }
}

function marcarVista(pantalla) {
  if (!pantalla) return;
  try {
    globalThis.sessionStorage?.setItem(`${STORAGE_PREFIX}${pantalla}`, '1');
  } catch {
    /* sin storage: la explicación se repite en este dispositivo, aceptable */
  }
}

/**
 * LA DECISIÓN, pura. Devuelve `{ mostrar, motivo }` — el motivo es para
 * telemetría/tests, no para el usuario.
 *
 * @param {Object} ctx
 * @param {boolean} [ctx.activo=true] - el host puede apagar toda la guía.
 * @param {boolean} ctx.conExplicacion — ¿el manifiesto cubre la pantalla?
 * @param {boolean} ctx.conParadas — ¿la pantalla tiene guía propia (paseo)?
 * @param {boolean} ctx.yaVista — ¿ya se explicó esta pantalla en la sesión?
 * @param {boolean} ctx.silenciado — ¿el usuario apagó los avisos manualmente?
 * @param {boolean} ctx.ocupado — ¿está escribiendo/grabando/ocupado?
 * @returns {{ mostrar: boolean, motivo: string }}
 */
export function decidirGuia({
  activo = true,
  conExplicacion,
  conParadas,
  yaVista,
  silenciado,
  ocupado,
}) {
  if (!activo) return { mostrar: false, motivo: 'inactivo' };
  if (!conExplicacion) return { mostrar: false, motivo: 'sin-explicacion' };
  if (conParadas) return { mostrar: false, motivo: 'pantalla-con-guia-propia' };
  if (yaVista) return { mostrar: false, motivo: 'ya-vista' };
  if (silenciado) return { mostrar: false, motivo: 'silenciado' };
  if (ocupado) return { mostrar: false, motivo: 'ocupado' };
  return { mostrar: true, motivo: 'entrada' };
}

/**
 * @param {string|null} pantalla — currentView del shell.
 * @param {Object} [opciones]
 * @param {boolean} [opciones.activo=true]
 * @param {number} [opciones.demoraMs=800]
 * @param {number} [opciones.duracionMs=9000]
 * @param {boolean} [opciones.silenciado] - pisa la lectura del store (tests).
 * @returns {{
 *   explicacion: import('../services/compaiExplicaPantallas.js').ExplicaPantalla|null,
 *   visible: boolean,
 *   descartar: () => void,
 * }}
 */
export default function useCompaiGuiaPantalla(
  pantalla,
  { activo = true, demoraMs = DEMORA_DEFECTO_MS, duracionMs = DURACION_DEFECTO_MS, silenciado: silenciadoExterno } = {},
) {
  const [explicacion, setExplicacion] = useState(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);
  const durarRef = useRef(null);

  const limpiar = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (durarRef.current) {
      window.clearTimeout(durarRef.current);
      durarRef.current = null;
    }
  }, []);

  const descartar = useCallback(() => {
    limpiar();
    setExplicacion(null);
    setVisible(false);
  }, [limpiar]);

  // Al cambiar de pantalla (o montarse con una), evaluar la guía de entrada.
  useEffect(() => {
    if (!activo) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset al apagarse la guía (mismo patrón que useCompaiPaseo)
      descartar();
      return undefined;
    }
    if (!pantalla) return undefined;

    // Presentar la nueva pantalla: cerrar la explicación de la anterior.
    descartar();

    const p = pantalla;
    timerRef.current = window.setTimeout(() => {
      // El silencio se lee FRESCO en el momento de decidir (no en el momento de
      // programar): si el usuario apagó los avisos en la demora, no se presenta.
      const silencioActual = silenciadoExterno ?? useAngelitaStore.getState().silenciado;
      const decision = decidirGuia({
        activo,
        conExplicacion: explicacionDePantalla(p) !== null,
        conParadas: tieneParadas(p),
        yaVista: vistaEnSesion(p),
        silenciado: silencioActual,
        ocupado: estaOcupado(),
      });
      if (!decision.mostrar) return;
      const exp = explicacionDePantalla(p);
      if (!exp) return;
      marcarVista(p);
      setExplicacion(exp);
      setVisible(true);
      durarRef.current = window.setTimeout(() => {
        setExplicacion(null);
        setVisible(false);
      }, duracionMs);
    }, demoraMs);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pantalla, activo, silenciadoExterno, demoraMs]);

  // Al desmontar, no dejar timers colgados.
  useEffect(() => () => limpiar(), [limpiar]);

  return { explicacion, visible, descartar };
}
