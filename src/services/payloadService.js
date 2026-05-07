import { sendToFarmOS } from './apiService';
import { syncManager } from './syncManager';
import { generatePlanForPlant } from './planGeneratorService';

const isUUID = (uuid) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);

const resolveEndpoint = (type) =>
  type === 'plant_asset' ? '/api/asset/plant' :
  type === 'input' ? '/api/log/input' :
  type === 'harvest' ? '/api/log/harvest' :
  type === 'observation' ? '/api/log/observation' :
  type === 'task' ? '/api/log/task' :
  '/api/log/seeding';

export const savePayload = async (type, payload) => {
  console.log(`Payload Chagra (${type}):`, JSON.stringify(payload, null, 2));
  const endpoint = resolveEndpoint(type);
  if (navigator.onLine) {
    try {
      const planCandidates = [];
      // Fase 1.5: Resolver entidades anidadas y limpiar mock IDs.
      //
      // Bug fix v0.6.8: antes, al procesar un item inline se filtraban sus
      // relationships descartando cualquier sub-item sin id UUID. Eso hacia
      // que un inline anidado (ej. taxonomy_term--plant_type dentro de un
      // asset--plant inline) se perdiera → POST /api/asset/plant saltaba
      // sin plant_type → 422 "plant_type: Este valor no puede ser nulo".
      //
      // Ahora resolvemos recursivamente: si una sub-relationship contiene
      // items con attributes (sin id), se POSTean primero al endpoint de
      // su tipo, se captura el UUID retornado, y se usa esa ref resuelta
      // en el payload del item padre. Items con id UUID valido pasan
      // directo; items sin id ni attributes se descartan.
      if (payload.data.relationships) {
        const resolveInline = async (d) => {
          if (d.id && isUUID(d.id)) return d;
          if (d.attributes) {
            const subParts = d.type.split('--');
            const subEndpoint = `/api/${subParts[0]}/${subParts[1]}`;
            const subPayload = { data: { type: d.type, attributes: d.attributes } };
            const subResult = await sendToFarmOS(subEndpoint, subPayload);
            return { type: d.type, id: subResult.data.id };
          }
          return null;
        };

        const resolveRels = async (rels) => {
          const out = {};
          for (const [rk, rv] of Object.entries(rels || {})) {
            if (!rv?.data) continue;
            const isArray = Array.isArray(rv.data);
            const subItems = isArray ? rv.data : [rv.data];
            const resolved = (await Promise.all(subItems.map(resolveInline))).filter(Boolean);
            if (resolved.length > 0) {
              out[rk] = { data: isArray ? resolved : resolved[0] };
            }
          }
          return out;
        };

        for (const [relName, relData] of Object.entries(payload.data.relationships)) {
          if (!relData.data) continue;

          const processItem = async (item) => {
            if (!item.id && item.attributes) {
              const parts = item.type.split('--');
              const inlineEndpoint = `/api/${parts[0]}/${parts[1]}`;

              // Resolve recursive: inlines anidados dentro de este item.
              const resolvedRels = item.relationships
                ? await resolveRels(item.relationships)
                : {};

              const inlinePayload = {
                data: {
                  type: item.type,
                  attributes: item.attributes,
                  ...(Object.keys(resolvedRels).length > 0 ? { relationships: resolvedRels } : {})
                }
              };

              const result = await sendToFarmOS(inlineEndpoint, inlinePayload);

              if (type === 'seeding' && item.type === 'asset--plant') {
                const speciesSlug = item._speciesSlug || null;
                const timestampSec = Number(payload?.data?.attributes?.timestamp);
                const plantingDate = Number.isFinite(timestampSec)
                  ? new Date(timestampSec * 1000).toISOString()
                  : new Date().toISOString();
                planCandidates.push({
                  assetId: result?.data?.id,
                  speciesSlug,
                  plantingDate,
                  plantName: item?.attributes?.name || 'planta',
                });
              }

              return { type: item.type, id: result.data.id };
            }
            return item;
          };

          let items = Array.isArray(relData.data) ? relData.data : [relData.data];
          items = await Promise.all(items.map(processItem));
          items = items.filter(d => d.attributes || (d.id && isUUID(d.id)));

          if (items.length === 0) {
            delete payload.data.relationships[relName];
          } else {
            payload.data.relationships[relName].data = Array.isArray(relData.data) ? items : items[0];
          }
        }
      }

      if (payload._multipartFile) delete payload._multipartFile;
      if (payload.data.attributes) {
        Object.keys(payload.data.attributes).forEach(key => {
          if (key.startsWith('_')) delete payload.data.attributes[key];
        });
      }

      const result = await sendToFarmOS(endpoint, payload);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('farmosLog', { detail: payload.data.attributes.name }));
        // Bug fix v0.6.5: el path online-directo tambien debe emitir
        // syncCompleted para que useAssetStore refresque los assets
        // relacionados (ej. la planta inline creada durante un seeding).
        // Sin esto, voz crea la planta en FarmOS pero el store local
        // no se entera hasta un refresh manual.
        const detail = { type, id: result?.data?.id };

        if (type === 'seeding' && planCandidates.length > 0) {
          const candidate = planCandidates[0];
          detail.plantId = candidate.assetId;

          if (candidate.assetId && candidate.speciesSlug) {
            generatePlanForPlant({
              assetId: candidate.assetId,
              speciesSlug: candidate.speciesSlug,
              plantingDate: candidate.plantingDate,
            }).then((plan) => {
              if (plan?.steps?.length > 0) {
                window.dispatchEvent(new CustomEvent('syncCompleted', {
                  detail: {
                    ...detail,
                    planGenerated: {
                      plantId: candidate.assetId,
                      plantName: candidate.plantName,
                      steps: plan.steps.length,
                    },
                  },
                }));
              } else {
                window.dispatchEvent(new CustomEvent('syncCompleted', { detail }));
              }
            }).catch((err) => {
              console.warn('[payloadService] No se pudo generar plan post-seeding:', err);
              window.dispatchEvent(new CustomEvent('syncCompleted', { detail }));
            });
            return { success: true, message: 'Guardado y sincronizado con servidor', data: result };
          }
        }

        window.dispatchEvent(new CustomEvent('syncCompleted', { detail }));
      }
      return { success: true, message: 'Guardado y sincronizado con servidor', data: result };
    } catch (error) {
      // Imprime el body del error (ya capturado como error.detail en
      // apiService) de forma legible. Para 422 de FarmOS, el body trae un
      // JSON:API con `errors[].detail` que indica exactamente que campo o
      // regla fallo — imprescindible para diagnosticar inline POSTs que
      // revientan con validaciones lejanas al codigo del cliente.
      console.warn('[payloadService] API Error, falling back to offline:', error.message);
      if (error.detail) {
        try {
          const body = JSON.parse(error.detail);
          console.warn('[payloadService] Error body (parsed):', body);
          if (Array.isArray(body.errors)) {
            body.errors.forEach((e, i) =>
              console.warn(`  [${i}] ${e.title || 'Error'}: ${e.detail || '(sin detalle)'}${e.source?.pointer ? ` @ ${e.source.pointer}` : ''}`),
            );
          }
        } catch {
          console.warn('[payloadService] Error body (raw):', error.detail.slice(0, 500));
        }
      }
      await syncManager.saveTransaction({ type: type.replace("plant_asset", "planting"), payload: { ...payload, endpoint } });
      return { success: false, message: `Guardado local. Pendiente de sincronización (${error.message})` };
    }
  } else {
    await syncManager.saveTransaction({ type: type.replace("plant_asset", "planting"), payload: { ...payload, endpoint } });
    return { success: false, message: 'Sin conexión. Guardado localmente. Pendiente sincronización' };
  }
};

