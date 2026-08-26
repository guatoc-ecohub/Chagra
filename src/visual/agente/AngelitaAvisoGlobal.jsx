import { useEffect, useRef } from 'react';
import useAngelitaStore from '../../store/useAngelitaStore';
import BurbujaAngelita from './BurbujaAngelita.jsx';
import { duracionAviso } from './duracionAviso.js';
import './angelitaAvisoGlobal.css';

/**
 * <AngelitaAvisoGlobal> — la burbuja de Angelita, EN PRODUCCIÓN 2D (P5,
 * `ops/AUDITORIA-COMPAI-MENSAJES-2D-3D-2026-08-23.md` +
 * `ops/COMPAI-MENU-DISENO-2026-08-25.md` §R-D).
 *
 * Hasta ahora BurbujaAngelita (typewriter + color por tipo, `angelitaAvisoTipos`)
 * solo vivía en el mockup del valle (`mockups/valle/Valle3D.jsx`) y en
 * <AngelitaGuia> (paradas guiadas). Todo lo que el cerebro de Angelita decide
 * en prod 2D — alertas reales, clima vivo, susurro nocturno, agroecología,
 * celebra/luto (todo vía `useAngelitaStore`) — se degradaba a un GLOW en el
 * <AgentFab>: el mensaje YA ADAPTADO nunca se leía, solo brillaba. Este
 * componente cierra ese hueco.
 *
 * CERO CANAL PARALELO: no decide nada, no tiene su propio cooldown ni su
 * propio silencio — lee el store DIRECTO. El mensaje que pinta ya pasó la
 * anti-molestia completa de `angelitaInteligencia.resolverComportamiento`
 * (silencio 🔔, "hoy no", cooldown por llave, `ocupado`, contador de
 * molestia) ANTES de llegar a `useAngelitaStore.mensaje`. Si el usuario
 * silenció a Angelita (`silenciar(true)`), el store nunca vuelve a poner un
 * mensaje — y `silenciar` además llama `reposar()` de una, así que este
 * componente desaparece con el resto.
 *
 * Auto-dismiss: el aviso dura lo que cuesta LEERLO (`duracionAviso`, la misma
 * fórmula tuneada del husmeo autónomo del valle 3D — reexpuesta en
 * `BurbujaAngelita.jsx` para no reinventarla). Al vencer, `reposar()` — solo
 * borra el mensaje EN PANTALLA; la memoria anti-molestia (cooldowns,
 * silencio) no se toca.
 *
 * Cierre manual (×): el usuario puede cerrarlo antes de que se cumpla el
 * tiempo; también llama `reposar()`. No es "Callar hoy" (eso vive en el menú
 * compacto del FAB, pendiente aparte, R4 del diseño) — solo cierra ESTE aviso.
 *
 * MONTAJE: junto al <AgentFab>, en las MISMAS pantallas (mismo guard en
 * App.jsx) — sin el FAB visible el aviso queda huérfano (nadie a quien
 * atribuirle la voz).
 */
export default function AngelitaAvisoGlobal() {
  const mensaje = useAngelitaStore((s) => s.mensaje);
  const tipo = useAngelitaStore((s) => s.tipo);
  const reposar = useAngelitaStore((s) => s.reposar);

  const timerRef = useRef(null);
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!mensaje) return undefined;
    timerRef.current = setTimeout(() => { reposar(); }, duracionAviso(mensaje));
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // Solo `mensaje` — dos avisos IDÉNTICOS seguidos ya los veta el cooldown
    // del store (angelitaInteligencia); si de verdad llega otro, reiniciar el
    // reloj de lectura es lo correcto.
  }, [mensaje, reposar]);

  if (!mensaje) return null;

  return (
    <div className="angelita-aviso-global">
      <BurbujaAngelita
        mensaje={mensaje}
        tipo={tipo || 'informativa'}
        className="angelita-aviso-global__burbuja"
      />
      <button
        type="button"
        className="angelita-aviso-global__cerrar"
        aria-label="Cerrar el aviso de Angelita"
        onClick={reposar}
      >
        ×
      </button>
    </div>
  );
}
