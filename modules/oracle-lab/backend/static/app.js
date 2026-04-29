// Oracle Guatoc MVP v0.2 — vanilla JS dashboard.
// Fase 1.5: collectors adicionales (HA + Ollama + Whisper + Cloudflare + Git).
// TODO post identidad final: migrar a React + R3F + Three.js Jarvis HUD.

const root = document.getElementById('root');
const stamp = document.getElementById('stamp');

const WEATHER_CODES = {
  0: '☀ Despejado', 1: '🌤 Mayormente claro', 2: '⛅ Parcialmente nublado', 3: '☁ Nublado',
  45: '🌫 Niebla', 48: '🌫 Niebla con escarcha',
  51: '🌦 Llovizna ligera', 53: '🌦 Llovizna moderada', 55: '🌦 Llovizna densa',
  61: '🌧 Lluvia ligera', 63: '🌧 Lluvia moderada', 65: '🌧 Lluvia intensa',
  80: '🌧 Aguacero ligero', 81: '🌧 Aguacero moderado', 82: '🌧 Aguacero violento',
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

function row(k, v) {
  return `<div class="row"><span class="row-key">${escape(k)}</span><span class="row-val">${escape(v)}</span></div>`;
}

function metric(value, label) {
  return `<div class="metric">${escape(String(value))}</div><div class="metric-label">${escape(label)}</div>`;
}

function noDataBody(p) {
  return `<div style="color:var(--fg-dim);font-size:0.85rem;">${escape(p.data?.reason || 'Pendiente configuración')}</div>`;
}

function errorBody(p) {
  return `<pre>${escape(p.error || 'unknown error')}</pre>`;
}

// ─── Renderers por collector ──────────────────────────────────────────

function renderWeather(p) {
  if (p.status !== 'ok') return card('Clima Choachí', p.status, errorBody(p));
  const d = p.data || {}, c = d.current || {};
  const codeText = WEATHER_CODES[c.weather_code ?? 0] || `Código ${c.weather_code ?? '?'}`;
  return card('Clima Choachí · 1923 msnm', p.status, `
    <div style="font-size:1.4rem;color:var(--accent-mint);margin-bottom:1rem;">${codeText}</div>
    <div class="weather-grid">
      <div class="weather-cell"><div class="v">${c.temperature_c ?? '—'}°</div><div class="l">Temperatura</div></div>
      <div class="weather-cell"><div class="v">${c.humidity_pct ?? '—'}%</div><div class="l">Humedad</div></div>
      <div class="weather-cell"><div class="v">${c.precipitation_mm ?? '—'}<span style="font-size:0.7rem;">mm</span></div><div class="l">Lluvia</div></div>
      <div class="weather-cell"><div class="v">${c.wind_kmh ?? '—'}<span style="font-size:0.7rem;">km/h</span></div><div class="l">Viento</div></div>
    </div>
  `);
}

function renderFarmOS(p) {
  if (p.status === 'no_data') return card('FarmOS · Finca Guatoc', p.status, noDataBody(p));
  if (p.status !== 'ok') return card('FarmOS · Finca Guatoc', p.status, errorBody(p));
  const d = p.data || {};
  const bundleRows = Object.entries(d.assets_by_bundle || {}).map(([k, v]) => row(k, v)).join('');
  return card('FarmOS · Finca Guatoc', p.status, `
    ${metric(d.assets_active ?? '—', 'Assets activos')}
    <div style="margin-top:0.5rem;font-size:0.7rem;color:var(--fg-dim);">Logs últimos 7d: <strong style="color:var(--accent-mint);">${d.logs_7d ?? '—'}</strong></div>
    ${bundleRows ? `<div style="margin-top:1rem;">${bundleRows}</div>` : ''}
  `);
}

function renderHomeAssistant(p) {
  if (p.status === 'no_data') return card('Home Assistant · IoT', p.status, noDataBody(p));
  if (p.status !== 'ok') return card('Home Assistant · IoT', p.status, errorBody(p));
  const d = p.data || {};
  const sensors = (d.sensors || []).slice(0, 8).map(s =>
    row(s.friendly_name || s.entity_id.replace('sensor.', ''), `${s.state}${s.unit ? ' ' + s.unit : ''}`)
  ).join('');
  return card('Home Assistant · IoT', p.status, `
    ${metric(d.matched_sensors ?? '—', 'Sensores matched')}
    <div style="margin-top:0.5rem;font-size:0.7rem;color:var(--fg-dim);">de ${d.total_entities ?? '?'} entidades totales</div>
    ${sensors ? `<div style="margin-top:1rem;">${sensors}</div>` : ''}
  `);
}

function renderOllama(p) {
  if (p.status !== 'ok') return card('Ollama · Modelos locales', p.status, errorBody(p));
  const d = p.data || {};
  const loaded = (d.loaded_now || []).map(m => row(m.name, `${m.vram_gb} GB VRAM`)).join('');
  const models = (d.models || []).slice(0, 5).map(m => row(m.name, `${m.size_gb} GB`)).join('');
  return card('Ollama · Modelos locales', p.status, `
    ${metric(d.loaded_count ?? 0, 'Cargados ahora')}
    <div style="margin-top:0.5rem;font-size:0.7rem;color:var(--fg-dim);">Total disponibles: <strong style="color:var(--accent-mint);">${d.models_total ?? '?'}</strong></div>
    ${loaded ? `<div style="margin-top:1rem;font-size:0.7rem;color:var(--fg-dim);text-transform:uppercase;letter-spacing:0.1em;">Cargados</div>${loaded}` : ''}
    ${models ? `<div style="margin-top:1rem;font-size:0.7rem;color:var(--fg-dim);text-transform:uppercase;letter-spacing:0.1em;">Disponibles</div>${models}` : ''}
  `);
}

function renderWhisper(p) {
  if (p.status !== 'ok') return card('Whisper · Transcripción', p.status, errorBody(p));
  const d = p.data || {};
  return card('Whisper · Transcripción', p.status, `
    ${metric(d.hours_transcribed ?? 0, 'Horas transcritas')}
    <div style="margin-top:0.5rem;font-size:0.7rem;color:var(--fg-dim);">Health: <strong style="color:${d.healthy ? 'var(--status-ok)' : 'var(--status-err)'};">${d.healthy ? 'OK' : 'DOWN'}</strong></div>
    <div style="margin-top:0.5rem;font-size:0.7rem;color:var(--fg-dim);">Transcripciones: <strong style="color:var(--accent-mint);">${d.transcription_count ?? '?'}</strong></div>
    ${(d.models || []).length > 0 ? `<div style="margin-top:1rem;">${(d.models || []).slice(0, 3).map(m => row('modelo', m)).join('')}</div>` : ''}
  `);
}

function renderCloudflare(p) {
  if (p.status === 'no_data') return card('Cloudflare Tunnels', p.status, noDataBody(p));
  if (p.status !== 'ok') return card('Cloudflare Tunnels', p.status, errorBody(p));
  const d = p.data || {};
  const tunnels = (d.systemd_tunnels || []).map(t => row('tunnel', t.replace('cloudflared-', ''))).join('');
  return card('Cloudflare Tunnels', p.status, `
    ${metric(d.ha_connections ?? '—', 'HA Connections')}
    <div style="margin-top:0.5rem;font-size:0.7rem;color:var(--fg-dim);">Requests: <strong style="color:var(--accent-mint);">${d.requests_total ?? '?'}</strong></div>
    <div style="margin-top:0.5rem;font-size:0.7rem;color:var(--fg-dim);">5xx: <strong style="color:${(d.responses_5xx || 0) > 0 ? 'var(--status-err)' : 'var(--status-ok)'};">${d.responses_5xx ?? 0}</strong></div>
    ${tunnels}
  `);
}

function renderGitActivity(p) {
  if (p.status !== 'ok') return card('Git Activity · 7d', p.status, errorBody(p));
  const d = p.data || {};
  const repoRows = Object.entries(d.repos || {}).map(([repo, r]) =>
    row(repo, `${r.commits_7d ?? 0} commits`)
  ).join('');
  return card('Git Activity · últimos 7d', p.status, `
    ${metric(d.total_commits_7d ?? 0, 'Commits totales')}
    <div style="margin-top:1rem;">${repoRows}</div>
  `);
}

function renderAiStats(p) {
  if (p.status !== 'ok') return card('AI Stack', p.status, errorBody(p));
  const providers = p.data?.providers || {};
  const rows = Object.entries(providers).map(([k, d]) => row(k, d.status || 'unknown')).join('');
  return card('AI Stack · z.ai · Ollama · Whisper', p.status, rows || `<div style="color:var(--fg-dim);font-size:0.8rem;">Sin providers reportados</div>`);
}

const RENDERERS = {
  openmeteo: renderWeather,
  farmos: renderFarmOS,
  home_assistant: renderHomeAssistant,
  ollama: renderOllama,
  whisper: renderWhisper,
  cloudflare_tunnels: renderCloudflare,
  git_activity: renderGitActivity,
  ai_stats: renderAiStats,
};

// ─── Render snapshot ──────────────────────────────────────────────────

function renderSnapshot(data) {
  const ts = new Date(data.timestamp).toLocaleString('es-CO', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
  stamp.textContent = `Sincronizado · ${ts}`;
  const providers = data.providers || {};
  const cards = [];
  for (const [name, renderer] of Object.entries(RENDERERS)) {
    if (providers[name]) cards.push(renderer(providers[name]));
  }
  root.innerHTML = cards.join('') || '<div style="color:var(--fg-dim);">Sin providers activos</div>';
}

// ─── Fallback REST polling ────────────────────────────────────────────

async function loadViaRest() {
  try {
    const r = await fetch('/api/oracle/snapshot');
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    renderSnapshot(await r.json());
  } catch (err) {
    stamp.textContent = `Error REST: ${err.message}`;
    root.innerHTML = card('Error de conexión', 'error', `<pre>${escape(err.message)}</pre>`);
  }
}

// ─── WebSocket real-time (fase 2) ─────────────────────────────────────

let ws = null;
let wsRetryDelay = 1000;

function connectWebSocket() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = `${proto}//${location.host}/ws/oracle/stream`;
  ws = new WebSocket(url);

  ws.onopen = () => {
    console.log('[oracle] WebSocket conectado');
    wsRetryDelay = 1000;
    stamp.textContent = 'Conectado WS · esperando primer snapshot';
  };

  ws.onmessage = (ev) => {
    try {
      const event = JSON.parse(ev.data);
      if (event.type === 'snapshot') {
        renderSnapshot(event.payload);
      } else if (event.type === 'manual_event') {
        console.log('[oracle] Manual event recibido:', event.payload);
        // TODO: toast notification
      }
    } catch (err) {
      console.error('[oracle] WS message parse error:', err);
    }
  };

  ws.onerror = (err) => {
    console.warn('[oracle] WebSocket error, fallback a REST polling');
    stamp.textContent = 'WS error · usando REST';
    loadViaRest();
  };

  ws.onclose = () => {
    console.log('[oracle] WebSocket cerrado, retry en', wsRetryDelay, 'ms');
    setTimeout(connectWebSocket, wsRetryDelay);
    wsRetryDelay = Math.min(wsRetryDelay * 1.5, 30_000);
    // Mientras retry, mantener poll REST
    loadViaRest();
  };
}

async function refresh() {
  stamp.textContent = 'Refrescando…';
  if (ws && ws.readyState === WebSocket.OPEN) {
    // Si WS está vivo, fuerza refresh por REST y dejará que WS push siguiente
    await loadViaRest();
  } else {
    await loadViaRest();
  }
}

// Bootstrap: REST primero (fast first paint), luego WS para updates
loadViaRest();
connectWebSocket();
// Backup polling cada 90s en caso de que WS muera silenciosamente
setInterval(loadViaRest, 90_000);
