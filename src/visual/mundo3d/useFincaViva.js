/*
 * useFincaViva — EL ESPEJO VIVO del dato real, cosido al mundo 3D (auditoría §5b).
 *
 * Este hook NO reinventa nada: CONSUME los servicios anti-fabricación que ya
 * cablean la finca al Espíritu-guardián (vitalidadEspirituService /
 * fincaEvolutionService y sus fuentes) y arma el descriptor `estadoFinca` con la
 * FORMA EXACTA que la escena 3D espera —la que declara reaccionFinca.js (la capa
 * de reacción de Angelita) y consume CorralVivo.jsx (el hato):
 *
 *   estadoFinca = {
 *     clima,            // 'dorada'|'soleado'|'niebla'|'lluvia'|'noche'
 *     enso,             // 'nino' | 'nina' | 'neutro'  (fase ENSO efectiva)
 *     cosechaReciente,  // null | { cultivo, mundoId }
 *     saludFinca,       // { matasVivas, matasTotal, agua? }  (conteos REALES)
 *     animales,         // [{ especie, nombre, raza, tamano, estado }]
 *   }
 *
 * CONTRATO ANTI-FABRICACIÓN (el mismo de vitalidadEspirituService): si un dato
 * no tiene fuente real, va "en camino", NO se inventa un número:
 *   · saludFinca solo se emite cuando la escena de finca NO está vacía; si aún
 *     no cargan los procesos (processes === null) o la finca está vacía, se OMITE
 *     → reaccionFinca cae a su neutro sereno (nunca fingimos salud ni desastre).
 *   · cosechaReciente es null hasta que el store de cosecha esté cargado y haya
 *     una cosecha DENTRO de la ventana reciente (si no, no hay banquete).
 *   · agua NO tiene sensor de humedad de suelo: se deriva un proxy HONESTO de la
 *     lluvia real de Open-Meteo (documentado abajo) o se omite (neutro).
 *   · animales NO tiene inventario de hato real (no existe asset animal) → []
 *     ("dato en camino"); el corral conserva su hato de muestra, no fabricamos.
 *
 * Offline-first y three-free (vive en el bundle base del framework, junto al
 * host <Mundo>): lee caches SÍNCRONOS + se suscribe al evento de clima, como el
 * molde de convención useClimaAtmosphere.js. Español de Colombia.
 *
 * @module visual/mundo3d/useFincaViva
 */
import { useEffect, useMemo, useState } from 'react';
import useAssetStore from '../../store/useAssetStore.js';
import useCosechaStore from '../../store/useCosechaStore.js';
import { listFarmProcesses } from '../../db/farmProcessCache.js';
import { buildFincaScene } from '../../services/fincaSceneService.js';
import { deriveAtmosphere } from '../../services/atmosphereService.js';
import { getEnsoPhase } from '../../services/ensoService.js';
import {
  getCachedClimaSnapshot,
  resolveClimaLocation,
  CLIMA_UPDATED_EVENT,
} from '../../services/climaService.js';
import { getProfile } from '../../services/userProfileService.js';
import { normalizarPisoUsuario } from './pisosTermicos.js';

/** Re-evalúa la atmósfera cada 10 min (mismo ritmo que useClimaAtmosphere). */
const REEVAL_MS = 10 * 60 * 1000;
/** Ventana de "cosecha reciente": pasado esto, ya no es un banquete de hoy. */
const COSECHA_RECIENTE_DIAS = 14;

/* ── mapeos meteo/ENSO → vocabulario del mundo 3D ──────────────────────────── */

/**
 * Condición meteo real (deriveCondicion) + luz del día real (deriveLuz, por
 * efemérides de la vereda) → el clima de ESCENA (valleData.CLIMAS). No existe un
 * "nublado" en ese vocabulario: el día cubierto se lee como 'soleado' (día), y la
 * hora dorada (amanecer/atardecer) como 'dorada'. Prioridad: lluvia > noche >
 * niebla > dorada > soleado (mojarse manda; de noche, descansa).
 *
 * @param {string|null} luz  'amanecer'|'dia'|'atardecer'|'noche'|null
 * @param {string|null} condicion  'despejado'|'nublado'|'lluvia'|'niebla'|null
 * @returns {'dorada'|'soleado'|'niebla'|'lluvia'|'noche'}
 */
