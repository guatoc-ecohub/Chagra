import { useMemo } from 'react';
import { AlertTriangle, ShieldCheck, Scale, Ruler, Leaf, Sprout, Activity } from 'lucide-react';
import { evaluarPSA } from '../services/psaElegibilidad';
import { detectarAlertaCarbono } from '../services/carbonoAlerta';
import RESTAURACION from '../data/restauracion.json';
import CARBONO_CAPTURA from '../data/carbono-captura.json';
import PSA_DATA from '../data/psa.json';
import { calcularCarbonoSeguimiento } from '../services/carbonoSeguimiento';

/**
 * Lista cruda de modalidades PSA, para el caso "el perfil de la finca no
 * permite decidir elegibilidad": en vez de inventar elegibilidad, mostramos el
 * menú completo de psa.json para que el campesino lo consulte con su CAR.
 */
const PSA_MODALIDADES = Array.isArray(PSA_DATA?.modalidades) ? PSA_DATA.modalidades : [];

/**
 * CarbonoPsaSubvista — sub-vista "Carbono y PSA" DENTRO del seguimiento de
 * Reforestación (process_type 'restoration'). Operador 2026-06-15.
 *
 * Tres bloques, en este orden de prioridad (lo defensivo primero):
 *   1. ALERTA ANTI-TRAMPA de bonos de carbono (PROMINENTE). Reusa la guarda
 *      cerrada `restauracion.json.guardas.bonos_carbono` + el detector
 *      `carbonoAlerta.detectarAlertaCarbono` (mismas trampas/recomendacion que
 *      usa el agente). NO duplica el texto: lo lee de los datos.
 *   2. ELEGIBILIDAD PSA: reusa `psaElegibilidad.evaluarPSA` + `psa.json`.
 *   3. ESTIMACION DE CO2 — anti-alucinacion ESTRICTA: muestra el RANGO de
 *      referencia con FUENTE (carbono-captura.json, DR-RESTAURACION-1) marcado
 *      [VALIDAR], y el METODO (que se necesitaria medir). NUNCA un numero
 *      exacto calculado para el predio: sin medicion de campo no hay cifra.
 *
 * Hereda el gate por perfil de Reforestacion (homeModuleSelector): el perfil
 * urbano nunca llega aca, asi que esta sub-vista no necesita re-gatear.
 *
 * @param {object} props
 * @param {object} [props.proceso] FarmProcess de la reforestacion (para contexto:
 *   # arboles / zona). Solo se usa para CONTEXTUALIZAR, nunca para fabricar cifras.
 * @param {{altitud?: number, enCuenca?: boolean, enParamo?: boolean}} [props.perfilFinca]
 *   Perfil de la finca para evaluar elegibilidad PSA.
 */
