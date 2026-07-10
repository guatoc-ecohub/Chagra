import { useEffect, useMemo } from 'react';
import {
  Users, MapPin, AlertTriangle, Clock, CheckCircle2, FlaskConical,
  Sprout, Info, UserCircle2,
} from 'lucide-react';
import { ScreenShell } from './common/ScreenShell';
import { esExtensionistaActual } from '../config/extensionistaAccess';
import { esOperadorActual } from '../config/glaciarAccess';
import { construirTableroExtensionista } from '../services/extensionistaService';
import { getActiveTenantId } from '../services/tenantContext';
import useFincaActiveStore from '../services/fincaActiveStore';

/**
 * ExtensionistaScreen — Panel SUPERVISOR del modo extensionista (ADR-048 MVP).
 *
 * Un extensionista (asesor de extensión rural EPSEA/SENA, técnico
 * Agrosavia/IPPTA, líder de asociación campesina) ve aquí las fincas que
 * supervisa, con un resumen y el estado de cada una. NO opera su propia finca:
 * acompaña las de otros.
 *
 * FRONTERA MVP (importante para no confundir a un piloto):
 *   - Lo que se ve sale de un MOCK estático + whitelist client-side. NO es una
 *     autorización verificada server-side.
 *   - La delegación real (el agricultor autoriza al extensionista) y los datos
 *     en vivo por finca son FOLLOW-UP backend: UCAN delegations + módulo Drupal
 *     `farm_did_auth` (ADR-036 sub-i/sub-iv). Por eso el panel muestra un aviso
 *     claro de "vista previa".
 *
 * Ruta: #extensionista. Gateado por feature flag VITE_FEATURE_EXTENSIONISTA +
 * rol (ver extensionistaAccess.js) — App.jsx ya redirige a quien no tenga
 * acceso, pero esta pantalla repite el guard de forma defensiva.
 *
 * Offline-first (lee tenant + mock local, sin red). Theme-aware vía ScreenShell
 * (la foto de fondo del body se ve a través del scrim). Español Colombia, SIN
 * voseo argentino.
 */

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

function formatearFecha(iso) {
  if (!iso) return 'sin registro';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'sin registro';
  // Formato corto local (es-CO). Sin hora para mantenerlo legible en campo.
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

function ResumenChip({ icon, valor, label, tono = 'neutro' }) {
  // Asignamos a un const capitalizado (mismo patrón que FincaCard con
  // EstadoIcon). La config de ESLint no incluye eslint-plugin-react, así que
  // un PARÁMETRO usado solo como tag JSX se marca como no-usado; un const
  // capitalizado (matchea varsIgnorePattern ^[A-Z_]) no tiene ese problema.
  const Icono = icon;
  return (
    <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${TONO_CLASES[tono]}`}>
      <Icono size={18} aria-hidden="true" className="shrink-0" />
      <div className="leading-tight">
        <div className="text-lg font-bold">{valor}</div>
        <div className="text-[11px] opacity-80">{label}</div>
      </div>
    </div>
  );
}

function FincaCard({ finca }) {
  const tono = finca?._clasificacion?.tono || 'neutro';
  const EstadoIcon = TONO_ICON[tono] || Info;
  return (
    <article className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-white truncate flex items-center gap-2">
            <Sprout size={16} className="text-emerald-400 shrink-0" aria-hidden="true" />
            {finca.nombre}
          </h3>
          <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
            <UserCircle2 size={13} aria-hidden="true" />
            <span className="truncate">Agricultor: {finca.operador}</span>
          </p>
          {(finca.vereda || finca.municipio) && (
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
              <MapPin size={13} aria-hidden="true" />
              <span className="truncate">
                {[finca.vereda, finca.municipio].filter(Boolean).join(', ')}
              </span>
            </p>
          )}
        </div>
        <span
          className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${TONO_CLASES[tono]}`}
        >
          <EstadoIcon size={13} aria-hidden="true" />
          {finca?._clasificacion?.label || 'Estado desconocido'}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-800/60 px-2 py-1 text-slate-300">
          <Clock size={12} aria-hidden="true" />
          Última sync: {formatearFecha(finca.ultima_sync_iso)}
        </span>
        {(finca.pendientes || 0) > 0 && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-900/30 border border-amber-700/40 px-2 py-1 text-amber-200">
            <FlaskConical size={12} aria-hidden="true" />
            {finca.pendientes} pendiente{finca.pendientes === 1 ? '' : 's'}
          </span>
        )}
        {(finca.alertas || 0) > 0 && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-red-900/30 border border-red-700/40 px-2 py-1 text-red-200">
            <AlertTriangle size={12} aria-hidden="true" />
            {finca.alertas} alerta{finca.alertas === 1 ? '' : 's'}
          </span>
        )}
      </div>
    </article>
  );
}

