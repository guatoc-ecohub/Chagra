/* eslint-disable chagra-i18n/no-hardcoded-spanish --
 * Los textos de UI de esta tarjeta (título "Red de fincas", resúmenes,
 * aria-labels) son strings de interfaz. Su migración a src/config/messages.js
 * es la TAREA i18n de ADR-050 (transversal a toda la app), fuera del alcance de
 * esta feature visual — mismo criterio que MiFincaVivaHomeCard.jsx y
 * ExtensionistaScreen.jsx en este repo. */
import { useMemo } from 'react';
import {
  Users, AlertTriangle, Clock, CheckCircle2, FlaskConical, Info, MapPin, ChevronRight,
} from 'lucide-react';
import { construirTableroExtensionista } from '../../services/extensionistaService';
import { getActiveTenantId } from '../../services/tenantContext';
import { esOperadorActual } from '../../config/glaciarAccess';
import { WORLD_STAGES } from '../../services/fincaGameService';
import FincaWorldScene from '../juego/FincaWorldScene';
import '../juego/juego-finca.css';

/**
 * FincaRedInstitucional — la VISTA INSTITUCIONAL del home para el modo
 * extensionista/supervisor (ADR-048). En vez de la escena de UNA finca propia,
 * muestra la RED de fincas que el usuario acompaña: agregados arriba (total /
 * con alertas / con pendientes) + cada finca como una mini-escena "Finca Viva"
 * enriquecida (estado de un vistazo, lo urgente arriba). Coherente con la
 * estética del mockup F2 ("Finca Viva Evolutiva"): cada finca es un mundo vivo.
 *
 * DATOS: `construirTableroExtensionista(username)` (extensionistaService) sobre
 * el mock `extensionista-fincas.json` (ADR-048 MVP — la delegación real es
 * follow-up backend UCAN/farm_did_auth). NO inventa datos: si no hay fincas
 * para el tenant y el usuario es operador (demo/ministerial), cae al mock de
 * ejemplo `demo-extensionista`, igual que ExtensionistaScreen.
 *
 * La VARIANTE de la mini-escena se deriva de la zona biocultural de cada finca
 * (zona de páramo → escena de páramo; resto → finca rural) y su "vitalidad"
 * visual del estado (al día = más viva; sin sincronizar = más sobria). Es
 * representación glanceable, NO una inferencia agronómica.
 *
 * Offline-first (tenant + mock local, sin red). SVG rsvg-safe, animaciones que
 * respetan prefers-reduced-motion (juego-finca.css). Español Colombia (usted),
 * sin voseo.
 *
 * @param {Object} props
 * @param {Function} [props.onNavigate] navegación de la app (abre 'extensionista').
 */
