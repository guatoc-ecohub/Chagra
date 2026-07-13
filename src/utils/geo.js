/**
 * geo.js — Serialización GeoJSON ↔ WKT para FarmOS `intrinsic_geometry`.
 *
 * FarmOS v2 persiste geometrías en `asset.attributes.intrinsic_geometry.value`
 * como strings WKT (Well-Known Text). Internamente manejamos GeoJSON por
 * ergonomía en JS y convertimos al momento de construir payloads JSON:API.
 *
 * Soporte actual:
 *   - Point            → "POINT(lon lat)"
 *   - Polygon          → "POLYGON((lon lat, lon lat, ...))"
 *   - MultiPolygon     → "MULTIPOLYGON(((...)),((...)))"
 *
 * Precisión: 7 decimales (≈ 1 cm) — más que suficiente para agricultura.
 */

const PRECISION = 7;

const fmt = (n) => Number.parseFloat(n).toFixed(PRECISION);

// --- Constantes de filtrado GPS para "trazar caminando" (bug #57) --------
//
// El campesino recorre el borde del lote a pie con el GPS del teléfono.
// El stream de watchPosition trae ruido que rompía el trazo de tres formas:
//   (a) "línea loca": fixes con accuracy mala saltan erráticos.
//   (b) "polígono rayado": puntos casi-duplicados + orden ruidoso →
//       auto-intersección al cerrar el anillo.
//   (c) "precisión 1ª corrida": el primer fix (cold-start A-GPS) es grueso
//       y ancla el polígono en un punto equivocado.
//
// Umbrales conservadores pensados para un teléfono al aire libre caminando:

// Accuracy peor que esto (en metros) → descartamos el fix. GPS de smartphone
// a cielo abierto da 5-15m; >25m suele ser triangulación de celda/wifi.
export const GPS_ACCURACY_THRESHOLD_M = 25;

// Accuracy exigida durante el "warm-up": no empezamos a trazar hasta que el
// GPS converja por debajo de esto. Más estricto que el umbral de descarte
// para que el primer vértice del polígono sea sólido (síntoma c).
export const GPS_WARMUP_ACCURACY_M = 20;

// bug #57(c) residual: cuántos fixes SIN `accuracy` reportada toleramos durante
// el warm-up antes de rendirnos y anclar de todos modos. Algunos navegadores de
// escritorio nunca reportan accuracy; sin este tope el warm-up nunca terminaría.
// En un teléfono al aire libre, ~8 fixes son varios segundos de señal.
export const GPS_WARMUP_NO_ACCURACY_LIMIT = 8;

// Velocidad humana caminando ≈ 1.4 m/s. Por encima de este techo el "salto"
// entre dos fixes consecutivos es físicamente imposible a pie → ruido GPS.
export const GPS_MAX_WALK_SPEED_MPS = 5; // ~18 km/h, holgado para trote/jitter

// Distancia mínima entre vértices conservados. Pasos más cortos que esto se
// consideran el mismo punto (dedup) y solo engordan el anillo con jitter.
export const GPS_MIN_VERTEX_DISTANCE_M = 3;

// Distancia máxima razonable entre dos fixes consecutivos caminando. Se usa
// como guarda de respaldo cuando los timestamps no están disponibles para
// hacer el chequeo de velocidad; el comentario original decía "caemos a un
// tope de distancia" pero nunca se implementó (bug #57 línea loca).
export const GPS_MAX_JUMP_DISTANCE_M = 50;

// Tolerancia por defecto de Douglas-Peucker para simplificar el recorrido.
export const GPS_SIMPLIFY_TOLERANCE_M = 2;

const EARTH_RADIUS_M = 6371008.8; // radio medio WGS-84
const DEG2RAD = Math.PI / 180;

/**
 * Distancia haversine en metros entre dos puntos {lat, lng}.
 * Suficientemente precisa a escala de un lote (errores < 0.5% por debajo de
 * unos pocos km, despreciable para agricultura).
 *
 * @param {{lat:number,lng:number}} a
 * @param {{lat:number,lng:number}} b
 * @returns {number} distancia en metros.
 */
