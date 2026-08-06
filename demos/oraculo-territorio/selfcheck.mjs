import assert from 'node:assert/strict';
import { demoPunto, demoPuntoFuera, demoReferencias, demoTerritorioGeojson } from './fixtures.mjs';
import {
  bearing,
  decodePlusCode,
  encodePlusCode,
  haversine,
  oraculo,
  pointInPolygon,
  zonaDe,
} from './oraculo.mjs';

function check(condition, message) {
  assert.ok(condition, message);
}

function assertRoundTrip(lat, lng) {
  const code = encodePlusCode(lat, lng);
  const decoded = decodePlusCode(code);
  check(lat >= decoded.latLo && lat <= decoded.latHi, `lat fuera de celda para ${code}`);
  check(lng >= decoded.lngLo && lng <= decoded.lngHi, `lng fuera de celda para ${code}`);
}

function main() {
  const officialCode = encodePlusCode(47.36559, 8.524997);
  check(officialCode === '8FVC9G8F+6X', `OLC oficial inesperado: ${officialCode}`);

  assertRoundTrip(20.375, 2.775);
  assertRoundTrip(-33.865143, 151.2099);

  const distance = haversine({ lat: 0, lng: 0 }, { lat: 0, lng: 1 });
  check(distance > 110000 && distance < 112500, `haversine fuera de rango: ${distance}`);

  const angle = bearing({ lat: 0, lng: 0 }, { lat: 1, lng: 1 });
  check(angle > 30 && angle < 60, `bearing fuera de rango: ${angle}`);

  const ring = [
    [-75.001, 4.999],
    [-74.999, 4.999],
    [-74.999, 5.001],
    [-75.001, 5.001],
    [-75.001, 4.999],
  ];
  check(pointInPolygon([-75, 5], ring), 'punto interno no clasificado');
  check(!pointInPolygon([-75.01, 5], ring), 'punto externo mal clasificado');

  const insideAlta = zonaDe({ lat: 4.999, lng: -75.001 }, demoTerritorioGeojson);
  check(insideAlta?.zonaId === 'zona-alta', `zona incorrecta: ${JSON.stringify(insideAlta)}`);
  const insideMedia = zonaDe(demoPunto, demoTerritorioGeojson);
  check(insideMedia?.zonaId === 'zona-media', `zona media incorrecta: ${JSON.stringify(insideMedia)}`);
  const outside = zonaDe(demoPuntoFuera, demoTerritorioGeojson);
  check(outside === null, `zona fuera no debería clasificar: ${JSON.stringify(outside)}`);

  const unified = oraculo(
    demoPunto,
    {
      geojson: demoTerritorioGeojson,
      referencias: demoReferencias,
    }
  );

  check(unified.plusCode.length > 0, 'plusCode vacio');
  check(unified.zona?.zonaId === 'zona-media', 'oraculo no resolvio zona');
  check(unified.referencias.length === demoReferencias.length, 'referencias incompletas');
  check(unified.referencias[0].distanciaM <= unified.referencias[1].distanciaM, 'referencias no ordenadas');

  console.log('OK');
}

try {
  main();
  process.exit(0);
} catch (error) {
  console.error(error?.message ?? error);
  process.exit(1);
}
