/**
 * ProviderCards — renderers específicos por collector.
 *
 * Cada renderer usa HudCard como contenedor + visualización custom.
 * Render condicional: solo aparece la card si el provider está activo.
 */
import { HudCard } from './HudCard';
import { MetricRing } from './MetricRing';
import type { ProviderResponse } from '../hooks/useOracleStream';

const WEATHER_CODES: Record<number, string> = {
  0: 'Despejado', 1: 'Mayormente claro', 2: 'Parc. nublado', 3: 'Nublado',
  45: 'Niebla', 48: 'Niebla escarcha',
  51: 'Llovizna ligera', 53: 'Llovizna mod', 55: 'Llovizna densa',
  61: 'Lluvia leve', 63: 'Lluvia mod', 65: 'Lluvia fuerte',
  80: 'Aguacero', 81: 'Aguacero', 82: 'Aguacero violento',
  95: 'Tormenta',
};

const STATUS_COLOR: Record<string, string> = {
  ok: 'var(--status-ok)',
  error: 'var(--status-err)',
  no_data: 'var(--fg-dim)',
};

function statusLabel(s: string) { return s.toUpperCase().replace('_', ' '); }

interface Props { provider: ProviderResponse; delay: number; }

export function WeatherCard({ provider, delay }: Props) {
  const d = provider.data || {};
  const c = d.current || {};
  const code = c.weather_code ?? 0;
  return (
    <HudCard
      title={d.location || 'Clima · Guatoc · Vereda El Curí'}
      badge={statusLabel(provider.status)}
      badgeColor={STATUS_COLOR[provider.status]}
      delay={delay}
    >
      {provider.status !== 'ok' ? (
        <div style={{ color: 'var(--fg-dim)' }}>{provider.error || 'sin datos'}</div>
      ) : (
        <>
          <div style={{ fontSize: '1.3rem', color: 'var(--accent-glow)', marginBottom: '0.75rem' }}>
            {WEATHER_CODES[code] || `Código ${code}`}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <Stat value={`${c.temperature_c ?? '—'}°`} label="Temperatura" />
            <Stat value={`${c.humidity_pct ?? '—'}%`} label="Humedad" />
            <Stat value={`${c.precipitation_mm ?? '—'} mm`} label="Lluvia" />
            <Stat value={`${c.wind_kmh ?? '—'} km/h`} label="Viento" />
          </div>
        </>
      )}
    </HudCard>
  );
}

export function FarmOSCard({ provider, delay }: Props) {
  const d = provider.data || {};
  return (
    <HudCard
      title="FarmOS · Finca Guatoc"
      badge={statusLabel(provider.status)}
      badgeColor={STATUS_COLOR[provider.status]}
      delay={delay}
    >
      {provider.status === 'no_data' ? (
        <div style={{ color: 'var(--fg-dim)' }}>{d.reason || 'token pendiente'}</div>
      ) : provider.status !== 'ok' ? (
        <div style={{ color: 'var(--status-err)' }}>{provider.error}</div>
      ) : (
        <>
          <BigNumber value={d.assets_active ?? 0} label="Assets activos" />
          <Subtext>Logs últimos 7d: <strong style={{ color: 'var(--accent-glow)' }}>{d.logs_7d ?? '—'}</strong></Subtext>
          {d.assets_by_bundle && Object.keys(d.assets_by_bundle).length > 0 && (
            <BundleList bundles={d.assets_by_bundle} />
          )}
        </>
      )}
    </HudCard>
  );
}

export function HACard({ provider, delay }: Props) {
  const d = provider.data || {};
  return (
    <HudCard
      title="Home Assistant · IoT"
      badge={statusLabel(provider.status)}
      badgeColor={STATUS_COLOR[provider.status]}
      delay={delay}
    >
      {provider.status === 'no_data' ? (
        <div style={{ color: 'var(--fg-dim)' }}>{d.reason || 'token pendiente'}</div>
      ) : provider.status !== 'ok' ? (
        <div style={{ color: 'var(--status-err)' }}>{provider.error}</div>
      ) : (
        <>
          <BigNumber value={d.matched_sensors ?? 0} label="Sensores activos" />
          <Subtext>de {d.total_entities ?? '?'} entidades</Subtext>
          <SensorList sensors={d.sensors || []} />
        </>
      )}
    </HudCard>
  );
}

