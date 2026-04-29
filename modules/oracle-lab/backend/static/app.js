// Oracle Guatoc MVP v0.1 — vanilla JS dashboard.
// TODO post identidad final: migrar a React + R3F + Three.js Jarvis HUD.

const root = document.getElementById('root');
const stamp = document.getElementById('stamp');

const WEATHER_CODES = {
  0: '☀ Despejado',
  1: '🌤 Mayormente claro',
  2: '⛅ Parcialmente nublado',
  3: '☁ Nublado',
  45: '🌫 Niebla',
  48: '🌫 Niebla con escarcha',
  51: '🌦 Llovizna ligera',
  53: '🌦 Llovizna moderada',
  55: '🌦 Llovizna densa',
  61: '🌧 Lluvia ligera',
  63: '🌧 Lluvia moderada',
  65: '🌧 Lluvia intensa',
  80: '🌧 Aguacero ligero',
  81: '🌧 Aguacero moderado',
  82: '🌧 Aguacero violento',
  95: '⛈ Tormenta',
};

function badge(status) {
  const cls = {ok: 'badge-ok', error: 'badge-error', no_data: 'badge-no_data'}[status] || 'badge-no_data';
  return `<span class="badge ${cls}">${status || '?'}</span>`;
}

function escape(s) {
  return String(s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function card(title, badgeStatus, body) {
  return `<section class="card"><h2><span>${escape(title)}</span>${badge(badgeStatus)}</h2>${body}</section>`;
}

function renderAiStats(p) {
  if (p.status !== 'ok') {
    return card('AI Stack', p.status, `<pre>${escape(p.error || '')}</pre>`);
  }
  const providers = p.data?.providers || {};
  const rows = Object.entries(providers).map(([name, d]) => {
    const status = d.status || 'unknown';
    return `<div class="row"><span class="row-key">${escape(name)}</span><span class="row-val">${escape(status)}</span></div>`;
  }).join('');
  return card('AI Stack · z.ai · Ollama · Whisper', p.status, rows || '<div style="color:var(--fg-dim);font-size:0.8rem;">Sin providers reportados</div>');
}

function renderFarmOS(p) {
  if (p.status === 'no_data') {
    return card('FarmOS · Finca Guatoc', p.status, `<div style="color:var(--fg-dim);font-size:0.85rem;">${escape(p.data?.reason || 'Token pendiente SOPS')}</div>`);
  }
  if (p.status !== 'ok') {
    return card('FarmOS · Finca Guatoc', p.status, `<pre>${escape(p.error || '')}</pre>`);
  }
  const d = p.data || {};
  const recent = (d.recent_logs || []).slice(0, 5).map(l =>
    `<div class="row"><span class="row-key">${escape(l.type || '?')}</span><span class="row-val">${escape((l.name || '?').slice(0, 30))}</span></div>`
  ).join('');
  return card('FarmOS · Finca Guatoc', p.status, `
    <div class="metric">${d.assets_active ?? '—'}</div>
    <div class="metric-label">Assets activos</div>
    <div style="margin-top:1rem;color:var(--fg-dim);font-size:0.75rem;">Logs últimos 7d: <strong style="color:var(--accent-mint);">${d.logs_7d ?? '—'}</strong></div>
    <div style="margin-top:1rem;">${recent}</div>
  `);
}

function renderWeather(p) {
  if (p.status !== 'ok') {
    return card('Clima Choachí · Open-Meteo', p.status, `<pre>${escape(p.error || '')}</pre>`);
  }
  const d = p.data || {};
  const c = d.current || {};
  const code = c.weather_code ?? 0;
  const codeText = WEATHER_CODES[code] || `Código ${code}`;
  return card('Clima Choachí · 1923 msnm', p.status, `
    <div style="font-size:1.4rem;color:var(--accent-mint);margin-bottom:1rem;">${codeText}</div>
    <div class="weather-grid">
      <div class="weather-cell">
        <div class="v">${c.temperature_c ?? '—'}°</div>
        <div class="l">Temperatura</div>
      </div>
      <div class="weather-cell">
        <div class="v">${c.humidity_pct ?? '—'}%</div>
        <div class="l">Humedad</div>
      </div>
      <div class="weather-cell">
        <div class="v">${c.precipitation_mm ?? '—'}<span style="font-size:0.7rem;">mm</span></div>
        <div class="l">Lluvia</div>
      </div>
      <div class="weather-cell">
        <div class="v">${c.wind_kmh ?? '—'}<span style="font-size:0.7rem;">km/h</span></div>
        <div class="l">Viento</div>
      </div>
    </div>
    <div style="margin-top:1rem;font-size:0.7rem;color:var(--fg-dim);">${escape(d.location || '')}</div>
  `);
}

async function load() {
  try {
    const r = await fetch('/api/oracle/snapshot');
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    const ts = new Date(data.timestamp).toLocaleString('es-CO', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
    stamp.textContent = `Sincronizado · ${ts}`;
    const providers = data.providers || {};
    const cards = [
      renderWeather(providers.openmeteo || {status:'no_data'}),
      renderFarmOS(providers.farmos || {status:'no_data'}),
    ];
    if (providers.ai_stats) {
      cards.push(renderAiStats(providers.ai_stats));
    }
    root.innerHTML = cards.join('');
  } catch (err) {
    stamp.textContent = `Error: ${err.message}`;
    root.innerHTML = card('Error de conexión', 'error', `<pre>${escape(err.message)}</pre>`);
  }
}

async function refresh() {
  stamp.textContent = 'Refrescando…';
  await load();
}

load();
setInterval(load, 60_000);