export const haversineMeters = (a, b) => {
  if (!a || !b) return 0;
  const lat1 = a.lat * DEG2RAD;
  const lat2 = b.lat * DEG2RAD;
  const dLat = (b.lat - a.lat) * DEG2RAD;
  const dLng = (b.lng - a.lng) * DEG2RAD;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
};

/**
 * Decide si un fix GPS entrante debe aceptarse durante el trazo caminando.
 *
 * Filtra el síntoma (a) "línea loca": descarta fixes imprecisos y saltos a
 * velocidad imposible respecto al último vértice aceptado.
 *
 * @param {{lat:number,lng:number,accuracy?:number,timestamp?:number}} fix
 * @param {{lat:number,lng:number,timestamp?:number}|null} prev - último fix aceptado.
 * @param {object} [opts]
 * @param {number} [opts.accuracyThreshold=GPS_ACCURACY_THRESHOLD_M]
 * @param {number} [opts.maxSpeed=GPS_MAX_WALK_SPEED_MPS]
 * @param {number} [opts.maxJumpDistance=GPS_MAX_JUMP_DISTANCE_M]
 * @returns {{accepted:boolean, reason:string|null, distance:number}}
 */
export const acceptGpsFix = (fix, prev, opts = {}) => {
  const accuracyThreshold = opts.accuracyThreshold ?? GPS_ACCURACY_THRESHOLD_M;
  const maxSpeed = opts.maxSpeed ?? GPS_MAX_WALK_SPEED_MPS;
  const maxJumpDistance = opts.maxJumpDistance ?? GPS_MAX_JUMP_DISTANCE_M;

  if (!fix || !Number.isFinite(fix.lat) || !Number.isFinite(fix.lng)) {
    return { accepted: false, reason: 'invalid', distance: 0 };
  }
  // accuracy ausente: el navegador no la reportó. Tratamos como sospechosa
  // pero no la descartamos por sí sola (algunos navegadores la omiten).
  if (Number.isFinite(fix.accuracy) && fix.accuracy > accuracyThreshold) {
    return { accepted: false, reason: 'accuracy', distance: 0 };
  }
  if (!prev) {
    return { accepted: true, reason: null, distance: 0 };
  }

  const distance = haversineMeters(prev, fix);
  // Salto imposible: distancia/tiempo → velocidad irreal. Solo lo evaluamos
  // si tenemos timestamps consistentes; si no, caemos a un tope de distancia.
  const dtMs =
    Number.isFinite(fix.timestamp) && Number.isFinite(prev.timestamp)
      ? fix.timestamp - prev.timestamp
      : null;
  if (dtMs != null && dtMs > 0) {
    const speed = distance / (dtMs / 1000); // m/s
    if (speed > maxSpeed) {
      return { accepted: false, reason: 'speed', distance };
    }
  } else if (distance > maxJumpDistance) {
    // Fallback: sin timestamps consistentes, no podemos calcular velocidad,
    // pero una distancia exagerada igual es un salto GPS → línea loca.
    return { accepted: false, reason: 'jump', distance };
  }
  return { accepted: true, reason: null, distance };
};

/**
 * Decide si un fix entrante debe TERMINAR el warm-up del GPS y convertirse en
 * el ancla del polígono (síntoma c "precisión 1ª corrida").
 *
 * El warm-up existe para no anclar el polígono en el primer fix de cold-start
 * A-GPS, que suele ser grueso. La regla:
 *   - accuracy finita y ≤ umbral  → el GPS convergió: terminar warm-up.
 *   - accuracy finita y > umbral   → aún impreciso: seguir esperando.
 *   - accuracy AUSENTE             → no podemos verificar precisión. NO anclamos
 *     con ella salvo como fallback tras `noAccuracyCount` ≥ límite (navegadores
 *     que jamás reportan accuracy), para no colgar el warm-up indefinidamente.
 *
 * Bug #57(c) residual: la versión previa terminaba el warm-up con CUALQUIER fix
 * sin accuracy (la condición `Number.isFinite(accuracy) && accuracy > umbral`
 * era falsa cuando accuracy era undefined), anclando en un cold-start grueso.
 *
 * @param {{accuracy?:number}} fix
 * @param {object} [opts]
 * @param {number} [opts.warmupAccuracy=GPS_WARMUP_ACCURACY_M]
 * @param {number} [opts.noAccuracyCount=0] - fixes consecutivos sin accuracy ya vistos.
 * @param {number} [opts.noAccuracyLimit=GPS_WARMUP_NO_ACCURACY_LIMIT]
 * @returns {{warmedUp:boolean, reason:'converged'|'fallback'|'imprecise'|'no-accuracy'}}
 */
