/**
 * restauracionPlanPDF — Plan de restauración ecológica en PDF institucional.
 *
 * Diferenciador Pro para gestión de riesgo / restauración (caso Ana, UNGRD
 * Pasto / Galeras): el usuario genera un PDF imprimible del plan de sucesión
 * ecológica (pioneras → intermedias → clímax) con especies NATIVAS por piso
 * térmico, el arreglo recomendado, las guardas anti-mito y, opcionalmente, el
 * contexto de riesgo de incendio. Sirve para informes a la UNGRD, la CAR
 * (Corponariño), planes municipales de gestión del riesgo (Ley 1523/2012) y
 * proyectos de PSA (Decreto 1007/2018).
 *
 * Reutiliza el patrón de `cuadernoPDF.js`: jsPDF, build en memoria → Blob,
 * UI-agnóstico (solo toca `document` en `downloadRestauracionPlanPDF`). Los
 * datos entran ya calculados (`diagnosticarRestauracion()` + opcional
 * `evaluarRiesgoIncendio()`), así los tests unit no tocan red ni DOM.
 *
 * CERO fabricación: el PDF SOLO imprime especies que vienen del diagnóstico
 * (catálogo DR-RESTAURACION-1 por piso térmico). Si no hay datos para el piso,
 * lo dice explícitamente y remite al vivero local / CAR. Las fuentes se citan
 * en el pie. El bloque de riesgo de incendio se marca como ESTIMACIÓN, no
 * alerta oficial.
 */

import { jsPDF } from 'jspdf';

// A4 portrait en mm (jsPDF default unit).
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;

// Paleta — verde Chagra para títulos, gris para secundario (igual que cuadernoPDF).
/** @type {[number, number, number]} */ const COLOR_EMERALD = [16, 122, 87];
/** @type {[number, number, number]} */ const COLOR_SLATE = [71, 85, 105];
/** @type {[number, number, number]} */ const COLOR_MUTED = [148, 163, 184];
/** @type {[number, number, number]} */ const COLOR_DARK = [15, 23, 42];
/** @type {[number, number, number]} */ const COLOR_AMBER = [180, 83, 9];
/** @type {[number, number, number]} */ const COLOR_RED = [153, 27, 27];

// Versión del schema del plan (bump si cambian secciones / orden).
export const RESTAURACION_PDF_VERSION = '1';

const pad = (n) => String(n).padStart(2, '0');

const formatHumanDate = (date = new Date()) => {
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
};

const formatDateTimeForFile = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;

const safeStr = (value, fallback = '—') => {
  if (value == null) return fallback;
  const s = String(value).trim();
  return s.length === 0 ? fallback : s;
};

const estimateLineHeight = (fontSize) => fontSize * 0.42;

const PISO_LABELS = {
  calido_0_1000: 'Cálido (0–1000 msnm)',
  templado_1000_2000: 'Templado (1000–2000 msnm)',
  frio_2000_3000: 'Frío (2000–3000 msnm)',
  paramo_3000: 'Páramo (más de 3000 msnm)',
};

/** @type {{ [key: string]: { label: string, color: [number, number, number] } }} */
const NIVEL_INCENDIO = {
  alto: { label: 'ALTO', color: COLOR_RED },
  medio: { label: 'MEDIO', color: COLOR_AMBER },
  bajo: { label: 'BAJO', color: COLOR_EMERALD },
};

// ─── Renderers (mismos helpers que cuadernoPDF, ajustados al plan) ──────────

const drawPageHeader = (doc, subtitle) => {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(`Plan de restauración ecológica · ${safeStr(subtitle, 'Chagra')}`, MARGIN, 10);
  doc.setDrawColor(...COLOR_MUTED);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, 12, PAGE_W - MARGIN, 12);
};

const drawPageFooter = (doc, pageNum, totalPages) => {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(`Página ${pageNum} de ${totalPages} · Chagra Eco-OS`, PAGE_W / 2, PAGE_H - 8, { align: 'center' });
};

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

/** Salta de página si no queda espacio; devuelve el nuevo cursorY. */
const ensureSpace = (doc, y, needed, subtitle) => {
  if (y + needed > PAGE_H - MARGIN - 12) {
    drawPageFooter(doc, doc.getNumberOfPages(), doc.getNumberOfPages());
    doc.addPage();
    drawPageHeader(doc, subtitle);
    return MARGIN + 6;
  }
  return y;
};

/**
 * Lista de especies de un rol sucesional (pioneras/intermedias/clímax).
 * Cada especie: "Nombre común (Nombre científico) — nota". Las científicas en
 * itálica. Devuelve el cursorY actualizado.
 */