export function OllamaCard({ provider, delay }: Props) {
  const d = provider.data || {};
  return (
    <HudCard
      title="Ollama · Modelos locales"
      badge={statusLabel(provider.status)}
      badgeColor={STATUS_COLOR[provider.status]}
      delay={delay}
    >
      {provider.status !== 'ok' ? (
        <div style={{ color: 'var(--status-err)' }}>{provider.error || 'sin datos'}</div>
      ) : (
        <>
          <BigNumber value={d.loaded_count ?? 0} label="En VRAM" />
          <Subtext>de {d.models_total ?? '?'} disponibles</Subtext>
          {d.loaded_now && d.loaded_now.length > 0 && (
            <ListBlock label="Cargados">
              {d.loaded_now.slice(0, 3).map((m: any) => (
                <Row key={m.name} k={m.name} v={`${m.vram_gb} GB`} />
              ))}
            </ListBlock>
          )}
        </>
      )}
    </HudCard>
  );
}

export function WhisperCard({ provider, delay }: Props) {
  const d = provider.data || {};
  return (
    <HudCard
      title="Whisper · Transcripción"
      badge={statusLabel(provider.status)}
      badgeColor={STATUS_COLOR[provider.status]}
      delay={delay}
    >
      {provider.status !== 'ok' ? (
        <div style={{ color: 'var(--status-err)' }}>{provider.error || 'sin datos'}</div>
      ) : (
        <>
          <BigNumber value={d.hours_transcribed ?? 0} label="Horas transcritas" />
          <Subtext>
            Health: <strong style={{ color: d.healthy ? 'var(--status-ok)' : 'var(--status-err)' }}>
              {d.healthy ? 'OK' : 'DOWN'}
            </strong>
          </Subtext>
        </>
      )}
    </HudCard>
  );
}

export function LunarCard({ provider, delay }: Props) {
  const d = provider.data || {};
  return (
    <HudCard
      title="Calendario lunar"
      badge={statusLabel(provider.status)}
      badgeColor={STATUS_COLOR[provider.status]}
      delay={delay}
    >
      {provider.status !== 'ok' ? (
        <div style={{ color: 'var(--status-err)' }}>{provider.error}</div>
      ) : (
        <>
          <div style={{ fontSize: '1.2rem', color: 'var(--accent-sun)', marginBottom: '0.5rem' }}>
            {d.phase}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <MetricRing
              value={d.illumination_pct ?? 0}
              displayValue={`${Math.round(d.illumination_pct ?? 0)}%`}
              label="Iluminación"
              size={90}
              color="var(--accent-sun)"
            />
            <div style={{ flex: 1, fontSize: '0.75rem', color: 'var(--fg-dim)' }}>
              <div>Edad: <strong style={{ color: 'var(--fg)' }}>{d.age_days}d</strong></div>
              <div>Próxima nueva: <strong style={{ color: 'var(--fg)' }}>{d.days_until_new}d</strong></div>
              <div>Próxima llena: <strong style={{ color: 'var(--fg)' }}>{d.days_until_full}d</strong></div>
            </div>
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--fg-dim)' }}>
            {d.recommendation}
          </div>
        </>
      )}
    </HudCard>
  );
}

export function GitActivityCard({ provider, delay }: Props) {
  const d = provider.data || {};
  return (
    <HudCard
      title="Git Activity · 7d"
      badge={statusLabel(provider.status)}
      badgeColor={STATUS_COLOR[provider.status]}
      delay={delay}
    >
      {provider.status !== 'ok' ? (
        <div style={{ color: 'var(--status-err)' }}>{provider.error}</div>
      ) : (
        <>
          <BigNumber value={d.total_commits_7d ?? 0} label="Commits totales" />
          {d.repos && Object.keys(d.repos).length > 0 && (
            <ListBlock>
              {Object.entries(d.repos).map(([repo, info]: any) => (
                <Row key={repo} k={repo} v={`${info.commits_7d ?? 0}`} />
              ))}
            </ListBlock>
          )}
        </>
      )}
    </HudCard>
  );
}

