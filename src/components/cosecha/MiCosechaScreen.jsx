import React, { useEffect } from 'react';
import { Apple, TrendingUp, TrendingDown, Minus, ShoppingBasket, Mic } from 'lucide-react';
import { ScreenShell } from '../common/ScreenShell';
import useCosechaStore from '../../store/useCosechaStore';
import './mi-cosecha.css';

/**
 * MiCosechaScreen — tablero visual de "Mi cosecha" (producción y rendimiento).
 *
 * Feature estrella Tier-1: el piloto ve SU dato propio — cuánto produce la
 * finca por cultivo, cómo va el año, la curva mensual y el rendimiento por
 * lote. TODO sale de useCosechaStore → cosechaService.harvestSummary (agrega
 * los `log--harvest` que HarvestLog ya registra, offline-first). Esta vista
 * SOLO pinta: cero números fabricados; sin datos → estado vacío acogedor que
 * invita a registrar la primera cosecha.
 *
 * Reemplaza a MiCosechaPlaceholder (andamiaje de datos de #2130).
 *
 * Gráficas hechas a mano (CSS/SVG, byte-neutral): barras por cultivo (un solo
 * tono — es magnitud, no identidad) y curva mensual SVG. Cada gráfica trae su
 * tabla alterna ("Ver los números") para lectores de pantalla y para quien
 * prefiere el número al dibujo.
 *
 * @param {object} props
 * @param {Function} props.onBack
 * @param {Function} [props.onHome]
 * @param {Function} props.onNavigate - navegar a 'cosechar' / 'registro_voz'.
 */

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** '2026-06' → 'jun 26'. */
const mesLabel = (period) => {
  const [y, m] = String(period || '').split('-');
  const idx = Number(m) - 1;
  if (!(idx >= 0 && idx < 12)) return period || '';
  return `${MESES[idx]} ${String(y).slice(2)}`;
};

const nf1 = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

/** Formatea una cantidad: 1 decimal por debajo de 100, redondo de ahí en adelante. */
const fmtCant = (n) => (Math.abs(n) >= 100 ? nf0.format(n) : nf1.format(n));

/** Valor mostrado de un bucket según la unidad activa del resumen. */
const valorDe = (bucket, usesKg) => (usesKg ? bucket.totalKg : bucket.totalCount);

// ── Estado vacío ─────────────────────────────────────────────────────────────