export function mapearClima(luz, condicion) {
  if (condicion === 'lluvia') return 'lluvia';
  if (luz === 'noche') return 'noche';
  if (condicion === 'niebla') return 'niebla';
  if (luz === 'amanecer' || luz === 'atardecer') return 'dorada';
  return 'soleado';
}

/**
 * Fase ENSO del servicio ('neutral'|'el_nino'|'la_nina') → el slug corto que
 * reaccionFinca espera ('nino'|'nina'|'neutro').
 *
 * @param {string|null} fase
 * @returns {'nino'|'nina'|'neutro'}
 */
export function mapearEnso(fase) {
  if (fase === 'el_nino') return 'nino';
  if (fase === 'la_nina') return 'nina';
  return 'neutro';
}

/** 'YYYY-MM-DD' local (mismo criterio que atmosphereService/ejeClima). */
function isoDiaLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * `agua` (0..1) para saludFinca. NO hay sensor de humedad de suelo en el repo:
 * derivamos un PROXY honesto de la LLUVIA REAL de hoy (Open-Meteo, la misma
 * señal que pinta ejeClima). Base 0.5 (neutro: SIN sed falsa un día seco suelto)
 * subiendo con la lluvia hasta ~0.95 con un aguacero franco (25 mm). La sed real
 * llega por El Niño + clima seco en reaccionFinca, no por este número. Sin
 * snapshot de clima → null (reaccionFinca usa su neutro 0.5).
 *
 * @param {object|null} snapshot  getCachedClimaSnapshot()
 * @param {Date} now
 * @returns {number|null}
 */
export function aguaDeLluvia(snapshot, now = new Date()) {
  const om = snapshot?.openmeteo;
  if (!om?.available || !Array.isArray(om.forecast_7d)) return null;
  const hoy = isoDiaLocal(now);
  const dia = om.forecast_7d.find((d) => d?.date === hoy) || om.forecast_7d[0];
  const precip = Number(dia?.precip_mm);
  if (!Number.isFinite(precip)) return null;
  return Math.max(0, Math.min(1, 0.5 + (Math.min(precip, 25) / 25) * 0.45));
}

/** Deriva { clima, enso, agua } de la señal de clima/ENSO cacheada (síncrona). */
function derivarAtmosfera(now = new Date()) {
  const location = resolveClimaLocation();
  const snapshot = getCachedClimaSnapshot();
  const { condicion, luz } = deriveAtmosphere({ snapshot, now, location });
  return {
    clima: mapearClima(luz, condicion),
    enso: mapearEnso(getEnsoPhase()),
    agua: aguaDeLluvia(snapshot, now),
  };
}

/**
 * cosechaReciente: el cultivo cosechado MÁS reciente si cae dentro de la ventana
 * (COSECHA_RECIENTE_DIAS). summary frío (null) o cosecha vieja → null (pendiente,
 * no inventamos un banquete). mundoId queda null: no existe mapeo cultivo→mundo
 * en el repo y reaccionFinca solo lee `.cultivo`.
 *
 * @param {object|null} summary  useCosechaStore.summary (cosechaService.harvestSummary)
 * @param {Date} now
 * @returns {null | { cultivo: string, mundoId: null }}
 */
export function cosechaRecienteDe(summary, now = new Date()) {
  const byCrop = summary?.byCrop;
  if (!Array.isArray(byCrop) || byCrop.length === 0) return null;
  const ultimaMs = summary?.dateRange?.lastMs;
  if (!Number.isFinite(ultimaMs)) return null;
  const limite = now.getTime() - COSECHA_RECIENTE_DIAS * 24 * 60 * 60 * 1000;
  if (ultimaMs < limite) return null;
  const reciente = byCrop.reduce(
    (mejor, c) => (c?.lastMs != null && (mejor == null || c.lastMs > mejor.lastMs) ? c : mejor),
    null,
  );
  if (!reciente?.crop) return null;
  return { cultivo: reciente.crop, mundoId: null };
}

/** Piso confirmado del perfil, o derivado de la altitud real de la finca. */
export function pisoTermicoDePerfil(profile) {
  const declarado = normalizarPisoUsuario(profile?.piso_termico);
  if (declarado) return declarado;
  return normalizarPisoUsuario(profile?.finca_altitud ?? profile?.altitud);
}