export const warmupDecision = (fix, opts = {}) => {
  const warmupAccuracy = opts.warmupAccuracy ?? GPS_WARMUP_ACCURACY_M;
  const noAccuracyCount = opts.noAccuracyCount ?? 0;
  const noAccuracyLimit = opts.noAccuracyLimit ?? GPS_WARMUP_NO_ACCURACY_LIMIT;
  const accuracy = fix?.accuracy;

  if (Number.isFinite(accuracy)) {
    return accuracy <= warmupAccuracy
      ? { warmedUp: true, reason: 'converged' }
      : { warmedUp: false, reason: 'imprecise' };
  }
  // accuracy ausente: solo rendirse (anclar) tras varios fixes sin señal de
  // precisión; mientras tanto seguimos calentando.
  if (noAccuracyCount + 1 >= noAccuracyLimit) {
    return { warmedUp: true, reason: 'fallback' };
  }
  return { warmedUp: false, reason: 'no-accuracy' };
};

/**
 * Elimina puntos consecutivos separados por menos de `minDistance` metros.
 *
 * Combate el síntoma (b): el jitter del GPS estando quieto genera decenas de
 * vértices casi-coincidentes que, al cerrar el anillo, se cruzan entre sí.
 *
 * @param {Array<{lat:number,lng:number}>} points
 * @param {number} [minDistance=GPS_MIN_VERTEX_DISTANCE_M]
 * @returns {Array<{lat:number,lng:number}>} copia filtrada.
 */
export const dedupeByMinDistance = (points, minDistance = GPS_MIN_VERTEX_DISTANCE_M) => {
  if (!Array.isArray(points) || points.length === 0) return [];
  const out = [points[0]];
  for (let i = 1; i < points.length; i += 1) {
    if (haversineMeters(out[out.length - 1], points[i]) >= minDistance) {
      out.push(points[i]);
    }
  }
  return out;
};

// Distancia perpendicular (en metros) del punto p al segmento a-b, usando una
// proyección equirectangular local. A escala de lote el error es despreciable.
const perpendicularDistanceM = (p, a, b) => {
  const latRef = (a.lat + b.lat) / 2 * DEG2RAD;
  const mPerDegLat = 111132.92; // aprox a latitudes medias
  const mPerDegLng = 111412.84 * Math.cos(latRef);
  const toXY = (pt) => ({ x: pt.lng * mPerDegLng, y: pt.lat * mPerDegLat });
  const P = toXY(p);
  const A = toXY(a);
  const B = toXY(b);
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(P.x - A.x, P.y - A.y);
  const t = ((P.x - A.x) * dx + (P.y - A.y) * dy) / lenSq;
  const tc = Math.max(0, Math.min(1, t));
  const projX = A.x + tc * dx;
  const projY = A.y + tc * dy;
  return Math.hypot(P.x - projX, P.y - projY);
};

/**
 * Simplifica una polilínea con Douglas-Peucker, tolerancia en metros.
 *
 * Reduce los vértices manteniendo la forma → menos lados que se puedan cruzar
 * (síntoma b) y un anillo más limpio para persistir.
 *
 * @param {Array<{lat:number,lng:number}>} points
 * @param {number} [toleranceM=GPS_SIMPLIFY_TOLERANCE_M]
 * @returns {Array<{lat:number,lng:number}>}
 */