const drawEspeciesRol = (doc, y, titulo, especies, subtitle) => {
  if (!Array.isArray(especies) || especies.length === 0) return y;
  y = ensureSpace(doc, y, 10, subtitle);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_EMERALD);
  doc.text(titulo, MARGIN, y);
  y += 6;
  doc.setFontSize(9.5);
  for (const e of especies) {
    y = ensureSpace(doc, y, 8, subtitle);
    const comun = safeStr(e?.nombre || e?.nombre_comun, '');
    const cient = safeStr(e?.cientifico || e?.nombre_cientifico, '');
    const nota = e?.nota ? ` — ${e.nota}` : '';
    // Nombre común en negrita
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLOR_DARK);
    doc.text(`• ${comun}`, MARGIN + 2, y);
    const comunW = doc.getTextWidth(`• ${comun} `);
    // Científico en itálica + nota normal, con wrap.
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...COLOR_SLATE);
    const resto = cient ? `(${cient})${nota}` : nota;
    const restoLines = doc.splitTextToSize(resto, CONTENT_W - comunW - 4);
    doc.text(restoLines, MARGIN + 2 + comunW, y);
    y += Math.max(1, restoLines.length) * estimateLineHeight(9.5) + 2.5;
  }
  return y + 2;
};

/**
 * Genera el PDF del plan de restauración en memoria → Blob application/pdf.
 *
 * @param {{ diagnostico?: object, finca?: object, operatorName?: string, operatorRole?: string, objetivo?: string, descripcion?: string, riesgoIncendio?: object|null, piso?: string }} planData
 * @returns {Blob} application/pdf
 */
