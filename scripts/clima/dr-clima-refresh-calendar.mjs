#!/usr/bin/env node

/**
 * Calendar gate for the user-level dr-clima-refresh service.
 *
 * The upstream sources do not publish SIPSA on Colombian public holidays.
 * Keeping this check here prevents the refresh from treating the previous
 * business day's bulletin as a report for the holiday. systemd's
 * Persistent=true remains responsible for recovering a missed run.
 */
import { spawnSync } from 'node:child_process';
import os from 'node:os';

const TIME_ZONE = 'America/Bogota';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function addDays(date, days) {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

function nextMonday(date) {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  return addDays(date, weekday === 0 ? 1 : weekday === 1 ? 0 : 8 - weekday);
}

function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return isoDate(year, month, day);
}

/** Return the Colombian national holidays as an ISO date -> label map. */
export function colombiaHolidays(year) {
  const holidays = new Map([
    [isoDate(year, 1, 1), 'Año Nuevo'],
    [isoDate(year, 5, 1), 'Día del Trabajo'],
    [isoDate(year, 7, 20), 'Independencia'],
    [isoDate(year, 8, 7), 'Batalla de Boyacá'],
    [isoDate(year, 12, 8), 'Inmaculada Concepción'],
    [isoDate(year, 12, 25), 'Navidad'],
  ]);

  const moved = [
    [1, 6, 'Reyes Magos'],
    [3, 19, 'San José'],
    [6, 29, 'San Pedro y San Pablo'],
    [8, 15, 'Asunción de la Virgen'],
    [10, 12, 'Día de la Raza'],
    [11, 1, 'Todos los Santos'],
    [11, 11, 'Independencia de Cartagena'],
  ];
  for (const [month, day, label] of moved) {
    holidays.set(nextMonday(isoDate(year, month, day)), label);
  }

  const easter = easterSunday(year);
  holidays.set(addDays(easter, -3), 'Jueves Santo');
  holidays.set(addDays(easter, -2), 'Viernes Santo');
  for (const [offset, label] of [
    [39, 'Ascensión del Señor'],
    [60, 'Corpus Christi'],
    [68, 'Sagrado Corazón de Jesús'],
  ]) {
    holidays.set(nextMonday(addDays(easter, offset)), label);
  }

  return holidays;
}

export function bogotaDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return isoDate(values.year, values.month, values.day);
}

export function holidayFor(date) {
  if (!ISO_DATE.test(date)) throw new Error(`Fecha inválida: ${date}`);
  const year = Number(date.slice(0, 4));
  return colombiaHolidays(year).get(date) ?? null;
}

function readDateArg() {
  const value = process.argv.find((arg) => arg.startsWith('--date='));
  return value ? value.slice('--date='.length) : bogotaDate();
}

const date = readDateArg();
const holiday = holidayFor(date);

if (process.argv.includes('--dry-run')) {
  console.log(holiday ? `${date}: festivo colombiano (${holiday}), se omite` : `${date}: día hábil, se ejecuta`);
  process.exit(0);
}

if (holiday) {
  console.log(`[dr-clima-refresh] ${date} es festivo colombiano (${holiday}); no se extrae ni se actualiza -latest`);
  process.exit(0);
}

const script = process.env.DR_CLIMA_REFRESH_SCRIPT
  ?? `${os.homedir()}/.local/bin/dr-clima-refresh.sh`;
const result = spawnSync(script, { stdio: 'inherit', env: process.env });
if (result.error) {
  console.error(`[dr-clima-refresh] no se pudo ejecutar ${script}: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