export const simplifyDouglasPeucker = (points, toleranceM = GPS_SIMPLIFY_TOLERANCE_M) => {
  if (!Array.isArray(points) || points.length <= 2) {
    return Array.isArray(points) ? [...points] : [];
  }
  const first = 0;
  const last = points.length - 1;
  let maxDist = 0;
  let index = -1;
  for (let i = first + 1; i < last; i += 1) {
    const d = perpendicularDistanceM(points[i], points[first], points[last]);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }
  if (maxDist > toleranceM && index !== -1) {
    const left = simplifyDouglasPeucker(points.slice(first, index + 1), toleranceM);
    const right = simplifyDouglasPeucker(points.slice(index, last + 1), toleranceM);
    return [...left.slice(0, -1), ...right];
  }
  return [points[first], points[last]];
};

/**
 * Área (en metros cuadrados) de un anillo de coordenadas {lat,lng} usando la
 * fórmula del shoelace sobre una proyección equirectangular local. Devuelve
 * el valor absoluto (independiente de la orientación del anillo).
 *
 * Útil para validar el polígono (área ~0 → degenerado / colapsado).
 *
 * @param {Array<{lat:number,lng:number}>} ring - abierto o cerrado.
 * @returns {number} área en m², 0 si el anillo es degenerado.
 */
export const polygonAreaSqMeters = (ring) => {
  if (!Array.isArray(ring) || ring.length < 3) return 0;
  // Trabajar sobre el anillo cerrado para el shoelace.
  const pts = ring.slice();
  const f = pts[0];
  const l = pts[pts.length - 1];
  if (f.lat !== l.lat || f.lng !== l.lng) pts.push(f);
  const latRef = (pts.reduce((s, p) => s + p.lat, 0) / pts.length) * DEG2RAD;
  const mPerDegLat = 111132.92;
  const mPerDegLng = 111412.84 * Math.cos(latRef);
  let sum = 0;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const x1 = pts[i].lng * mPerDegLng;
    const y1 = pts[i].lat * mPerDegLat;
    const x2 = pts[i + 1].lng * mPerDegLng;
    const y2 = pts[i + 1].lat * mPerDegLat;
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
};

/**
 * Limpia el recorrido caminado a un anillo de polígono estable y listo para
 * persistir: dedup por distancia mínima + simplificación Douglas-Peucker.
 *
 * No reordena los puntos: el orden de recorrido a pie YA describe el perímetro;
 * reordenar (p. ej. por ángulo respecto al centroide) rompería lotes cóncavos.
 * La auto-intersección del síntoma (b) venía del jitter (puntos casi-duplicados
 * y micro-zigzags), que dedup + simplify eliminan.
 *
 * Devuelve los vértices SIN cerrar (el cierre del anillo lo hace closeRing /
 * latLngsToPolygon al serializar) para no duplicar el primer punto dos veces.
 *
 * @param {Array<{lat:number,lng:number}>} points - vértices ya filtrados por accuracy.
 * @param {object} [opts]
 * @param {number} [opts.minDistance=GPS_MIN_VERTEX_DISTANCE_M]
 * @param {number} [opts.toleranceM=GPS_SIMPLIFY_TOLERANCE_M]
 * @returns {Array<{lat:number,lng:number}>}
 */
export const buildWalkPolygon = (points, opts = {}) => {
  if (!Array.isArray(points) || points.length < 3) {
    return Array.isArray(points) ? [...points] : [];
  }
  const minDistance = opts.minDistance ?? GPS_MIN_VERTEX_DISTANCE_M;
  const toleranceM = opts.toleranceM ?? GPS_SIMPLIFY_TOLERANCE_M;

  let ring = dedupeByMinDistance(points, minDistance);
  ring = simplifyDouglasPeucker(ring, toleranceM);

  // Si dedup/simplify dejaron el primer y último punto coincidentes (el
  // recorrido volvió al inicio), quitamos el duplicado de cola: el cierre lo
  // añade el serializador. Así evitamos un anillo con el inicio repetido 2×.
  if (ring.length > 1) {
    const f = ring[0];
    const l = ring[ring.length - 1];
    if (haversineMeters(f, l) < minDistance) {
      ring = ring.slice(0, -1);
    }
  }
  return ring;
};

// GeoJSON coordenadas: [lon, lat]. WKT: "lon lat" (sin coma).
const coordToWkt = ([lon, lat]) => `${fmt(lon)} ${fmt(lat)}`;