export const generateRestauracionPlanPDF = (planData) => {
  const data = planData || /** @type {{ diagnostico?: object, finca?: object, operatorName?: string, operatorRole?: string, objetivo?: string, descripcion?: string, riesgoIncendio?: object|null, piso?: string }} */({});
  const diag = data.diagnostico || {};
  const finca = data.finca || {};
  const especies = diag.especies || null;
  const roles = diag.roles || null;
  const arreglo = diag.arreglo || null;
  const alertas = Array.isArray(diag.alertas) ? diag.alertas : [];
  const guardas = Array.isArray(diag.guardas) ? diag.guardas : [];
  const riesgo = data.riesgoIncendio || null;
  const subtitle = safeStr(finca.nombre, 'Plan de restauración');

  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });

  // ─── PORTADA ─────────────────────────────────────────────────────────
  doc.setFillColor(...COLOR_EMERALD);
  doc.rect(0, 0, PAGE_W, 72, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(30);
  doc.setTextColor(255, 255, 255);
  doc.text('CHAGRA', MARGIN, 30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.text('Plan de restauración ecológica', MARGIN, 42);
  doc.setFontSize(9);
  doc.text('Documento técnico de apoyo · sucesión con especies nativas', MARGIN, 50);

  let y = 92;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...COLOR_DARK);
  doc.text(safeStr(finca.nombre, 'Predio sin nombre'), MARGIN, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_SLATE);
  if (data.operatorName) { doc.text(`Responsable: ${safeStr(data.operatorName)}`, MARGIN, y); y += 6; }
  if (data.operatorRole) { doc.text(`Rol / entidad: ${safeStr(data.operatorRole)}`, MARGIN, y); y += 6; }

  const locParts = [];
  if (finca.municipio) locParts.push(finca.municipio);
  if (finca.departamento) locParts.push(finca.departamento);
  if (finca.vereda) locParts.push(`vereda ${finca.vereda}`);
  if (finca.altitud) locParts.push(`${finca.altitud} msnm`);
  if (Array.isArray(finca.coords) && finca.coords.length === 2) {
    locParts.push(`(${Number(finca.coords[0]).toFixed(4)}, ${Number(finca.coords[1]).toFixed(4)})`);
  }
  if (locParts.length) { doc.text(`Ubicación: ${locParts.join(' · ')}`, MARGIN, y); y += 6; }

  if (data.objetivo) {
    doc.text(`Objetivo de restauración: ${objetivoLabel(data.objetivo)}`, MARGIN, y);
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
  y += 8;

  if (data.descripcion) {
    drawParagraph(doc, y, `Situación descrita: ${data.descripcion}`, { fontSize: 10, color: COLOR_SLATE });
  }

  // ─── PÁGINA 2: ARREGLO + SUCESIÓN ────────────────────────────────────
  doc.addPage();
  drawPageHeader(doc, subtitle);
  y = MARGIN + 6;
  y = drawSectionTitle(doc, y, 'Arreglo recomendado');

  if (arreglo) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...COLOR_DARK);
    doc.text(safeStr(arreglo.nombre), MARGIN, y);
    y += 6;
    if (arreglo.densidad) y = drawParagraph(doc, y, `Densidad / disposición: ${arreglo.densidad}`, { fontSize: 10, color: COLOR_SLATE, gap: 2 });
    if (arreglo.detalle) y = drawParagraph(doc, y, arreglo.detalle, { fontSize: 10, color: COLOR_SLATE });
  } else {
    y = drawParagraph(doc, y, 'No se determinó un arreglo específico desde la descripción. Consulta el plan de sucesión por piso térmico y el vivero local.', { fontSize: 10, color: COLOR_MUTED });
  }

  y += 2;
  const pisoKey = data.piso || inferPisoFromEspecies(especies, roles);
  y = drawSectionTitle(doc, y, 'Sucesión ecológica por etapas');
  y = drawParagraph(
    doc, y,
    `Estas son las especies NATIVAS recomendadas${pisoKey ? ` para el piso ${PISO_LABELS[pisoKey] || pisoKey}` : ''}. ` +
    'Se siembran en orden sucesional: primero las pioneras (rústicas, de rápido crecimiento), luego las intermedias bajo su sombra, y finalmente las de clímax que estructuran el bosque maduro. NO se mezclan todas de una vez.',
    { fontSize: 9.5, color: COLOR_SLATE },
  );

  if (especies && (especies.pioneras || especies.intermedias || especies.climax)) {
    y = drawEspeciesRol(doc, y, '1. Pioneras (año 1)', especies.pioneras, subtitle);
    y = drawEspeciesRol(doc, y, '2. Intermedias (años 2–5)', especies.intermedias, subtitle);
    y = drawEspeciesRol(doc, y, '3. Clímax (año 5 en adelante)', especies.climax, subtitle);
  } else if (roles) {
    // Fallback: roles trae solo nombres comunes (sin binomio).
    y = drawEspeciesRolNombres(doc, y, '1. Pioneras (año 1)', roles.pioneras, subtitle);
    y = drawEspeciesRolNombres(doc, y, '2. Intermedias (años 2–5)', roles.intermedias, subtitle);
    y = drawEspeciesRolNombres(doc, y, '3. Clímax (año 5 en adelante)', roles.climax, subtitle);
  } else {
    y = drawParagraph(
      doc, y,
      'No hay una lista de especies cargada para este piso térmico todavía. ' +
      'Para no recomendar especies equivocadas, consulta el vivero forestal de tu municipio o tu Corporación Autónoma Regional (CAR): ellos tienen el material nativo apropiado para tu zona.',
      { fontSize: 10, color: COLOR_AMBER },
    );
  }

  // ─── ALERTAS Y GUARDAS ───────────────────────────────────────────────
  if (alertas.length || guardas.length) {
    y = ensureSpace(doc, y, 30, subtitle);
    y += 2;
    y = drawSectionTitle(doc, y, 'Alertas y buenas prácticas');
    for (const a of alertas) {
      y = ensureSpace(doc, y, 14, subtitle);
      y = drawParagraph(doc, y, `⚠ ${a}`, { fontSize: 9.5, color: COLOR_AMBER });
    }
    for (const g of guardas) {
      y = ensureSpace(doc, y, 14, subtitle);
      y = drawParagraph(doc, y, g, { fontSize: 9, color: COLOR_SLATE });
    }
  }

  // ─── RIESGO DE INCENDIO (opcional) ───────────────────────────────────
  if (riesgo && riesgo.nivel) {
    doc.addPage();
    drawPageHeader(doc, subtitle);
    y = MARGIN + 6;
    y = drawSectionTitle(doc, y, 'Contexto de riesgo de incendio');
    const nv = NIVEL_INCENDIO[riesgo.nivel] || NIVEL_INCENDIO.bajo;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...nv.color);
    doc.text(`Nivel estimado: ${nv.label}`, MARGIN, y);
    y += 8;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_MUTED);
    y = drawParagraph(doc, y, 'ESTIMACIÓN estacional (temporada seca + fase El Niño/La Niña). NO es una alerta oficial de incendio.', { fontSize: 8.5, color: COLOR_MUTED });
    for (const f of (riesgo.factores || [])) {
      y = ensureSpace(doc, y, 12, subtitle);
      y = drawParagraph(doc, y, `• ${f}`, { fontSize: 9.5, color: COLOR_DARK, gap: 2 });
    }
    if ((riesgo.recomendaciones || []).length) {
      y += 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...COLOR_EMERALD);
      y = ensureSpace(doc, y, 10, subtitle);
      doc.text('Recomendaciones', MARGIN, y);
      y += 6;
      for (const r of riesgo.recomendaciones) {
        y = ensureSpace(doc, y, 12, subtitle);
        y = drawParagraph(doc, y, `• ${r}`, { fontSize: 9.5, color: COLOR_SLATE, gap: 2 });
      }
    }
    if (riesgo.disclaimer) {
      y += 2;
      y = drawParagraph(doc, y, riesgo.disclaimer, { fontSize: 9, color: COLOR_AMBER });
    }
  }

  // ─── FUENTES + PIE LEGAL ─────────────────────────────────────────────
  y = ensureSpace(doc, y, 40, subtitle);
  y += 4;
  y = drawSectionTitle(doc, y, 'Fuentes');
  const fuentes = [];
  if (diag.fuente) fuentes.push(diag.fuente);
  if (riesgo && Array.isArray(riesgo.fuentes)) fuentes.push(...riesgo.fuentes);
  if (fuentes.length === 0) fuentes.push('Catálogo de restauración Chagra (DR-RESTAURACION-1: IAvH, MinAmbiente, CIPAV).');
  for (const f of fuentes) {
    y = ensureSpace(doc, y, 10, subtitle);
    y = drawParagraph(doc, y, `• ${f}`, { fontSize: 9, color: COLOR_SLATE, gap: 1.5 });
  }

  const disclaimer =
    `Documento generado por Chagra Eco-OS el ${formatHumanDate(new Date())}. ` +
    'Es un documento técnico de APOYO basado en investigación documentada (restauración ecológica nativa); ' +
    'NO reemplaza el concepto de un ingeniero forestal ni la autorización de la autoridad ambiental competente ' +
    '(Corporación Autónoma Regional). Para predios en zona de páramo, ronda hídrica o área protegida, verifica ' +
    'las restricciones de uso (Ley 1930/2018, Ley 1523/2012) antes de intervenir.';
  y = ensureSpace(doc, y, 24, subtitle);
  y += 4;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_MUTED);
  const discLines = doc.splitTextToSize(disclaimer, CONTENT_W);
  doc.text(discLines, MARGIN, y);

  // ─── Footer + paginación ─────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    if (p > 1) drawPageFooter(doc, p, totalPages);
  }

  const arrayBuffer = doc.output('arraybuffer');
  return new Blob([arrayBuffer], { type: 'application/pdf' });
};

