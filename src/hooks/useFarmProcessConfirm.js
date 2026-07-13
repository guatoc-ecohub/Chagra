/**
 * useFarmProcessConfirm — hook de integración para Task 19.
 *
 * Conecta FarmProcessConfirmCard.onConfirm → createFarmProcess (escritura
 * atómica local). Sigue ADR-050 contrato conversacional de escritura.
 *
 * Estados:
 *   - idle: reposo, no ha intentado guardar
 *   - saving: ejecutando escritura
 *   - recorded_local_pending_sync: éxito local (sin sync remoto aún)
 *   - failed: error de persistencia
 */
import { useState, useCallback } from 'react';
import { createFarmProcess } from '../services/farmEventService';
// recordFarmEvent está disponible para eventos posteriores (ej. observations,
// harvests) cuando se necesiten en el mismo ciclo.
import { newUlid } from '../utils/id';

export function useFarmProcessConfirm() {
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);

  const confirm = useCallback(async (draft) => {
    setStatus('saving');
    try {
      const now = Date.now();
      const processId = newUlid();

      // Determina status y current_stage según el tipo de proceso
      const processType = draft.process_type || 'sowing';
      const isHarvest = processType === 'harvest';
      const status = isHarvest ? 'completed' : 'active';
      const currentStage = (() => {
        if (isHarvest) return 'closed';
        if (processType === 'post_harvest') return 'post_harvest';
        if (processType === 'pest_management') return 'pest_management';
        return 'sowing_confirmed';
      })();

      // Build FarmProcess from edited draft
      const process = {
        process_id: processId,
        type: 'farm_process',
        attributes: {
          process_type: processType,
          subject_kind: draft.subject_kind || 'individual',
          subject_slug: draft.subject_slug || '',
          subject_label: draft.subject_label,
          variety: draft.variety || null,
          quantity: draft.quantity,
          unit: draft.unit || 'plantas',
          location_land_asset_id: draft.location_land_asset_id,
          status,
          current_stage: currentStage,
          created_at: draft.suggested_date || now,
          updated_at: now,
        },
      };

      const outcome = await createFarmProcess(/** @type {import('../types/farmProcess').FarmProcess} */ (/** @type {any} */ (process)));
      setResult(outcome);
      setStatus('recorded_local_pending_sync');
      return outcome;
    } catch (err) {
      setStatus('failed');
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
  }, []);

  return { status, result, confirm, reset };
}
