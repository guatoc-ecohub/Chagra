/**
 * exportService — Servicio de exportación de trazabilidad (Fase 16.4).
 *
 * Genera un CSV offline-ready a partir del logCache de IndexedDB, cruzando
 * cada registro con MATERIAL_CATEGORIES para etiquetar el eje funcional del
 * insumo. Usa la API Blob nativa del navegador, sin dependencias externas.
 *
 * Formato:
 *   - Encoding:  UTF-8 con BOM (compatibilidad Excel ES-CO)
 *   - Separador: punto y coma (;)
 *   - Cifras decimales: punto (.)
 *   - Estado sincronización: columna explícita para advertir registros _pending
 */

import { logCache } from '../db/logCache';
import { MATERIAL_CATEGORIES, MATERIAL_CATEGORY_BY_NAME } from '../config/materials';

// Conversión a unidad base decimal (kg/l). Consistente con hooks de analítica.
const toBaseUnit = (qty) => {
  if (!qty) return { value: 0, base: 'kg' };
  const value = parseFloat(qty.value) || 0;
  const unit = (qty.unit || '').toLowerCase();
  if (unit === 'g' || unit === 'mg') return { value: value * 0.001, base: 'kg' };
  if (unit === 'ml') return { value: value * 0.001, base: 'l' };
  if (unit === 'bultos') return { value: value * 50, base: 'kg' };
  if (unit === 'l') return { value, base: 'l' };
  if (unit === 'kg') return { value, base: 'kg' };
  return { value, base: unit || 'u' };
};

// Extrae el nombre canónico del material a partir del nombre del log.
// Formato esperado en log--input: "Aplicación de {Material}"
// Para otros tipos de log, retorna el name completo.
const extractMaterialName = (log) => {
  const name = log.name || log.attributes?.name || '';
  return name.replace(/^Aplicación de /, '');
};

// Resuelve la categoría del material (fertilization, protection, etc.).
// Para logs que no sean log--input (harvest, seeding, planting), retorna '—'.
const resolveCategory = (log) => {
  if (log.type !== 'log--input') return '—';
  const material = extractMaterialName(log);
  const catId = MATERIAL_CATEGORY_BY_NAME[material];
  return catId ? MATERIAL_CATEGORIES[catId].label : 'Sin categoría';
};

// Deriva un identificador de operario desde el log si está disponible.
// FarmOS expone relationships.owner / relationships.uid en logs sincronizados.
const resolveOperator = (log) => {
  const rel = log.relationships || {};
  const owner = rel.owner?.data || rel.uid?.data;
  if (Array.isArray(owner)) return owner[0]?.id?.split('-')[0] || '—';
  return owner?.id?.split('-')[0] || '—';
};

// Formatea timestamp UNIX segundos a ISO-8601 (YYYY-MM-DD HH:mm)
const formatDate = (ts) => {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Escapado de campo CSV: envuelve en comillas si contiene ; " \r o \n.
// Las comillas internas se duplican según RFC 4180.
const escapeCsv = (field) => {
  const value = field == null ? '' : String(field);
  if (/[;"\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

// Cabecera del CSV — orden estable, referenciado por tests visuales en Excel.
const HEADERS = [
  'Fecha',
  'Tipo_Log',
  'Activo_ID',
  'Categoria',
  'Material',
  'Cantidad_Original',
  'Unidad',
  'Cantidad_Normalizada',
  'Unidad_Base',
  'Operario',
  'Estado_Sync',
];

// Transforma un log individual en una fila del CSV (array de strings).
const logToRow = (log) => {
  const qty = log.quantity || log.attributes?.quantity || {};
  const originalValue = qty.value ?? '';
  const originalUnit = qty.unit ?? '';
  const { value: normalizedValue, base: normalizedUnit } = toBaseUnit(qty);
  const pending = log._pending === true;

  return [
    formatDate(log.timestamp || log.attributes?.timestamp),
    log.type || '',
    (log.asset_id || '').slice(0, 8),
    resolveCategory(log),
    extractMaterialName(log),
    originalValue !== '' ? String(originalValue) : '',
    originalUnit || '',
    normalizedValue ? normalizedValue.toFixed(4) : '0.0000',
    normalizedUnit,
    resolveOperator(log),
    pending ? 'PENDIENTE' : 'SINCRONIZADO',
  ];
};

// Construye el string CSV completo a partir de los logs normalizados.
const buildCsv = (logs) => {
  const rows = [HEADERS, ...logs.map(logToRow)];
  return rows.map((row) => row.map(escapeCsv).join(';')).join('\r\n');
};

// Dispara la descarga del archivo via Blob + anchor temporal.
const triggerDownload = (csvContent, filename) => {
  // BOM UTF-8 para que Excel detecte el encoding correctamente.
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Liberar el object URL tras un tick para permitir que el navegador inicie la descarga.
  setTimeout(() => URL.revokeObjectURL(url), 100);
};

/**
 * API pública del servicio.
 *
 * Ejecuta el pipeline completo: Extract(IDB) → Transform(Categories) → Load(Blob).
 *
 * @param {Object} options
 * @param {string} [options.filename] - nombre del archivo (default: chagra_trazabilidad_{fecha}.csv)
 * @param {Array<string>} [options.types] - filtrar por tipos de log (default: todos)
 * @returns {Promise<{ rowCount: number, pendingCount: number, filename: string }>}
 */
export const exportTraceabilityCsv = async (options = {}) => {
  const allLogs = await logCache.getAll();

  // Filtrado opcional por tipo de log
  const filtered = options.types
    ? allLogs.filter((l) => options.types.includes(l.type))
    : allLogs;

  // Orden cronológico descendente (registros recientes primero)
  const sorted = [...filtered].sort(
    (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
  );

  const csv = buildCsv(sorted);

  const today = new Date().toISOString().split('T')[0];
  const filename = options.filename || `chagra_trazabilidad_${today}.csv`;

  triggerDownload(csv, filename);

  const pendingCount = sorted.filter((l) => l._pending === true).length;
  return { rowCount: sorted.length, pendingCount, filename };
};

export default exportTraceabilityCsv;
