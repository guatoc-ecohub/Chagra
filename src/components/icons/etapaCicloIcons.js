/**
 * etapaCicloIcons.js — familia ÚNICA de iconos por etapa de ciclo de vida.
 *
 * Problema que resuelve (feedback del operador 2026-07): cada pantalla
 * inventaba su propio glifo de etapa — GuiaEspecieCards repetía Sprout y
 * CheckCircle para 6 etapas distintas, PhenologyTimeline pintaba un punto de
 * color sin glifo, y el selector de etapa de CicloDetalle era solo texto. A
 * 16–24px (catálogo, cards, timeline) eso obliga a leer el label para saber
 * en qué etapa se está.
 *
 * Este módulo define UN icono lucide por etapa, con métrica consistente
 * (strokeWidth 2, tamaño por prop), resuelto por:
 *   1. `code` — códigos FarmOS/fenología del proyecto (sowing, emergence,
 *      vegetative, flowering, fruiting, harvest_window, closed) + los hitos
 *      de restauración/silvopastoreo (hoyEnFincaService.STAGE_LABELS).
 *   2. `nombre` — matching por keyword del label en español (Germinación,
 *      Floración, Cosecha…) para plantillas con etiquetas propias.
 *   3. Fallback: Sprout (nunca un hueco).
 *
 * Regla de diseño: etapas = iconos de LÍNEA lucide (chrome de UI);
 * especies = emoji (contenido) — ver utils/speciesVisual.js.
 */
import {
  Bean,
  Sprout,
  Leaf,
  Flower2,
  Apple,
  ShoppingBasket,
  Package,
  Recycle,
  TreeDeciduous,
  Wrench,
} from 'lucide-react';

/** Iconos por código de etapa (fenología FarmOS + restauración). */
export const ETAPA_CODE_ICONS = {
  // Fenología de cultivo (STAGE_ORDER de CicloDetalle / phenologyCalculator).
  sowing: Bean,
  emergence: Sprout,
  vegetative: Leaf,
  flowering: Flower2,
  fruiting: Apple,
  harvest_window: ShoppingBasket,
  closed: Recycle,
  // Restauración / silvopastoreo (hoyEnFincaService).
  establecimiento: Bean,
  prendimiento: Sprout,
  mantenimiento: Wrench,
  monitoreo_sucesion: TreeDeciduous,
  cierre: Recycle,
  // Momentos del form de planta (plantMeta.ETAPA_FENOLOGICA_OPTIONS).
  semillero: Bean,
  vegetativo: Leaf,
  floracion: Flower2,
  fructificacion: Apple,
  madurez: ShoppingBasket,
  senescencia: Recycle,
};

/*
 * Matching por keyword del NOMBRE de la etapa (normalizado sin tildes).
 * Orden = prioridad: lo específico primero. Cubre los labels de
 * guias-demo.js (Germinación → Producto), STAGE_LABELS y plantillas
 * fenológicas por especie.
 */
const ETAPA_NOMBRE_ICONS = [
  { kw: ['siembra', 'semilla', 'semillero', 'trasplante'], Icon: Bean },
  { kw: ['germina', 'broto', 'emergencia', 'nacida', 'prendimiento'], Icon: Sprout },
  { kw: ['vegetat', 'crec', 'macollamiento', 'desarrollo'], Icon: Leaf },
  { kw: ['flor'], Icon: Flower2 },
  { kw: ['fruct', 'fruto', 'llenado', 'grano'], Icon: Apple },
  // 'poscosecha' va ANTES que 'cosecha' (substring): Poscosecha → Package.
  { kw: ['producto', 'poscosecha', 'guarda', 'almacen', 'secado'], Icon: Package },
  { kw: ['cosecha', 'madur'], Icon: ShoppingBasket },
  { kw: ['cerrado', 'cierre', 'terminado', 'senescencia', 'acabandose'], Icon: Recycle },
  { kw: ['mantenimiento'], Icon: Wrench },
  { kw: ['sucesion', 'monitoreo'], Icon: TreeDeciduous },
];

const normaliza = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

/**
 * Resuelve el componente lucide de una etapa.
 * @param {{ code?: string, nombre?: string }} etapa
 * @returns {import('lucide-react').LucideIcon} siempre retorna un icono (fallback Sprout).
 */
export function getEtapaIcon({ code, nombre } = {}) {
  const base = normaliza(code).replace(/_confirmed$/, '');
  if (base && ETAPA_CODE_ICONS[base]) return ETAPA_CODE_ICONS[base];

  const n = normaliza(nombre);
  if (n) {
    for (const entry of ETAPA_NOMBRE_ICONS) {
      if (entry.kw.some((k) => n.includes(k))) return entry.Icon;
    }
  }
  return Sprout;
}

