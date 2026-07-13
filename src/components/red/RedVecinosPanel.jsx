/* i18n (ADR-050): etiquetas user-facing en español Colombia — mismo criterio
 * de archivo que MercadosScreen. */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
import { useEffect, useMemo } from 'react';
import { Users, Handshake } from 'lucide-react';
import useRedStore from '../../store/useRedStore';
import { getCurrentOperatorHash } from '../../services/operatorIdentityService';
import PreguntarVecinoPanel from './PreguntarVecinoPanel';
import ReputacionCard from './ReputacionCard';

/**
 * RedVecinosPanel — el tab "Vecinos" del mercado: la cara de la RED humana.
 *
 * El mercado es la puerta de la red (DR de red groundeado): cada trato
 * registrado ya dice quién cultiva qué y cómo cumple — por eso esta vista vive
 * DENTRO del mercado y no en una pantalla aparte. Dos superficies:
 *
 *   1. "Pregúntele al vecino" — rutear una duda al par que demostró saber.
 *   2. "Así lo ve la red a usted" — su reputación GANADA por cultivo (los
 *      mismos semáforos que ven los vecinos: sin sorpresas ni letra menuda).
 *
 * Nada aquí monetiza el saber; la única superficie de dinero sigue siendo la
 * compra-venta del mercado.
 */
export default function RedVecinosPanel() {
  const reputaciones = useRedStore((s) => s.reputaciones);
  const grafo = useRedStore((s) => s.grafo);
  const isLoading = useRedStore((s) => s.isLoading);
  const cargar = useRedStore((s) => s.cargar);

  useEffect(() => {
    // Hidratar derivadas al montar (async vía IndexedDB — mismo patrón
    // "cargar al montar" de MercadosScreen.recargar).
    cargar();
  }, [cargar]);

  const miHash = getCurrentOperatorHash() || '';
  const mias = useMemo(
    () => reputaciones.filter((r) => r.productorHash === miHash),
    [reputaciones, miHash],
  );

  return (
    <div className="space-y-6" data-testid="red-vecinos">
      {/* Encuadre: la red es entre personas; la IA solo tiende el puente. */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 flex gap-2.5">
        <Users className="text-emerald-400 shrink-0 mt-0.5" size={18} aria-hidden="true" />
        <p className="text-sm text-emerald-100/90 leading-snug">
          La red de vecinos conecta a quien tiene una duda con quien ya la
          resolvió en su tierra. <strong>Campesino le responde a campesino</strong>;
          Chagra solo los presenta. Preguntar no cuesta: el saber no se vende.
        </p>
      </div>

      <section aria-label="Pregúntele al vecino">
        <h3 className="text-white font-bold text-base mb-3">Pregúntele al vecino</h3>
        <PreguntarVecinoPanel />
      </section>

      <section aria-label="Su reputación en la red">
        <h3 className="text-white font-bold text-base mb-1">Así lo ve la red a usted</h3>
        <p className="text-xs text-slate-400 mb-3 leading-snug">
          Su reputación no se pide ni se vota: se gana con los tratos que usted
          registra y decide compartir. Esto es exactamente lo que ve un vecino.
        </p>
        {isLoading && mias.length === 0 ? (
          <p className="text-sm text-slate-400" data-testid="red-cargando">Cargando su red…</p>
        ) : mias.length > 0 ? (
          <ul className="space-y-3">
            {mias.map((rep) => (
              <li key={`${rep.productorHash}-${rep.productoNorm}`}>
                <ReputacionCard reputacion={rep} esUsted />
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3 flex gap-2 text-sm text-slate-300" data-testid="red-sin-reputacion">
            <Handshake size={16} className="text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Todavía no tiene tratos compartidos con los vecinos. Cuando cierre
              una venta de una oferta suya, regístrela y compártala
              &ldquo;con los vecinos&rdquo;: así la red va conociendo su palabra.
            </span>
          </div>
        )}
        {grafo?.meta?.tratos > 0 && (
          <p className="text-[11px] text-slate-500 mt-2" data-testid="red-meta">
            En este dispositivo: {grafo.meta.tratos} trato{grafo.meta.tratos === 1 ? '' : 's'} registrado{grafo.meta.tratos === 1 ? '' : 's'},
            {' '}{grafo.meta.compartidos} compartido{grafo.meta.compartidos === 1 ? '' : 's'} con la red.
          </p>
        )}
      </section>
    </div>
  );
}
