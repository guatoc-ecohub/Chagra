const ALPHABET = '23456789CFGHJMPQRVWX';
const ALPHABET_MAP = new Map([...ALPHABET].map((char, index) => [char, index]));
const SEPARATOR = '+';
const PADDING = '0';
const SEPARATOR_POSITION = 8;
const MAX_CODE_LENGTH = 15;
const PAIR_CODE_LENGTH = 10;
const GRID_ROWS = 5;
const GRID_COLUMNS = 4;
const LATITUDE_MAX = 90;
const LONGITUDE_MAX = 180;
const EPSILON = 1e-12;
const EARTH_RADIUS_M = 6371008.8;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function wrapLongitude(lng) {
  if (!Number.isFinite(lng)) {
    throw new TypeError('Longitude must be a finite number');
  }

  let wrapped = lng;
  while (wrapped < -LONGITUDE_MAX) wrapped += 360;
  while (wrapped >= LONGITUDE_MAX) wrapped -= 360;
  return wrapped;
}

function normalizeLatLng(point) {
  if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng)) {
    throw new TypeError('Point must have finite lat and lng');
  }

  const lat = clamp(point.lat, -LATITUDE_MAX, LATITUDE_MAX - EPSILON);
  const lng = wrapLongitude(point.lng);
  return { lat, lng };
}

function validateCodeLength(codeLength) {
  if (!Number.isInteger(codeLength) || codeLength < 2 || codeLength > MAX_CODE_LENGTH) {
    throw new RangeError(`codeLength must be an integer between 2 and ${MAX_CODE_LENGTH}`);
  }
}

function encodePairs(lat, lng, pairDigits) {
  let code = '';
  let latValue = lat + LATITUDE_MAX;
  let lngValue = lng + LONGITUDE_MAX;
  let place = 20;

  for (let index = 0; index < pairDigits; index += 2) {
    const latDigit = Math.floor(latValue / place);
    const lngDigit = Math.floor(lngValue / place);
    code += ALPHABET[latDigit] + ALPHABET[lngDigit];
    latValue -= latDigit * place;
    lngValue -= lngDigit * place;
    place /= 20;
  }

  return code;
}

function encodeGrid(latRemainder, lngRemainder, gridDigits) {
  let code = '';
  let latPlace = 0.000125;
  let lngPlace = 0.000125;

  for (let index = 0; index < gridDigits; index += 1) {
    latPlace /= GRID_ROWS;
    lngPlace /= GRID_COLUMNS;
    const row = Math.floor(latRemainder / latPlace);
    const col = Math.floor(lngRemainder / lngPlace);
    const digit = row * GRID_COLUMNS + col;
    code += ALPHABET[digit];
    latRemainder -= row * latPlace;
    lngRemainder -= col * lngPlace;
  }

  return code;
}

export function encodePlusCode(lat, lng, codeLength = 10) {
  validateCodeLength(codeLength);
  const point = normalizeLatLng({ lat, lng });

  const pairDigits = Math.min(codeLength, PAIR_CODE_LENGTH);
  const gridDigits = Math.max(0, codeLength - PAIR_CODE_LENGTH);
  let code = encodePairs(point.lat, point.lng, pairDigits);
  if (gridDigits > 0) {
    let latValue = point.lat + LATITUDE_MAX;
    let lngValue = point.lng + LONGITUDE_MAX;
    let place = 20;

    for (let index = 0; index < pairDigits; index += 2) {
      const latDigit = Math.floor(latValue / place);
      const lngDigit = Math.floor(lngValue / place);
      latValue -= latDigit * place;
      lngValue -= lngDigit * place;
      place /= 20;
    }

    code += encodeGrid(latValue, lngValue, gridDigits);
  }

  if (code.length < SEPARATOR_POSITION) {
    code = code.padEnd(SEPARATOR_POSITION, PADDING);
  }

  code = `${code.slice(0, SEPARATOR_POSITION)}${SEPARATOR}${code.slice(SEPARATOR_POSITION)}`;

  return code;
}

function decodeCharacter(char) {
  const value = ALPHABET_MAP.get(char);
  if (value === undefined) {
    throw new Error(`Invalid Plus Code character: ${char}`);
  }
  return value;
}

export function decodePlusCode(code) {
  if (typeof code !== 'string' || code.length === 0) {
    throw new TypeError('code must be a non-empty string');
  }

  const clean = code
    .toUpperCase()
    .replaceAll(SEPARATOR, '')
    .replaceAll(PADDING, '');

  if (clean.length < 2) {
    throw new Error('Plus Code is too short');
  }

  const pairLength = Math.min(clean.length, PAIR_CODE_LENGTH);
  let latLo = -LATITUDE_MAX;
  let lngLo = -LONGITUDE_MAX;
  let latPlace = 20;
  let lngPlace = 20;

  for (let index = 0; index < pairLength; index += 2) {
    const latDigit = decodeCharacter(clean[index]);
    const lngDigit = decodeCharacter(clean[index + 1]);
    latLo += latDigit * latPlace;
    lngLo += lngDigit * lngPlace;
    if (index + 2 < pairLength) {
      latPlace /= 20;
      lngPlace /= 20;
    }
  }

  if (clean.length > PAIR_CODE_LENGTH) {
    const pairResolution = 0.000125;
    latPlace = pairResolution;
    lngPlace = pairResolution;

    for (let index = PAIR_CODE_LENGTH; index < clean.length; index += 1) {
      const digit = decodeCharacter(clean[index]);
      latPlace /= GRID_ROWS;
      lngPlace /= GRID_COLUMNS;
      const row = Math.floor(digit / GRID_COLUMNS);
      const col = digit % GRID_COLUMNS;
      latLo += row * latPlace;
      lngLo += col * lngPlace;
    }
  }

  const latHi = latLo + latPlace;
  const lngHi = lngLo + lngPlace;

  return {
    latCenter: (latLo + latHi) / 2,
    lngCenter: (lngLo + lngHi) / 2,
    latLo,
    lngLo,
    latHi,
    lngHi,
  };
}

