/* i18n (ADR-050): etiquetas user-facing en español Colombia. La regla
 * chagra-i18n es soft (warn); se desactiva a nivel de archivo siguiendo el
 * mismo criterio que GerminacionScreen/SoilDiagnosticScreen para no bloquear el
 * pre-commit (max-warnings=0). Los errores reales siguen activos. */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Store, Plus, Search, MapPin, Phone, Trash2, ArrowLeft, Tag, Info,
  Sprout, AlertCircle, CheckCircle2, Users, Handshake,
} from 'lucide-react';
import RedVecinosPanel from './red/RedVecinosPanel';
import CierreTratoSheet from './red/CierreTratoSheet';
import { ScreenShell } from './common/ScreenShell';
import EmptyStateCampo from './common/EmptyStateCampo.jsx';
import ErrorStateCampo from './common/ErrorStateCampo.jsx';
import SkeletonCampo from './common/SkeletonCampo.jsx';
import PhotoCaptureField from './PhotoCaptureField';
import { blobToDataUrl } from '../utils/imageProcessor';
import { marketplaceOfertas } from '../db/marketplaceOfertas';
import { CATEGORIAS, UNIDADES, OFERTAS_SEED } from '../data/marketplaceSeed';
import { getProfile } from '../services/userProfileService';
import {
  formatearCOP, construirContacto, resolverPrecioReferencia,
  validarOferta, filtrarOfertas,
} from '../services/marketplaceService';

/**
 * MercadosScreen — el MARKETPLACE agroecológico de Chagra (circuitos cortos).
 *
 * Reemplaza el placeholder "en preparación" de la rama "Vender" de la mano
 * radial. MVP offline-first (como el resto de la app), tres flujos:
 *
 *   1. EXPLORAR — catálogo de ofertas (propias + ejemplos de otras fincas),
 *      filtrable por categoría y por texto (producto/ubicación). Encuadre de
 *      mercados campesinos / agroferias / venta directa sin intermediarios.
 *   2. PUBLICAR — el productor publica un producto de su finca (producto,
 *      cantidad, unidad, precio OPCIONAL, foto opcional, finca/vereda/municipio).
 *      Se persiste local (IndexedDB) y aparece de inmediato en Explorar.
 *   3. CONTACTAR — botón de contacto directo al vendedor (WhatsApp/teléfono),
 *      patrón del resto de la app. Sin transacción ni pago dentro de Chagra:
 *      deflección honesta sobre pagos.
 *
 * Precio de referencia GROUNDEADO: si hay dato citado (SIPSA/DANE) para el
 * producto, se muestra con su fuente y la fecha del boletín; si no, deflección
 * honesta ("sin precio de referencia todavía"). NUNCA se inventa un precio ni
 * una tendencia (la tabla es una foto puntual del boletín, no una serie
 * temporal — por eso no hay flecha de subida/bajada). Se muestra en DOS
 * momentos: (1) al PUBLICAR, para que el productor calibre su precio mientras
 * escribe el nombre del producto; (2) en el detalle de una oferta, para que el
 * comprador la vea también. Mismo componente (`PrecioReferenciaBloque`), texto
 * de deflección adaptado por `contexto`. El gancho para el dato SIPSA EN VIVO
 * (no esta foto estática) sigue en cola — ver precioReferencia.js.
 *
 * @param {object} props
 * @param {() => void} [props.onBack] - volver al dashboard.
 * @param {(view: string, data?: any) => void} [props.onNavigate] - navegación opcional a otras vistas.
 * @param {(pregunta: string) => void} [props.onAskAgent] - opcional, puente al agente desde la vista "Vender mejor".
 */
