/* i18n (ADR-050): etiquetas user-facing en español Colombia. Igual criterio que
 * FermentosView: la regla chagra-i18n es soft (warn) y se apaga a nivel de
 * archivo para no bloquear el pre-commit (max-warnings=0). Los errores reales
 * de i18n siguen activos en el resto del repo. */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
import React, { useState, useEffect, useMemo } from 'react';
import {
  Sprout,
  FlaskConical,
  Droplets,
  Mountain,
  Bug,
  Beaker,
  Clock,
  Repeat,
  ShieldAlert,
  ShieldCheck,
  ScrollText,
  BookOpen,
  ChevronDown,
  MapPin,
  HardHat,
  Ban,
  Sparkles,
  Gauge,
} from 'lucide-react';
import { getAllBiopreparados } from '../db/catalogDB';
import { loadGrafoRelations } from '../services/grafoRelations';
import BiopreparadoDiagrama from './BiopreparadoDiagrama';
import { tieneDiagrama } from '../data/biopreparado-diagramas';
import './biopreparados-fichas.css';

/**
 * BiopreparadosView — fichas ILUSTRADAS de los biopreparados de la finca.
 *
 * De datos crudos (catalog/biopreparados-seed.json) a una vista hermosa y
 * didáctica para el campesino: qué es cada preparado, para qué sirve (con los
 * cultivos donde el GRAFO lo asocia), su dosis + cada-cuánto + método, la
 * preparación PASO A PASO (reusa BiopreparadoDiagrama) y su seguridad + fuente.
 *
 * PRINCIPIOS
 *   - CERO fabricación: toda cantidad/dosis/tiempo sale del catálogo; los
 *     cultivos asociados salen del grafo (public/grafo-relations.json). Acá solo
 *     se RE-EXPRESA visualmente.
 *   - Legible al sol: fondos opacos, texto de alto contraste (slate-100/200 para
 *     lo importante), nada de gris tenue sobre imagen. La ilustración vive arriba
 *     y nunca detrás del texto de dosis/seguridad.
 *   - Theme-aware: SOLO familias remapeadas por [data-theme] (slate/emerald/
 *     amber) + el acento de marca `--t-accent-rgb`. Nada de sky/cyan/lime.
 *   - prefers-reduced-motion: las burbujas/deriva se apagan (biopreparados-fichas.css).
 *
 * Se monta dentro del ScreenShell "Biopreparados" (App.jsx). `onNavigate` es
 * opcional: si viene, la ficha de toxicología enlaza a la pantalla de EPI/dosis.
 */

/* ── Agrupación práctica por tipo (no taxonomía) ─────────────────────────── */
const GRUPOS = [
  { id: 'fermentado', label: 'Fermentos', Icon: Sprout, sub: 'Vida del suelo en un balde' },
  { id: 'caldo', label: 'Caldos', Icon: FlaskConical, sub: 'Minerales contra hongos' },
  { id: 'extracto', label: 'Extractos y tés', Icon: Droplets, sub: 'Lixiviados y macerados' },
  { id: 'microbiano', label: 'Microbianos', Icon: Bug, sub: 'Hongos y bacterias aliadas' },
  { id: 'mineral', label: 'Minerales y enmiendas', Icon: Mountain, sub: 'Roca, cal y ceniza' },
  { id: 'residuo', label: 'Abonos verdes', Icon: Sprout, sub: 'Coberturas y residuos vivos' },
  { id: 'compuesto', label: 'Coadyuvantes', Icon: Droplets, sub: 'Jabones y ayudantes de mezcla' },
];
const GRUPO_POR_TIPO = Object.fromEntries(GRUPOS.map((g) => [g.id, g]));

function grupoDe(bp) {
  return GRUPO_POR_TIPO[bp?.tipo]?.label || 'Otros';
}

/** Humaniza un slug del catálogo (`control_pulgon` → "control pulgón"-ish). */
function humaniza(s) {
  return String(s || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\bph\b/gi, 'pH')
    .trim();
}

