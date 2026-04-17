/**
 * exportService — Servicio de exportación de trazabilidad (Fase 16.4).
 *
 * Genera un CSV offline-ready a partir del logCache de IndexedDB, cruzando
 * cada registro con MATERIAL_CATEGORIES para etiquetar el eje funcional del
 * insumo. Usa la API Blob nativa del navegador, sin dependencias externas.
 */

import { logCache } from '../db/logCache';
import { MATERIAL_CATEGORIES, MATERIAL_CATEGORY_BY_NAME } from '../config/materials';

interface QuantityLike {
  value?: number | string;
  unit?: string;
  [key: string]: unknown;
}

interface ExportableLog {
  id?: string;
  type?: string;
  name?: string;
  asset_id?: string | null;
  timestamp?: number;
  quantity?: QuantityLike | null | unknown;
  attributes?: { name?: string; timestamp?: number; quantity?: QuantityLike | null };
  relationships?: Record<string, { data?: unknown }>;
  _pending?: boolean;
  [key: string]: unknown;
}

interface ExportOptions {
  filename?: string;
  types?: string[];
}

interface ExportResult {
  rowCount: number;
  pendingCount: number;
  filename: string;
}

const toBaseUnit = (qty: QuantityLike | null | undefined): { value: number; base: string } => {
  if (!qty) return { value: 0, base: 'kg' };
  const value = parseFloat(String(qty.value ?? 0)) || 0;
  const unit = (qty.unit || '').toLowerCase();
  if (unit === 'g' || unit === 'mg') return { value: value * 0.001, base: 'kg' };
  if (unit === 'ml') return { value: value * 0.001, base: 'l' };
  if (unit === 'bultos') return { value: value * 50, base: 'kg' };
  if (unit === 'l') return { value, base: 'l' };
  if (unit === 'kg') return { value, base: 'kg' };
  return { value, base: unit || 'u' };
};

const extractMaterialName = (log: ExportableLog): string => {
  const name = log.name || log.attributes?.name || '';
  return name.replace(/^Aplicación de /, '');
};

const resolveCategory = (log: ExportableLog): string => {
  if (log.type !== 'log--input') return '—';
  const material = extractMaterialName(log);
  const catId = MATERIAL_CATEGORY_BY_NAME[material];
  return catId ? MATERIAL_CATEGORIES[catId].label : 'Sin categoría';
};

const resolveOperator = (log: ExportableLog): string => {
  const rel = log.relationships || {};
  const owner = rel['owner']?.data || rel['uid']?.data;
  if (Array.isArray(owner)) {
    const first = owner[0] as { id?: string } | undefined;
    return first?.id?.split('-')[0] || '—';
  }
  return (owner as { id?: string } | undefined)?.id?.split('-')[0] || '—';
};

const formatDate = (ts: number | undefined): string => {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const escapeCsv = (field: unknown): string => {
  const value = field == null ? '' : String(field);
  if (/[;"\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

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

const logToRow = (log: ExportableLog): string[] => {
  const qty = (log.quantity || log.attributes?.quantity || {}) as QuantityLike;
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

const buildCsv = (logs: ExportableLog[]): string => {
  const rows: string[][] = [HEADERS, ...logs.map(logToRow)];
  return rows.map((row) => row.map(escapeCsv).join(';')).join('\r\n');
};

const triggerDownload = (csvContent: string, filename: string): void => {
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

  setTimeout(() => URL.revokeObjectURL(url), 100);
};

/**
 * Ejecuta el pipeline completo: Extract(IDB) → Transform(Categories) → Load(Blob).
 */
export const exportTraceabilityCsv = async (options: ExportOptions = {}): Promise<ExportResult> => {
  const allLogs = (await logCache.getAll()) as unknown as ExportableLog[];

  const filtered = options.types
    ? allLogs.filter((l) => l.type && options.types!.includes(l.type))
    : allLogs;

  const sorted = [...filtered].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  const csv = buildCsv(sorted);

  const today = new Date().toISOString().split('T')[0];
  const filename = options.filename || `chagra_trazabilidad_${today}.csv`;

  triggerDownload(csv, filename);

  const pendingCount = sorted.filter((l) => l._pending === true).length;
  return { rowCount: sorted.length, pendingCount, filename };
};

export default exportTraceabilityCsv;