export default function CarbonoPsaSubvista({ proceso, perfilFinca }) {
  const a = proceso?.attributes || {};
  const carbono = useMemo(() => calcularCarbonoSeguimiento(proceso), [proceso]);

  // 1) Alerta anti-trampa. La guarda cerrada SIEMPRE se muestra (es defensiva,
  //    no depende de que el campesino mencione "bonos"). Las trampas/recomendacion
  //    detalladas vienen del detector compartido con el agente.
  const guardaBonos = RESTAURACION?.guardas?.bonos_carbono || '';
  const detalleCarbono = useMemo(
    () => detectarAlertaCarbono('bonos de carbono'),
    [],
  );

  // 2) PSA. El interes en carbono se asume porque el campesino esta mirando esta
  //    sub-vista; el resto sale del perfil real de la finca (sin inventar).
  const psa = useMemo(
    () => evaluarPSA({ ...(perfilFinca || {}), interes: 'carbono' }),
    [perfilFinca],
  );

  // 3) CO2: ¿hay factor con fuente en los datos del repo? Si lo hay, se muestra
  //    como rango orientativo con fuente + [VALIDAR]. NUNCA se calcula un numero
  //    exacto para este predio (carbono-captura.requiere_medicion_campo === true).
  const rangos = Array.isArray(CARBONO_CAPTURA?.rangos_referencia)
    ? CARBONO_CAPTURA.rangos_referencia
    : [];
  const hayFactorConFuente = rangos.length > 0;
  const requiereMedicion = CARBONO_CAPTURA?.requiere_medicion_campo !== false;
  const metodo = CARBONO_CAPTURA?.metodo_estimacion || null;

  // Contexto del proceso (NO es un calculo de CO2; es lo que el campesino registro).
  const contexto = [];
  if (a.quantity) contexto.push(`${a.quantity} ${a.unit || ''}`.trim());
  if (a.subject_label) contexto.push(a.subject_label);

  return (
    <div className="flex flex-col gap-4" data-testid="carbono-psa-subvista">
      <header className="flex items-center gap-2">
        <Leaf size={18} className="text-lime-400 shrink-0" />
        <div>
          <h2 className="text-base font-bold text-white leading-tight">Carbono y PSA</h2>
          <p className="text-xs text-slate-400 leading-tight">
            Cómo se paga por restaurar — y cómo NO caer en trampas.
          </p>
        </div>
      </header>

      {/* ── 1. ALERTA ANTI-TRAMPA (prominente, defensiva) ─────────────── */}
      <section
        className="bg-red-900/30 border-2 border-red-700/70 rounded-xl p-4 flex flex-col gap-2"
        data-testid="alerta-bonos-carbono"
        role="alert"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className="text-red-400 shrink-0" />
          <h3 className="text-sm font-black text-red-200 uppercase tracking-wide">
            Cuidado con los bonos de carbono
          </h3>
        </div>
        <p className="text-xs text-red-100 leading-snug">{guardaBonos}</p>

        {detalleCarbono?.trampas?.length > 0 && (
          <ul className="flex flex-col gap-1.5 mt-1">
            {detalleCarbono.trampas.map((t) => (
              <li key={t.nombre} className="text-2xs text-red-100/90 leading-snug">
                <span className="font-bold text-red-200">{t.nombre}:</span> {t.riesgo}
              </li>
            ))}
          </ul>
        )}

        <p className="text-2xs text-red-100/90 leading-snug mt-1">
          <span className="font-bold">No firme sin asesoría jurídica.</span> Use la
          CAR (Corporación Autónoma Regional), los consultorios jurídicos
          universitarios, la Personería Municipal o la Defensoría del Pueblo —
          todos gratuitos.
        </p>

        {detalleCarbono?.recomendacion && (
          <p className="text-2xs text-red-200/80 italic leading-snug mt-1">
            {detalleCarbono.recomendacion}
          </p>
        )}
      </section>

      {/* ── 2. ELEGIBILIDAD PSA ───────────────────────────────────────── */}
      <section
        className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-2"
        data-testid="psa-elegibilidad"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
          <h3 className="text-sm font-bold text-emerald-200">
            Pago por Servicios Ambientales (PSA)
          </h3>
        </div>
        <p className="text-xs text-slate-300 leading-snug">
          La alternativa legal y más segura: el Estado (vía la CAR) le paga por
          conservar o restaurar. <span className="font-bold text-slate-100">La tierra sigue siendo suya.</span>
        </p>

        <p className="text-2xs text-slate-400">
          {psa.elegible
            ? 'Según el perfil de tu finca, podrías aplicar a estas modalidades:'
            : 'Modalidades del PSA que existen en Colombia (consulta con tu CAR cuál aplica a tu finca):'}
        </p>
        <ul className="flex flex-col gap-1.5">
          {(psa.elegible ? psa.modalidades : PSA_MODALIDADES).map((m) => (
            <li
              key={m.id}
              className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2"
            >
              <span className="block text-xs font-bold text-slate-100">{m.nombre}</span>
              <span className="block text-2xs text-slate-400 leading-snug">{m.que_cubre}</span>
            </li>
          ))}
        </ul>

        {psa.monto && (
          <p className="text-2xs text-slate-400 mt-1">
            <Scale size={11} className="inline mr-1 -mt-0.5" />
            Monto orientativo: <span className="text-slate-200 font-bold">{psa.monto}</span>.
            {' '}Autoridad: {psa.autoridad}.
          </p>
        )}

        {Array.isArray(psa.requisitos) && psa.requisitos.length > 0 && (
          <details className="mt-1">
            <summary className="text-2xs font-bold text-emerald-300 cursor-pointer">
              ¿Qué piden para aplicar?
            </summary>
            <ul className="list-disc list-inside mt-1 flex flex-col gap-0.5">
              {psa.requisitos.map((r, i) => (
                <li key={i} className="text-2xs text-slate-400 leading-snug">{r}</li>
              ))}
            </ul>
          </details>
        )}
      </section>

      {/* ── 3. ESTIMACION DE CO2 (anti-alucinacion estricta) ──────────── */}
      <section
        className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-2"
        data-testid="co2-estimacion"
      >
        <div className="flex items-center gap-2">
          <Ruler size={16} className="text-sky-400 shrink-0" />
          <h3 className="text-sm font-bold text-sky-200">Captura de CO₂</h3>
        </div>

        {contexto.length > 0 && <p className="text-2xs text-slate-500 leading-snug">Tu registro: {contexto.join(' · ')}.</p>}

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            <p className="text-3xs uppercase tracking-wide text-slate-500">Especie</p>
            <p className="text-sm font-bold text-slate-100 leading-tight">{carbono.speciesName}</p>
            <p className="text-2xs text-slate-500">{carbono.speciesScientific || 'Sin especie reconocida'}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            <p className="text-3xs uppercase tracking-wide text-slate-500">Área plantada</p>
            <p className="text-sm font-bold text-slate-100 leading-tight">{carbono.areaHa ? `${carbono.areaHa} ha` : 'Pendiente'}</p>
            <p className="text-2xs text-slate-500">{carbono.confidence === 'media' ? 'Estimación con especie reconocida' : 'Estimación conservadora'}</p>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-800/50 bg-emerald-950/20 p-3 flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sprout size={14} className="text-emerald-300" />
              <span className="text-xs font-bold text-emerald-200">Captura estimada</span>
            </div>
            <span className="text-xs font-black text-white">{carbono.yearlyTCO2Text}</span>
          </div>
          <p className="text-2xs text-emerald-100/80 leading-snug">
            {carbono.source}. {carbono.sourceNote}
          </p>
          <p className="text-3xs text-slate-400 leading-snug">
            {carbono.ageLabel}{carbono.ageYears != null ? ` · ${carbono.ageYears.toFixed(1)} años aprox.` : ''}{carbono.stockText ? ` · Stock de referencia ${carbono.stockText}` : ''}
          </p>
        </div>

        {/* MENSAJE DE VALIDACION SIEMPRE PRESENTE: nunca un numero exacto como hecho. */}
        <p className="text-xs text-amber-200 leading-snug font-medium" data-testid="co2-validacion">
          El cálculo de captura de CO₂ de tu predio sigue siendo una estimación.
          {' '}Cualquier cifra exacta sin medir es una aproximación preliminar
          <span className="font-bold"> [VALIDAR]</span>, no un hecho.
        </p>

        {hayFactorConFuente ? (
          <div className="bg-sky-950/30 border border-sky-800/50 rounded-lg p-3 flex flex-col gap-1.5" data-testid="co2-rango-referencia">
            <p className="text-2xs font-bold text-sky-300 uppercase tracking-wide">
              Rango de referencia (orientativo) · [VALIDAR]
            </p>
            <ul className="flex flex-col gap-1">
              {rangos.map((r) => (
                <li key={r.ecosistema} className="text-2xs text-slate-300 leading-snug">
                  <span className="font-bold text-slate-100">{r.ecosistema}:</span>{' '}
                  {Array.isArray(r.rango_tC_ha) ? `${r.rango_tC_ha[0]}–${r.rango_tC_ha[1]} tC/ha` : '—'}
                  {r.fuente ? <span className="text-slate-500"> · {r.fuente}</span> : null}
                </li>
              ))}
            </ul>
            {CARBONO_CAPTURA?.conversion?.explicacion && (
              <p className="text-3xs text-slate-500 leading-snug">
                {CARBONO_CAPTURA.conversion.explicacion}
              </p>
            )}
            <p className="text-3xs text-slate-500 leading-snug">
              Fuente: {CARBONO_CAPTURA.fuente}. Estimación preliminar — requiere
              medición de campo. La medición formal (MRV) es costosa e inviable
              para un campesino solo.
            </p>
          </div>
        ) : (
          <p className="text-2xs text-slate-400 leading-snug">
            No hay un factor de captura con fuente verificable para mostrar un
            rango. No se inventa ningún número.
          </p>
        )}

        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3" data-testid="co2-timeline">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={14} className="text-cyan-300" />
            <p className="text-2xs font-bold uppercase tracking-wide text-cyan-200">Línea de tiempo de captura acumulada</p>
          </div>
          <div className="flex items-end gap-2 h-28">
            {carbono.timeline.map((p) => (
              <div key={p.year} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex-1 flex items-end">
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-emerald-700 to-cyan-400"
                    style={{ height: `${Math.max(12, Math.min(100, (p.tco2 / Math.max(carbono.timeline.at(-1)?.tco2 || 1, 1)) * 100))}%` }}
                    aria-label={`${p.label} ${p.tco2.toFixed(2)} tCO2e acumuladas`}
                  />
                </div>
                <span className="text-3xs text-slate-500">{p.label}</span>
                <span className="text-3xs text-slate-300 font-bold">{p.tco2.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>

        {requiereMedicion && metodo && (
          <details className="mt-1">
            <summary className="text-2xs font-bold text-sky-300 cursor-pointer">
              {metodo.titulo}
            </summary>
            <ul className="list-disc list-inside mt-1 flex flex-col gap-0.5">
              {(metodo.pasos || []).map((p, i) => (
                <li key={i} className="text-2xs text-slate-400 leading-snug">{p}</li>
              ))}
            </ul>
            {metodo.advertencia && (
              <p className="text-3xs text-amber-300/80 italic leading-snug mt-1">
                {metodo.advertencia}
              </p>
            )}
            <p className="text-3xs text-slate-500 leading-snug mt-1">Fuente: {/** @type {any} */ (metodo).citation}.</p>
          </details>
        )}
      </section>
    </div>
  );
}
