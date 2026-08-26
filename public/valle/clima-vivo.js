/*
 * Clima vivo del valle, capa puente para la escena vanilla r160.
 *
 * La PWA ya tiene `src/services/agroMeteoService.js`, que es la fuente
 * normalizada y cacheada de Open-Meteo. Este módulo consume primero esa misma
 * cache cuando el usuario llega desde la PWA y solo hace una consulta directa
 * cuando el valle se abre como sitio independiente en 3d.guatoc.co. La forma
 * de la respuesta y las variables pedidas son deliberadamente las mismas.
 *
 * Sin coordenadas confirmadas no se pinta un clima inventado. Los overrides
 * `?clima=lluvia|sol|niebla|arcoiris` siguen perteneciendo al clima manual
 * existente y sirven para capturas comparables.
 */
import * as THREE from 'three';
import { height } from './terrain.js';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const CACHE_KEY = 'chagra:agrometeo:forecast-v1';
const PROFILE_PREFIX = 'chagra:profile:v1';
const CLIMA_SNAPSHOT_KEY = 'chagra:clima:snapshot-v1';
const CACHE_TTL_MS = 3 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 12000;
const WMO = {
  0: ['Despejado', 'sol'], 1: ['Casi despejado', 'sol'], 2: ['Parcialmente nublado', 'nubes'],
  3: ['Nublado', 'nubes'], 45: ['Neblina', 'nubes'], 48: ['Neblina', 'nubes'],
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const safeNumber = (v) => Number.isFinite(Number(v)) ? Number(v) : null;
const json = (key) => {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
};

function describe(code, isDay = true) {
  const c = Number(code);
  if (WMO[c]) return { label: WMO[c][0], family: WMO[c][1] };
  if (c >= 80 && c <= 82) return { label: 'Aguaceros', family: 'lluvia' };
  if (c >= 51 && c <= 67) return { label: 'Lluvia', family: 'lluvia' };
  if (c >= 71 && c <= 86) return { label: 'Precipitación sólida', family: 'lluvia' };
  if (c >= 95) return { label: 'Tormenta', family: 'tormenta' };
  return { label: isDay ? 'Condición sin detalle' : 'Noche sin detalle', family: 'nubes' };
}

function profileLocation() {
  let profile = json(PROFILE_PREFIX);
  if (!profile) {
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key?.startsWith(`${PROFILE_PREFIX}:`)) { profile = json(key); break; }
      }
    } catch { /* storage bloqueado */ }
  }
  const lat = safeNumber(profile?.ubicacion_lat);
  const lng = safeNumber(profile?.ubicacion_lng);
  if (lat == null || lng == null) return null;
  const elevation = safeNumber(profile?.finca_altitud ?? profile?.altitud);
  return { lat, lng, elevation };
}

function requestedLocation() {
  const q = new URLSearchParams(location.search);
  const lat = safeNumber(q.get('lat'));
  const lng = safeNumber(q.get('lng'));
  if (lat != null && lng != null) {
    const elevation = safeNumber(q.get('elevation'));
    return { lat, lng, elevation };
  }
  return profileLocation();
}

function cachedPayload(location) {
  const entry = json(CACHE_KEY);
  const p = entry?.payload;
  if (!p?.available || !Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return null;
  if (location && (Math.abs(p.lat - location.lat) > 0.001 || Math.abs(p.lng - location.lng) > 0.001)) return null;
  return { payload: p, stale: !entry.ts || Date.now() - entry.ts > CACHE_TTL_MS };
}

async function fetchJson(url) {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    return res.ok ? await res.json() : null;
  } catch { return null; }
  finally { clearTimeout(timeout); }
}