const ringToWkt = (ring) => `(${ring.map(coordToWkt).join(', ')})`;

/**
 * Convierte una geometría GeoJSON a string WKT (Well-Known Text) para
 * serialización hacia FarmOS. Soporta Point, Polygon y MultiPolygon.
 *
 * @param {object} geometry - Geometría GeoJSON con type y coordinates.
 * @returns {string} Representación WKT, o string vacío si el tipo no está soportado.
 */
export const geoJsonToWkt = (geometry) => {
  if (!geometry || !geometry.type) return '';

  switch (geometry.type) {
    case 'Point':
      return `POINT(${coordToWkt(geometry.coordinates)})`;

    case 'Polygon': {
      // Polygon: coordinates es un array de rings (exterior + holes).
      // Un polígono cerrado repite el primer punto al final.
      const rings = geometry.coordinates.map(ringToWkt).join(', ');
      return `POLYGON(${rings})`;
    }

    case 'MultiPolygon': {
      const polygons = geometry.coordinates
        .map((poly) => `(${poly.map(ringToWkt).join(', ')})`)
        .join(', ');
      return `MULTIPOLYGON(${polygons})`;
    }

    default:
      console.warn('[geo] Tipo de geometría no soportado:', geometry.type);
      return '';
  }
};

/**
 * Cierra un ring abierto añadiendo el primer punto al final si el anillo
 * no está ya cerrado (primer y último punto distintos).
 *
 * @param {Array<[number, number]>} ring - Array de coordenadas [lon, lat].
 * @returns {Array<[number, number]>} Ring cerrado (copia si fue necesario cerrar).
 */
export const closeRing = (ring) => {
  if (ring.length < 3) return ring;
  const [first] = ring;
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return ring;
  return [...ring, first];
};

/**
 * Construye un GeoJSON Point Feature desde coordenadas de Leaflet.
 * Leaflet entrega LatLng: { lat, lng }. GeoJSON espera [lon, lat].
 *
 * @param {{ lat: number, lng: number }} latlng - Coordenada Leaflet.
 * @returns {{ type: 'Point', coordinates: [number, number] }} GeoJSON Point.
 */
export const latLngToPoint = (latlng) => ({
  type: 'Point',
  coordinates: [latlng.lng, latlng.lat],
});

/**
 * Construye un GeoJSON Polygon desde un array de coordenadas Leaflet.
 * Cierra el anillo automáticamente vía closeRing.
 *
 * @param {Array<{ lat: number, lng: number }>} latlngs - Array de coordenadas Leaflet.
 * @returns {{ type: 'Polygon', coordinates: [[number, number]] }} GeoJSON Polygon.
 */
export const latLngsToPolygon = (latlngs) => {
  const ring = latlngs.map((ll) => /** @type {[number,number]} */ ([ll.lng, ll.lat]));
  return {
    type: 'Polygon',
    coordinates: /** @type {any} */ ([closeRing(ring)]),
  };
};

/**
 * Parsea un WKT simple (POINT o POLYGON) de vuelta a GeoJSON para renderizar
 * geometrías existentes que llegan del servidor.
 *
 * @param {string} wkt - String WKT a parsear.
 * @returns {object|null} Geometría GeoJSON con type y coordinates, o null si no se pudo parsear.
 */
export const wktToGeoJson = (wkt) => {
  if (!wkt || typeof wkt !== 'string') return null;
  const trimmed = wkt.trim().toUpperCase();

  const pointMatch = trimmed.match(/^POINT\s*\(([-\d.\s]+)\)$/);
  if (pointMatch) {
    const [lon, lat] = pointMatch[1].trim().split(/\s+/).map(Number);
    return { type: 'Point', coordinates: [lon, lat] };
  }

  const polyMatch = trimmed.match(/^POLYGON\s*\(\((.+)\)\)$/);
  if (polyMatch) {
    const ring = polyMatch[1]
      .split(',')
      .map((pair) => pair.trim().split(/\s+/).map(Number));
    return { type: 'Polygon', coordinates: [ring] };
  }

  return null;
};