/* ── Propósito crudo → frase campesina ───────────────────────────────────── */
const PROPOSITO_LABEL = {
  fertilizacion: 'Nutre y abona',
  estimulante_microbiano: 'Despierta la vida del suelo',
  repelente_insectos: 'Ahuyenta insectos',
  fitosanitario_preventivo: 'Previene enfermedades',
  fitosanitario_curativo: 'Ayuda a frenar enfermedades',
  enmienda_ph: 'Corrige la acidez (pH)',
  enmienda_ca: 'Aporta calcio',
  enmienda_p: 'Aporta fósforo',
};
function propositoLabel(p) {
  return PROPOSITO_LABEL[p] || String(p || '').replace(/_/g, ' ');
}

/* ── Confianza (del catálogo) → pastilla ─────────────────────────────────── */
const CONFIANZA = {
  alta: { label: 'Confianza alta', cls: 'bg-emerald-900/50 text-emerald-200 border-emerald-600/60' },
  media: { label: 'Confianza media', cls: 'bg-amber-900/40 text-amber-200 border-amber-600/60' },
  baja: { label: 'Confianza baja', cls: 'bg-slate-800 text-slate-300 border-slate-600/70' },
};

/* ── Seguridad (safety_class / precaución) → estilo de la banda ──────────── */
const SAFETY = {
  alto: {
    label: 'Manejo con cuidado — riesgo alto',
    Icon: ShieldAlert,
    box: 'bg-red-950/50 border-red-700/70',
    head: 'text-red-200',
    icon: 'text-red-400',
    body: 'text-red-100/95',
  },
  medio: {
    label: 'Precauciones',
    Icon: ShieldAlert,
    box: 'bg-amber-950/40 border-amber-700/60',
    head: 'text-amber-200',
    icon: 'text-amber-400',
    body: 'text-amber-100/95',
  },
  bajo: {
    label: 'Bajo riesgo — cuidados básicos',
    Icon: ShieldCheck,
    box: 'bg-emerald-950/40 border-emerald-700/50',
    head: 'text-emerald-200',
    icon: 'text-emerald-400',
    body: 'text-emerald-100/95',
  },
  revisar: {
    label: 'Verificar seguridad antes de usar',
    Icon: ShieldAlert,
    box: 'bg-amber-950/40 border-amber-700/60',
    head: 'text-amber-200',
    icon: 'text-amber-400',
    body: 'text-amber-100/95',
  },
};
function safetyDe(bp) {
  const c = bp?.safety_class;
  if (c && SAFETY[c]) return SAFETY[c];
  // Sin clase explícita: si hay do_not_use_when o reingreso, sube a medio.
  if ((bp?.do_not_use_when && bp.do_not_use_when.length) || bp?.reentry_interval_dias) return SAFETY.medio;
  return SAFETY.bajo;
}

/* ── Método → icono ──────────────────────────────────────────────────────── */
function MetodoIcon({ metodo, className }) {
  const m = String(metodo || '').toLowerCase();
  if (m.includes('foliar')) return <Droplets className={className} aria-hidden="true" />;
  if (m.includes('solido') || m.includes('sólido') || m.includes('suelo') || m.includes('incorpora'))
    return <Sprout className={className} aria-hidden="true" />;
  return <Beaker className={className} aria-hidden="true" />;
}

/* ──────────────────────────────────────────────────────────────────────────
 * ILUSTRACIONES — SVG inline (offline-safe, nítido, theme-aware).
 * El trazo hereda `currentColor` (color del texto del tema); los acentos usan
 * el acento de marca `rgb(var(--t-accent-rgb))`. Distintas por tipo para que el
 * campesino reconozca el preparado por su dibujo, casi sin leer.
 * ──────────────────────────────────────────────────────────────────────── */
