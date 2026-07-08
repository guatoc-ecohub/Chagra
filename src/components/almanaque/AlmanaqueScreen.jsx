import { useMemo, useState } from 'react';
import {
  CalendarDays, CloudRain, Sun, Sprout, Apple, Mountain, Moon,
  Info, ChevronRight, Camera, ExternalLink, MessageCircle,
  Hourglass, Leaf,
} from 'lucide-react';
import { ScreenShell } from '../common/ScreenShell';
import { getProfile } from '../../services/userProfileService';
import {
  FOTOS_ALMANAQUE,
  TEMPORADAS_ANIO,
  HITOS_PRONOSTICO,
  PISOS_TERMICOS,
  LUNA_FASES,
  LUNA_GRUPOS,
  LUNA_CAVEAT,
  LUNA_FUENTE,
  ALMANAQUE_FUENTES,
  CREDITOS_FOTOS_ALMANAQUE,
  ventanaCosecha,
  regimenCultivo,
} from '../../data/almanaqueFinca';
import './almanaque.css';

/**
 * AlmanaqueScreen — "Almanaque de la finca": el calendario agrícola y lunar
 * campesino, contado a lo grande. Vista HERMANA (no duplicado) de
 * CalendarioFincaScreen: aquel arma el calendario grounded mata-por-mata de la
 * finca del usuario; este enseña el año campesino de Colombia — aguas y secas,
 * qué da cada piso térmico, y el saber lunar tradicional — y remata enlazando al
 * calendario de detalle.
 *
 * Photo-forward (patrón de Café/Agua): REUTILIZA fotos CC que ya viven en
 * /public (no engorda el bundle). Todo lo agronómico va grounded en
 * perennialCycles.js; lo folk (temporadas, luna) se cita como saber campesino,
 * con el aviso honesto de que "es cultura, no receta".
 */

/* ── Chip honesto para cifras/fechas aún sin grounding ─────────────────── */
function SlotPendiente({ children = null }) {
  return (
    <span
      data-testid="slot-grounded-pendiente"
      className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-300"
    >
      <Hourglass size={11} aria-hidden="true" />
      {children || 'Dato en camino'}
    </span>
  );
}

