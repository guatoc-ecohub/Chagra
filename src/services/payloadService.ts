import { sendToFarmOS } from './apiService';
import { syncManager } from './syncManager';

const isUUID = (uuid: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);

type PayloadType = 'plant_asset' | 'input' | 'harvest' | 'seeding';

const resolveEndpoint = (type: string): string =>
  type === 'plant_asset'
    ? '/api/asset/plant'
    : type === 'input'
      ? '/api/log/input'
      : type === 'harvest'
        ? '/api/log/harvest'
        : '/api/log/seeding';

interface RelationshipItem {
  id?: string;
  type: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, { data?: unknown }>;
}

interface Payload {
  data: {
    type: string;
    id?: string;
    attributes?: Record<string, unknown>;
    relationships?: Record<string, { data?: unknown }>;
  };
  _multipartFile?: unknown;
  [key: string]: unknown;
}

interface SavePayloadResult {
  success: boolean;
  message: string;
  data?: unknown;
}

export const savePayload = async (
  type: PayloadType | string,
  payload: Payload
): Promise<SavePayloadResult> => {
  console.log(`Payload Chagra (${type}):`, JSON.stringify(payload, null, 2));
  const endpoint = resolveEndpoint(type);
  if (navigator.onLine) {
    try {
      // Fase 1.5: Resolver entidades anidadas y limpiar mock IDs
      if (payload.data.relationships) {
        for (const [relName, relData] of Object.entries(payload.data.relationships)) {
          if (!relData.data) continue;

          const processItem = async (item: RelationshipItem): Promise<RelationshipItem> => {
            if (!item.id && item.attributes) {
              const parts = item.type.split('--');
              const inlineEndpoint = `/api/${parts[0]}/${parts[1]}`;

              const safeRels: Record<string, { data: unknown }> = {};
              if (item.relationships) {
                Object.entries(item.relationships).forEach(([rk, rv]) => {
                  if (!rv.data) return;
                  const subItems: RelationshipItem[] = Array.isArray(rv.data)
                    ? (rv.data as RelationshipItem[])
                    : [rv.data as RelationshipItem];
                  const filtered = subItems.filter((d) => d.id && isUUID(d.id));
                  if (filtered.length > 0) {
                    safeRels[rk] = {
                      data: Array.isArray(rv.data) ? filtered : filtered[0],
                    };
                  }
                });
              }

              const inlinePayload = {
                data: {
                  type: item.type,
                  attributes: item.attributes,
                  ...(Object.keys(safeRels).length > 0 ? { relationships: safeRels } : {}),
                },
              };

              const result = (await sendToFarmOS(inlineEndpoint, inlinePayload)) as {
                data: { id: string };
              };
              return { type: item.type, id: result.data.id };
            }
            return item;
          };

          let items: RelationshipItem[] = Array.isArray(relData.data)
            ? (relData.data as RelationshipItem[])
            : [relData.data as RelationshipItem];
          items = await Promise.all(items.map(processItem));
          items = items.filter((d) => d.attributes || (d.id && isUUID(d.id)));

          if (items.length === 0) {
            delete payload.data.relationships[relName];
          } else {
            payload.data.relationships[relName]!.data = Array.isArray(relData.data) ? items : items[0];
          }
        }
      }

      if (payload._multipartFile) delete payload._multipartFile;
      if (payload.data.attributes) {
        Object.keys(payload.data.attributes).forEach((key) => {
          if (key.startsWith('_')) delete payload.data.attributes![key];
        });
      }

      const result = await sendToFarmOS(endpoint, payload);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('farmosLog', { detail: payload.data.attributes?.['name'] })
        );
      }
      return { success: true, message: 'Guardado y sincronizado con servidor', data: result };
    } catch (error) {
      console.warn('API Error, falling back to offline', error);
      await syncManager.saveTransaction({
        type: type.replace('plant_asset', 'planting'),
        payload: { ...payload, endpoint },
      });
      return {
        success: false,
        message: `Guardado local. Pendiente de sincronización (${(error as Error).message})`,
      };
    }
  } else {
    await syncManager.saveTransaction({
      type: type.replace('plant_asset', 'planting'),
      payload: { ...payload, endpoint },
    });
    return {
      success: false,
      message: 'Sin conexión. Guardado localmente. Pendiente sincronización',
    };
  }
};