async function fetchForecast(location) {
  if (!location) return null;
  const params = new URLSearchParams({
    latitude: String(location.lat), longitude: String(location.lng),
    daily: 'weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum',
    hourly: 'temperature_2m,dew_point_2m,precipitation,cloud_cover,is_day,weathercode,soil_moisture_0_to_1cm',
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weathercode,cloud_cover,wind_speed_10m',
    timezone: 'auto', forecast_days: '16', past_days: '1',
  });
  if (location.elevation != null) params.set('elevation', String(location.elevation));
  const raw = await fetchJson(`${FORECAST_URL}?${params}`);
  if (!raw?.current || !raw?.hourly?.time || !raw?.daily?.time) return null;
  let n = 0; let best = Infinity;
  raw.hourly.time.forEach((time, i) => {
    const d = Math.abs(new Date(time).getTime() - Date.now());
    if (d < best) { best = d; n = i; }
  });
  const code = safeNumber(raw.current.weathercode ?? raw.hourly.weathercode?.[n]);
  const isDay = (raw.current.is_day ?? raw.hourly.is_day?.[n]) !== 0;
  const daily = raw.daily.time.map((date, i) => ({
    date, weathercode: raw.daily.weathercode?.[i] ?? null,
    temp_max: raw.daily.temperature_2m_max?.[i] ?? null,
    temp_min: raw.daily.temperature_2m_min?.[i] ?? null,
    precip_mm: raw.daily.precipitation_sum?.[i] ?? null,
  }));
  return {
    available: true, fetched_at: new Date().toISOString(), source: 'Open-Meteo',
    source_url: 'https://open-meteo.com', lat: location.lat, lng: location.lng,
    elevation: raw.elevation ?? location.elevation ?? null, timezone: raw.timezone ?? null,
    now: {
      temp: raw.current.temperature_2m ?? raw.hourly.temperature_2m?.[n] ?? null,
      rh: raw.current.relative_humidity_2m ?? null, dew: raw.hourly.dew_point_2m?.[n] ?? null,
      precip: raw.current.precipitation ?? raw.hourly.precipitation?.[n] ?? null,
      cloud: raw.current.cloud_cover ?? raw.hourly.cloud_cover?.[n] ?? null,
      viento: raw.current.wind_speed_10m ?? null, is_day: isDay,
      soil_moisture_0_1: raw.hourly.soil_moisture_0_to_1cm?.[n] ?? null,
      weather: describe(code, isDay), weathercode: code,
    },
    today: daily.find((d) => d.date === new Date().toISOString().slice(0, 10)) || daily[1] || daily[0] || null,
    daily,
  };
}

function ensoMode() {
  const q = new URLSearchParams(location.search).get('enso');
  if (q === 'nino' || q === 'nino-estimado') return { family: 'nino', estimated: q === 'nino-estimado' };
  const snapshot = json(CLIMA_SNAPSHOT_KEY)?.payload;
  const phase = String(snapshot?.enso_status?.phase || '').toLowerCase();
  if (phase.includes('nino')) return { family: 'nino', estimated: false };
  if (phase.includes('nina')) return { family: 'nina', estimated: false };
  return { family: 'neutral', estimated: false };
}

function cloudTexture() {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, 256, 128);
  const blobs = [[58, 73, 48], [106, 54, 58], [157, 68, 49], [204, 78, 38]];
  for (const [x, y, r] of blobs) {
    const g = ctx.createRadialGradient(x, y, 3, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,.96)'); g.addColorStop(.68, 'rgba(255,255,255,.5)');
    g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}