export function haversine(a, b) {
  const p1 = normalizeLatLng(a);
  const p2 = normalizeLatLng(b);
  const lat1 = (p1.lat * Math.PI) / 180;
  const lat2 = (p2.lat * Math.PI) / 180;
  const deltaLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const deltaLng = ((p2.lng - p1.lng) * Math.PI) / 180;

  const sinLat = Math.sin(deltaLat / 2);
  const sinLng = Math.sin(deltaLng / 2);
  const aTerm =
    sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  const c = 2 * Math.atan2(Math.sqrt(aTerm), Math.sqrt(1 - aTerm));
  return EARTH_RADIUS_M * c;
}

export function bearing(a, b) {
  const p1 = normalizeLatLng(a);
  const p2 = normalizeLatLng(b);
  const lat1 = (p1.lat * Math.PI) / 180;
  const lat2 = (p2.lat * Math.PI) / 180;
  const deltaLng = ((p2.lng - p1.lng) * Math.PI) / 180;

  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
  const degrees = (Math.atan2(y, x) * 180) / Math.PI;
  return (degrees + 360) % 360;
}

function pointOnSegment(point, start, end) {
  const [px, py] = point;
  const [x1, y1] = start;
  const [x2, y2] = end;
  const cross = (px - x1) * (y2 - y1) - (py - y1) * (x2 - x1);
  if (Math.abs(cross) > EPSILON) {
    return false;
  }

  const withinX = px >= Math.min(x1, x2) - EPSILON && px <= Math.max(x1, x2) + EPSILON;
  const withinY = py >= Math.min(y1, y2) - EPSILON && py <= Math.max(y1, y2) + EPSILON;
  return withinX && withinY;
}

export function pointInPolygon(point, ring) {
  if (!Array.isArray(ring) || ring.length < 3) {
    return false;
  }

  const [testLng, testLat] = point;
  let inside = false;

  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const start = ring[previous];
    const end = ring[index];

    if (pointOnSegment(point, start, end)) {
      return true;
    }

    const [x1, y1] = start;
    const [x2, y2] = end;
    const intersects =
      y1 > testLat !== y2 > testLat &&
      testLng <
        ((x2 - x1) * (testLat - y1)) / (y2 - y1 + 0) + x1;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function polygonContains(point, polygon) {
  if (!Array.isArray(polygon) || polygon.length === 0) {
    return false;
  }

  const outerRing = polygon[0];
  if (!pointInPolygon(point, outerRing)) {
    return false;
  }

  for (let index = 1; index < polygon.length; index += 1) {
    if (pointInPolygon(point, polygon[index])) {
      return false;
    }
  }

  return true;
}

export function zonaDe(point, geojson) {
  if (!geojson || !Array.isArray(geojson.features)) {
    return null;
  }

  const testPoint = [point.lng, point.lat];

  for (const feature of geojson.features) {
    if (!feature || feature.geometry == null) {
      continue;
    }

    const { geometry, properties = {} } = feature;
    const zonaId = properties.zonaId ?? properties.id ?? feature.id ?? null;
    const nombre = properties.nombre ?? properties.name ?? zonaId ?? null;

    if (geometry.type === 'Polygon') {
      if (polygonContains(testPoint, geometry.coordinates)) {
        return { zonaId, nombre };
      }
    } else if (geometry.type === 'MultiPolygon') {
      if (geometry.coordinates.some((polygon) => polygonContains(testPoint, polygon))) {
        return { zonaId, nombre };
      }
    }
  }

  return null;
}

export function oraculo(point, { geojson, referencias } = {}) {
  const normalizedPoint = normalizeLatLng(point);
  const plusCode = encodePlusCode(normalizedPoint.lat, normalizedPoint.lng);
  const zona = zonaDe(normalizedPoint, geojson);
  const referenciasOrdenadas = Array.isArray(referencias)
    ? referencias
        .map((ref) => {
          const destination = normalizeLatLng(ref);
          return {
            id: ref.id,
            nombre: ref.nombre,
            distanciaM: haversine(normalizedPoint, destination),
            rumbo: bearing(normalizedPoint, destination),
          };
        })
        .sort((a, b) => a.distanciaM - b.distanciaM)
    : [];

  return {
    plusCode,
    zona,
    referencias: referenciasOrdenadas,
  };
}