/* ── Foto reusada con scrim fijo + crédito + fallback a ícono ───────────── */
function FotoAlmanaque({ fotoKey, alt, ratio = 'aspect-[16/9]', Fallback = Sprout, children = null }) {
  const [ok, setOk] = useState(true);
  const foto = FOTOS_ALMANAQUE[fotoKey];
  const IconoFallback = Fallback;
  return (
    <div className={`relative overflow-hidden bg-[#2a1c12] ${ratio}`}>
      {ok && foto ? (
        <img
          src={foto.src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setOk(false)}
          className="alm-foto absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center" aria-hidden="true">
          <IconoFallback size={38} className="text-amber-900/70" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/5" aria-hidden="true" />
      {children}
      {foto?.autor && (
        <span className="absolute bottom-1 right-1.5 rounded bg-black/55 px-1 py-0.5 text-[9px] leading-none text-white/75">
          Foto: {foto.autor}
        </span>
      )}
    </div>
  );
}

/* ── Glifo de luna en SVG puro (rsvg-safe: sin filtros ni foreignObject) ── */
function MoonGlyph({ fase, size = 34 }) {
  const r = 15;
  const c = 17;
  return (
    <svg className="alm-luna-glifo" width={size} height={size} viewBox="0 0 34 34" aria-hidden="true">
      {/* disco oscuro base */}
      <circle className="alm-luna-disco" cx={c} cy={c} r={r} />
      {fase === 'llena' && <circle className="alm-luna-luz" cx={c} cy={c} r={r} />}
      {fase === 'creciente' && (
        // mitad derecha iluminada
        <path className="alm-luna-luz" d={`M ${c} ${c - r} A ${r} ${r} 0 0 1 ${c} ${c + r} Z`} />
      )}
      {fase === 'menguante' && (
        // mitad izquierda iluminada
        <path className="alm-luna-luz" d={`M ${c} ${c - r} A ${r} ${r} 0 0 0 ${c} ${c + r} Z`} />
      )}
      {fase === 'nueva' && <circle className="alm-luna-borde" cx={c} cy={c} r={r - 1} />}
    </svg>
  );
}

/* ── SECCIÓN 1 · El año campesino (aguas y secas) ──────────────────────── */
function SeccionAnio() {
  return (
    <section className="space-y-4" data-testid="alm-seccion-anio">
      <div className="rounded-2xl border border-amber-800/40 overflow-hidden bg-[#241811]/60">
        <FotoAlmanaque fotoKey="siembra_lluvia" alt="Siembra al entrar las lluvias en la ladera andina" ratio="aspect-[16/9]" Fallback={CloudRain}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-sky-200">
              <CloudRain size={14} aria-hidden="true" /> Aguas y secas
            </p>
            <h3 className="text-xl font-black text-white leading-tight drop-shadow">El año no tiene cuatro estaciones</h3>
          </div>
        </FotoAlmanaque>
      </div>

      <p className="text-sm leading-relaxed text-slate-200">
        En Colombia no hay primavera ni otoño: hay <b>aguas</b> (picos de lluvia) y{' '}
        <b>secas</b>. El campesino siembra al <b>entrar las aguas</b>. En buena parte de
        la zona andina el régimen es <b>bimodal</b>: dos ventanas de siembra al año.
        En los Llanos y el piedemonte es de una sola temporada larga.
      </p>

      {/* Tira del año: temporadas grounded en el léxico folk-climático */}
      <div className="space-y-2" data-testid="alm-temporadas">
        {TEMPORADAS_ANIO.map((t) => {
          const esLluvia = t.tono === 'lluvia';
          const Icono = esLluvia ? CloudRain : Sun;
          return (
            <div
              key={t.id}
              className={`rounded-xl bg-[#241811]/50 border border-slate-700/50 p-3 ${esLluvia ? 'alm-temporada-lluvia' : 'alm-temporada-seca'}`}
              data-testid={`temporada-${t.id}`}
            >
              <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-100 leading-tight">
                <Icono size={15} aria-hidden="true" className={esLluvia ? 'text-sky-300' : 'text-amber-300'} />
                {t.nombre}
                <span className="rounded-full bg-slate-700/50 px-2 py-0.5 text-[10px] font-bold text-slate-300">{t.meses}</span>
              </p>
              <p className="mt-1 text-xs leading-snug text-slate-300">{t.que}</p>
            </div>
          );
        })}
      </div>

      {/* Saberes folk de pronóstico */}
      <div className="rounded-2xl border border-slate-700/60 bg-[#241811]/50 p-4 space-y-2.5" data-testid="alm-pronostico">
        <p className="flex items-center gap-2 text-sm font-black text-amber-200 uppercase tracking-wide">
          <CalendarDays size={16} aria-hidden="true" /> Cómo lee el campesino el año
        </p>
        {HITOS_PRONOSTICO.map((h) => (
          <div key={h.id} className="rounded-xl border border-slate-700/50 bg-slate-950/40 p-3" data-testid={`pronostico-${h.id}`}>
            <p className="text-sm font-bold text-slate-100 leading-tight">{h.termino}</p>
            <p className="mt-0.5 text-xs leading-snug text-slate-300">{h.que}</p>
          </div>
        ))}
        <p className="text-[10px] leading-snug text-slate-500">
          Saber folk-climático campesino de Colombia (léxico etnolingüístico Chagra). Es costumbre y observación, no pronóstico oficial: para la lluvia real, mire el boletín del clima.
        </p>
      </div>
    </section>
  );
}

/* ── SECCIÓN 2 · Pisos térmicos ────────────────────────────────────────── */
function CultivoFila({ cultivo }) {
  const ventana = ventanaCosecha(cultivo.slug);
  const reg = regimenCultivo(cultivo.slug);
  return (
    <li className="rounded-xl border border-slate-700/50 bg-slate-950/40 p-3" data-testid={`cultivo-${cultivo.slug || cultivo.nombre}`}>
      <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-100 leading-tight">
        <Sprout size={14} aria-hidden="true" className="text-lime-400 shrink-0" />
        {cultivo.nombre}
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${reg.tone === 'ok' ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-600/40' : 'bg-amber-500/10 text-amber-300 border border-amber-500/40'}`}>
          {reg.label}
        </span>
      </p>
      <p className="mt-1 text-xs leading-snug text-slate-300">{cultivo.nota}</p>
      <p className="mt-1.5 flex items-center gap-1.5 text-[11px] leading-snug">
        <Apple size={12} aria-hidden="true" className="shrink-0 text-orange-300" />
        {ventana ? (
          <span className="text-slate-200">Cosecha (aprox.): <b className="text-orange-200">{ventana}</b></span>
        ) : (
          <SlotPendiente>ventana de cosecha en camino</SlotPendiente>
        )}
      </p>
    </li>
  );
}

function SeccionPisos({ altitudeM }) {
  // Piso por defecto según la altitud del perfil (si la hay).
  const pisoDefault = useMemo(() => {
    if (!altitudeM) return 'templado';
    if (altitudeM < 1000) return 'calido';
    if (altitudeM < 2000) return 'templado';
    if (altitudeM < 3000) return 'frio';
    return 'paramo';
  }, [altitudeM]);
  const [pisoSel, setPisoSel] = useState(pisoDefault);
  const piso = PISOS_TERMICOS.find((p) => p.id === pisoSel) || PISOS_TERMICOS[1];

  return (
    <section className="space-y-4" data-testid="alm-seccion-pisos">
      <p className="text-sm leading-relaxed text-slate-200">
        La misma mata cambia según a qué altura viva. Escoja su piso térmico y vea
        qué da y cuándo cosecha. {altitudeM ? (
          <span className="text-slate-400">Su finca está a <b>{altitudeM} msnm</b>.</span>
        ) : (
          <span className="text-slate-400">Ponga su altitud en el perfil para que lo elija por usted.</span>
        )}
      </p>

      {/* Selector de piso térmico */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="tablist" aria-label="Pisos térmicos">
        {PISOS_TERMICOS.map((p) => {
          const activo = p.id === pisoSel;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={activo}
              data-testid={`piso-tab-${p.id}`}
              onClick={() => setPisoSel(p.id)}
              className={`alm-tab rounded-xl border px-2 py-2.5 text-center ${
                activo
                  ? 'alm-tab-activa border-amber-500/70 bg-amber-500/15 text-amber-100'
                  : 'border-slate-700 bg-[#241811]/50 text-slate-300 active:bg-slate-800/70'
              }`}
            >
              <span className="block text-lg leading-none" aria-hidden="true">{p.emoji}</span>
              <span className="block text-xs font-black leading-tight mt-1">{p.nombre}</span>
              <span className="block text-[10px] text-slate-400 leading-tight">{p.rango}</span>
            </button>
          );
        })}
      </div>

      {/* Cabecera del piso elegido, con foto si la hay */}
      {piso.foto ? (
        <div className="rounded-2xl border border-slate-700/60 overflow-hidden bg-[#241811]/60" data-testid="alm-piso-hero">
          <FotoAlmanaque fotoKey={piso.foto} alt={`Cultivos de ${piso.nombre}`} ratio="aspect-[16/9]" Fallback={Mountain}>
            <div className="absolute inset-0 flex flex-col justify-end p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-200">
                <Mountain size={14} aria-hidden="true" /> {piso.rango} · {piso.temp}
              </p>
              <h3 className="text-xl font-black text-white leading-tight drop-shadow">{piso.nombre}</h3>
              <p className="text-xs text-white/80 leading-tight mt-0.5">{piso.lema}</p>
            </div>
          </FotoAlmanaque>
        </div>
      ) : (
        <div className="rounded-2xl border border-sky-800/40 bg-[#101b26]/70 p-4" data-testid="alm-piso-hero">
          <p className="flex items-center gap-2 text-sm font-black text-sky-200">
            <span aria-hidden="true" className="text-lg">{piso.emoji}</span> {piso.nombre}
            <span className="text-[11px] font-normal text-slate-400">{piso.rango} · {piso.temp}</span>
          </p>
          <p className="mt-1 text-xs leading-snug text-slate-300">{piso.lema}</p>
        </div>
      )}

      {/* Cultivos del piso, con ventana de cosecha grounded */}
      {piso.cultivos.length > 0 ? (
        <ul className="space-y-2" data-testid="alm-piso-cultivos">
          {piso.cultivos.map((cultivo) => (
            <CultivoFila key={cultivo.slug || cultivo.nombre} cultivo={cultivo} />
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-sky-800/40 bg-sky-950/20 p-3 text-xs leading-snug text-sky-100 flex items-start gap-1.5" data-testid="alm-piso-nota">
          <Info size={13} aria-hidden="true" className="shrink-0 mt-0.5 text-sky-300" />
          {piso.nota}
        </p>
      )}

      <p className="text-[10px] leading-snug text-slate-500">
        Ventanas de cosecha derivadas de los ciclos del catálogo Chagra (Agrosavia, Cenicafé, Fedecacao, ICA, U. Nacional). Aproximadas; cambian con la región, la altitud y el manejo. Donde no hay dato firme, se dice.
      </p>
    </section>
  );
}

/* ── SECCIÓN 3 · La luna (saber campesino) ─────────────────────────────── */
const GRUPO_CLASE = { hoja: 'alm-grupo-hoja', fruto: 'alm-grupo-fruto', raiz: 'alm-grupo-raiz' };
const GRUPO_LABEL = { hoja: 'hoja', fruto: 'fruto', raiz: 'raíz' };

function SeccionLuna() {
  return (
    <section className="space-y-4" data-testid="alm-seccion-luna">
      {/* Encuadre honesto: cultura, no receta (misma política de MundoCultivos) */}
      <div className="alm-luna-bloque rounded-2xl p-4 space-y-2" data-testid="alm-luna-caveat">
        <p className="flex items-center gap-2 text-sm font-black text-slate-100">
          <Moon size={18} aria-hidden="true" className="text-slate-200" /> La luna, saber campesino
        </p>
        <p className="text-xs leading-relaxed text-slate-300">{LUNA_CAVEAT}</p>
      </div>

      {/* Las cuatro fases, con su glifo y su labor folk */}
      <div className="space-y-2" data-testid="alm-luna-fases">
        {LUNA_FASES.map((f) => (
          <div key={f.id} className="alm-luna-fase rounded-xl p-3 flex gap-3" data-testid={`luna-fase-${f.id}`}>
            <span className="shrink-0 mt-0.5"><MoonGlyph fase={f.icono} size={38} /></span>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-100 leading-tight">
                {f.fase}
                <span className="text-[10px] font-normal italic text-slate-400">«{f.folk}»</span>
              </p>
              <p className="text-[11px] leading-snug text-slate-400 mt-0.5">{f.dice}</p>
              <p className="text-xs leading-snug text-slate-200 mt-1">{f.labores}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Regla mnemónica folk: hoja / fruto / raíz */}
      <div className="rounded-2xl border border-slate-700/60 bg-[#241811]/50 p-4 space-y-2.5" data-testid="alm-luna-grupos">
        <p className="flex items-center gap-2 text-sm font-black text-slate-200 uppercase tracking-wide">
          <Leaf size={16} aria-hidden="true" /> La regla de la abuela
        </p>
        <p className="text-xs leading-snug text-slate-400">
          Se agrupa el cultivo por la parte que se come, y esa parte manda la luna:
        </p>
        {LUNA_GRUPOS.map((g) => (
          <div key={g.id} className="flex items-center gap-2 rounded-xl border border-slate-700/50 bg-slate-950/40 p-2.5" data-testid={`luna-grupo-${g.id}`}>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${GRUPO_CLASE[g.id]}`}>
              {GRUPO_LABEL[g.id]}
            </span>
            <span className="min-w-0 flex-1 text-xs text-slate-300 leading-tight">{g.ejemplos}</span>
            <span className="shrink-0 text-[11px] font-bold text-slate-200">luna {g.luna}</span>
          </div>
        ))}
      </div>

      {/* Puente etnolingüístico: entender el habla del campo */}
      <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 p-3" data-testid="alm-luna-habla">
        <p className="flex items-start gap-1.5 text-[11px] leading-snug text-amber-100">
          <Info size={13} aria-hidden="true" className="shrink-0 mt-0.5 text-amber-300" />
          <span>
            Si en su casa dicen <b>«hay que sembrar en luna tierna»</b>, se refieren a la
            luna nueva; <b>«cortar en menguante»</b> es la fase en que baja la savia. El
            agente de Chagra entiende estas expresiones y le responde en su mismo lenguaje.
          </span>
        </p>
      </div>

      <p className="text-[10px] leading-snug text-slate-500 flex items-start gap-1.5">
        <Info size={11} aria-hidden="true" className="shrink-0 mt-0.5" />
        <span>Fuente: {LUNA_FUENTE}</span>
      </p>
    </section>
  );
}

/* ── Créditos de fotos (cumplimiento licencia abierta) ─────────────────── */
function CreditosFotos() {
  const [abierto, setAbierto] = useState(false);
  if (!CREDITOS_FOTOS_ALMANAQUE.length) return null;
  return (
    <div className="rounded-xl border border-slate-700/60 bg-[#241811]/50 p-3" data-testid="alm-creditos-fotos">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="w-full flex items-center gap-2 text-left"
      >
        <Camera size={15} className="text-slate-400 shrink-0" aria-hidden="true" />
        <span className="flex-1 text-xs font-bold text-slate-300">Créditos de las fotos (licencia abierta)</span>
        <ChevronRight size={16} className={`text-slate-500 transition-transform ${abierto ? 'rotate-90' : ''}`} aria-hidden="true" />
      </button>
      {abierto && (
        <ul className="mt-2.5 pt-2.5 border-t border-slate-700/60 flex flex-col gap-1.5">
          {CREDITOS_FOTOS_ALMANAQUE.map((cr) => (
            <li key={cr.slug} className="text-[11px] leading-snug text-slate-400">
              <a
                href={cr.fuenteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-slate-200 hover:text-white underline decoration-slate-600 underline-offset-2 inline-flex items-center gap-0.5"
              >
                {cr.slug}<ExternalLink size={10} className="inline shrink-0" aria-hidden="true" />
              </a>
              <span className="text-slate-500"> — {cr.autor} · {cr.licencia} · Wikimedia Commons</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const SECCIONES = [
  { id: 'anio', titulo: 'El año', desc: 'Aguas y secas', Icon: CloudRain },
  { id: 'pisos', titulo: 'Pisos térmicos', desc: 'Qué da su altura', Icon: Mountain },
  { id: 'luna', titulo: 'La luna', desc: 'Saber campesino', Icon: Moon },
];

/* ── Pantalla principal ────────────────────────────────────────────────── */
export default function AlmanaqueScreen({ onBack, onNavigate = undefined }) {
  const [seccion, setSeccion] = useState('anio');

  const altitudeM = useMemo(() => {
    const n = Number(getProfile()?.finca_altitud);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, []);

  return (
    <ScreenShell title="Almanaque" icon={CalendarDays} onBack={onBack}>
      <div className="alm-screen max-w-2xl mx-auto p-4 space-y-4" data-testid="almanaque-screen">
        {/* Portada */}
        <div className="alm-portada rounded-2xl border border-amber-800/40 p-4">
          <p className="flex items-center gap-2 text-sm font-black text-amber-200 leading-tight">
            <CalendarDays size={18} aria-hidden="true" className="shrink-0" />
            El almanaque campesino
          </p>
          <p className="mt-1.5 text-xs italic leading-snug text-slate-300">
            El año de la finca contado a lo grande: cuándo entran las aguas y cuándo
            secan, qué da cada piso térmico y cuándo cosecha, y el saber lunar de los
            mayores. Para el detalle de sus propias matas, entre al Calendario de la finca.
          </p>
        </div>

        {/* Navegación entre secciones */}
        <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Secciones del almanaque">
          {SECCIONES.map((s) => {
            const activo = seccion === s.id;
            const Icono = s.Icon;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={activo}
                data-testid={`alm-tab-${s.id}`}
                onClick={() => setSeccion(s.id)}
                className={`alm-tab rounded-xl border px-2 py-2.5 text-center ${
                  activo
                    ? 'alm-tab-activa border-amber-500/70 bg-amber-500/15 text-amber-100'
                    : 'border-slate-700 bg-[#241811]/50 text-slate-300 active:bg-slate-800/70'
                }`}
              >
                <Icono size={17} aria-hidden="true" className="mx-auto" />
                <span className="block text-sm font-black leading-tight mt-1">{s.titulo}</span>
                <span className={`block text-[10px] leading-tight ${activo ? 'text-amber-200/90' : 'text-slate-500'}`}>{s.desc}</span>
              </button>
            );
          })}
        </div>

        {seccion === 'anio' && <SeccionAnio />}
        {seccion === 'pisos' && <SeccionPisos altitudeM={altitudeM} />}
        {seccion === 'luna' && <SeccionLuna />}

        {/* Puente al Calendario de la finca (la vista hermana grounded) */}
        {typeof onNavigate === 'function' && (
          <button
            type="button"
            data-testid="alm-ir-calendario"
            onClick={() => onNavigate('calendario_finca')}
            className="w-full flex items-center gap-3 rounded-2xl border border-emerald-700/50 bg-emerald-900/20 p-3.5 text-left active:bg-emerald-900/40 transition-colors"
          >
            <span aria-hidden="true" className="shrink-0 w-10 h-10 rounded-xl bg-emerald-500/15 grid place-items-center">
              <CalendarDays size={20} className="text-emerald-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100 leading-tight">Calendario de la finca</span>
              <span className="block text-xs text-slate-400 leading-tight mt-0.5">El detalle mata por mata: cuándo sembrar, abonar, vigilar y cosechar sus plantas.</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
          </button>
        )}

        {/* Créditos de fotos */}
        <CreditosFotos />

        {/* Puente al agente */}
        {typeof onNavigate === 'function' && (
          <button
            type="button"
            data-testid="alm-preguntar-agente"
            onClick={() => onNavigate('agente', { prefilledPrompt: '¿Qué me conviene sembrar este mes según mi altura y las lluvias de mi zona?' })}
            className="w-full flex items-center gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/40 p-3.5 text-left active:bg-slate-800/60 transition-colors"
          >
            <span aria-hidden="true" className="shrink-0 w-10 h-10 rounded-xl bg-amber-500/15 grid place-items-center">
              <MessageCircle size={20} className="text-amber-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100 leading-tight">¿Su finca es distinta?</span>
              <span className="block text-xs text-slate-400 leading-tight mt-0.5">Cuéntele al agente su altura y su clima: le afina el mes de siembra y de cosecha.</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
          </button>
        )}

        {/* Pie: fuentes */}
        <p className="text-[10px] text-slate-500 flex items-start gap-1.5 border-t border-slate-800 pt-3">
          <Info size={11} aria-hidden="true" className="shrink-0 mt-0.5" />
          <span>{ALMANAQUE_FUENTES}</span>
        </p>
      </div>
    </ScreenShell>
  );
}