/** Canasta dibujada a mano (SVG puro, decorativa). */
function CanastaVacia() {
  return (
    <svg className="mc-vacio-dibujo" viewBox="0 0 150 110" aria-hidden="true">
      {/* Frutas que "van cayendo" a la canasta */}
      <g className="mc-vacio-fruta">
        <circle cx="60" cy="26" r="9" fill="#34d399" opacity="0.9" />
        <path d="M60 17 q3 -6 8 -7" fill="none" stroke="#6ee7b7" strokeWidth="2" strokeLinecap="round" />
      </g>
      <g className="mc-vacio-fruta is-2">
        <circle cx="94" cy="18" r="7" fill="#fbbf24" opacity="0.85" />
        <path d="M94 11 q2 -5 6 -6" fill="none" stroke="#fcd34d" strokeWidth="2" strokeLinecap="round" />
      </g>
      {/* Canasta: boca, cuerpo y tejido */}
      <ellipse cx="75" cy="52" rx="44" ry="8" fill="none" stroke="#94a3b8" strokeWidth="2.5" />
      <path d="M31 52 Q37 96 75 96 Q113 96 119 52" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M40 66 Q75 74 110 66" fill="none" stroke="#64748b" strokeWidth="1.5" />
      <path d="M46 79 Q75 86 104 79" fill="none" stroke="#64748b" strokeWidth="1.5" />
      {/* Asa */}
      <path d="M53 50 Q75 20 97 50" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function EstadoVacio({ onNavigate }) {
  return (
    <div className="mc-vacio" data-testid="mi-cosecha-vacio">
      <CanastaVacia />
      <h2>Aún no ha registrado cosecha</h2>
      <p>
        Cada canasta que anote va pintando aquí la historia de su finca:
        cuánto dio cada cultivo, cómo va el año y qué lote rinde más.
      </p>
      <div className="mc-ctas">
        <button type="button" className="mc-cta" onClick={() => onNavigate('cosechar')}>
          <ShoppingBasket size={18} aria-hidden="true" /> Anotar mi primera cosecha
        </button>
        <button type="button" className="mc-cta is-secundario" onClick={() => onNavigate('registro_voz')}>
          <Mic size={16} aria-hidden="true" /> O dígala por voz
        </button>
      </div>
    </div>
  );
}

// ── Héroe + KPIs ─────────────────────────────────────────────────────────────

function DeltaBadge({ season }) {
  if (!season?.prevMonth || season.deltaKg == null) return null;
  const sube = season.deltaKg > 0;
  const baja = season.deltaKg < 0;
  const Icono = sube ? TrendingUp : baja ? TrendingDown : Minus;
  const clase = sube ? '' : baja ? ' is-baja' : ' is-estable';
  const unidad = season.usesKg ? 'kg' : 'und';
  const pct = season.deltaPct != null ? ` (${season.deltaPct > 0 ? '+' : ''}${nf0.format(season.deltaPct)} %)` : '';
  return (
    <span className={`mc-delta${clase}`}>
      <Icono size={14} aria-hidden="true" />
      {`${season.deltaKg > 0 ? '+' : ''}${fmtCant(season.deltaKg)} ${unidad}${pct} · ${mesLabel(season.lastMonth.period)} vs ${mesLabel(season.prevMonth.period)}`}
    </span>
  );
}

function Hero({ summary }) {
  const { season, totalKg } = summary;
  const usesKg = season.usesKg;
  const totalConteo = summary.byCrop.reduce((acc, c) => acc + c.totalCount, 0);
  // Honesto: si la temporada (año en curso) no tiene datos, el héroe muestra
  // el total histórico y lo DICE — nada de un "0" que asuste ni un total
  // disfrazado de temporada.
  const enTemporada = season.monthsWithData > 0;
  const valor = enTemporada
    ? (usesKg ? season.seasonKg : season.seasonCount)
    : (usesKg ? totalKg : totalConteo);
  const etiqueta = enTemporada
    ? `Cosechado en lo que va de ${season.year}`
    : 'Todo lo cosechado hasta hoy';
  return (
    <section className="mc-card" aria-label="Total de la temporada">
      <p className="mc-hero-label">{etiqueta}</p>
      <p className="mc-hero-value">
        {fmtCant(valor)}
        <span className="mc-hero-unit">{usesKg ? 'kg' : 'unidades'}</span>
      </p>
      <DeltaBadge season={season} />
    </section>
  );
}

function KpiRow({ summary }) {
  const kpis = [
    { label: 'Total histórico', value: fmtCant(summary.totalKg), sufijo: 'kg' },
    { label: 'Cosechas', value: nf0.format(summary.totalHarvests) },
    { label: 'Cultivo estrella', value: summary.topCrop?.crop || '—' },
  ];
  return (
    <ul className="mc-kpis">
      {kpis.map((k) => (
        <li className="mc-kpi" key={k.label}>
          <span className="mc-kpi-label">{k.label}</span>
          <span className="mc-kpi-value" title={k.value}>
            {k.value}{k.sufijo ? <small> {k.sufijo}</small> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ── Barras por cultivo ───────────────────────────────────────────────────────

const MAX_BARRAS = 7; // techo de clases legibles; la cola se pliega en "Otros"

function BarrasPorCultivo({ byCrop }) {
  const pesados = byCrop.filter((c) => c.totalKg > 0);
  const contados = byCrop.filter((c) => !(c.totalKg > 0) && c.totalCount > 0);
  if (!pesados.length && !contados.length) return null;

  const top = pesados.slice(0, MAX_BARRAS);
  const cola = pesados.slice(MAX_BARRAS);
  const otros = cola.length
    ? { crop: `Otros (${cola.length} cultivos)`, cropKey: '__otros', totalKg: cola.reduce((a, c) => a + c.totalKg, 0), esOtros: true }
    : null;
  const filas = otros ? [...top, otros] : top;
  const max = Math.max(...filas.map((c) => c.totalKg), 1);

  return (
    <section className="mc-card" aria-labelledby="mc-cultivos-titulo">
      <h3 className="mc-section-title" id="mc-cultivos-titulo">Producción por cultivo</h3>
      <p className="mc-section-sub">Kilos totales de cada cultivo, de mayor a menor.</p>
      {filas.length > 0 && (
        <ul className="mc-bars">
          {filas.map((c) => (
            <li key={c.cropKey}>
              <div className="mc-bar-head">
                <span className="mc-bar-name">{c.crop}</span>
                <span className="mc-bar-value">{fmtCant(c.totalKg)} kg</span>
              </div>
              <div className="mc-bar-track" aria-hidden="true">
                <div
                  className={`mc-bar-fill${c.esOtros ? ' is-otros' : ''}`}
                  style={{ width: `${Math.max((c.totalKg / max) * 100, 1.5)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      {contados.length > 0 && (
        <ul className="mc-conteos" aria-label="Cosechas que se cuentan por unidades">
          {contados.map((c) => (
            <li key={c.cropKey}>
              <span className="mc-bar-name">{c.crop}</span>
              <span className="mc-bar-value">{nf0.format(c.totalCount)} und</span>
            </li>
          ))}
        </ul>
      )}
      <details className="mc-table">
        <summary>Ver los números en tabla</summary>
        <table>
          <thead>
            <tr><th scope="col">Cultivo</th><th scope="col">Cosechas</th><th scope="col">Total</th></tr>
          </thead>
          <tbody>
            {byCrop.map((c) => (
              <tr key={c.cropKey}>
                <td>{c.crop}</td>
                <td>{nf0.format(c.harvestCount)}</td>
                <td>{c.totalKg > 0 ? `${fmtCant(c.totalKg)} kg` : `${nf0.format(c.totalCount)} und`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}

// ── Tendencia mensual (SVG) ──────────────────────────────────────────────────

const MESES_VISIBLES = 12;

function TendenciaSvg({ serie, usesKg }) {
  const W = 320;
  const H = 132;
  const PAD = { izq: 8, der: 40, arr: 16, abj: 22 };
  const max = Math.max(...serie.map((s) => valorDe(s, usesKg)), 1);
  const x = (i) => PAD.izq + (i * (W - PAD.izq - PAD.der)) / (serie.length - 1);
  const y = (v) => PAD.arr + (1 - v / max) * (H - PAD.arr - PAD.abj);
  const pts = serie.map((s, i) => [x(i), y(valorDe(s, usesKg))]);
  const linea = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
  const base = H - PAD.abj;
  const area = `${linea} L${pts[pts.length - 1][0].toFixed(1)},${base} L${pts[0][0].toFixed(1)},${base} Z`;
  const unidad = usesKg ? 'kg' : 'und';
  const ultimo = serie[serie.length - 1];
  // Ticks del eje x: primero, medio (si hay espacio) y último — sin saturar.
  const ticks = serie.length >= 5 ? [0, Math.floor((serie.length - 1) / 2), serie.length - 1] : [0, serie.length - 1];

  return (
    <svg
      className="mc-trend-svg"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Cosecha por mes, de ${mesLabel(serie[0].period)} a ${mesLabel(ultimo.period)}. Último mes: ${fmtCant(valorDe(ultimo, usesKg))} ${unidad}.`}
    >
      <line className="mc-trend-grid" x1={PAD.izq} y1={base} x2={W - PAD.der + 14} y2={base} />
      <path className="mc-trend-area" d={area} />
      <path className="mc-trend-line" d={linea} />
      {pts.map(([px, py], i) => (
        <circle key={serie[i].period} className="mc-trend-dot" cx={px} cy={py} r={i === serie.length - 1 ? 4.5 : 3}>
          <title>{`${mesLabel(serie[i].period)}: ${fmtCant(valorDe(serie[i], usesKg))} ${unidad}`}</title>
        </circle>
      ))}
      {/* Etiqueta directa SOLO en el punto final (la tabla trae el resto). */}
      <text
        className="mc-trend-endlabel"
        x={Math.min(pts[pts.length - 1][0] + 8, W - 4)}
        y={Math.max(pts[pts.length - 1][1] + 4, 12)}
      >
        {fmtCant(valorDe(ultimo, usesKg))}
      </text>
      {ticks.map((i) => (
        <text
          key={serie[i].period}
          className="mc-trend-tick"
          x={pts[i][0]}
          y={H - 6}
          textAnchor={i === 0 ? 'start' : i === serie.length - 1 ? 'end' : 'middle'}
        >
          {mesLabel(serie[i].period)}
        </text>
      ))}
    </svg>
  );
}

function Tendencia({ trend, season }) {
  const serie = trend.series.slice(-MESES_VISIBLES);
  if (!serie.length) return null;
  const usesKg = season.usesKg;
  const unidad = usesKg ? 'kg' : 'und';
  const nombreDireccion = { subiendo: 'va subiendo', bajando: 'va bajando', estable: 'va estable' }[trend.direction];

  return (
    <section className="mc-card" aria-labelledby="mc-tendencia-titulo">
      <h3 className="mc-section-title" id="mc-tendencia-titulo">Mes a mes</h3>
      <p className="mc-section-sub">
        {serie.length >= 2
          ? `Su cosecha ${nombreDireccion} en los últimos ${serie.length} meses con registro.`
          : 'Un solo mes con registro: la curva arranca cuando anote el segundo.'}
      </p>
      {serie.length >= 2 ? (
        <>
          <TendenciaSvg serie={serie} usesKg={usesKg} />
          {season.prevMonth && (
            <p className="mc-compara">
              <strong>{mesLabel(season.lastMonth.period)}</strong>: {fmtCant(valorDe(season.lastMonth, usesKg))} {unidad}
              {' · '}
              <strong>{mesLabel(season.prevMonth.period)}</strong>: {fmtCant(valorDe(season.prevMonth, usesKg))} {unidad}
            </p>
          )}
          <details className="mc-table">
            <summary>Ver los números en tabla</summary>
            <table>
              <thead>
                <tr><th scope="col">Mes</th><th scope="col">Cosechas</th><th scope="col">Total</th></tr>
              </thead>
              <tbody>
                {serie.map((s) => (
                  <tr key={s.period}>
                    <td>{mesLabel(s.period)}</td>
                    <td>{nf0.format(s.harvestCount)}</td>
                    <td>{`${fmtCant(valorDe(s, usesKg))} ${unidad}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      ) : (
        <p className="mc-nota">
          {mesLabel(serie[0].period)}: {fmtCant(valorDe(serie[0], usesKg))} {unidad} en {nf0.format(serie[0].harvestCount)} cosecha(s).
        </p>
      )}
    </section>
  );
}

// ── Rendimiento por lote ─────────────────────────────────────────────────────

function PorLote({ byLote }) {
  const conDatos = byLote.filter((l) => l.totalKg > 0 || l.totalCount > 0);
  if (!conDatos.length) return null;
  return (
    <section className="mc-card" aria-labelledby="mc-lotes-titulo">
      <h3 className="mc-section-title" id="mc-lotes-titulo">Rendimiento por lote</h3>
      <p className="mc-section-sub">Qué parte de la finca está dando más.</p>
      <ul className="mc-lotes">
        {conDatos.slice(0, 6).map((l) => (
          <li className="mc-lote" key={l.loteId}>
            <span className="mc-lote-name">{l.name}</span>
            <span className="mc-lote-datos">
              {l.totalKg > 0 && <span>{fmtCant(l.totalKg)} kg</span>}
              {l.totalCount > 0 && <span>{nf0.format(l.totalCount)} und</span>}
              {l.kgPerPlant != null && <span>{fmtCant(l.kgPerPlant)} kg/planta</span>}
              {l.kgPerHa != null && <span>{fmtCant(l.kgPerHa)} kg/ha</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ── Pantalla ─────────────────────────────────────────────────────────────────

/**
 * @param {{ onBack: Function, onHome?: Function, onNavigate: Function }} props
 */
export default function MiCosechaScreen({ onBack, onHome, onNavigate }) {
  const summary = useCosechaStore((s) => s.summary);
  const isLoading = useCosechaStore((s) => s.isLoading);
  const error = useCosechaStore((s) => s.error);
  const loadHarvests = useCosechaStore((s) => s.loadHarvests);

  useEffect(() => {
    loadHarvests();
  }, [loadHarvests]);

  const vacio = !summary || summary.totalHarvests === 0;

  return (
    <ScreenShell title="Mi cosecha" icon={Apple} onBack={onBack} onHome={onHome}>
      <div className="mi-cosecha" data-testid="mi-cosecha">
        {isLoading && !summary && <p className="mc-cargando">Sumando sus cosechas…</p>}
        {!isLoading && error && !summary && (
          <p className="mc-cargando" role="alert">No se pudieron cargar las cosechas. Intente de nuevo.</p>
        )}
        {summary && vacio && <EstadoVacio onNavigate={onNavigate} />}
        {summary && !vacio && (
          <>
            <Hero summary={summary} />
            <KpiRow summary={summary} />
            <BarrasPorCultivo byCrop={summary.byCrop} />
            <Tendencia trend={summary.trend} season={summary.season} />
            <PorLote byLote={summary.byLote} />
            <div className="mc-ctas">
              <button type="button" className="mc-cta" onClick={() => onNavigate('cosechar')}>
                <ShoppingBasket size={18} aria-hidden="true" /> Anotar otra cosecha
              </button>
              <button type="button" className="mc-cta is-secundario" onClick={() => onNavigate('registro_voz')}>
                <Mic size={16} aria-hidden="true" /> Por voz
              </button>
            </div>
          </>
        )}
      </div>
    </ScreenShell>
  );
}