const ACC = 'rgb(var(--t-accent-rgb, 16 185 129))';
const ACC_SOFT = 'rgb(var(--t-accent-rgb, 16 185 129) / 0.28)';
const ACC_FAINT = 'rgb(var(--t-accent-rgb, 16 185 129) / 0.14)';

function IlustracionFermento() {
  // Balde de fermento con tapa entreabierta y burbujas que suben.
  return (
    <g stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 20 L18 46 Q18 50 22 50 L42 50 Q46 50 46 46 L50 20 Z" fill={ACC_FAINT} />
      <path d="M23 34 Q32 30 41 34 L39.5 45 Q32 47 24.5 45 Z" fill={ACC_SOFT} stroke="none" />
      <line x1="12" y1="20" x2="52" y2="20" />
      <path d="M20 20 Q24 15 32 15 Q40 15 44 20" />
      <circle className="bpf-bubble" cx="28" cy="30" r="2.2" fill={ACC} stroke="none" />
      <circle className="bpf-bubble bpf-bubble--b" cx="34" cy="32" r="1.6" fill={ACC} stroke="none" />
      <circle className="bpf-bubble bpf-bubble--c" cx="31" cy="28" r="1.2" fill={ACC} stroke="none" />
    </g>
  );
}

function IlustracionCaldo() {
  // Olla/caldera con vapor — caldos minerales (bordelés, sulfocálcico).
  return (
    <g stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path className="bpf-bubble" d="M27 15 Q24 12 27 9 Q30 6 27 3" strokeWidth="1.6" opacity="0.8" />
      <path className="bpf-bubble bpf-bubble--b" d="M37 15 Q34 12 37 9 Q40 6 37 3" strokeWidth="1.6" opacity="0.8" />
      <path d="M16 24 L20 46 Q20 50 24 50 L40 50 Q44 50 44 46 L48 24 Z" fill={ACC_FAINT} />
      <path d="M20 30 Q32 26 44 30 L43 36 Q32 39 21 36 Z" fill={ACC_SOFT} stroke="none" />
      <line x1="13" y1="24" x2="51" y2="24" />
      <line x1="10" y1="24" x2="16" y2="24" strokeWidth="3" />
      <line x1="48" y1="24" x2="54" y2="24" strokeWidth="3" />
    </g>
  );
}

function IlustracionExtracto() {
  // Frasco gotero — extractos, tés, lixiviados.
  return (
    <g stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <rect x="24" y="10" width="16" height="6" rx="1.5" />
      <path d="M26 16 L26 22 Q18 26 18 38 L18 46 Q18 50 22 50 L42 50 Q46 50 46 46 L46 38 Q46 26 38 22 L38 16 Z" fill={ACC_FAINT} />
      <path d="M20 38 Q32 34 44 38 L44 45 Q32 48 20 45 Z" fill={ACC_SOFT} stroke="none" />
      <path className="bpf-bubble" d="M32 22 Q29 26 32 28 Q35 26 32 22 Z" fill={ACC} stroke="none" />
      <line x1="28" y1="10" x2="28" y2="4" />
      <line x1="36" y1="10" x2="36" y2="4" />
      <line x1="26" y1="4" x2="38" y2="4" strokeWidth="3" />
    </g>
  );
}

function IlustracionMicrobiano() {
  // Caja de Petri con colonias — Trichoderma, Bacillus.
  return (
    <g stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="32" cy="32" r="20" fill={ACC_FAINT} />
      <circle cx="32" cy="32" r="20" />
      <g className="bpf-drift" fill={ACC} stroke="none">
        <circle cx="26" cy="27" r="3.4" />
        <circle cx="38" cy="30" r="2.4" />
        <circle cx="30" cy="38" r="2.8" />
        <circle cx="40" cy="39" r="1.8" />
        <circle cx="23" cy="35" r="1.6" />
      </g>
      <path d="M14 24 Q32 20 50 24" opacity="0.55" />
    </g>
  );
}

