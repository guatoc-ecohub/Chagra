/**
 * colombiaDate.js — Utilidades de fecha y hora en zona horaria Colombia (UTC-5).
 *
 * Tarea 82: formatea fechas en zona horaria Bogota, obtiene el mes actual
 * en Colombia, y expone el calendario de siembra por zona biocultural usando
 * el CALENDARIO_SIEMBRA definido en notificationsService.
 *
 * Colombia no usa horario de verano. UTC-5 es fijo todo el ano.
 * Offset en ms: -5 * 60 * 60 * 1000 = -18_000_000.
 */
import { resolveCalendarMonth } from '../services/notificationsService';

const COLOMBIA_OFFSET_MS = -5 * 60 * 60 * 1000; // UTC-5 fijo, sin DST

/**
 * Convierte una fecha a la zona horaria de Colombia (UTC-5).
 * Retorna un objeto Date cuyos getUTC*() reflejan la hora local colombiana.
 */
export function toColombiaDate(date) {
  if (date === null || date === undefined) {
    return new Date(Date.now() + COLOMBIA_OFFSET_MS);
  }
  const d = new Date(date);
  if (isNaN(d.getTime())) return new Date(NaN);
  return new Date(d.getTime() + COLOMBIA_OFFSET_MS);
}

/**
 * Formatea una fecha en zona horaria Colombia segun un formato especificado.
 *
 * Formatos:
 *   - 'iso-date':        "YYYY-MM-DD"
 *   - 'iso-datetime':    "YYYY-MM-DD HH:mm"
 *   - 'short':           "DD/MM/YYYY, HH:mm"
 *   - 'month-name':      nombre del mes en es-CO
 *   - 'month-number':    "1" a "12"
 *   - 'day-month':       "15 de junio"
 *   - 'human':           "lunes, 15 de junio de 2026"
 */
export function formatColombiaDate(date, format = 'iso-date') {
  const d = toColombiaDate(date);
  if (isNaN(d.getTime())) return '';

  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  const h = d.getUTCHours();
  const min = d.getUTCMinutes();
  const pad = (n) => String(n).padStart(2, '0');

  const MESES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  const DIAS = [
    'domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado',
  ];

  switch (format) {
    case 'iso-date':
      return `${y}-${pad(m + 1)}-${pad(day)}`;
    case 'iso-datetime':
      return `${y}-${pad(m + 1)}-${pad(day)} ${pad(h)}:${pad(min)}`;
    case 'short':
      return `${pad(day)}/${pad(m + 1)}/${String(y).slice(-2)}, ${pad(h)}:${pad(min)}`;
    case 'month-name':
      return MESES[m];
    case 'month-number':
      return String(m + 1);
    case 'day-month':
      return `${day} de ${MESES[m]}`;
    case 'human': {
      const d2 = new Date(date || Date.now());
      const diaSemana = DIAS[d2.getDay()];
      return `${diaSemana}, ${day} de ${MESES[m]} de ${y}`;
    }
    default:
      return `${y}-${pad(m + 1)}-${pad(day)}`;
  }
}

/**
 * Retorna el numero de mes actual en zona horaria Colombia (1-12).
 */
export function getColombiaMonth() {
  const d = toColombiaDate();
  return d.getUTCMonth() + 1;
}

/**
 * Obtiene el calendario de siembra para una zona biocultural.
 */
export function getSowingCalendarMonth(bioculturalZone) {
  if (!bioculturalZone) return null;
  return resolveCalendarMonth(bioculturalZone);
}
