import { useMemo, useState } from 'react';
import {
  Search, Phone, MapPin, ClipboardCopy, Sprout, Info,
} from 'lucide-react';
import useRedStore from '../../store/useRedStore';
import { marketplaceOfertas } from '../../db/marketplaceOfertas';
import { getProfile } from '../../services/userProfileService';
import { NIVEL_REPUTACION_COPY } from './reputacionCopy';
import { encontrarContactoPublico } from './contactoPublico';

/**
 * PreguntarVecinoPanel — "Pregúntele al vecino": la vista donde una duda de
 * cultivo se rutea al PAR competente y cercano de la red (redMatchmaking).
 *
 * La IA aquí es PUENTE, no reemplazo del saber campesino: Chagra no responde
 * la duda — encuentra al vecino que ya DEMOSTRÓ éxito con ese cultivo en
 * tratos reales del mercado, y le arma el mensaje para que hablen entre
 * personas. El agente engancha este mismo flujo cuando no sabe
 * (agentConfident:false) o cuando la duda es local-específica.
 *
 * Privacidad (inviolable): el teléfono del vecino SOLO aparece si él mismo lo
 * expuso público en una oferta del mercado (opt-in). Sin ese consentimiento se
 * entrega el mensaje sugerido para llevarlo al encuentro — nunca un número.
 *
 * @param {Object} props
 * @param {string} [props.productoInicial] - prellenar el cultivo de la duda.
 */

export default function PreguntarVecinoPanel({ productoInicial = '' }) {
  const preguntarAlVecino = useRedStore((s) => s.preguntarAlVecino);
  const abrirCanal = useRedStore((s) => s.abrirCanal);
  const perfil = useMemo(() => getProfile(), []);

  const [producto, setProducto] = useState(productoInicial);
  const [sintoma, setSintoma] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [decision, setDecision] = useState(/** @type {Object|null} */ (null));
  const [contacto, setContacto] = useState(/** @type {Object|null} */ (null));
  const [mensaje, setMensaje] = useState('');
  const [copiado, setCopiado] = useState(false);

  const handleBuscar = async () => {
    const q = producto.trim();
    if (!q) return;
    setBuscando(true);
    setCopiado(false);
    // agentConfident:false — quien busca aquí YA decidió preguntarle a una
    // persona, no al modelo. La decisión de ruteo excluye al propio operador.
    const dec = await preguntarAlVecino({
      producto: q,
      vereda: perfil?.vereda || '',
      municipio: perfil?.municipio || perfil?.departamento || '',
      sintoma: sintoma.trim(),
      agentConfident: false,
    });
    setDecision(dec);
    setMensaje(dec?.mensajeSugerido || '');
    if (dec?.peer) {
      try {
        const ofertas = await marketplaceOfertas.getAll();
        setContacto(encontrarContactoPublico(dec.peer, ofertas));
      } catch {
        setContacto(null); // sin ofertas legibles no hay contacto — se degrada al mensaje
      }
    } else {
      setContacto(null);
    }
    setBuscando(false);
  };

  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(mensaje);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  };

  const peer = decision?.peer || null;
  const canal = peer && contacto ? abrirCanal(contacto, { mensaje }) : null;
  const nivelCopy = peer ? (NIVEL_REPUTACION_COPY[peer.nivel] || null) : null;

  return (
    <div className="space-y-4" data-testid="preguntar-vecino">
      {/* La duda: cultivo + qué está pasando. */}
      <div className="space-y-3">
        <label className="block">
          <span className="block text-sm font-semibold text-slate-200 mb-1.5">¿Sobre qué cultivo tiene la duda?</span>
          <input
            type="text"
            value={producto}
            onChange={(e) => setProducto(e.target.value)}
            placeholder="Ej: tomate, mora, café…"
            aria-label="Cultivo de la duda"
            className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm min-h-[44px] focus:border-emerald-500 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-semibold text-slate-200 mb-1.5">
            ¿Qué está pasando? <span className="text-slate-500 font-normal">(opcional)</span>
          </span>
          <input
            type="text"
            value={sintoma}
            onChange={(e) => setSintoma(e.target.value)}
            placeholder="Ej: se le amarillan las hojas de abajo…"
            aria-label="Síntoma o duda"
            className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm min-h-[44px] focus:border-emerald-500 focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={handleBuscar}
          disabled={buscando || !producto.trim()}
          data-testid="buscar-vecino"
          className="w-full min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold flex items-center justify-center gap-2"
        >
          <Search size={17} aria-hidden="true" /> {buscando ? 'Buscando…' : 'Buscar un vecino que sepa'}
        </button>
      </div>

      {/* La decisión de ruteo, honesta en ambos sentidos. */}
      {decision && !peer && (
        <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3 flex gap-2 text-sm text-slate-300" data-testid="sin-vecino">
          <Sprout size={16} className="text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            Todavía no hay en la red un vecino que haya <strong>demostrado</strong> experiencia
            con ese cultivo. No le vamos a inventar un contacto: la red crece con
            cada trato que los vecinos registran y comparten en el mercado.
          </span>
        </div>
      )}

      {peer && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-3" data-testid="vecino-sugerido">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-white text-sm">
                Hay un vecino {peer.proximidadLabel} que ya cultivó {peer.producto}.
              </p>
              <p className="text-slate-400 text-xs mt-0.5 flex items-center gap-1">
                <MapPin size={11} aria-hidden="true" />
                {[peer.vereda, peer.municipio].filter(Boolean).join(', ') || 'Ubicación sin registrar'}
                {' · '}{peer.nTransacciones} trato{peer.nTransacciones === 1 ? '' : 's'} en la red
              </p>
            </div>
            {nivelCopy && (
              <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] font-bold ${nivelCopy.chip}`}>
                <nivelCopy.Icon size={12} aria-hidden="true" /> {nivelCopy.label}
              </span>
            )}
          </div>

          {/* El mensaje es de usted, no del modelo: editable antes de enviar. */}
          <label className="block">
            <span className="block text-xs font-semibold text-slate-300 mb-1">Su mensaje (revíselo y ajústelo si quiere)</span>
            <textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              rows={4}
              aria-label="Mensaje para el vecino"
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm leading-snug resize-none focus:border-emerald-500 focus:outline-none"
            />
          </label>

          {canal ? (
            <a
              href={canal.href}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="abrir-canal"
              className="w-full min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2"
            >
              <Phone size={17} aria-hidden="true" /> Escribirle por WhatsApp
            </a>
          ) : (
            <div className="space-y-2">
              <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3 flex gap-2 text-xs text-slate-300" data-testid="sin-contacto">
                <Info size={14} className="text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  Este vecino no ha compartido un teléfono público, y Chagra no
                  entrega números sin permiso. Lleve el mensaje al mercado
                  campesino o a la agrofería y pregúntele en persona.
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopiar}
                data-testid="copiar-mensaje"
                className="w-full min-h-[44px] rounded-lg border border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm flex items-center justify-center gap-2"
              >
                <ClipboardCopy size={15} aria-hidden="true" /> {copiado ? 'Mensaje copiado' : 'Copiar el mensaje'}
              </button>
            </div>
          )}

          <p className="text-[11px] text-slate-500 leading-snug">
            Chagra solo hace el puente: la respuesta es del vecino y la
            conversación es entre ustedes. Preguntar y responder aquí no cuesta
            ni paga — el saber no se vende.
          </p>
        </div>
      )}
    </div>
  );
}