export function SystemHealthCard({ provider, delay }: Props) {
  const d = provider.data || {};
  const m = d.memory || {};
  return (
    <HudCard
      title={`Sistema · ${d.hostname || 'host'}`}
      badge={statusLabel(provider.status)}
      badgeColor={STATUS_COLOR[provider.status]}
      delay={delay}
    >
      {provider.status !== 'ok' ? (
        <div style={{ color: 'var(--status-err)' }}>{provider.error}</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-around', marginBottom: '1rem' }}>
            <MetricRing
              value={d.load_pct_1m ?? 0}
              label="CPU 1m"
              size={90}
              color={(d.load_pct_1m ?? 0) > 80 ? 'var(--status-err)' : 'var(--accent-glow)'}
            />
            <MetricRing value={m.used_pct ?? 0} label="RAM" size={90} />
          </div>
          <Subtext>
            Load: {d.load_avg_1m} / {d.load_avg_5m} / {d.load_avg_15m} ({d.cpu_count} CPUs)
          </Subtext>
          {d.disks && Object.keys(d.disks).length > 0 && (
            <ListBlock>
              {Object.entries(d.disks).map(([k, v]: any) => (
                <Row key={k} k={k} v={`${v.used_pct}%`} />
              ))}
            </ListBlock>
          )}
        </>
      )}
    </HudCard>
  );
}

export function CloudflareCard({ provider, delay }: Props) {
  const d = provider.data || {};
  return (
    <HudCard
      title="Cloudflare Tunnels"
      badge={statusLabel(provider.status)}
      badgeColor={STATUS_COLOR[provider.status]}
      delay={delay}
    >
      {provider.status === 'no_data' ? (
        <div style={{ color: 'var(--fg-dim)' }}>{d.reason}</div>
      ) : provider.status !== 'ok' ? (
        <div style={{ color: 'var(--status-err)' }}>{provider.error}</div>
      ) : (
        <>
          <BigNumber value={d.ha_connections ?? 0} label="HA Connections" />
          <Subtext>Requests: <strong style={{ color: 'var(--accent-glow)' }}>{d.requests_total ?? '?'}</strong></Subtext>
          <Subtext>5xx: <strong style={{ color: (d.responses_5xx || 0) > 0 ? 'var(--status-err)' : 'var(--status-ok)' }}>
            {d.responses_5xx ?? 0}
          </strong></Subtext>
        </>
      )}
    </HudCard>
  );
}

// ─── Helper components ───────────────────────────────────────────────

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{
      padding: '0.6rem',
      background: 'rgba(14, 146, 166, 0.06)',
      borderRadius: 8,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '1.2rem', fontWeight: 300, color: 'var(--accent-glow)' }}>{value}</div>
      <div style={{ fontSize: '0.6rem', color: 'var(--fg-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {label}
      </div>
    </div>
  );
}

function BigNumber({ value, label }: { value: number | string; label: string }) {
  return (
    <>
      <div style={{
        fontSize: '2.4rem',
        fontWeight: 200,
        background: 'linear-gradient(135deg, var(--bg-mint), var(--accent))',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        lineHeight: 1,
      }}>
        {value}
      </div>
      <div style={{ fontSize: '0.7rem', color: 'var(--fg-dim)', marginTop: '0.25rem', letterSpacing: '0.05em' }}>
        {label}
      </div>
    </>
  );
}

function Subtext({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--fg-dim)' }}>
      {children}
    </div>
  );
}

function ListBlock({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: '0.75rem' }}>
      {label && (
        <div style={{
          fontSize: '0.65rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--fg-dim)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: '0.25rem',
        }}>
          {label}
        </div>
      )}
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string | number }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      padding: '0.3rem 0',
      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      fontSize: '0.8rem',
    }}>
      <span style={{ color: 'var(--fg-dim)' }}>{k}</span>
      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg)' }}>{v}</span>
    </div>
  );
}

function BundleList({ bundles }: { bundles: Record<string, number> }) {
  return (
    <ListBlock>
      {Object.entries(bundles).map(([k, v]) => <Row key={k} k={k} v={v} />)}
    </ListBlock>
  );
}

function SensorList({ sensors }: { sensors: any[] }) {
  return (
    <ListBlock>
      {sensors.slice(0, 6).map((s) => (
        <Row
          key={s.entity_id}
          k={s.friendly_name || s.entity_id.replace('sensor.', '')}
          v={`${s.state}${s.unit ? ' ' + s.unit : ''}`}
        />
      ))}
    </ListBlock>
  );
}