export default function FincaRedInstitucional({ onNavigate }) {
  // Tablero del extensionista. Mismo criterio de fallback que ExtensionistaScreen:
  // si el tenant activo no tiene fincas delegadas y es operador, usar el mock de
  // ejemplo para que el demo muestre valor (datos ya marcados como "vista previa").
  const tablero = useMemo(() => {
    const propio = construirTableroExtensionista(getActiveTenantId());
    if (propio.fincas.length > 0) return propio;
    if (esOperadorActual()) return construirTableroExtensionista('demo-extensionista');
    return propio;
  }, []);

  const { fincas, resumen } = tablero;
  const abrirPanel = () => onNavigate?.('extensionista');

  return (
    <section
      data-testid="finca-red-institucional"
      className="bg-gradient-to-br from-sky-950/70 to-emerald-950/50 border border-sky-800/40 rounded-2xl overflow-hidden"
    >
      {/* Encabezado: red de fincas + acceso al panel completo */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Users size={18} className="text-sky-300 shrink-0" aria-hidden="true" />
          <h3 className="text-base font-bold text-white truncate">Red de fincas que acompaño</h3>
        </div>
        <button
          type="button"
          onClick={abrirPanel}
          aria-label="Abrir el panel de extensionista"
          className="flex items-center gap-1 text-xs font-semibold text-sky-300/80 hover:text-sky-200 active:scale-95 transition"
        >
          Panel
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>

      {/* Agregados arriba (de un vistazo): total / con alertas / con pendientes */}
      <div className="flex flex-wrap gap-2 px-4 pb-3">
        <Agregado icon={Users} valor={resumen.total} label="fincas" tono="neutro" />
        <Agregado
          icon={AlertTriangle}
          valor={resumen.con_alertas}
          label="con alertas"
          tono={resumen.con_alertas > 0 ? 'alerta' : 'ok'}
        />
        <Agregado
          icon={FlaskConical}
          valor={resumen.con_pendientes}
          label="con pendientes"
          tono={resumen.con_pendientes > 0 ? 'aviso' : 'ok'}
        />
      </div>

      {/* Red de fincas como mini-escenas vivas, o estado vacío honesto */}
      {fincas.length === 0 ? (
        <div className="mx-4 mb-4 rounded-xl border border-dashed border-slate-700/60 bg-slate-900/30 p-6 text-center">
          <p className="text-sm font-semibold text-slate-300 mb-1">
            Todavía no hay fincas asignadas
          </p>
          <p className="text-xs text-slate-500">
            Cuando un agricultor le delegue el acompañamiento de su finca,
            aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-4 pb-4">
          {fincas.map((finca) => (
            <FincaMini key={finca.slug} finca={finca} onAbrir={abrirPanel} />
          ))}
        </div>
      )}

      {/* Aviso de frontera MVP — vista previa, no autorización verificada. */}
      <div className="mx-4 mb-4 rounded-xl border border-sky-700/40 bg-sky-900/20 p-3 text-[11px] text-sky-200/90 flex items-start gap-2">
        <Info size={14} className="shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          Vista previa: datos de ejemplo. Todavía no es una autorización
          verificada con cada agricultor — esa delegación segura llega
          próximamente.
        </span>
      </div>
    </section>
  );
}

/** Estilos por tono semántico del estado (alineados con ExtensionistaScreen). */
const TONO_CLASES = {
  alerta: 'border-red-600/50 bg-red-900/20 text-red-200',
  aviso: 'border-amber-600/50 bg-amber-900/20 text-amber-200',
  ok: 'border-emerald-600/50 bg-emerald-900/20 text-emerald-200',
  neutro: 'border-slate-600/50 bg-slate-800/30 text-slate-300',
};

const TONO_ICON = {
  alerta: AlertTriangle,
  aviso: Clock,
  ok: CheckCircle2,
  neutro: Info,
};

/**
 * Mapa estado → nivel de "vitalidad" visual de la mini-escena (cuánta vida se
 * dibuja). Representación glanceable, NO inferencia agronómica: una finca al día
 * se ve más viva; una sin sincronizar, más sobria (no sabemos su estado real).
 */
const ESTADO_NIVEL = {
  al_dia: 3,
  con_pendientes: 2,
  sin_sync_reciente: 1,
};

/** Agregado superior (contador con icono y tono). */
function Agregado({ icon, valor, label, tono = 'neutro' }) {
  // Const capitalizado para el tag JSX (la config ESLint no incluye
  // eslint-plugin-react; un PARÁMETRO usado solo como tag se marca no-usado,
  // un const ^[A-Z_] matchea varsIgnorePattern). Mismo patrón que
  // ExtensionistaScreen.ResumenChip.
  const Icono = icon;
  return (
    <div className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 ${TONO_CLASES[tono]}`}>
      <Icono size={16} aria-hidden="true" className="shrink-0" />
      <div className="leading-tight">
        <div className="text-base font-bold">{valor}</div>
        <div className="text-[10px] opacity-80">{label}</div>
      </div>
    </div>
  );
}

/**
 * FincaMini — una finca de la red como mini-escena "Finca Viva" + cabecera con
 * estado. Reusa FincaWorldScene (la misma escena del home) con una variante y un
 * `stage` derivados de la zona y el estado de la finca (no de datos propios).
 */
function FincaMini({ finca, onAbrir }) {
  const tono = finca?._clasificacion?.tono || 'neutro';
  const EstadoIcon = TONO_ICON[tono] || Info;

  const esParamo = String(finca.biocultural_zone || '')
    .toLowerCase()
    .includes('paramo');

  // Variante de escena: páramo si la zona lo es; resto, finca rural.
  const variant = useMemo(
    () => ({
      kind: esParamo ? 'paramo' : 'finca',
      escala: 'media',
      animales: false,
      cerdos: false,
      tinte: esParamo ? 'paramo' : 'templado',
    }),
    [esParamo],
  );

  // Stage (vitalidad visual) desde el estado; sin sync reciente = escena vacía
  // honesta (no fingimos vida que no sabemos que exista).
  const nivel = ESTADO_NIVEL[finca.estado] ?? 1;
  const stage = WORLD_STAGES[nivel] || WORLD_STAGES[1];
  const escenaVacia = finca.estado === 'sin_sync_reciente';

  return (
    <button
      type="button"
      onClick={onAbrir}
      aria-label={`${finca.nombre}: ${finca?._clasificacion?.label || 'estado desconocido'}. Abrir panel.`}
      className="text-left rounded-xl border border-slate-700/60 bg-slate-900/40 overflow-hidden hover:border-sky-500/60 active:scale-[0.99] transition"
    >
      {/* Mini-escena viva (la misma FincaWorldScene del home, en pequeño) */}
      <div className="h-24 overflow-hidden">
        <FincaWorldScene stage={stage} criaturas={[]} vacia={escenaVacia} variant={variant} />
      </div>

      {/* Cabecera con nombre + estado */}
      <div className="px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-bold text-white truncate">{finca.nombre}</h4>
          <span
            className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${TONO_CLASES[tono]}`}
          >
            <EstadoIcon size={11} aria-hidden="true" />
            {finca?._clasificacion?.label || 'Estado desconocido'}
          </span>
        </div>
        {(finca.vereda || finca.municipio) && (
          <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
            <MapPin size={11} aria-hidden="true" className="shrink-0" />
            <span className="truncate">
              {[finca.vereda, finca.municipio].filter(Boolean).join(', ')}
            </span>
          </p>
        )}
        <div className="flex flex-wrap gap-1.5 mt-1.5 text-[10px]">
          {(finca.pendientes || 0) > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-900/30 border border-amber-700/40 px-1.5 py-0.5 text-amber-200">
              <FlaskConical size={10} aria-hidden="true" />
              {finca.pendientes} pendiente{finca.pendientes === 1 ? '' : 's'}
            </span>
          )}
          {(finca.alertas || 0) > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-red-900/30 border border-red-700/40 px-1.5 py-0.5 text-red-200">
              <AlertTriangle size={10} aria-hidden="true" />
              {finca.alertas} alerta{finca.alertas === 1 ? '' : 's'}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