/**
 * updatePayload — PATCH a una entidad existente. Necesario para edición de
 * tareas pendientes (Lili #106). Misma resolución de endpoint + manejo
 * online/offline que savePayload, pero PATCH en lugar de POST + endpoint
 * incluye el ID del recurso target.
 *
 * Scope justificado para CONTRIBUTING.md regla #1: feature edit task del
 * field test Lili requiere endpoint PATCH explícito que no existía. NO
 * modifica savePayload existente.
 *
 * @param {string} type - mismo enum que savePayload (task, observation, etc.)
 * @param {string} logId - UUID del recurso a actualizar
 * @param {object} payload - { data: { type, id, attributes, relationships? } }
 */
export const updatePayload = async (type, logId, payload) => {
  console.log(`PATCH Chagra (${type} #${logId}):`, JSON.stringify(payload, null, 2));
  const endpoint = `${resolveEndpoint(type)}/${logId}`;
  if (navigator.onLine) {
    try {
      const result = await sendToFarmOS(endpoint, payload, 'PATCH');
      return { success: true, message: 'Actualizado en servidor', data: result };
    } catch (error) {
      console.warn(`[payloadService] PATCH error (${type} #${logId}):`, error.message);
      await syncManager.saveTransaction({
        type: `${type}_update`,
        payload: { ...payload, endpoint, method: 'PATCH' },
      });
      return { success: false, message: `Cambios guardados local. Pendiente sync (${error.message})` };
    }
  } else {
    await syncManager.saveTransaction({
      type: `${type}_update`,
      payload: { ...payload, endpoint, method: 'PATCH' },
    });
    return { success: false, message: 'Sin conexión. Cambios guardados localmente.' };
  }
};
