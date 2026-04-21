import { sendToFarmOS } from './apiService';
import { syncManager } from './syncManager';

const isUUID = (uuid) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);

const resolveEndpoint = (type) =>
  type === 'plant_asset' ? '/api/asset/plant' :
  type === 'input' ? '/api/log/input' :
  type === 'harvest' ? '/api/log/harvest' :
  '/api/log/seeding';

export const savePayload = async (type, payload) => {
  console.log(`Payload Chagra (${type}):`, JSON.stringify(payload, null, 2));
  const endpoint = resolveEndpoint(type);
  if (navigator.onLine) {
    try {
      // Fase 1.5: Resolver entidades anidadas y limpiar mock IDs
      if (payload.data.relationships) {
        for (const [relName, relData] of Object.entries(payload.data.relationships)) {
          if (!relData.data) continue;

          const processItem = async (item) => {
            if (!item.id && item.attributes) {
              const parts = item.type.split('--');
              const inlineEndpoint = `/api/${parts[0]}/${parts[1]}`;

              const safeRels = {};
              if (item.relationships) {
                Object.entries(item.relationships).forEach(([rk, rv]) => {
                  if (!rv.data) return;
                  const subItems = Array.isArray(rv.data) ? rv.data : [rv.data];
                  const filtered = subItems.filter(d => d.id && isUUID(d.id));
                  if (filtered.length > 0) {
                    safeRels[rk] = { data: Array.isArray(rv.data) ? filtered : filtered[0] };
                  }
                });
              }

              const inlinePayload = {
                data: {
                  type: item.type,
                  attributes: item.attributes,
                  ...(Object.keys(safeRels).length > 0 ? { relationships: safeRels } : {})
                }
              };

              const result = await sendToFarmOS(inlineEndpoint, inlinePayload);
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
        window.dispatchEvent(new CustomEvent('syncCompleted', {
          detail: { type, id: result?.data?.id },
        }));
      }
      return { success: true, message: 'Guardado y sincronizado con servidor', data: result };
    } catch (error) {
      console.warn("API Error, falling back to offline", error);
      await syncManager.saveTransaction({ type: type.replace("plant_asset", "planting"), payload: { ...payload, endpoint } });
      return { success: false, message: `Guardado local. Pendiente de sincronización (${error.message})` };
    }
  } else {
    await syncManager.saveTransaction({ type: type.replace("plant_asset", "planting"), payload: { ...payload, endpoint } });
    return { success: false, message: 'Sin conexión. Guardado localmente. Pendiente sincronización' };
  }
};