export default function MercadosScreen({ onBack, onNavigate: _onNavigate }) {
  const [tab, setTab] = useState('explorar'); // 'explorar' | 'publicar' | 'vecinos'
  const [publicadas, setPublicadas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [mostrarEjemplos, setMostrarEjemplos] = useState(true);
  const [filtroCat, setFiltroCat] = useState('');
  const [filtroTexto, setFiltroTexto] = useState('');
  const [detalle, setDetalle] = useState(null); // oferta seleccionada para contacto

  // ── carga inicial de ofertas publicadas (offline-first) ──
  const recargar = useCallback(async () => {
    try {
      const lista = await marketplaceOfertas.getAll();
      setPublicadas(lista);
      setErrorCarga(false);
    } catch (e) {
      // Un fallo de lectura NO debe verse igual que un mercado vacío: se
      // marca para que ExplorarPanel muestre el estado de error con reintento.
      console.warn('[Mercados] no se pudieron leer las ofertas:', e?.message);
      setPublicadas([]);
      setErrorCarga(true);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    // Carga inicial al montar. recargar() hace su propio setState de forma
    // ASÍNCRONA (await IndexedDB); el disable es para el patrón establecido de
    // "cargar al montar" (mismo que GlaciarHistorialScreen), no un setState
    // síncrono que dispare renders en cascada.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    recargar();
  }, [recargar]);

  // Catálogo combinado: publicadas primero (más recientes), luego ejemplos.
  const catalogo = useMemo(() => {
    const base = [...publicadas];
    if (mostrarEjemplos) base.push(...OFERTAS_SEED);
    return base;
  }, [publicadas, mostrarEjemplos]);

  const visibles = useMemo(
    () => filtrarOfertas(catalogo, { categoria: filtroCat, texto: filtroTexto }),
    [catalogo, filtroCat, filtroTexto],
  );

  const handlePublicada = useCallback(() => {
    setTab('explorar');
    recargar();
  }, [recargar]);

  const handleEliminar = useCallback(async (id) => {
    await marketplaceOfertas.remove(id);
    setDetalle(null);
    recargar();
  }, [recargar]);

  return (
    <ScreenShell title="Mercado de la finca" icon={Store} onBack={onBack}>
      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Encuadre: circuitos cortos / venta directa */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 mb-4 flex gap-2.5">
          <Sprout className="text-emerald-400 shrink-0 mt-0.5" size={18} />
          <p className="text-sm text-emerald-100/90 leading-snug">
            Vende directo a fincas y compradores vecinos: <strong>circuitos cortos</strong>,
            agroferias y mercados campesinos, sin intermediarios. El contacto es
            directo; Chagra no cobra comisión ni procesa pagos.
          </p>
        </div>

        {/* Tabs Explorar / Publicar */}
        <div className="flex gap-2 mb-4" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'explorar'}
            onClick={() => setTab('explorar')}
            className={`flex-1 min-h-[44px] rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors ${
              tab === 'explorar'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Search size={16} /> Explorar
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'publicar'}
            onClick={() => setTab('publicar')}
            className={`flex-1 min-h-[44px] rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors ${
              tab === 'publicar'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Plus size={16} /> Publicar
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'vecinos'}
            onClick={() => setTab('vecinos')}
            className={`flex-1 min-h-[44px] rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors ${
              tab === 'vecinos'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Users size={16} /> Vecinos
          </button>
        </div>

        {tab === 'explorar' && (
          <ExplorarPanel
            cargando={cargando}
            errorCarga={errorCarga}
            onReintentar={recargar}
            ofertas={visibles}
            filtroCat={filtroCat}
            setFiltroCat={setFiltroCat}
            filtroTexto={filtroTexto}
            setFiltroTexto={setFiltroTexto}
            mostrarEjemplos={mostrarEjemplos}
            setMostrarEjemplos={setMostrarEjemplos}
            onContactar={setDetalle}
            onPublicarCta={() => setTab('publicar')}
          />
        )}

        {tab === 'publicar' && (
          <PublicarPanel onPublicada={handlePublicada} onCancelar={() => setTab('explorar')} />
        )}

        {/* RED humana campesino↔campesino: el mercado es la puerta de la red
            (los tratos alimentan grafo + reputación), por eso vive aquí. */}
        {tab === 'vecinos' && <RedVecinosPanel />}
      </div>

      {detalle && (
        <DetalleOferta
          oferta={detalle}
          onClose={() => setDetalle(null)}
          onEliminar={handleEliminar}
        />
      )}
    </ScreenShell>
  );
}

/* ════════════════════════ EXPLORAR ════════════════════════ */

function ExplorarPanel({
  cargando, errorCarga, onReintentar, ofertas, filtroCat, setFiltroCat, filtroTexto, setFiltroTexto,
  mostrarEjemplos, setMostrarEjemplos, onContactar, onPublicarCta,
}) {
  return (
    <div>
      {/* Buscador por producto / ubicación */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
        <input
          type="search"
          value={filtroTexto}
          onChange={(e) => setFiltroTexto(e.target.value)}
          placeholder="Buscar producto, vereda o municipio…"
          aria-label="Buscar ofertas"
          className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {/* Filtro por categoría (chips) */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-1 px-1">
        <CategoriaChip activo={filtroCat === ''} onClick={() => setFiltroCat('')} icon="🛒" label="Todo" />
        {CATEGORIAS.map((c) => (
          <CategoriaChip
            key={c.id}
            activo={filtroCat === c.id}
            onClick={() => setFiltroCat(c.id)}
            icon={c.icon}
            label={c.label}
          />
        ))}
      </div>

      {/* Toggle ejemplos */}
      <label className="flex items-center gap-2 text-xs text-slate-400 mb-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={mostrarEjemplos}
          onChange={(e) => setMostrarEjemplos(e.target.checked)}
          className="accent-emerald-500"
        />
        Mostrar ofertas de ejemplo de otras fincas
      </label>

      {cargando ? (
        <SkeletonCampo variant="lista" count={3} label="Cargando ofertas…" />
      ) : errorCarga && ofertas.length === 0 ? (
        <div className="py-10" data-testid="mercado-error">
          <ErrorStateCampo
            title="No pudimos abrir el mercado."
            hint="Sus ofertas guardadas están a salvo en este dispositivo. Espere un momento y vuelva a intentar."
            onRetry={onReintentar}
          />
        </div>
      ) : (
        <>
          {/* Si falló la lectura de las ofertas propias pero los ejemplos sí se
              ven, se avisa sin tapar la lista. */}
          {errorCarga && (
            <div className="flex items-center justify-between gap-3 mb-3 px-3 py-2 rounded-lg bg-amber-900/20 border border-amber-800/40">
              <p className="text-xs text-amber-200">
                No pudimos leer sus ofertas guardadas. Las de ejemplo sí se ven.
              </p>
              <button
                type="button"
                onClick={onReintentar}
                className="text-xs font-bold text-amber-300 underline shrink-0"
              >
                Reintentar
              </button>
            </div>
          )}
          {ofertas.length === 0 ? (
            <div className="py-10" data-testid="mercado-empty">
              <EmptyStateCampo
                variant="busqueda"
                title="No hay ofertas que coincidan todavía."
                hint="Sea el primero: publique lo que vende su finca y aparecerá aquí para los vecinos."
              >
                <button
                  type="button"
                  onClick={onPublicarCta}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm"
                >
                  <Plus size={16} /> Publicar mi producto
                </button>
              </EmptyStateCampo>
            </div>
          ) : (
            <ul className="space-y-3">
              {ofertas.map((o) => (
                <li key={o.id}>
                  <OfertaCard oferta={o} onContactar={onContactar} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function CategoriaChip({ activo, onClick, icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
        activo ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
      }`}
    >
      <span aria-hidden="true">{icon}</span> {label}
    </button>
  );
}

function OfertaCard({ oferta, onContactar }) {
  const precio = formatearCOP(oferta.precio);
  const cat = CATEGORIAS.find((c) => c.id === oferta.categoria);
  const ubic = [oferta.vereda, oferta.municipio].filter(Boolean).join(', ');
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/70 overflow-hidden">
      <div className="flex">
        {oferta.fotoDataUrl ? (
          <img
            src={oferta.fotoDataUrl}
            alt={oferta.producto}
            className="w-24 h-24 object-cover shrink-0"
          />
        ) : (
          <div className="w-24 h-24 shrink-0 bg-slate-800 flex items-center justify-center text-3xl" aria-hidden="true">
            {cat?.icon || '📦'}
          </div>
        )}
        <div className="flex-1 min-w-0 p-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-white text-sm leading-tight truncate">{oferta.producto}</h3>
            {oferta.demo && (
              <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                ejemplo
              </span>
            )}
          </div>
          <p className="text-emerald-300 font-black text-base mt-0.5">
            {precio ? `${precio}` : 'A convenir'}
            <span className="text-slate-400 font-normal text-xs"> / {oferta.unidad}</span>
          </p>
          <p className="text-slate-400 text-xs mt-0.5">
            {oferta.cantidad} {oferta.unidad} disponible{oferta.cantidad === 1 ? '' : 's'}
          </p>
          {ubic && (
            <p className="text-slate-500 text-xs mt-1 flex items-center gap-1 truncate">
              <MapPin size={11} className="shrink-0" /> {ubic}
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onContactar(oferta)}
        className="w-full py-2.5 bg-slate-800/80 hover:bg-emerald-700/40 text-emerald-300 text-sm font-bold flex items-center justify-center gap-2 border-t border-slate-700"
      >
        <Phone size={14} /> Contactar al vendedor
      </button>
    </div>
  );
}

/* ════════════════════════ DETALLE + CONTACTO ════════════════════════ */

function DetalleOferta({ oferta, onClose, onEliminar }) {
  const contacto = construirContacto(oferta);
  const ref = resolverPrecioReferencia(oferta.producto);
  const precio = formatearCOP(oferta.precio);
  const cat = CATEGORIAS.find((c) => c.id === oferta.categoria);
  // RED humana: paso de cierre "¿se concretó el negocio?" — el gesto que
  // alimenta el grafo social + la reputación (services/red). Solo para
  // ofertas PROPIAS: el productor registra su propio trato.
  const [cerrandoTrato, setCerrandoTrato] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Detalle de ${oferta.producto}`}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-slate-900 rounded-t-2xl sm:rounded-2xl border border-slate-700 max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-800 sticky top-0 bg-slate-900">
          <button type="button" onClick={onClose} aria-label="Cerrar" className="p-2 -ml-2 text-slate-400 hover:text-white">
            <ArrowLeft size={20} />
          </button>
          <span className="font-bold text-white text-sm truncate px-2">{oferta.producto}</span>
          <span className="w-8" />
        </div>

        <div className="p-4 space-y-4">
          {oferta.fotoDataUrl && (
            <img src={oferta.fotoDataUrl} alt={oferta.producto} className="w-full h-44 object-cover rounded-lg" />
          )}

          <div>
            <p className="text-emerald-300 font-black text-2xl">
              {precio ? precio : 'A convenir'}
              <span className="text-slate-400 font-normal text-sm"> / {oferta.unidad}</span>
            </p>
            <p className="text-slate-400 text-sm mt-1">
              {oferta.cantidad} {oferta.unidad} · {cat?.icon} {cat?.label || 'Producto'}
            </p>
          </div>

          {/* Precio de referencia GROUNDEADO o deflección honesta */}
          <PrecioReferenciaBloque referencia={ref} />

          {(oferta.finca || oferta.vereda || oferta.municipio) && (
            <div className="text-sm text-slate-300">
              {oferta.finca && <p className="font-semibold">{oferta.finca}</p>}
              {[oferta.vereda, oferta.municipio].filter(Boolean).length > 0 && (
                <p className="text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin size={13} /> {[oferta.vereda, oferta.municipio].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          )}

          {oferta.nota && <p className="text-slate-300 text-sm leading-snug">{oferta.nota}</p>}

          {/* Contacto directo — sin pagos dentro de la app (deflección honesta) */}
          {contacto ? (
            <a
              href={contacto.href}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2"
            >
              <Phone size={18} /> Escribir por WhatsApp
            </a>
          ) : (
            <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3 flex gap-2 text-sm text-slate-300">
              <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
              {oferta.demo
                ? 'Esta es una oferta de ejemplo: no tiene un contacto real. Publique la suya para que le puedan escribir.'
                : 'Este vendedor no dejó un contacto directo. Coordine con él en su mercado campesino o agrofería.'}
            </div>
          )}

          <p className="text-[11px] text-slate-500 leading-snug flex gap-1.5">
            <Info size={13} className="shrink-0 mt-0.5" />
            El pago y la entrega se acuerdan directamente entre comprador y vendedor.
            Chagra no procesa pagos ni garantiza la transacción.
          </p>

          {/* Cierre de trato (solo ofertas propias): alimenta la RED humana —
              de este registro salen el grafo social y la reputación ganada. */}
          {!oferta.demo && (
            <button
              type="button"
              onClick={() => setCerrandoTrato(true)}
              data-testid="abrir-cierre-trato"
              className="w-full min-h-[48px] rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold text-sm flex items-center justify-center gap-2"
            >
              <Handshake size={16} /> ¿Ya vendió? Registrar el trato
            </button>
          )}

          {/* Retirar publicación (solo ofertas propias, no ejemplos) */}
          {!oferta.demo && (
            <button
              type="button"
              onClick={() => onEliminar(oferta.id)}
              className="w-full min-h-[44px] rounded-lg border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-semibold text-sm flex items-center justify-center gap-2"
            >
              <Trash2 size={15} /> Retirar mi publicación
            </button>
          )}
        </div>
      </div>

      {cerrandoTrato && (
        <CierreTratoSheet oferta={oferta} onClose={() => setCerrandoTrato(false)} />
      )}
    </div>
  );
}

/**
 * PrecioReferenciaBloque — cita el precio de referencia mayorista SIPSA/DANE
 * (banda + plaza(s) + boletín fechado) o deflecta honestamente si no hay dato
 * para el producto. Es una FOTO puntual del boletín, no un precio en vivo: por
 * eso el rótulo dice "referencia" y siempre muestra la fecha del boletín, y
 * por eso NUNCA se dibuja una flecha de tendencia (no hay serie temporal
 * detrás, solo un punto — inventar una tendencia sería alucinar).
 *
 * `contexto` ajusta solo el texto de la deflección (cuando no hay dato):
 *   - 'oferta'   (default): la ve un comprador mirando una oferta publicada.
 *   - 'publicar': la ve el productor mientras redacta su propia oferta.
 *
 * @param {object} props
 * @param {{disponible:boolean, banda?:string, mercado?:string, fuente?:string,
 *   fuenteUrl?:string, boletinFecha?:string}} props.referencia
 * @param {'oferta'|'publicar'} [props.contexto]
 */
function PrecioReferenciaBloque({ referencia, contexto = 'oferta' }) {
  if (referencia.disponible) {
    return (
      <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-3 text-sm">
        <p className="text-sky-200 font-semibold flex items-center gap-1.5">
          <Tag size={14} /> Referencia SIPSA (precio mayorista)
        </p>
        <p className="text-white mt-1">{referencia.banda}{referencia.mercado ? ` · ${referencia.mercado}` : ''}</p>
        <p className="text-slate-400 text-xs mt-1">
          {referencia.fuenteUrl ? (
            <a href={referencia.fuenteUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-sky-300">
              Fuente: {referencia.fuente}
            </a>
          ) : (
            <>Fuente: {referencia.fuente}</>
          )}
          {referencia.boletinFecha ? ` · boletín ${referencia.boletinFecha}` : ''}
        </p>
        <p className="text-slate-500 text-[11px] mt-1.5">
          {contexto === 'publicar'
            ? 'Es una referencia mayorista, no lo que le van a pagar a usted en finca. Úsela solo para calibrar su precio.'
            : 'Es una referencia mayorista de ese día, no un precio en vivo.'}
        </p>
      </div>
    );
  }
  // Deflección honesta: NO inventamos un precio de referencia.
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3 text-sm text-slate-300 flex gap-2">
      <Info size={15} className="text-slate-400 shrink-0 mt-0.5" />
      <span>
        {contexto === 'publicar'
          ? 'Sin referencia SIPSA para este producto todavía. Ponga usted el precio que considere justo.'
          : 'Sin precio de referencia todavía. La consulta de precios mayoristas (SIPSA/DANE) aún no está disponible en Chagra; el precio que usted ve lo puso el productor.'}
      </span>
    </div>
  );
}

/* ════════════════════════ PUBLICAR ════════════════════════ */

function PublicarPanel({ onPublicada, onCancelar }) {
  const perfil = useMemo(() => getProfile(), []);
  const [form, setForm] = useState(() => ({
    producto: '',
    categoria: 'hortaliza',
    cantidad: '',
    unidad: 'kg',
    precio: '',
    finca: perfil.finca_nombre || perfil.nombre_finca || '',
    vereda: perfil.vereda || '',
    municipio: perfil.municipio || perfil.departamento || '',
    contactoTel: '',
    nota: '',
  }));
  const [fotoBlob, setFotoBlob] = useState(null);
  const [errors, setErrors] = useState(/** @type {{ producto?: string, cantidad?: string, unidad?: string, precio?: string }} */ ({}));
  const [guardando, setGuardando] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // Precio de referencia SIPSA/DANE mientras el productor escribe el producto:
  // se calcula solo con 3+ caracteres para no mostrar la deflección sobre un
  // campo recién abierto. Reusa la misma lógica GROUNDEADA que el detalle de
  // la oferta (resolverPrecioReferencia) — nunca inventa un precio.
  const refPrecio = useMemo(() => {
    const q = form.producto.trim();
    return q.length >= 3 ? resolverPrecioReferencia(q) : null;
  }, [form.producto]);

  const handleGuardar = useCallback(async () => {
    const { ok, errors: errs } = validarOferta(form);
    setErrors(errs);
    if (!ok) return;
    setGuardando(true);
    try {
      let fotoDataUrl = null;
      if (fotoBlob) {
        try {
          fotoDataUrl = await blobToDataUrl(fotoBlob);
        } catch {
          fotoDataUrl = null; // la foto es opcional: no bloquea la publicación
        }
      }
      await marketplaceOfertas.save({
        producto: form.producto.trim(),
        categoria: form.categoria,
        cantidad: Number(form.cantidad),
        unidad: form.unidad,
        precio: form.precio === '' ? null : Number(form.precio),
        finca: form.finca.trim(),
        vereda: form.vereda.trim(),
        municipio: form.municipio.trim(),
        contactoTel: form.contactoTel.trim(),
        nota: form.nota.trim(),
        fotoDataUrl,
      });
      onPublicada();
    } catch (e) {
      console.warn('[Mercados] no se pudo publicar la oferta:', e?.message);
      setErrors({ producto: 'No se pudo guardar. Intente de nuevo.' });
    } finally {
      setGuardando(false);
    }
  }, [form, fotoBlob, onPublicada]);

  return (
    <div className="space-y-4">
      <Field label="¿Qué vende?" error={errors.producto} required>
        <input
          type="text"
          value={form.producto}
          onChange={(e) => set('producto', e.target.value)}
          placeholder="Ej: Tomate chonto, miel, papa criolla…"
          className="form-input"
        />
      </Field>

      <Field label="Categoría">
        <select value={form.categoria} onChange={(e) => set('categoria', e.target.value)} className="form-input">
          {CATEGORIAS.map((c) => (
            <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Cantidad" error={errors.cantidad} required>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            value={form.cantidad}
            onChange={(e) => set('cantidad', e.target.value)}
            placeholder="Ej: 50"
            className="form-input"
          />
        </Field>
        <Field label="Unidad" error={errors.unidad} required>
          <select value={form.unidad} onChange={(e) => set('unidad', e.target.value)} className="form-input">
            {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </Field>
      </div>

      {refPrecio && <PrecioReferenciaBloque referencia={refPrecio} contexto="publicar" />}

      <Field label="Precio por unidad (opcional)" error={errors.precio} hint="Déjelo vacío si prefiere 'a convenir'. Chagra no sugiere precios.">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={form.precio}
            onChange={(e) => set('precio', e.target.value)}
            placeholder="A convenir"
            className="form-input pl-7"
          />
        </div>
      </Field>

      <Field label="Foto (opcional)">
        <PhotoCaptureField
          label="Agregar foto del producto"
          value={fotoBlob}
          onPhoto={setFotoBlob}
          onRemove={() => setFotoBlob(null)}
        />
      </Field>

      <div className="grid grid-cols-1 gap-3">
        <Field label="Finca (opcional)">
          <input type="text" value={form.finca} onChange={(e) => set('finca', e.target.value)} placeholder="Nombre de su finca" className="form-input" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Vereda (opcional)">
            <input type="text" value={form.vereda} onChange={(e) => set('vereda', e.target.value)} placeholder="Vereda" className="form-input" />
          </Field>
          <Field label="Municipio (opcional)">
            <input type="text" value={form.municipio} onChange={(e) => set('municipio', e.target.value)} placeholder="Municipio" className="form-input" />
          </Field>
        </div>
      </div>

      <Field label="Teléfono de contacto (opcional)" hint="Para que le escriban por WhatsApp. Si no lo pone, coordina en el mercado.">
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
          <input
            type="tel"
            inputMode="tel"
            value={form.contactoTel}
            onChange={(e) => set('contactoTel', e.target.value)}
            placeholder="Ej: 300 123 4567"
            className="form-input pl-9"
          />
        </div>
      </Field>

      <Field label="Descripción (opcional)">
        <textarea
          value={form.nota}
          onChange={(e) => set('nota', e.target.value)}
          rows={3}
          placeholder="Cómo lo produce, cuándo entrega, calidad…"
          className="form-input resize-none"
        />
      </Field>

      {errors.producto && !form.producto && (
        <p className="text-rose-400 text-sm flex items-center gap-1.5">
          <AlertCircle size={14} /> {errors.producto}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancelar}
          className="flex-1 min-h-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleGuardar}
          disabled={guardando}
          className="flex-1 min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold flex items-center justify-center gap-2"
        >
          <CheckCircle2 size={18} /> {guardando ? 'Publicando…' : 'Publicar oferta'}
        </button>
      </div>

      <style>{`
        .form-input{
          width:100%;padding:10px 12px;border-radius:10px;
          background:rgb(30 41 59);border:1px solid rgb(51 65 85);
          color:#fff;font-size:14px;min-height:44px;
        }
        .form-input::placeholder{color:rgb(100 116 139)}
        .form-input:focus{outline:none;border-color:rgb(16 185 129)}
      `}</style>
    </div>
  );
}

/**
 * @param {Object} props
 * @param {string} props.label
 * @param {import('react').ReactNode} props.children
 * @param {string} [props.error]
 * @param {string} [props.hint]
 * @param {boolean} [props.required]
 */
function Field({ label, children, error, hint, required }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-slate-200 mb-1.5">
        {label} {required && <span className="text-rose-400">*</span>}
      </span>
      {children}
      {hint && !error && <span className="block text-xs text-slate-500 mt-1">{hint}</span>}
      {error && <span className="block text-xs text-rose-400 mt-1">{error}</span>}
    </label>
  );
}
