/**
 * useInventarioCompai — LO QUE EL compAI SABE DE ESTA FINCA, en vivo.
 *
 * El puente que faltaba (auditoría 2026-07-26, ítem #38 — "el husmeo del valle
 * habla con la boca vacía"). El motor de comportamiento siempre estuvo hecho
 * para hablar con datos reales, pero los dos call-sites del valle 3D le
 * pasaban `{}`, así que cada comentario caía a la rama genérica *"todavía no
 * me ha contado qué tiene sembrado"* aunque el usuario tuviera sus matas
 * registradas en IndexedDB.
 *
 * Este hook es la capa delgada de React sobre el núcleo portable
 * (`compai/nucleo/datosFinca.js`): lee el store de activos —que ya vive
 * offline-first sobre IndexedDB— y devuelve el inventario en la forma exacta
 * que los comentaristas saben leer.
 *
 * LOCAL-FIRST: cero red. Si el store está vacío (usuario nuevo, todavía sin
 * hidratar), el inventario sale vacío y el personaje dice la verdad. Nunca se
 * rellena con datos de muestra.
 *
 * @module hooks/useInventarioCompai
 */
import { useMemo } from 'react';
import useAssetStore from '../store/useAssetStore';
import useCosechaStore from '../store/useCosechaStore';
import { inventarioCompai, datosDeMundo } from '../compai/nucleo/datosFinca.js';

/**
 * El inventario vivo del compAI. Se recalcula sólo cuando cambian de verdad
 * los activos (el array del store cambia de identidad en hydrate/sync, no en
 * cada frame), así que es barato incluso dentro del valle 3D.
 *
 * @returns {import('../compai/nucleo/datosFinca.js').InventarioCompai}
 */
export function useInventarioCompai() {
  const plants = useAssetStore((s) => s.plants);
  // Los animales de cría todavía no son un `asset_type` propio en el store
  // (las pantallas de animales son contenido, no registro). Cuando lo sean,
  // entran por aquí y `mis_animales` deja de caer a su rama honesta sin tocar
  // ni una línea más. Hoy: lista vacía = el personaje lo dice, no lo inventa.
  const equipment = useAssetStore((s) => s.equipment);
  const resumenCosecha = useCosechaStore((s) => s.summary);

  return useMemo(() => {
    const animales = (equipment || []).filter(
      (a) => a?.attributes?.animal_type || a?.asset_type === 'animal' || a?.type === 'asset--animal',
    );
    // Cosecha: `harvestSummary().byCrop` trae `{ crop, lastMs, … }` por cultivo
    // (cosechaService.js:223). El núcleo se queda con la de `lastMs` mayor —
    // la cosecha MÁS RECIENTE, no la más grande. Si no hay logs, no hay
    // celebración: `cosechaReciente` queda null y el personaje no la inventa.
    const cosechas = Array.isArray(resumenCosecha?.byCrop)
      ? resumenCosecha.byCrop.map((c) => ({ cultivo: c.crop, timestamp: c.lastMs }))
      : [];
    return inventarioCompai({ plants: plants || [], animales, cosechas });
  }, [plants, equipment, resumenCosecha]);
}

/**
 * Atajo para el caso más común: los datos ya traducidos al mundo que se va a
 * comentar. Equivale a `datosDeMundo(mundo, useInventarioCompai())`.
 *
 * @param {string} mundo
 * @param {Object} [extra] — lo que sólo el shell conoce (snapshot de clima…).
 * @returns {Object}
 */
export function useDatosDeMundo(mundo, extra = undefined) {
  const inventario = useInventarioCompai();
  return useMemo(() => datosDeMundo(mundo, inventario, extra || {}), [mundo, inventario, extra]);
}

export default useInventarioCompai;