function buildRain() {
  const count = 780; const positions = new Float32Array(count * 6);
  const seed = new Float32Array(count * 4);
  for (let i = 0; i < count; i += 1) {
    let s = i * 17.13 + 4.7; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    seed.set([(rnd() - .5) * 260, rnd() * 170, (rnd() - .5) * 300, rnd()], i * 4);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({ color: 0xb6def0, transparent: true, opacity: 0, depthWrite: false });
  const lines = new THREE.LineSegments(geo, mat); lines.frustumCulled = false; lines.renderOrder = 4;
  return { lines, seed, positions, mat };
}

function buildWetGround() {
  const group = new THREE.Group(); group.name = 'clima-suelo-mojado';
  const patches = [];
  let s = 8831; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  for (let i = 0; i < 28; i += 1) {
    const x = -170 + rnd() * 340; const z = -20 + rnd() * 250;
    const r = 5 + rnd() * 18; const y = height(x, z) + .12;
    const mat = new THREE.MeshBasicMaterial({ color: 0x213d37, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(1, 18), mat);
    mesh.position.set(x, y, z); mesh.rotation.x = -Math.PI / 2; mesh.scale.setScalar(r); mesh.renderOrder = 2;
    group.add(mesh); patches.push({ mesh, base: r, phase: rnd() * 6.28 });
  }
  return { group, patches };
}

function buildClouds() {
  const group = new THREE.Group(); group.name = 'clima-nubes-vivas';
  const texture = cloudTexture();
  const defs = [[-520, 450, -1120, 540, .62], [80, 570, -1320, 700, .8], [620, 470, -980, 470, .52], [-320, 700, -1660, 760, .72]];
  const sprites = defs.map(([x, y, z, scale, op]) => {
    const mat = new THREE.SpriteMaterial({ map: texture, color: 0xe9eef4, transparent: true, opacity: 0, depthWrite: false, fog: true });
    const sprite = new THREE.Sprite(mat); sprite.position.set(x, y, z); sprite.scale.set(scale, scale * .48, 1); group.add(sprite);
    return { sprite, op, phase: x * .01 };
  });
  return { group, sprites, texture };
}

function makeUi() {
  let root = document.getElementById('climaVivo');
  if (root) return root;
  root = document.createElement('aside'); root.id = 'climaVivo'; root.setAttribute('aria-live', 'polite');
  root.innerHTML = '<div class="climaVivo__eyebrow">CLIMA VIVO</div><strong data-clima="condicion">Buscando el parte</strong><span data-clima="detalle">Open-Meteo, sin datos locales todavía</span><span data-clima="enso" hidden></span>';
  document.body.appendChild(root); return root;
}

function setUi(root, payload, status, enso) {
  const condition = root.querySelector('[data-clima="condicion"]');
  const detail = root.querySelector('[data-clima="detalle"]');
  const badge = root.querySelector('[data-clima="enso"]');
  if (!payload) {
    condition.textContent = status === 'sin-ubicacion' ? 'Clima real, sin ubicación de finca' : 'Clima real, sin conexión';
    detail.textContent = status === 'sin-ubicacion' ? 'Confirme la finca en la PWA para activar el cielo vivo' : 'Se conserva la escena base, sin inventar valores';
  } else {
    const w = payload.now?.weather || { label: 'Condición sin detalle' };
    condition.textContent = `${w.label}${Number.isFinite(payload.now?.temp) ? ` · ${Math.round(payload.now.temp * 10) / 10} °C` : ''}`;
    detail.textContent = `${payload.now?.precip > 0 ? `${payload.now.precip} mm ahora` : 'Sin precipitación ahora'} · ${payload.stale ? 'cache vencida' : 'dato fresco'} · Open-Meteo`;
  }
  if (enso.family === 'nino') {
    badge.hidden = false; badge.textContent = `El Niño, dic 2026 / ene 2027${enso.estimated ? ' · estimado' : ''}`;
  } else if (enso.family === 'nina') {
    badge.hidden = false; badge.textContent = 'La Niña, dato ENSO disponible';
  } else badge.hidden = true;
}

export function makeClimaVivo({ scene, renderer, atmos, terrainG }) {
  const root = makeUi(); const locationData = requestedLocation(); const enso = ensoMode();
  const rain = buildRain(); const wet = buildWetGround(); const clouds = buildClouds();
  scene.add(rain.lines, wet.group, clouds.group);
  const H = atmos.noche; const base = {
    exposure: renderer.toneMappingExposure, fog: scene.fog?.color?.clone(), density: scene.fog?.density || 0,
    dir: atmos.dir.color.clone(), dirI: atmos.dir.intensity, hemi: H.hemi.color.clone(), hemiI: H.hemi.intensity,
    ground: H.hemi.groundColor.clone(), warm: H.warmFill.intensity,
    turb: H.sky.material.uniforms.turbidity.value, ray: H.sky.material.uniforms.rayleigh.value,
    mie: H.sky.material.uniforms.mieCoefficient.value,
  };
  const target = { rain: 0, wet: 0, cloud: .3, light: 1, nino: enso.family === 'nino' ? 1 : 0, hour: 9, day: true };
  const current = { ...target }; let payload = null; let status = locationData ? 'cargando' : 'sin-ubicacion';
  terrainG.traverse((obj) => { if (obj.isMesh) obj.receiveShadow = true; });
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  atmos.dir.castShadow = true; atmos.dir.shadow.mapSize.set(1024, 1024);
  atmos.dir.shadow.camera.left = -700; atmos.dir.shadow.camera.right = 700;
  atmos.dir.shadow.camera.top = 700; atmos.dir.shadow.camera.bottom = -700;
  document.body.dataset.climaVivo = '1'; document.body.dataset.enso = enso.family;
  setUi(root, null, status, enso);

  function applyPayload(next, stale = false) {
    if (!next) { status = 'sin-dato'; setUi(root, null, status, enso); return; }
    payload = { ...next, stale };
    const w = next.now?.weather || describe(next.now?.weathercode, next.now?.is_day);
    target.rain = next.now?.precip > 0 || w.family === 'lluvia' || w.family === 'tormenta' ? clamp((next.now?.precip || .35) / 2, .18, 1) : 0;
    target.wet = next.now?.precip > 0 ? clamp(next.now.precip / 3, .08, 1) : 0;
    target.cloud = clamp((next.now?.cloud ?? (w.family === 'nubes' ? 70 : 12)) / 100, 0, 1);
    target.day = next.now?.is_day !== false;
    const tz = next.timezone || 'UTC';
    try { target.hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false }).format(new Date())); } catch { target.hour = new Date().getHours(); }
    target.light = target.day ? clamp(Math.sin(((target.hour - 5.5) / 13) * Math.PI), .08, 1) : .04;
    setUi(root, payload, status, enso);
  }

  const cached = cachedPayload(locationData);
  if (cached) applyPayload(cached.payload, cached.stale);
  const cargarParte = (intento = 0) => fetchForecast(locationData).then((fresh) => {
    if (fresh) applyPayload(fresh, false);
    else if (!cached && intento < 2) setTimeout(() => cargarParte(intento + 1), 7000);
    else if (!cached) setUi(root, null, 'sin-dato', enso);
  });
  if (locationData) cargarParte();

  function update(t) {
    const k = 1 - Math.exp(-Math.min(.1, 1 / 60) * 3.2);
    for (const key of ['rain', 'wet', 'cloud', 'light', 'nino']) current[key] = lerp(current[key], target[key], k);
    const w = payload?.now?.weather?.family || 'sol';
    const rainTint = new THREE.Color(0x9daabd); const clearTint = new THREE.Color(0x9ab6d2);
    const ninoTint = new THREE.Color(0xe1a06e); const fogTarget = new THREE.Color(w === 'sol' ? 0x8997a8 : 0x707d91);
    if (current.nino > .01) fogTarget.lerp(ninoTint, .18 * current.nino);
    if (scene.fog) { scene.fog.color.lerp(fogTarget, k * .55); scene.fog.density = lerp(base.density, base.density * (1 + current.cloud * 1.45), k); }
    const lightColor = clearTint.clone().lerp(rainTint, current.cloud * .75).lerp(ninoTint, current.nino * .35);
    atmos.dir.color.lerp(lightColor, k); atmos.dir.intensity = lerp(base.dirI * (.45 + current.light * .85), base.dirI * .36, current.cloud * .72);
    H.hemi.intensity = lerp(base.hemiI * (.38 + current.light * .72), base.hemiI * .66, current.cloud);
    H.hemi.color.lerp(lightColor, k); H.hemi.groundColor.lerp(base.ground, k);
    H.warmFill.intensity = lerp(base.warm, base.warm * .4, current.cloud);
    renderer.toneMappingExposure = lerp(base.exposure * (.72 + current.light * .33), base.exposure * .82, current.cloud);
    H.sky.material.uniforms.turbidity.value = lerp(base.turb, 18, current.cloud);
    H.sky.material.uniforms.rayleigh.value = lerp(base.ray, 1.15, current.cloud);
    H.sky.material.uniforms.mieCoefficient.value = lerp(base.mie, .012, current.cloud);
    const hour = target.hour; const solar = target.day ? Math.sin(((hour - 5.5) / 13) * Math.PI) : -.12;
    const az = (hour - 12) * Math.PI / 12; const sun = new THREE.Vector3(Math.sin(az) * .75, solar, Math.cos(az) * .75).normalize();
    H.sky.material.uniforms.sunPosition.value.copy(sun); atmos.sun.copy(sun); atmos.dir.position.copy(sun).multiplyScalar(2000);
    rain.mat.opacity = current.rain * .58; wet.patches.forEach((p) => { p.mesh.material.opacity = current.wet * (.08 + Math.sin(t * .8 + p.phase) * .012); });
    clouds.sprites.forEach((c, i) => { c.sprite.material.opacity = clamp(current.cloud * c.op * (w === 'lluvia' || w === 'tormenta' ? 1.18 : 1), 0, .82); c.sprite.position.x += Math.sin(t * .015 + c.phase) * .012; });
    const arr = rain.positions; const cam = window.__cam?.position || { x: 0, z: 0 };
    for (let i = 0; i < rain.seed.length / 4; i += 1) {
      const j = i * 4; const x = cam.x + rain.seed[j]; const z = cam.z + rain.seed[j + 2];
      const y = 5 + ((rain.seed[j + 1] + t * (42 + rain.seed[j + 3] * 20)) % 170);
      const p = i * 6; arr[p] = x; arr[p + 1] = y; arr[p + 2] = z; arr[p + 3] = x + .8; arr[p + 4] = y - 7; arr[p + 5] = z + .2;
    }
    rain.lines.geometry.attributes.position.needsUpdate = true;
  }
  return { update, payload: () => payload, refresh: () => fetchForecast(locationData).then((fresh) => applyPayload(fresh)) };
}
