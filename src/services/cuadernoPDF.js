/**
 * cuadernoPDF — Cuaderno de campo PDF descargable (FEAT-D #295).
 *
 * Diferenciador agronómico para SNIA / EPSEA / certificación orgánica
 * (ICA, ECOCERT, FLO-CERT). El campesino imprime/envía el cuaderno con
 * TODO lo que registró en Chagra para:
 *   - Visita de extensionista del sistema EPSEA.
 *   - Certificación orgánica (auditor pide constancia documental).
 *   - Trazabilidad cosecha cooperativa.
 *
 * Diseño:
 *   - Usa `jspdf` (lightweight, sin canvas, ~100KB gzipped).
 *   - `generateCuadernoFinca(fincaData)` recibe la data ya extraída
 *     del store/IndexedDB y devuelve un Blob `application/pdf`.
 *   - `buildFincaData()` arma el shape esperado desde
 *     `assetCache` + `logCache` + `fincaActiveStore` + localStorage.
 *
 * Layout PDF (A4 portrait, márgenes 18mm):
 *   - Portada (logo Chagra como texto + nombre finca + operador + ubicación).
 *   - Resumen ejecutivo (totales N plantas/zonas/logs/cosechas).
 *   - Inventario plantas (tabla paginada).
 *   - Zonas (tipo + área cuando esté disponible).
 *   - Bitácora cronológica.
 *   - Cosechas (filter logs type='log--harvest').
 *   - Insumos usados (filter logs type='log--input').
 *   - Alertas + observaciones del agente.
 *   - Pie con disclaimer + versión Chagra.
 *
 * El módulo es UI-agnóstico: no toca `document` excepto cuando se llama
 * `downloadCuadernoPDF()`, que orquesta build → blob → download. Útil para
 * tests unit que mockean los stores.
 */

import { jsPDF } from 'jspdf';

// Tamaño de página A4 en mm (jsPDF default unit).
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;

// Paleta — verde Chagra para títulos, gris para secundario.
/** @type {[number, number, number]} */ const COLOR_EMERALD = [16, 122, 87];
/** @type {[number, number, number]} */ const COLOR_SLATE = [71, 85, 105];
/** @type {[number, number, number]} */ const COLOR_MUTED = [148, 163, 184];
/** @type {[number, number, number]} */ const COLOR_DARK = [15, 23, 42];

// Versión del schema del cuaderno (bump si cambiamos columnas / orden).
export const CUADERNO_VERSION = '1';

// ─── Helpers de fecha / formato ───────────────────────────────────────────

const pad = (n) => String(n).padStart(2, '0');

const formatTimestamp = (ts) => {
  if (!ts) return '';
  // FarmOS expone timestamps unix-seg o ISO según el path. Aceptamos ambos.
  const seconds = typeof ts === 'number' ? ts : Date.parse(ts) / 1000;
  if (Number.isNaN(seconds) || !Number.isFinite(seconds)) return '';
  const d = new Date(seconds * 1000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const formatDateTimeForFile = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;

const formatHumanDate = (date = new Date()) => {
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
};

const safeStr = (value, fallback = '—') => {
  if (value == null) return fallback;
  const s = String(value).trim();
  return s.length === 0 ? fallback : s;
};

// jsPDF NO ofrece ellipsis nativo. Truncamos para que las tablas no exploten.
const truncate = (str, max) => {
  if (!str) return '';
  return str.length > max ? `${str.slice(0, max - 1)}…` : str;
};

// ─── Type tags humanizados para la bitácora ───────────────────────────────

const LOG_TYPE_LABELS = {
  'log--seeding': 'Siembra',
  'log--planting': 'Trasplante',
  'log--harvest': 'Cosecha',
  'log--input': 'Aplicación',
  'log--task': 'Tarea',
  'log--observation': 'Observación',
};

const labelLogType = (type) => LOG_TYPE_LABELS[type] || safeStr(type, 'Evento');

// ─── Extracción de campos del asset ───────────────────────────────────────

const getAssetName = (asset) =>
  safeStr(asset?.attributes?.name || asset?.name);

const getAssetSpecies = (asset) => {
  // plant_type es la relación canónica FarmOS para el species de un asset--plant.
  const data = asset?.relationships?.plant_type?.data;
  if (Array.isArray(data) && data[0]?.attributes?.name) {
    return safeStr(data[0].attributes.name);
  }
  return '—';
};

const getAssetStatus = (asset) =>
  safeStr(asset?.attributes?.status || asset?.status, 'activo');

const getAssetCreated = (asset) => {
  const created = asset?.attributes?.created || asset?._createdAt;
  if (!created) return '';
  const ts = typeof created === 'number' ? created : Date.parse(created) / 1000;
  return formatTimestamp(ts);
};

const getLandType = (asset) => {
  const t = asset?.attributes?.land_type;
  const map = { field: 'campo', bed: 'cama', greenhouse: 'invernadero', paddock: 'potrero', building: 'edificación' };
  return map[t] || safeStr(t, 'zona');
};

// jsPDF expone getStringUnitWidth pero estimación con fuente fija sirve.
// Multiplicador conservador para no sobreestimar wraps.
const estimateLineHeight = (fontSize) => fontSize * 0.42;

// ─── Renderers de páginas ─────────────────────────────────────────────────

/** Header común a todas las páginas internas (excepto portada). */
const drawPageHeader = (doc, finca) => {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_MUTED);
  const headerText = `Cuaderno de campo · ${safeStr(finca?.nombre, 'Finca')}`;
  doc.text(headerText, MARGIN, 10);
  // Línea de separación.
  doc.setDrawColor(...COLOR_MUTED);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, 12, PAGE_W - MARGIN, 12);
};