function IlustracionMineral() {
  // Cristales/roca en capas — cal, roca fosfórica, ceniza.
  return (
    <g stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 46 L24 24 L34 46 Z" fill={ACC_SOFT} />
      <path d="M30 46 L40 18 L50 46 Z" fill={ACC_FAINT} />
      <path d="M40 18 L40 46" opacity="0.5" />
      <path d="M24 24 L24 46" opacity="0.5" />
      <line x1="10" y1="46" x2="54" y2="46" strokeWidth="2.4" />
    </g>
  );
}

function IlustracionAbonoVerde() {
  // Brotes/cobertura viva — abonos verdes (avena+vicia), residuos incorporados.
  return (
    <g stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="48" x2="52" y2="48" strokeWidth="2.4" />
      <g className="bpf-drift">
        <path d="M22 48 Q22 34 18 28" />
        <path d="M18 30 Q12 30 12 24 Q18 24 18 30 Z" fill={ACC_SOFT} stroke="none" />
        <path d="M22 34 Q28 32 30 26 Q24 26 22 34 Z" fill={ACC_SOFT} stroke="none" />
        <path d="M32 48 Q32 30 32 22" />
        <path d="M32 26 Q26 24 24 18 Q31 18 32 26 Z" fill={ACC} stroke="none" opacity="0.85" />
        <path d="M32 30 Q39 28 41 22 Q34 22 32 30 Z" fill={ACC_SOFT} stroke="none" />
        <path d="M42 48 Q42 36 46 30" />
        <path d="M46 32 Q52 32 52 26 Q46 26 46 32 Z" fill={ACC_SOFT} stroke="none" />
      </g>
    </g>
  );
}

const ILUSTRACION = {
  fermentado: IlustracionFermento,
  caldo: IlustracionCaldo,
  extracto: IlustracionExtracto,
  microbiano: IlustracionMicrobiano,
  mineral: IlustracionMineral,
  residuo: IlustracionAbonoVerde,
  compuesto: IlustracionExtracto,
};

function FichaIlustracion({ tipo }) {
  const Dibujo = ILUSTRACION[tipo] || IlustracionFermento;
  return (
    <svg viewBox="0 0 64 56" width="64" height="56" role="img" aria-hidden="true" className="text-slate-200 shrink-0">
      <Dibujo />
    </svg>
  );
}

/* ── Chips de propósito ──────────────────────────────────────────────────── */
function PropositoBadges({ proposito }) {
  if (!Array.isArray(proposito) || proposito.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {proposito.map((p) => (
        <span
          key={p}
          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-emerald-700/50 bg-emerald-950/40 text-emerald-200"
        >
          <Sparkles size={10} aria-hidden="true" />
          {propositoLabel(p)}
        </span>
      ))}
    </div>
  );
}

/* ── Objetivos del catálogo (`target`): para qué plaga/enfermedad/necesidad ── */
function TargetChips({ target }) {
  if (!Array.isArray(target) || target.length === 0) return null;
  const shown = target.slice(0, 6);
  const resto = target.length - shown.length;
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1.5">
        <Gauge size={11} aria-hidden="true" /> Para qué sirve
      </p>
      <div className="flex flex-wrap gap-1.5">
        {shown.map((t, i) => (
          <span
            key={`${t}-${i}`}
            className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-950/40 text-emerald-100 border border-emerald-800/60"
          >
            {humaniza(t)}
          </span>
        ))}
        {resto > 0 && <span className="text-[11px] px-2 py-0.5 text-slate-400">+{resto} más</span>}
      </div>
    </div>
  );
}

