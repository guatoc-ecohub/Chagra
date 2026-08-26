import { useEffect, useRef } from 'react';
import useAngelitaStore from '../../store/useAngelitaStore';
import BurbujaAngelita from './BurbujaAngelita.jsx';
import { duracionAviso } from './duracionAviso.js';
import './angelitaAvisoGlobal.css';

/**
 * Burbuja global de Angelita para la producción 2D. Solo refleja el mensaje
 * que ya decidió `useAngelitaStore`; no crea un canal paralelo de avisos.
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