/** Footer común con paginación. */
const drawPageFooter = (doc, pageNum, totalPages) => {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_MUTED);
  const footer = `Página ${pageNum} de ${totalPages} · Chagra Eco-OS`;
  doc.text(footer, PAGE_W / 2, PAGE_H - 8, { align: 'center' });
};

/** Título de sección con barra emerald a la izquierda. */
const drawSectionTitle = (doc, cursorY, title) => {
  doc.setFillColor(...COLOR_EMERALD);
  doc.rect(MARGIN, cursorY - 4, 2, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...COLOR_DARK);
  doc.text(title, MARGIN + 4, cursorY);
  return cursorY + 8;
};

const drawParagraph = (doc, cursorY, text, options = {}) => {
  const { fontSize = 10, color = COLOR_SLATE, gap = 4 } = options;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fontSize);
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(text, CONTENT_W);
  doc.text(lines, MARGIN, cursorY);
  return cursorY + lines.length * estimateLineHeight(fontSize) + gap;
};

/**
 * Tabla simple paginada. `columns`: [{ key, label, width }], width en mm.
 * Si el ancho total supera CONTENT_W, jsPDF se queda corto pero el splitText
 * de cada celda ayuda. El renderer añade páginas nuevas y repinta header
 * + columnas cada vez que se queda sin espacio.
 */