/**
 * Arma el `estadoFinca` completo desde las piezas ya cargadas. Puro: la vista
 * (useFincaViva) inyecta procesos/plantas/cosecha/atmósfera ya resueltos.
 */
function armarEstadoFinca({ processes, plants, summary, atmosfera, pisoTermico, now = new Date() }) {
  const { clima, enso, agua } = atmosfera;

  // saludFinca: conteos REALES de matas (buildFincaScene, la misma fuente que el
  // panel de vitalidad). Pendiente hasta que carguen los procesos, y OMITIDA si
  // la finca está vacía → reaccionFinca cae a su neutro (no fingimos salud).
  let saludFinca;
  if (Array.isArray(processes)) {
    const scene = buildFincaScene({ processes, plantAssetsCount: plants?.length || 0 });
    if (!scene.vacia) {
      saludFinca = {
        matasVivas: scene.cultivosActivos,
        matasTotal: scene.totalCultivos,
        ...(agua != null ? { agua } : {}),
      };
    }
  }

  return {
    clima,
    enso,
    pisoTermico,
    cosechaReciente: cosechaRecienteDe(summary, now),
    saludFinca,
    // Sin inventario de hato real (no hay asset animal): [] = "dato en camino".
    // El corral conserva su hato de muestra; no fabricamos animales.
    animales: [],
  };
}

/**
 * useFincaViva — devuelve el `estadoFinca` REAL, vivo y reactivo, para pasarlo a
 * <Mundo estadoFinca={...}> (que lo cose a la reacción de Angelita y, cuando haya
 * fuente, al corral). Se re-arma cuando cambian los datos de finca (plantas /
 * cosecha), el clima (evento CLIMA_UPDATED) o el paso del sol (intervalo).
 *
 * @returns {{clima:string, enso:string, cosechaReciente:(null|object), saludFinca:(object|undefined), animales:Array}}
 */
export function useFincaViva() {
  // Procesos reales (IndexedDB, offline-first). null = aún cargando (pendiente).
  const [processes, setProcesses] = useState(null);
  // Atmósfera derivada (clima/enso/agua); se refresca por evento + intervalo.
  const [atmosfera, setAtmosfera] = useState(() => derivarAtmosfera());

  // Reactivos de los stores globales (re-render cuando cambian, para que la
  // finca 3D siga la realidad sin polling).
  const plants = useAssetStore((s) => s.plants);
  const summary = useCosechaStore((s) => s.summary);
  const cosechaCargando = useCosechaStore((s) => s.isLoading);
  let profile = null;
  try { profile = getProfile(); } catch (_) { profile = null; }
  const pisoTermico = pisoTermicoDePerfil(profile);

  // Cargar los procesos una vez (y limpiar si el hook se desmonta antes).
  useEffect(() => {
    let vivo = true;
    listFarmProcesses()
      .then((p) => { if (vivo) setProcesses(Array.isArray(p) ? p : []); })
      .catch(() => { if (vivo) setProcesses([]); });
    return () => { vivo = false; };
  }, []);

  // Calentar el store de cosecha si está frío (idempotente: el guard isLoading
  // evita cargas duplicadas). Así "cosechaReciente" puede poblarse sin depender
  // de que otra pantalla lo haya cargado antes.
  useEffect(() => {
    if (summary == null && !cosechaCargando) {
      useCosechaStore.getState().loadHarvests();
    }
  }, [summary, cosechaCargando]);

  // Seguir el clima real (evento) y el paso del sol (intervalo), como el molde
  // useClimaAtmosphere: cero fetch propio, solo lee la señal ya cacheada.
  useEffect(() => {
    const refrescar = () => setAtmosfera(derivarAtmosfera());
    refrescar();
    window.addEventListener(CLIMA_UPDATED_EVENT, refrescar);
    const id = setInterval(refrescar, REEVAL_MS);
    return () => {
      window.removeEventListener(CLIMA_UPDATED_EVENT, refrescar);
      clearInterval(id);
    };
  }, []);

  // Identidad estable mientras las piezas no cambian: reaccionFinca (memoizado
  // en la escena por identidad de estadoFinca) no recalcula por render.
  return useMemo(
    () => armarEstadoFinca({ processes, plants, summary, atmosfera, pisoTermico }),
    [processes, plants, summary, atmosfera, pisoTermico],
  );
}

export default useFincaViva;