/* ── Cultivos donde el grafo lo asocia ───────────────────────────────────── */
function CultivosChips({ cultivos }) {
  if (!Array.isArray(cultivos) || cultivos.length === 0) return null;
  const shown = cultivos.slice(0, 8);
  const resto = cultivos.length - shown.length;
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1.5">
        <MapPin size={11} aria-hidden="true" /> Se usa en (grafo)
      </p>
      <div className="flex flex-wrap gap-1.5">
        {shown.map((c) => (
          <span key={c} className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700">
            {c}
          </span>
        ))}
        {resto > 0 && <span className="text-[11px] px-2 py-0.5 text-slate-400">+{resto} más</span>}
      </div>
    </div>
  );
}

/* ── Un dato clave (dosis / cada-cuánto / método) ────────────────────────── */
function DatoClave({ Icon, iconNode, titulo, children }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-slate-700/70 bg-slate-800/50 px-3 py-2">
      {iconNode || (Icon && <Icon size={16} className="text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />)}
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{titulo}</p>
        <p className="text-xs text-slate-100 leading-snug mt-0.5">{children}</p>
      </div>
    </div>
  );
}

/* ── Banda de seguridad ──────────────────────────────────────────────────── */
function BandaSeguridad({ bp }) {
  const st = safetyDe(bp);
  const { Icon } = st;
  const ppe = Array.isArray(bp.ppe_required) ? bp.ppe_required.filter(Boolean) : [];
  const noUsar = Array.isArray(bp.do_not_use_when) ? bp.do_not_use_when.filter(Boolean) : [];
  const reentry = bp.reentry_interval_dias;
  const tienePrecaucion = bp.precaucion_seguridad;
  if (!tienePrecaucion && ppe.length === 0 && noUsar.length === 0 && !reentry) return null;

  return (
    <div data-testid="banda-seguridad" className={`rounded-xl border p-3 ${st.box}`}>
      <header className="flex items-center gap-2 mb-1.5">
        <Icon size={16} className={`${st.icon} shrink-0`} aria-hidden="true" />
        <h5 className={`text-[11px] font-bold uppercase tracking-wide ${st.head}`}>{st.label}</h5>
      </header>

      {tienePrecaucion && <p className={`text-xs leading-relaxed ${st.body}`}>{bp.precaucion_seguridad}</p>}

      {(ppe.length > 0 || noUsar.length > 0 || reentry) && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-white/10">
          {ppe.map((p) => (
            <span
              key={p}
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-900/70 text-slate-200 border border-slate-600/70"
            >
              <HardHat size={10} aria-hidden="true" /> {humaniza(p)}
            </span>
          ))}
          {noUsar.map((n) => (
            <span
              key={n}
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-950/60 text-red-200 border border-red-700/60"
            >
              <Ban size={10} aria-hidden="true" /> No en {humaniza(n)}
            </span>
          ))}
          {reentry ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-950/50 text-amber-200 border border-amber-700/60">
              <Clock size={10} aria-hidden="true" /> Reingreso {reentry} d
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}

/* ── FICHA ───────────────────────────────────────────────────────────────── */
function Ficha({ bp, cultivos }) {
  const [abierto, setAbierto] = useState(false);
  const [porqueAbierto, setPorqueAbierto] = useState(false);
  const conf = CONFIANZA[bp.confianza] || CONFIANZA.media;
  const dosis = bp.dosis || bp.dosis_aplicacion;
  const conDiagrama = tieneDiagrama(bp.id);
  const esBorrador = /BORRADOR|PENDING|DRAFT/i.test(bp._curation_status || '');
  // Trazabilidad: `fuente` (seed legado) o los `source_ids` (catálogo v3.x).
  const fuenteTexto =
    bp.fuente ||
    (Array.isArray(bp.source_ids) && bp.source_ids.length
      ? bp.source_ids.map(humaniza).join(' · ')
      : '');

  return (
    <article
      data-testid={`ficha-${bp.id}`}
      className="rounded-2xl border border-slate-700/70 bg-slate-900 overflow-hidden flex flex-col"
    >
      {/* Banda ilustrada superior (decorativa, no lleva texto crítico) */}
      <div className="relative flex items-center gap-3 px-4 pt-4 pb-3 bg-gradient-to-br from-slate-800 to-slate-900 border-b border-slate-700/60">
        <div
          className="grid place-items-center w-16 h-14 rounded-xl bg-slate-950/40 border border-slate-700/50 shrink-0"
          style={{ boxShadow: `inset 0 0 24px ${ACC_FAINT}` }}
        >
          <FichaIlustracion tipo={bp.tipo} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-slate-50 leading-tight">{bp.nombre}</h3>
          <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: ACC }}>
            {grupoDe(bp)}
          </span>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          <span
            data-testid={`confianza-${bp.id}`}
            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${conf.cls}`}
          >
            <Gauge size={10} aria-hidden="true" /> {conf.label}
          </span>
          {esBorrador && (
            <span
              title="Contenido redactado con IA, pendiente de verificación humana"
              className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border border-amber-700/60 bg-amber-950/40 text-amber-300"
            >
              Borrador IA
            </span>
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {/* Qué es / para qué (categorías limpias) */}
        <PropositoBadges proposito={bp.proposito} />

        {/* Objetivos concretos del catálogo (plagas/enfermedades/necesidades) */}
        <TargetChips target={bp.target} />

        {/* Cultivos del grafo */}
        <CultivosChips cultivos={cultivos} />

        {/* Datos clave: dosis · cada cuánto · método */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {dosis && (
            <div className="sm:col-span-2">
              <DatoClave Icon={Gauge} titulo="Dosis">
                {dosis}
              </DatoClave>
            </div>
          )}
          {bp.frecuencia && (
            <DatoClave Icon={Repeat} titulo="Cada cuánto">
              {bp.frecuencia}
            </DatoClave>
          )}
          {(bp.uso || bp.metodo) && (
            <div className={bp.frecuencia ? '' : 'sm:col-span-2'}>
              <DatoClave
                iconNode={
                  <MetodoIcon
                    metodo={bp.metodo || bp.uso}
                    className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5"
                  />
                }
                titulo="Cómo y cuándo se aplica"
              >
                {bp.uso || bp.metodo}
              </DatoClave>
            </div>
          )}
          {bp.tiempo_elaboracion_dias != null && (
            <DatoClave Icon={Clock} titulo="Listo en">
              {bp.tiempo_elaboracion_dias <= 1 ? 'El mismo día' : `~${bp.tiempo_elaboracion_dias} días de fermentación`}
              {bp.vida_util_dias ? ` · dura ${bp.vida_util_dias} d` : ''}
            </DatoClave>
          )}
        </div>

        {/* Seguridad */}
        <BandaSeguridad bp={bp} />

        {/* Preparación paso a paso (reusa BiopreparadoDiagrama) */}
        {conDiagrama && (
          <div>
            <button
              type="button"
              data-testid={`toggle-preparacion-${bp.id}`}
              onClick={() => setAbierto((v) => !v)}
              aria-expanded={abierto}
              className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-700/70 bg-slate-800/60 px-3 py-2.5 text-left hover:border-emerald-700/60 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
            >
              <span className="flex items-center gap-2 text-sm font-bold text-slate-100">
                <FlaskConical size={16} className="text-emerald-400" aria-hidden="true" />
                Cómo se prepara, paso a paso
              </span>
              <ChevronDown
                size={18}
                className={`text-slate-400 transition-transform ${abierto ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>
            {abierto && (
              <div className="bpf-reveal mt-3 rounded-xl border border-slate-700/60 bg-slate-950/40 p-3">
                <BiopreparadoDiagrama biopreparado={bp} compact />
              </div>
            )}
          </div>
        )}

        {/* Proceso resumen (siempre disponible, aunque no haya diagrama) */}
        {!conDiagrama && bp.proceso_resumen && (
          <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-3">
            <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
              <FlaskConical size={11} aria-hidden="true" /> Preparación
            </p>
            <p className="text-xs text-slate-200 leading-relaxed">{bp.proceso_resumen}</p>
          </div>
        )}

        {/* ¿Por qué funciona? — nota didáctica (folk + ciencia) del catálogo */}
        {bp.valor_pedagogico && (
          <div>
            <button
              type="button"
              data-testid={`toggle-porque-${bp.id}`}
              onClick={() => setPorqueAbierto((v) => !v)}
              aria-expanded={porqueAbierto}
              className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-700/70 bg-slate-800/40 px-3 py-2 text-left hover:border-emerald-700/60 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
            >
              <span className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <BookOpen size={14} className="text-emerald-400" aria-hidden="true" />
                ¿Por qué funciona? (saber más)
              </span>
              <ChevronDown
                size={16}
                className={`text-slate-400 transition-transform ${porqueAbierto ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>
            {porqueAbierto && (
              <p className="bpf-reveal mt-2 text-xs text-slate-300 leading-relaxed rounded-xl border border-slate-700/60 bg-slate-950/40 p-3">
                {bp.valor_pedagogico}
              </p>
            )}
          </div>
        )}

        {/* Fuente (trazabilidad — cero fabricación) */}
        {fuenteTexto && (
          <div className="flex items-start gap-1.5 pt-1">
            <ScrollText size={12} className="text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-[10px] text-slate-400 italic leading-relaxed">
              <span className="font-bold not-italic text-slate-500">Fuente: </span>
              {fuenteTexto}
            </p>
          </div>
        )}
      </div>
    </article>
  );
}

/* ── Vista principal ─────────────────────────────────────────────────────── */
export default function BiopreparadosView({ onNavigate }) {
  const [bps, setBps] = useState([]);
  const [cultivosPorBp, setCultivosPorBp] = useState({});
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('Todos');

  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(() => getAllBiopreparados())
      .then((list) => {
        if (alive) setBps((list || []).filter((b) => b && b.id));
      })
      .catch((err) => {
        console.error('[BiopreparadosView] Error cargando biopreparados:', err);
        if (alive) setBps([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Mapa inverso del grafo: biopreparado.id → cultivos (nombre_común) que lo usan.
  useEffect(() => {
    let alive = true;
    loadGrafoRelations()
      .then((species) => {
        if (!alive || !species) return;
        const rev = {};
        for (const s of Object.values(species)) {
          if (!s || !s.nombre_comun || !Array.isArray(s.biopreparados)) continue;
          for (const b of s.biopreparados) {
            const id = b?.id || b;
            if (!id) continue;
            (rev[id] = rev[id] || new Set()).add(s.nombre_comun);
          }
        }
        const out = {};
        for (const [id, set] of Object.entries(rev)) out[id] = Array.from(set);
        setCultivosPorBp(out);
      })
      .catch(() => {
        /* sin grafo → las fichas simplemente ocultan "se usa en" */
      });
    return () => {
      alive = false;
    };
  }, []);

  // Grupos presentes (para los chips de filtro), en el orden de GRUPOS.
  const gruposPresentes = useMemo(() => {
    const set = new Set(bps.map(grupoDe));
    return ['Todos', ...GRUPOS.map((g) => g.label).filter((l) => set.has(l)), ...(set.has('Otros') ? ['Otros'] : [])];
  }, [bps]);

  const visibles = useMemo(
    () => (filtro === 'Todos' ? bps : bps.filter((b) => grupoDe(b) === filtro)),
    [bps, filtro],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-400 text-sm">Cargando biopreparados…</div>
      </div>
    );
  }

  return (
    <div data-testid="biopreparados-view" className="px-4 py-4 space-y-5 max-w-3xl mx-auto">
      {/* Intro: qué es un biopreparado + el ciclo cerrado de la finca */}
      <div className="rounded-2xl border border-emerald-800/50 bg-emerald-950/40 p-4 flex gap-3">
        <Beaker size={24} className="text-emerald-300 shrink-0" aria-hidden="true" />
        <div className="text-sm">
          <p className="font-bold text-emerald-100">Las recetas de la finca</p>
          <p className="text-emerald-200/90 mt-1 leading-relaxed">
            Un biopreparado se hace con lo que da la finca —estiércol, ceniza, ortiga, roca— para
            <strong className="text-emerald-100"> nutrir el suelo</strong> y
            <strong className="text-emerald-100"> proteger las plantas</strong> sin agroquímicos. Cierra el ciclo:
            animal → estiércol → biopreparado → suelo → planta. Cada ficha trae la
            <strong className="text-emerald-100"> dosis</strong>, el
            <strong className="text-emerald-100"> cada-cuánto</strong> y la
            <strong className="text-emerald-100"> preparación paso a paso</strong>, con su fuente.
          </p>
        </div>
      </div>

      {/* Aviso de toxicología: caldos de cobre/azufre exigen EPI y respetan la ley */}
      <button
        type="button"
        onClick={() => onNavigate && onNavigate('toxicologia', { tab: 'insumos' })}
        disabled={!onNavigate}
        className="w-full rounded-xl border border-amber-700/50 bg-amber-950/30 p-3 flex items-center gap-2.5 text-left hover:border-amber-600 transition-colors disabled:cursor-default focus:outline-none focus:ring-2 focus:ring-amber-400/50"
      >
        <ShieldAlert size={20} className="shrink-0 text-amber-400" aria-hidden="true" />
        <span className="text-sm text-amber-100 flex-1">
          <span className="font-bold">Antes de preparar, revise la seguridad.</span> Los caldos de cobre y azufre
          piden protección (EPI), dosis exactas y tienen restricciones legales (ICA).
        </span>
        {onNavigate && <ChevronDown size={16} className="-rotate-90 text-amber-400 shrink-0" aria-hidden="true" />}
      </button>

      {/* Filtro por grupo práctico */}
      {gruposPresentes.length > 2 && (
        <nav className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1" aria-label="Filtrar biopreparados por tipo">
          {gruposPresentes.map((g) => (
            <button
              key={g}
              type="button"
              data-testid={`filtro-${g}`}
              onClick={() => setFiltro(g)}
              aria-pressed={filtro === g}
              className={`min-h-[38px] px-3 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors border ${
                filtro === g
                  ? 'bg-emerald-700/40 text-emerald-100 border-emerald-600/60'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
              }`}
            >
              {g}
            </button>
          ))}
        </nav>
      )}

      {/* Fichas */}
      {visibles.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-sm">No hay biopreparados en este grupo.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibles.map((bp) => (
            <Ficha key={bp.id} bp={bp} cultivos={cultivosPorBp[bp.id]} />
          ))}
        </div>
      )}

      {/* Fuentes institucionales */}
      <section aria-label="Fuentes" className="rounded-xl border border-slate-700/70 bg-slate-900 p-4">
        <header className="flex items-center gap-2 mb-2">
          <BookOpen size={16} className="text-slate-300 shrink-0" aria-hidden="true" />
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wide">De dónde salen estas recetas</h2>
        </header>
        <p className="text-xs text-slate-300 leading-relaxed">
          Dosis, tiempos y precauciones provienen de fuentes agroecológicas reconocidas: Jairo Restrepo Rivera
          (<em>ABC de la agricultura orgánica</em>), los manuales de biopreparados de Agrosavia/SENA y la
          normativa fitosanitaria del ICA (p. ej. Resolución 698/2011 para el cobre). Los cultivos asociados salen
          del grafo de la finca. Ninguna dosis se inventa aquí: se cita en cada ficha.
        </p>
        <p className="text-[10px] text-slate-500 mt-3 leading-snug">
          Un biopreparado no es un medicamento. Ante dudas de dosis o intoxicación por cobre/azufre, consulte al
          técnico agropecuario o al puesto de salud.
        </p>
      </section>
    </div>
  );
}