const drawTable = (doc, cursorY, columns, rows, finca, options = {}) => {
  const { headerColor = COLOR_EMERALD, bodyFontSize = 9, rowGap = 1.5 } = options;
  let y = cursorY;
  const rowHeight = bodyFontSize * 0.5 + rowGap;

  const drawHeaderRow = (yPos) => {
    doc.setFillColor(...headerColor);
    doc.rect(MARGIN, yPos - 4, CONTENT_W, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(bodyFontSize);
    doc.setTextColor(255, 255, 255);
    let x = MARGIN + 1.5;
    for (const col of columns) {
      doc.text(col.label, x, yPos);
      x += col.width;
    }
    return yPos + rowHeight + 1;
  };

  y = drawHeaderRow(y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(bodyFontSize);
  doc.setTextColor(...COLOR_DARK);

  for (const row of rows) {
    if (y + rowHeight > PAGE_H - MARGIN - 12) {
      drawPageFooter(doc, doc.getNumberOfPages(), doc.getNumberOfPages());
      doc.addPage();
      drawPageHeader(doc, finca);
      y = MARGIN + 6;
      y = drawHeaderRow(y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(bodyFontSize);
      doc.setTextColor(...COLOR_DARK);
    }
    let x = MARGIN + 1.5;
    for (const col of columns) {
      const raw = row[col.key] ?? '';
      // Truncamiento basado en ancho mm × ~2.3 chars/mm para bodyFontSize 9.
      const maxChars = Math.max(4, Math.floor(col.width * 2.1));
      doc.text(truncate(String(raw), maxChars), x, y);
      x += col.width;
    }
    y += rowHeight;
  }

  return y + 4;
};

/**
 * Genera el PDF en memoria y devuelve un Blob `application/pdf`.
 *
 * @param {object} fincaData — shape:
 *   {
 *     finca: { nombre, operador, slug, biocultural_zone, altitud,
 *              coords: [lat,lng], municipio?, vereda?, descripcion_corta? },
 *     operatorName: string,
 *     operatorRole: string,
 *     plants: Asset[],
 *     lands: Asset[],
 *     structures: Asset[],
 *     materials: Asset[],
 *     logs: Log[],
 *     period: { from: ISO, to: ISO }, // opcional
 *     observations?: string, // texto libre del agente / observaciones IA
 *   }
 * @returns {Blob} application/pdf
 */
export const generateCuadernoFinca = (fincaData) => {
  const data = fincaData || {};
  const finca = data.finca || {};
  const plants = Array.isArray(data.plants) ? data.plants : [];
  const lands = Array.isArray(data.lands) ? data.lands : [];
  const structures = Array.isArray(data.structures) ? data.structures : [];
  const materials = Array.isArray(data.materials) ? data.materials : [];
  const logs = Array.isArray(data.logs) ? data.logs : [];

  const harvests = logs.filter((l) => l.type === 'log--harvest');
  const inputs = logs.filter((l) => l.type === 'log--input');

  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });

  // ─── PORTADA ─────────────────────────────────────────────────────────
  // Bloque verde superior con "marca" Chagra (texto solo, sin imagen para no
  // depender de assets binarios — la portada queda imprimible en B/N).
  doc.setFillColor(...COLOR_EMERALD);
  doc.rect(0, 0, PAGE_W, 70, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(32);
  doc.setTextColor(255, 255, 255);
  doc.text('CHAGRA', MARGIN, 32);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text('Eco-OS · Cuaderno de campo', MARGIN, 42);
  doc.setFontSize(9);
  doc.text('Documento de trazabilidad agronómica', MARGIN, 50);

  // Contenido portada
  let y = 90;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(...COLOR_DARK);
  doc.text(safeStr(finca.nombre, 'Finca sin nombre'), MARGIN, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_SLATE);
  doc.text(`Operador: ${safeStr(data.operatorName, finca.operador || 'Sin registrar')}`, MARGIN, y);
  y += 6;
  if (data.operatorRole) {
    doc.text(`Rol: ${safeStr(data.operatorRole)}`, MARGIN, y);
    y += 6;
  }

  // Ubicación: municipio · vereda · msnm (con fallbacks).
  const locParts = [];
  if (finca.municipio) locParts.push(finca.municipio);
  if (finca.vereda) locParts.push(`vereda ${finca.vereda}`);
  if (finca.altitud) locParts.push(`${finca.altitud} msnm`);
  if (Array.isArray(finca.coords) && finca.coords.length === 2) {
    locParts.push(`(${Number(finca.coords[0]).toFixed(4)}, ${Number(finca.coords[1]).toFixed(4)})`);
  }
  if (locParts.length > 0) {
    doc.text(`Ubicación: ${locParts.join(' · ')}`, MARGIN, y);
    y += 6;
  }

  if (finca.biocultural_zone) {
    doc.text(`Zona biocultural: ${safeStr(finca.biocultural_zone).replace(/_/g, ' ')}`, MARGIN, y);
    y += 6;
  }

  y += 4;
  doc.setDrawColor(...COLOR_MUTED);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLOR_DARK);
  doc.text('Fecha de generación', MARGIN, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_SLATE);
  doc.text(formatHumanDate(new Date()), MARGIN + 60, y);
  y += 6;

  if (data.period?.from || data.period?.to) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLOR_DARK);
    doc.text('Período cubierto', MARGIN, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLOR_SLATE);
    const from = data.period.from ? formatTimestamp(data.period.from) : '—';
    const to = data.period.to ? formatTimestamp(data.period.to) : '—';
    doc.text(`${from}  →  ${to}`, MARGIN + 60, y);
    y += 6;
  }

  if (finca.descripcion_corta) {
    y += 4;
    drawParagraph(doc, y, finca.descripcion_corta, { fontSize: 10, color: COLOR_SLATE });
  }

  // ─── PÁGINA 2: RESUMEN EJECUTIVO ─────────────────────────────────────
  doc.addPage();
  drawPageHeader(doc, finca);
  y = MARGIN + 6;
  y = drawSectionTitle(doc, y, 'Resumen ejecutivo');

  const summary = [
    ['Plantas registradas', plants.length],
    ['Zonas (campos / camas / invernaderos)', lands.length],
    ['Estructuras', structures.length],
    ['Insumos catalogados', materials.length],
    ['Eventos en bitácora', logs.length],
    ['Cosechas reportadas', harvests.length],
    ['Aplicaciones de insumos', inputs.length],
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_DARK);
  for (const [label, value] of summary) {
    doc.setFont('helvetica', 'normal');
    doc.text(label, MARGIN, y);
    doc.setFont('helvetica', 'bold');
    doc.text(String(value), PAGE_W - MARGIN, y, { align: 'right' });
    y += 7;
  }

  y += 4;
  drawParagraph(
    doc,
    y,
    'Este cuaderno consolida la información agronómica registrada en Chagra hasta la fecha de generación. ' +
    'Los datos provienen directamente del dispositivo del operador (modo offline-first), e incluyen tanto ' +
    'registros sincronizados con FarmOS como aquellos pendientes de sincronización.',
    { fontSize: 9, color: COLOR_SLATE },
  );

  // ─── INVENTARIO DE PLANTAS ───────────────────────────────────────────
  doc.addPage();
  drawPageHeader(doc, finca);
  y = MARGIN + 6;
  y = drawSectionTitle(doc, y, 'Inventario de plantas');

  if (plants.length === 0) {
    drawParagraph(doc, y, 'No hay plantas registradas en este dispositivo.', { fontSize: 10, color: COLOR_MUTED });
  } else {
    const plantRows = plants.map((p) => ({
      id: truncate(p.id || '', 8),
      especie: getAssetSpecies(p),
      nombre: getAssetName(p),
      estado: getAssetStatus(p),
      sembrada: getAssetCreated(p),
      sync: p._pending ? 'pend.' : 'ok',
    }));
    drawTable(
      doc,
      y,
      [
        { key: 'id', label: 'ID', width: 18 },
        { key: 'especie', label: 'Especie', width: 45 },
        { key: 'nombre', label: 'Nombre', width: 50 },
        { key: 'estado', label: 'Estado', width: 22 },
        { key: 'sembrada', label: 'Sembrada', width: 25 },
        { key: 'sync', label: 'Sync', width: 14 },
      ],
      plantRows,
      finca,
    );
  }

  // ─── ZONAS ───────────────────────────────────────────────────────────
  doc.addPage();
  drawPageHeader(doc, finca);
  y = MARGIN + 6;
  y = drawSectionTitle(doc, y, 'Zonas');

  if (lands.length === 0) {
    drawParagraph(doc, y, 'No hay zonas registradas.', { fontSize: 10, color: COLOR_MUTED });
  } else {
    const landRows = lands.map((l) => ({
      nombre: getAssetName(l),
      tipo: getLandType(l),
      estado: getAssetStatus(l),
      creada: getAssetCreated(l),
    }));
    drawTable(
      doc,
      y,
      [
        { key: 'nombre', label: 'Nombre', width: 80 },
        { key: 'tipo', label: 'Tipo', width: 40 },
        { key: 'estado', label: 'Estado', width: 25 },
        { key: 'creada', label: 'Creada', width: 29 },
      ],
      landRows,
      finca,
    );
  }

  // ─── BITÁCORA CRONOLÓGICA ────────────────────────────────────────────
  doc.addPage();
  drawPageHeader(doc, finca);
  y = MARGIN + 6;
  y = drawSectionTitle(doc, y, 'Bitácora cronológica');

  if (logs.length === 0) {
    drawParagraph(doc, y, 'No hay eventos en la bitácora.', { fontSize: 10, color: COLOR_MUTED });
  } else {
    // Orden cronológico ascendente (lo que primero se hizo arriba).
    const sortedLogs = [...logs].sort((a, b) => {
      const ta = typeof a.timestamp === 'number' ? a.timestamp : Date.parse(a.attributes?.timestamp || 0) / 1000;
      const tb = typeof b.timestamp === 'number' ? b.timestamp : Date.parse(b.attributes?.timestamp || 0) / 1000;
      return (ta || 0) - (tb || 0);
    });
    const logRows = sortedLogs.map((l) => {
      const ts = l.timestamp || l.attributes?.timestamp;
      const name = l.attributes?.name || l.name || '';
      return {
        fecha: formatTimestamp(ts),
        tipo: labelLogType(l.type),
        ref: truncate(l.asset_id || '', 8),
        descripcion: name,
      };
    });
    drawTable(
      doc,
      y,
      [
        { key: 'fecha', label: 'Fecha', width: 26 },
        { key: 'tipo', label: 'Tipo', width: 28 },
        { key: 'ref', label: 'Asset', width: 18 },
        { key: 'descripcion', label: 'Descripción', width: 102 },
      ],
      logRows,
      finca,
    );
  }

  // ─── COSECHAS ────────────────────────────────────────────────────────
  doc.addPage();
  drawPageHeader(doc, finca);
  y = MARGIN + 6;
  y = drawSectionTitle(doc, y, 'Cosechas reportadas');

  if (harvests.length === 0) {
    drawParagraph(doc, y, 'No hay cosechas reportadas en este período.', { fontSize: 10, color: COLOR_MUTED });
  } else {
    const harvestRows = harvests.map((h) => {
      const qty = (Array.isArray(h.attributes?.quantity) && h.attributes.quantity[0]) || h.quantity || {};
      const qtyValue = qty?.attributes?.value?.decimal ?? qty?.value ?? '';
      const qtyUnit = qty?.attributes?.unit ?? qty?.unit ?? '';
      return {
        fecha: formatTimestamp(h.timestamp || h.attributes?.timestamp),
        especie: truncate(h.attributes?.name || h.name || '', 50),
        cantidad: qtyValue !== '' ? String(qtyValue) : '—',
        unidad: qtyUnit || '—',
      };
    });
    drawTable(
      doc,
      y,
      [
        { key: 'fecha', label: 'Fecha', width: 28 },
        { key: 'especie', label: 'Cosecha de', width: 84 },
        { key: 'cantidad', label: 'Cantidad', width: 32 },
        { key: 'unidad', label: 'Unidad', width: 30 },
      ],
      harvestRows,
      finca,
    );
  }

  // ─── INSUMOS USADOS ──────────────────────────────────────────────────
  doc.addPage();
  drawPageHeader(doc, finca);
  y = MARGIN + 6;
  y = drawSectionTitle(doc, y, 'Insumos / biopreparados aplicados');

  if (inputs.length === 0) {
    drawParagraph(doc, y, 'No hay aplicaciones de insumos registradas.', { fontSize: 10, color: COLOR_MUTED });
  } else {
    const inputRows = inputs.map((i) => {
      const qty = (Array.isArray(i.attributes?.quantity) && i.attributes.quantity[0]) || i.quantity || {};
      const qtyValue = qty?.attributes?.value?.decimal ?? qty?.value ?? '';
      const qtyUnit = qty?.attributes?.unit ?? qty?.unit ?? '';
      // Material extraído del nombre del log ("Aplicación de <Material>").
      const rawName = i.attributes?.name || i.name || '';
      const material = rawName.replace(/^Aplicación de /, '');
      return {
        fecha: formatTimestamp(i.timestamp || i.attributes?.timestamp),
        insumo: truncate(material, 55),
        dosis: qtyValue !== '' ? `${qtyValue} ${qtyUnit}` : '—',
      };
    });
    drawTable(
      doc,
      y,
      [
        { key: 'fecha', label: 'Fecha', width: 28 },
        { key: 'insumo', label: 'Insumo / biopreparado', width: 100 },
        { key: 'dosis', label: 'Dosis aplicada', width: 46 },
      ],
      inputRows,
      finca,
    );
  }

  // ─── OBSERVACIONES + ALERTAS ─────────────────────────────────────────
  doc.addPage();
  drawPageHeader(doc, finca);
  y = MARGIN + 6;
  y = drawSectionTitle(doc, y, 'Observaciones del agente');

  if (data.observations) {
    y = drawParagraph(doc, y, data.observations, { fontSize: 10, color: COLOR_DARK });
  } else {
    y = drawParagraph(
      doc,
      y,
      'Sin observaciones registradas por el agente Chagra IA en este período. ' +
      'Las observaciones del agente se generan cuando el operador habilita la opción "Análisis automático" ' +
      'en Ajustes.',
      { fontSize: 10, color: COLOR_MUTED },
    );
  }

  // ─── PIE LEGAL (en la última página existente) ───────────────────────
  const disclaimer =
    `Documento generado por Chagra Eco-OS el ${formatHumanDate(new Date())}. ` +
    'Este cuaderno es un reporte de los registros locales del operador y no constituye certificación oficial. ' +
    'Para uso ante entidades reguladoras (ICA, ECOCERT, FLO-CERT, EPSEA, SNIA) ' +
    'verifique la integridad de los datos con su asesor o extensionista.';

  // Lo dibujamos al pie de la última página del cuerpo.
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_MUTED);
  const discLines = doc.splitTextToSize(disclaimer, CONTENT_W);
  const discHeight = discLines.length * estimateLineHeight(8) + 4;
  // Si no entra al pie de página actual, añadimos página dedicada.
  const lastPageNum = doc.getNumberOfPages();
  doc.setPage(lastPageNum);
  if (y + discHeight > PAGE_H - MARGIN - 14) {
    doc.addPage();
    drawPageHeader(doc, finca);
    y = MARGIN + 6;
  } else {
    y += 6;
  }
  doc.text(discLines, MARGIN, y);

  // ─── Renumerar todas las páginas con totales y footer ────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    // Portada (p=1) no lleva footer numerado para mantenerla "limpia".
    if (p > 1) {
      drawPageFooter(doc, p, totalPages);
    }
  }

  // Salida como Blob (NO usar doc.save: ese path requiere DOM y queremos
  // que tests unit puedan llamar generateCuadernoFinca sin tocar document).
  const arrayBuffer = doc.output('arraybuffer');
  return new Blob([arrayBuffer], { type: 'application/pdf' });
};

