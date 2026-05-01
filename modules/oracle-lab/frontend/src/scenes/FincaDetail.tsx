/**
 * FincaDetail — vista full-screen "viva" de Guatoc.
 *
 * Layout:
 *   [Topbar — back button + breadcrumb HYTA · GUATOC · El Curí + timestamp]
 *   [Hero — FOTO REAL de Guatoc (drone shot, geodesic dome + invernadero +
 *    paneles solares) ocupando 60% del ancho, con overlay de stats vivas]
 *   [Right panel — LiveGraph SVG 7d + subsystems + biodiversity banner]
 *
 * Foto real: /static/guatoc-hero.jpg (bundled desde public/).
 */
import { motion } from 'framer-motion';
import type { Snapshot } from '../hooks/useOracleStream';
import { BioDiversityBanner } from '../components/ParamoFauna';

interface Props {
  snapshot: Snapshot | null;
  onBack: () => void;
}

const ACCENT = '#4ED4E5';
const SUN = '#FFD27A';
const PARAMO_GREEN = '#5a8c5e';
const NIGHT = '#0a0e14';

export function FincaDetail({ snapshot, onBack }: Props) {
  const weather = snapshot?.providers?.openmeteo?.data;
  const farm = snapshot?.providers?.farmos?.data;
  const ha = snapshot?.providers?.home_assistant?.data;
  const lunar = snapshot?.providers?.lunar?.data;
  const current = weather?.current || {};
  const daily = weather?.daily_forecast || {};

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: NIGHT,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'var(--font-mono)',
        color: '#e6edf3',
      }}
    >
      {/* Hero photo full background con overlay oscuro gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(/static/guatoc-hero.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'saturate(1.05) contrast(1.05) brightness(0.85)',
          zIndex: 1,
        }}
      />

      {/* Overlay oscuro + cyan tint para legibilidad de stats */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 2,
          background: `
            linear-gradient(120deg, rgba(10,14,20,0.92) 0%, rgba(10,14,20,0.65) 35%, rgba(10,14,20,0.4) 65%, rgba(14,30,38,0.7) 100%),
            radial-gradient(ellipse at 0% 100%, rgba(78,212,229,0.08), transparent 50%),
            radial-gradient(ellipse at 100% 0%, rgba(255,210,122,0.05), transparent 50%)
          `,
        }}
      />

      {/* Topbar */}
      <header
        style={{
          padding: '1.5rem 2.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(78, 212, 229, 0.2)',
          background: 'linear-gradient(180deg, rgba(10,14,20,0.92), rgba(10,14,20,0.55))',
          backdropFilter: 'blur(12px)',
          zIndex: 5,
          position: 'relative',
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: 'transparent',
            border: '1px solid rgba(78, 212, 229, 0.4)',
            color: ACCENT,
            padding: '0.6rem 1.2rem',
            borderRadius: 4,
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            transition: 'all 200ms ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(78, 212, 229, 0.1)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 16px rgba(78, 212, 229, 0.4)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
          }}
        >
          ← Volver al globo
        </button>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.8rem',
          fontSize: '0.75rem',
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: 'rgba(230, 237, 243, 0.75)',
        }}>
          <span style={{ color: ACCENT, fontWeight: 600, textShadow: `0 0 8px rgba(78, 212, 229, 0.5)` }}>HYTA</span>
          <span style={{ color: 'rgba(230, 237, 243, 0.3)' }}>·</span>
          <span>GUATOC</span>
          <span style={{ color: 'rgba(230, 237, 243, 0.3)' }}>·</span>
          <span style={{ color: SUN }}>VEREDA EL CURÍ</span>
        </div>

        <div style={{ fontSize: '0.7rem', color: 'rgba(230, 237, 243, 0.6)', letterSpacing: '0.15em' }}>
          {snapshot?.timestamp
            ? new Date(snapshot.timestamp).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'medium' })
            : '—'}
        </div>
      </header>

      {/* Main grid: left stats + right graph */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'minmax(380px, 1fr) minmax(420px, 1.2fr)',
          gap: '2rem',
          padding: '2.5rem',
          overflow: 'auto',
          position: 'relative',
          zIndex: 4,
        }}
      >
        {/* Left — stats verticales sobre la foto */}
        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            justifyContent: 'flex-end',
          }}
        >
          <div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              style={{
                fontSize: '0.65rem',
                letterSpacing: '0.4em',
                color: SUN,
                textTransform: 'uppercase',
                marginBottom: '0.5rem',
                opacity: 0.85,
              }}
            >
              Finca Guatoc · en vivo
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              style={{
                fontSize: '1.75rem',
                fontWeight: 300,
                letterSpacing: '0.04em',
                color: '#fff',
                textShadow: '0 2px 16px rgba(0,0,0,0.85)',
                lineHeight: 1.15,
              }}
            >
              Vereda El Curí
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              style={{
                fontSize: '0.78rem',
                color: 'rgba(230, 237, 243, 0.75)',
                letterSpacing: '0.12em',
                marginTop: '0.5rem',
                textShadow: '0 1px 6px rgba(0,0,0,0.85)',
              }}
            >
              Choachí · Cundinamarca · 4.5306°N · -73.9247°W · 2520 msnm
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              style={{
                fontSize: '0.65rem',
                color: 'rgba(78, 212, 229, 0.7)',
                letterSpacing: '0.18em',
                marginTop: '0.3rem',
                fontStyle: 'italic',
              }}
            >
              Páramo cundinamarqués · Andes orientales
            </motion.div>
          </div>

          {/* Stat boxes 2x2 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '0.9rem',
          }}>
            <StatBox label="Temperatura" value={`${current.temperature_c ?? '—'}°`} hint="aire 2 m" accent={ACCENT} delay={0.7} />
            <StatBox label="Humedad" value={`${current.humidity_pct ?? '—'}%`} hint="rel." accent="#5FE3A8" delay={0.78} />
            <StatBox label="Lluvia hoy" value={`${current.precipitation_mm ?? 0} mm`} hint="acum." accent={ACCENT} delay={0.86} />
            <StatBox label="Viento" value={`${current.wind_kmh ?? '—'}`} hint="km/h" accent={SUN} delay={0.94} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem' }}>
            <SystemMini label="Asset finca" value={farm?.assets_active ?? '—'} accent={PARAMO_GREEN} delay={1.0} />
            <SystemMini label="Sensores IoT" value={ha?.sensors_total ?? '—'} accent={ACCENT} delay={1.06} />
            <SystemMini label="Fase lunar" value={lunar?.phase_name?.split(' ')[0] || '—'} accent={SUN} delay={1.12} />
          </div>
        </section>

        {/* Right — gráfica live + subsistemas + bio banner */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
          <PanelHeader title="Pulso vital · 7 días" subtitle="Temperatura máx/mín · precipitación" />
          <LiveGraph daily={daily} />

          <PanelHeader title="Sistema solar Guatoc" subtitle="Subsistemas · estado en vivo" />
          <SubsystemList />

          {/* Biodiversidad banner — imagen Gemini-generada por kortux con osos + quetzal + frailejones */}
          <BioDiversityBanner height={300} opacity={0.65} />
        </section>
      </div>
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────
// LiveGraph — area chart de temp/precipitación 7 días
// ────────────────────────────────────────────────────────────

function LiveGraph({ daily }: { daily: any }) {
  const tempMax: number[] = daily?.temp_max_c || [];
  const tempMin: number[] = daily?.temp_min_c || [];
  const rain: number[] = daily?.precipitation_mm || [];
  const dates: string[] = daily?.dates || [];

  const allTemps = [...tempMax, ...tempMin].filter((t) => typeof t === 'number');
  const tMin = allTemps.length ? Math.min(...allTemps) - 2 : 0;
  const tMax = allTemps.length ? Math.max(...allTemps) + 2 : 30;
  const rMax = rain.length ? Math.max(...rain, 5) : 5;

  const W = 640, H = 240;
  const PAD = { l: 40, r: 20, t: 20, b: 36 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  const xAt = (i: number) => PAD.l + (i / Math.max(tempMax.length - 1, 1)) * innerW;
  const yT = (t: number) => PAD.t + innerH - ((t - tMin) / (tMax - tMin)) * innerH;
  const yR = (r: number) => PAD.t + innerH - (r / rMax) * innerH;

  const tempMaxPath = tempMax.map((t, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i)},${yT(t)}`).join(' ');
  const tempMinPath = tempMin.map((t, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i)},${yT(t)}`).join(' ');
  const tempAreaPath = tempMax.length
    ? `${tempMaxPath} ${tempMin.slice().reverse().map((t, i) => {
        const idx = tempMin.length - 1 - i;
        return `L ${xAt(idx)},${yT(t)}`;
      }).join(' ')} Z`
    : '';

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, rgba(14, 30, 38, 0.7), rgba(8, 20, 26, 0.92))',
        border: '1px solid rgba(78, 212, 229, 0.2)',
        borderRadius: 6,
        padding: '1.2rem',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="temp-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SUN} stopOpacity="0.4" />
            <stop offset="100%" stopColor={ACCENT} stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="rain-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity="0.6" />
            <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((g, i) => (
          <line
            key={i}
            x1={PAD.l}
            x2={W - PAD.r}
            y1={PAD.t + innerH * g}
            y2={PAD.t + innerH * g}
            stroke="rgba(78, 212, 229, 0.1)"
            strokeWidth="1"
            strokeDasharray="2 4"
          />
        ))}

        {rain.map((r, i) => (
          <motion.rect
            key={`rain-${i}`}
            initial={{ height: 0 }}
            animate={{ height: PAD.t + innerH - yR(r) }}
            transition={{ duration: 0.6, delay: i * 0.06, ease: 'easeOut' }}
            x={xAt(i) - 8}
            y={yR(r)}
            width="16"
            fill="url(#rain-fill)"
          />
        ))}

        {tempAreaPath && (
          <motion.path
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            d={tempAreaPath}
            fill="url(#temp-fill)"
          />
        )}

        <motion.path
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, delay: 0.5, ease: 'easeOut' }}
          d={tempMaxPath}
          fill="none"
          stroke={SUN}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        <motion.path
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, delay: 0.7, ease: 'easeOut' }}
          d={tempMinPath}
          fill="none"
          stroke={ACCENT}
          strokeWidth="1.6"
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray="2 3"
        />

        {dates.map((d, i) => {
          const day = new Date(d).getDate();
          return (
            <text
              key={`d-${i}`}
              x={xAt(i)}
              y={H - 12}
              textAnchor="middle"
              fill="rgba(230, 237, 243, 0.6)"
              fontSize="9"
              fontFamily="monospace"
              letterSpacing="0.1em"
            >
              {day}
            </text>
          );
        })}

        {[tMin, (tMin + tMax) / 2, tMax].map((t, i) => (
          <text
            key={`yt-${i}`}
            x={PAD.l - 8}
            y={yT(t) + 3}
            textAnchor="end"
            fill="rgba(255, 210, 122, 0.6)"
            fontSize="8"
            fontFamily="monospace"
          >
            {Math.round(t)}°
          </text>
        ))}

        <g transform={`translate(${PAD.l}, ${PAD.t - 8})`}>
          <circle cx="0" cy="0" r="3" fill={SUN} />
          <text x="8" y="3" fill="rgba(255, 210, 122, 0.8)" fontSize="9" fontFamily="monospace" letterSpacing="0.1em">TEMP MAX</text>
          <circle cx="80" cy="0" r="3" fill={ACCENT} />
          <text x="88" y="3" fill="rgba(78, 212, 229, 0.8)" fontSize="9" fontFamily="monospace" letterSpacing="0.1em">TEMP MIN</text>
          <rect x="160" y="-3" width="6" height="6" fill={ACCENT} opacity="0.6" />
          <text x="170" y="3" fill="rgba(78, 212, 229, 0.7)" fontSize="9" fontFamily="monospace" letterSpacing="0.1em">LLUVIA mm</text>
        </g>
      </svg>
    </div>
  );
}