/** @param {{ onBack: () => void, onHome?: () => void }} props */
export default function ExtensionistaScreen({ onBack, onHome }) {
  // Guard defensivo de rol (App.jsx ya redirige, pero repetimos acá por si la
  // pantalla se monta por una ruta directa). Si no hay rol → no construimos el
  // tablero ni mostramos fincas.
  const tieneRol = esExtensionistaActual();
  const activeFincaSlug = useFincaActiveStore((s) => s.activeFincaSlug);
  const setActiveFinca = useFincaActiveStore((s) => s.setActiveFinca);

  // El operador (visión total / demo, p. ej. el panel ministerial) suele tener
  // un tenant propio (admin) que NO está en el mock de delegaciones, así que su
  // tablero saldría vacío. Para que el panel DEMUESTRE valor en el demo, si no
  // hay fincas para el tenant activo y el usuario es operador, caemos al MOCK de
  // ejemplo (`demo-extensionista`). Son los mismos datos ya marcados como "vista
  // previa / datos de ejemplo" en la UI — NO se inventan datos nuevos.
  const tablero = useMemo(() => {
    if (!tieneRol) return null;
    const propio = construirTableroExtensionista(getActiveTenantId());
    if (propio.fincas.length > 0) return propio;
    if (esOperadorActual()) return construirTableroExtensionista('demo-extensionista');
    return propio;
  }, [tieneRol]);

  const fincasDelegadas = useMemo(() => tablero?.fincas || [], [tablero]);

  useEffect(() => {
    if (!tieneRol || fincasDelegadas.length === 0) return;
    const activeExists = fincasDelegadas.some((f) => f.slug === activeFincaSlug);
    if (!activeExists) {
      setActiveFinca(fincasDelegadas[0].slug);
    }
  }, [activeFincaSlug, fincasDelegadas, setActiveFinca, tieneRol]);

  if (!tieneRol) {
    return (
      <ScreenShell title="Modo extensionista" icon={Users} onBack={onBack} onHome={onHome}>
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <Users size={40} className="text-slate-500" aria-hidden="true" />
          <h2 className="text-lg font-bold text-white">Vista no disponible</h2>
          <p className="text-sm text-slate-400 max-w-sm">
            No tienes acceso al modo extensionista. Este panel es para asesores
            de extensión rural que acompañan varias fincas. Si crees que deberías
            tener acceso, contacta al equipo de Chagra.
          </p>
        </div>
      </ScreenShell>
    );
  }

  const { fincas, resumen } = tablero;

  return (
    <ScreenShell title="Fincas que acompaño" icon={Users} onBack={onBack} onHome={onHome}>
      <div className="flex flex-col gap-4 px-4 py-4 pb-8 max-w-2xl mx-auto w-full">
        <p className="text-sm text-slate-300 leading-relaxed">
          Panel del extensionista: las fincas que supervisas, con su estado de un
          vistazo. Lo urgente aparece arriba. Toca una finca para ver su detalle
          (próximamente).
        </p>

        {fincasDelegadas.length > 0 && (
          <div className="rounded-2xl border border-emerald-700/30 bg-emerald-950/20 p-4 space-y-3">
            <div>
              {/* eslint-disable-next-line chagra-i18n/no-hardcoded-spanish -- i18n progresiva (ADR-050): esta pantalla aún no está migrada a messages.js; el resto de sus strings tampoco. Migración fuera del alcance de este fix. */}
              <p className="text-sm font-semibold text-emerald-200">Finca activa</p>
              <p className="text-xs text-emerald-300/80">
                Elige cuál de las fincas delegadas quieres gestionar ahora.
              </p>
            </div>
            <label className="block">
              <span className="sr-only">Selector de finca activa</span>
              <select
                data-testid="finca-selector"
                value={activeFincaSlug}
                onChange={(e) => setActiveFinca(e.target.value)}
                className="w-full rounded-xl border border-emerald-700/40 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
              >
                {fincasDelegadas.map((finca) => (
                  <option key={finca.slug} value={finca.slug}>
                    {finca.nombre} ({finca.municipio || 'sin municipio'})
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {/* Aviso de frontera MVP — para no confundir vista previa con permiso real. */}
        <div className="rounded-xl border border-sky-700/40 bg-sky-900/20 p-3 text-xs text-sky-200 flex items-start gap-2">
          <Info size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            Vista previa: estas fincas son datos de ejemplo. Todavía no es una
            autorización verificada con cada agricultor — esa delegación segura
            llega próximamente. Por ahora sirve para probar cómo se verá el
            acompañamiento a varias fincas.
          </span>
        </div>

        {/* Resumen agregado. */}
        <div className="flex flex-wrap gap-2">
          <ResumenChip icon={Users} valor={resumen.total} label="fincas que acompañas" tono="neutro" />
          <ResumenChip icon={AlertTriangle} valor={resumen.con_alertas} label="con alertas" tono={resumen.con_alertas > 0 ? 'alerta' : 'ok'} />
          <ResumenChip icon={FlaskConical} valor={resumen.con_pendientes} label="con pendientes" tono={resumen.con_pendientes > 0 ? 'aviso' : 'ok'} />
        </div>

        {/* Lista de fincas o estado vacío. */}
        {fincas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700/60 bg-slate-900/30 p-8 text-center">
            <Sprout size={32} className="text-slate-600 mx-auto mb-3" aria-hidden="true" />
            <h3 className="text-sm font-bold text-slate-300 mb-1">
              Todavía no tienes fincas asignadas
            </h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Cuando un agricultor te delegue el acompañamiento de su finca,
              aparecerá aquí.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {fincas.map((finca) => (
              <button
                key={finca.slug}
                type="button"
                onClick={() => setActiveFinca(finca.slug)}
                className={`text-left rounded-2xl border transition-colors ${
                  finca.slug === activeFincaSlug
                    ? 'border-emerald-500/70 ring-1 ring-emerald-500/40'
                    : 'border-slate-700/60 hover:border-slate-500/80'
                }`}
              >
                <FincaCard finca={finca} />
              </button>
            ))}
          </div>
        )}
      </div>
    </ScreenShell>
  );
}