/**
 * Arma el shape `fincaData` desde los caches reales del dispositivo.
 *
 * @param {object} options
 * @param {object}   options.assetCache - typeof import('../db/assetCache').assetCache
 * @param {object}   options.logCache   - typeof import('../db/logCache').logCache
 * @param {object}   options.finca      - finca activa (de fincaActiveStore)
 * @param {object}   options.operator   - { name, role }
 * @returns {Promise<object>} shape consumido por generateCuadernoFinca
 */
export const buildFincaData = async (options = /** @type {any} */ ({})) => {
  const { assetCache, logCache, finca, operator } = /** @type {any} */ (options);
  const [plants, lands, structures, materials, logs] = await Promise.all([
    assetCache.getByType('plant'),
    assetCache.getByType('land'),
    assetCache.getByType('structure'),
    assetCache.getByType('material'),
    logCache.getAll(),
  ]);

  // Período: desde el log más antiguo hasta hoy.
  let from = null;
  for (const l of logs) {
    const ts = typeof l.timestamp === 'number'
      ? l.timestamp
      : Date.parse(l.attributes?.timestamp || 0) / 1000;
    if (ts && (!from || ts < from)) from = ts;
  }

  return {
    finca: finca || {},
    operatorName: operator?.name || '',
    operatorRole: operator?.role || '',
    plants,
    lands,
    structures,
    materials,
    logs,
    period: from ? { from, to: Math.floor(Date.now() / 1000) } : null,
  };
};

/**
 * Filename canónico para el cuaderno descargado.
 *   cuaderno-chagra-<slug>-<YYYY-MM-DD-HHMM>.pdf
 */
export const buildCuadernoFilename = (finca, date = new Date()) => {
  const slug = (finca?.slug || finca?.nombre || 'finca')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-|-$/g, '');
  return `cuaderno-chagra-${slug || 'finca'}-${formatDateTimeForFile(date)}.pdf`;
};

/**
 * Orquesta build → blob → download. Lanza errores si algo falla, el caller
 * (CuadernoPDFButton) los muestra inline.
 *
 * @returns {Promise<{ filename: string, sizeBytes: number, pageCount: number }>}
 */
export const downloadCuadernoPDF = async (fincaData) => {
  const blob = generateCuadernoFinca(fincaData);
  const filename = buildCuadernoFilename(fincaData?.finca);

  if (typeof document !== 'undefined') {
    const url = URL.createObjectURL(blob);
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }
  }

  return {
    filename,
    sizeBytes: blob.size,
    pageCount: null, // el caller no usa este valor; jspdf no expone el conteo en el blob.
  };
};

export default generateCuadernoFinca;
