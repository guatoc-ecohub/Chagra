// Probe de inventario clima (2026-09-04): importa y evalúa los módulos, no greppea.
// Control (brief): si precipitation NO aparece marcada como usada, el instrumento está roto.
import * as fs from 'node:fs';

const ok = (label, cond, extra = '') =>
  console.log(`${cond ? 'OK  ' : 'ROTO'} ${label}${extra ? ' — ' + extra : ''}`);
const out = (label, v) => console.log(`${label}: ${JSON.stringify(v)}`);

// 1) agroMeteoService — variable lists canónicas (leídas del único archivo que las declara).
{
  const src = fs.readFileSync(new URL('../src/services/agroMeteoService.js', import.meta.url), 'utf8');
  const dailyBlock = src.slice(src.indexOf('const DAILY_VARS'), src.indexOf('];', src.indexOf('const DAILY_VARS')));
  const hourlyBlock = src.slice(src.indexOf('const HOURLY_VARS'), src.indexOf('];', src.indexOf('const HOURLY_VARS')));
  const daily = [...dailyBlock.matchAll(/'([a-z_0-9]+)'/g)].map(m => m[1]);
  const hourly = [...hourlyBlock.matchAll(/'([a-z_0-9]+)'/g)].map(m => m[1]);
  out('agroMeteo DAILY_VARS (contados)', daily.length);
  out('agroMeteo HOURLY_VARS (contados)', hourly.length);
  ok('13 diarias esperadas', daily.length === 13, JSON.stringify(daily));
  ok('11 horarias esperadas', hourly.length === 11, JSON.stringify(hourly));
  ok('TTL forecast 3h presente', /FORECAST_TTL_MS = 3 \* 60 \* 60 \* 1000/.test(src));
  ok('TTL normales 30d presente', /NORMALS_TTL_MS = 30 \* 24 \* 60 \* 60 \* 1000/.test(src));
  ok('usa archive ERA5 (normales)', /archive-api\.open-meteo\.com/.test(src));
}

// 2) Import real de módulos de datos puros (evalúa exports; Object.freeze no miente acá).
const { default: _unused } = await import('../src/services/ensoContext.js').catch(e => ({ default: null, e }));
const { FICHAS_AGROCLIMATICAS } = await import('../src/data/fichasAgroclimaticas.js');
const climaBoletines = await import('../src/data/climaBoletines.js');
const agroIndices = await import('../src/services/agroIndices.js');

const fichas = Object.keys(FICHAS_AGROCLIMATICAS);
out('fichas agroclimaticas', fichas.length);
ok('8 fichas agroclimáticas', fichas.length === 8, fichas.join(','));

const cultivos = Object.keys(agroIndices.CULTIVOS_AGRO);
out('CULTIVOS_AGRO', cultivos.length);
ok('CULTIVOS_AGRO 22 (listado integral)', cultivos.length === 22, cultivos.join(','));

const enf = Object.keys(agroIndices.MODELOS_ENFERMEDAD);
ok('MODELOS_ENFERMEDAD presentes', enf.length >= 6, enf.join(','));
ok('presionEnfermedad es función', typeof agroIndices.presionEnfermedad === 'function');
ok('vpdKpa/leerVpd/spi/spei/anomalia son funciones',
  ['vpdKpa','leerVpd','etcMm','balanceHidricoDia','deficitAcumulado','horasFrio','spi','spei','anomalia','presionEnfermedad','amplitudTermica','leerUv'].every(f => typeof agroIndices[f] === 'function'));

out('LECTURA_ENSO claves', Object.keys(climaBoletines.LECTURA_ENSO));
out('BOLETINES_IDEAM n', climaBoletines.BOLETINES_IDEAM.length);
out('ENSO_CALENDARIO_2026_27 n', climaBoletines.ENSO_CALENDARIO_2026_27.length);
out('faseCalendarioActual(2026-09-04)', climaBoletines.faseCalendarioActual(new Date('2026-09-04T12:00:00')));
ok('grounded_pendiente presente', climaBoletines.ESTADO_GROUNDED_PENDIENTE === 'grounded_pendiente');

// 3) Control del instrumento sobre `precipitation` (brief): la función pura que
//    decide lluvia la usa; si classifySkyCondition la ignorara, sería dato muerto.
const sky = await import('../src/services/skyConditionService.js');
const rLluvia = sky.classifySkyCondition({ weatherCode: 63, precipMm: 12, cloudCoverPct: 90, elevationM: 1400, ensoPhase: 'nino_moderado' });
ok('CONTROL precipitation→classify la marca lluvia', rLluvia.condition === 'lluvia', `condition=${rLluvia?.condition}`);
const rSol = sky.classifySkyCondition({ weatherCode: 0, precipMm: 0, cloudCoverPct: 5, elevationM: 1400 });
ok('CONTROL sin precipitación no es lluvia', rSol.condition === 'despejado', `condition=${rSol?.condition}`);
ok('CONTROL skyForDay lee day.precip_mm', sky.skyForDay({ precip_mm: 8, cloud_cover_mean_pct: 90 }, {}).condition === 'lluvia');
ok('CONTROL umbrales cielo exportados', sky.CLOUD_THRESHOLDS.nublado === 70 && sky.CLOUD_THRESHOLDS.parcial === 35);

// 4) agroIndices consume precipitación real (balance/SPI).
const bal = agroIndices.balanceHidricoDia(3, 4);
ok('CONTROL balanceHidricoDia con precip 3 vs etc 4', bal && bal.faltaMm === 1, JSON.stringify(bal));
const spiV = agroIndices.spi(5, { precip_dia_normal: 3, precip_dia_desv: 1.2 });
ok('CONTROL spi usa precip+historico', spiV != null && spiV > 1, `spi=${spiV}`);
const sp_vpd = agroIndices.vpdKpa(20, 60);
ok('CONTROL vpdKpa(T=20,HR=60) ~0.93', sp_vpd != null && sp_vpd > 0.9 && sp_vpd < 1.0, `vpd=${sp_vpd}`);

// 5) Static snapshot (fecha marcada).
const snap = JSON.parse(fs.readFileSync(new URL('../src/data/graph-stats-snapshot.json', import.meta.url), 'utf8'));
out('graph-stats-snapshot fecha', snap?._meta?.fecha_snapshot);

// 6) atmosphereService forward-compat: sin cloud en snapshot → condicion null.
const atmos = await import('../src/services/atmosphereService.js');
const sinNube = atmos.deriveCondicion({ snapshot: { openmeteo: { available: true, forecast_7d: [{ date: '2026-09-04', precip_mm: 0 }] } }, now: new Date('2026-09-04T13:00:00'), luz: 'dia', elevation: 2600 });
ok('atmosphere: sin cloud → null (no adivina)', sinNube === null, `condicion=${JSON.stringify(sinNube)}`);
const conNube = atmos.deriveCondicion({ snapshot: { openmeteo: { available: true, forecast_7d: [{ date: '2026-09-04', precip_mm: 0, cloud_cover_pct: 75 }] } }, now: new Date('2026-09-04T13:00:00'), luz: 'dia', elevation: 2600 });
ok('atmosphere: con cloud 75% en frío→nublado', conNube === 'nublado', `condicion=${JSON.stringify(conNube)}`);