/** Etiqueta humana del objetivo de restauración. */
function objetivoLabel(obj) {
  const m = {
    bosque: 'Restauración de bosque',
    ribera: 'Restauración de ribera / ronda hídrica',
    cortafuegos: 'Barrera cortafuegos',
    post_incendio: 'Recuperación post-incendio',
    paramo: 'Restauración de páramo',
    restauracion_bosque: 'Restauración de bosque',
    restauracion_ribera: 'Restauración de ribera',
  };
  return m[obj] || safeStr(obj).replace(/_/g, ' ');
}

/** Rol con solo nombres comunes (fallback cuando no hay binomios). */
function drawEspeciesRolNombres(doc, y, titulo, nombres, subtitle) {
  if (!Array.isArray(nombres) || nombres.length === 0) return y;
  y = ensureSpace(doc, y, 10, subtitle);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_EMERALD);
  doc.text(titulo, MARGIN, y);
  y += 6;
  y = drawParagraph(doc, y, nombres.map((n) => safeStr(n)).join(', '), { fontSize: 9.5, color: COLOR_DARK });
  return y + 2;
}

/** Infiere la clave de piso desde la presencia de listas (best-effort). */
function inferPisoFromEspecies(_especies, _roles) {
  return null; // el caller pasa data.piso explícito; este fallback evita adivinar mal.
}

/** Nombre de archivo canónico para el plan descargado. */
export const buildRestauracionPlanFilename = (finca, date = new Date()) => {
  const slug = (finca?.slug || finca?.nombre || 'predio')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-|-$/g, '');
  return `plan-restauracion-chagra-${slug || 'predio'}-${formatDateTimeForFile(date)}.pdf`;
};

/**
 * Orquesta build → blob → download. Lanza errores; el caller los muestra inline.
 *
 * @param {object} planData ver generateRestauracionPlanPDF.
 * @returns {Promise<{ filename: string, sizeBytes: number }>}
 */
export const downloadRestauracionPlanPDF = async (planData) => {
  const blob = generateRestauracionPlanPDF(planData);
  const filename = buildRestauracionPlanFilename(planData?.finca);

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

  return { filename, sizeBytes: blob.size };
};

export default generateRestauracionPlanPDF;