function StatBox({ label, value, hint, accent, delay = 0 }: { label: string; value: string; hint: string; accent: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      style={{
        background: 'linear-gradient(180deg, rgba(14, 30, 38, 0.75), rgba(8, 20, 26, 0.92))',
        border: `1px solid ${accent}40`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: 4,
        padding: '0.85rem 1rem',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
      }}
    >
      <div style={{ fontSize: '0.55rem', letterSpacing: '0.25em', color: 'rgba(230, 237, 243, 0.65)', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 300, color: accent, marginTop: '0.2rem', textShadow: `0 0 10px ${accent}77` }}>
        {value}
      </div>
      <div style={{ fontSize: '0.55rem', letterSpacing: '0.15em', color: 'rgba(230, 237, 243, 0.45)' }}>
        {hint}
      </div>
    </motion.div>
  );
}

function SystemMini({ label, value, accent, delay = 0 }: { label: string; value: any; accent: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay }}
      style={{
        background: 'rgba(14, 30, 38, 0.6)',
        border: `1px solid ${accent}40`,
        borderRadius: 4,
        padding: '0.7rem',
        textAlign: 'center',
        backdropFilter: 'blur(6px)',
      }}
    >
      <div style={{ fontSize: '0.5rem', letterSpacing: '0.25em', color: 'rgba(230, 237, 243, 0.55)', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.1rem', color: accent, marginTop: '0.3rem', fontWeight: 400, textShadow: `0 0 6px ${accent}55` }}>
        {value}
      </div>
    </motion.div>
  );
}

function PanelHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.8rem' }}>
      <span style={{
        fontSize: '0.7rem',
        letterSpacing: '0.32em',
        color: ACCENT,
        textTransform: 'uppercase',
        fontWeight: 600,
        textShadow: `0 0 8px ${ACCENT}66`,
      }}>
        {title}
      </span>
      <span style={{ fontSize: '0.6rem', color: 'rgba(230, 237, 243, 0.55)', letterSpacing: '0.15em' }}>
        {subtitle}
      </span>
    </div>
  );
}

function SubsystemList() {
  const subsystems = [
    { name: 'Sistema solar', icon: '☀', status: 'OK', accent: SUN },
    { name: 'Invernadero', icon: '⌂', status: 'OK', accent: '#5FE3A8' },
    { name: 'Sensores meteo', icon: '⌬', status: 'OK', accent: ACCENT },
    { name: 'Seguridad', icon: '⊕', status: 'OK', accent: '#FF6B6B' },
    { name: 'IA · Mycelium', icon: '⬢', status: 'OK', accent: '#1AB8CC' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {subsystems.map((s, i) => (
        <motion.div
          key={s.name}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 1.2 + i * 0.08 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.8rem',
            padding: '0.65rem 0.95rem',
            background: 'rgba(14, 30, 38, 0.55)',
            border: `1px solid ${s.accent}30`,
            borderLeft: `3px solid ${s.accent}`,
            borderRadius: 4,
          }}
        >
          <span style={{ fontSize: '1.05rem', color: s.accent, textShadow: `0 0 6px ${s.accent}aa` }}>{s.icon}</span>
          <span style={{ fontSize: '0.8rem', flex: 1, color: 'rgba(230, 237, 243, 0.9)', letterSpacing: '0.05em' }}>
            {s.name}
          </span>
          <span style={{
            fontSize: '0.6rem',
            letterSpacing: '0.2em',
            padding: '0.18rem 0.55rem',
            borderRadius: 2,
            background: `${s.accent}25`,
            color: s.accent,
            fontWeight: 600,
          }}>
            {s.status}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
