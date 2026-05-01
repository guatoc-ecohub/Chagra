/**
 * LiteView — vista simplificada para Nest Hub Guatoc (1024×600 / 1280×800).
 *
 * Sin Three.js (Nest Hub no tiene WebGL fluida). Sin glassmorphism complejo.
 * Tipografía grande + colores sólidos + datos clave: clima + finca.
 */
import { motion } from 'framer-motion';
import { useOracleStream } from '../hooks/useOracleStream';

const WEATHER_CODES: Record<number, string> = {
  0: '☀ Despejado', 1: '🌤 Mayormente claro', 2: '⛅ Parc. nublado', 3: '☁ Nublado',
  45: '🌫 Niebla', 48: '🌫 Niebla escarcha',
  61: '🌧 Lluvia leve', 63: '🌧 Lluvia mod', 65: '🌧 Lluvia fuerte',
  80: '🌧 Aguacero', 95: '⛈ Tormenta',
};

export function LiteView() {
  const { snapshot } = useOracleStream();

  if (!snapshot) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--bg-base)',
        color: 'var(--fg-dim)',
        fontSize: '1.2rem',
        letterSpacing: '0.15em',
      }}>
        Conectando…
      </div>
    );
  }

  const weather = snapshot.providers.openmeteo?.data;
  const farmos = snapshot.providers.farmos?.data;
  const lunar = snapshot.providers.lunar?.data;
  const c = weather?.current || {};

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'var(--bg-base)',
      padding: '2rem',
      display: 'grid',
      gridTemplateRows: 'auto 1fr auto',
      gap: '1.5rem',
    }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{
          margin: 0,
          fontSize: '1.8rem',
          color: 'var(--accent)',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          fontWeight: 500,
        }}>
          ⬢ Guatoc
        </h1>
        <span style={{ fontSize: '1rem', color: 'var(--fg-dim)' }}>
          {new Date(snapshot.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </header>

      <main style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '1.5rem',
        alignItems: 'stretch',
      }}>
        {/* Clima — gran panel */}
        <motion.section
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            padding: '2rem',
            background: 'var(--bg-card)',
            borderRadius: 16,
            border: '2px solid var(--accent)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '1.1rem', color: 'var(--fg-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Choachí · 1923 msnm
            </div>
            <div style={{ fontSize: '2rem', color: 'var(--accent-glow)', marginTop: '0.5rem' }}>
              {WEATHER_CODES[c.weather_code ?? 0] || 'sin datos'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <div style={{ fontSize: '6rem', fontWeight: 200, color: 'var(--accent-glow)' }}>
              {c.temperature_c ?? '—'}
            </div>
            <div style={{ fontSize: '2rem', color: 'var(--fg-dim)' }}>°C</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', fontSize: '1.2rem' }}>
            <Stat icon="💧" value={`${c.humidity_pct ?? '—'}%`} label="Humedad" />
            <Stat icon="🌧" value={`${c.precipitation_mm ?? '—'}mm`} label="Lluvia" />
            <Stat icon="💨" value={`${c.wind_kmh ?? '—'}km/h`} label="Viento" />
          </div>
        </motion.section>

        {/* Right column — finca + lunar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <motion.section
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={{
              flex: 1,
              padding: '1.5rem',
              background: 'var(--bg-card)',
              borderRadius: 16,
              border: '1px solid var(--border)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <div style={{ fontSize: '0.9rem', color: 'var(--fg-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Finca
            </div>
            <div style={{ fontSize: '4rem', fontWeight: 200, color: 'var(--accent-glow)', lineHeight: 1.1 }}>
              {farmos?.assets_active ?? 0}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--fg-dim)' }}>
              Assets activos · {farmos?.logs_7d ?? 0} logs 7d
            </div>
          </motion.section>

          {lunar && (
            <motion.section
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              style={{
                flex: 1,
                padding: '1.5rem',
                background: 'var(--bg-card)',
                borderRadius: 16,
                border: '1px solid var(--border)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '0.9rem', color: 'var(--fg-dim)' }}>
                Luna
              </div>
              <div style={{ fontSize: '1.4rem', color: 'var(--accent-sun)', margin: '0.5rem 0' }}>
                {lunar.phase}
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 200, color: 'var(--accent-sun)' }}>
                {Math.round(lunar.illumination_pct)}%
              </div>
            </motion.section>
          )}
        </div>
      </main>

      <footer style={{
        textAlign: 'center',
        fontSize: '0.7rem',
        color: 'var(--fg-mute)',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
      }}>
        Conexión Natural Sostenible · Guatoc Choachí
      </footer>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div>
      <div style={{ fontSize: '1.5rem' }}>{icon}</div>
      <div style={{ fontWeight: 600 }}>{value}</div>
      <div style={{ fontSize: '0.7rem', color: 'var(--fg-dim)', textTransform: 'uppercase' }}>
        {label}
      </div>
    </div>
  );
}
