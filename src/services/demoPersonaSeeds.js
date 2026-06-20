/**
 * demoPersonaSeeds.js — Datos semilla específicos por PERFIL DEMO.
 *
 * Cada persona (CAMPESINO, CAFETERO, CACAOTERO, CORPORATIVO) tiene su propia
 * finca demo rica y coherente, sembrada en IndexedDB (ChagraDB/farm_processes)
 * al elegir el perfil. Esto hace que cambiar de perfil muestre una experiencia
 * VISIBLEMENTE DISTINTA: diferentes cultivos, animales, parcelas y contextos.
 *
 * Datos plausibles, no fake escandaloso. Basado en agroecología andina colombiana
 * y sistemas reales de producción.
 *
 * @module demoPersonaSeeds
 */

import { openDB, STORES } from '../db/dbCore.js';

/** 
 * Mapa de semillas por perfil.
 * Cada clave es un id de PROFILE_PRESETS (campesino, cafetero, cacaotero, corporativo).
 */
export const PROFILE_SEEDS = Object.freeze({
  campesino: Object.freeze({
    nombre: 'Finca La Esperanza - Campesino',
    altitud_msnm: '2400',
    municipio: 'Facatativá',
    departamento: 'Cundinamarca',
    area_total_hectareas: 1.5,
    cultivos: [
      {
        id: 'cult-maiz-01',
        nombre: 'Maíz criollo',
        especie_id: 'zea_mays',
        area_m2: 400,
        fecha_siembra: '2026-03-15',
        etapa: 'vegetativa',
        variedad: 'Maíz criollo blanquito'
      },
      {
        id: 'cult-frijol-01',
        nombre: 'Fríjol caballero',
        especie_id: 'phaseolus_vulgaris',
        area_m2: 250,
        fecha_siembra: '2026-04-10',
        etapa: 'floracion',
        variedad: 'Fríjol cargamanto'
      },
      {
        id: 'cult-ahuyama-01',
        nombre: 'Ahuyama',
        especie_id: 'cucurbita_maxima',
        area_m2: 150,
        fecha_siembra: '2026-04-20',
        etapa: 'enredadera',
        variedad: 'Ahuyama local'
      },
      {
        id: 'cult-cafe-01',
        nombre: 'Café patio',
        especie_id: 'coffea_arabica',
        area_m2: 200,
        fecha_siembra: '2025-08-01',
        etapa: 'produccion',
        variedad: 'Caturra'
      }
    ],
    animales: [
      {
        id: 'anim-gallinas-01',
        tipo: 'gallinas',
        cantidad: 15,
        raza: 'Gallina criolla',
        sistema: 'pastoreo libre',
        nota: 'Gallinas de patio para huevo y control de plagas'
      }
    ],
    zonas: [
      {
        id: 'zona-huerta-campesino',
        nombre: 'Huerta diversificada',
        area_m2: 400,
        tipo: 'huerta_mixta',
        cultivos: ['maíz', 'fríjol', 'ahuyama']
      },
      {
        id: 'zona-cafetal-campesino',
        nombre: 'Cafetal patio',
        area_m2: 200,
        tipo: 'cafetal',
        cultivos: ['café']
      },
      {
        id: 'zona-gallinero-campesino',
        nombre: 'Gallinero',
        area_m2: 50,
        tipo: 'gallinero',
        animales: ['gallinas']
      }
    ],
    biopreparados: [
      {
        id: 'bio-cal-01',
        nombre: 'Caldo sulfocálcico',
        aplicado_en: ['cult-maiz-01', 'cult-frijol-01'],
        fecha_aplicacion: '2026-05-01',
        objetivo: 'Control de ácaros y hongos'
      }
    ]
  }),

  cafetero: Object.freeze({
    nombre: 'Finca El Mirador - Cafetero',
    altitud_msnm: '1850',
    municipio: 'Chinchiná',
    departamento: 'Caldas',
    area_total_hectareas: 3.5,
    cultivos: [
      {
        id: 'cult-cafe-sombra-01',
        nombre: 'SAF Café + Guamo',
        especie_id: 'coffea_arabica',
        area_m2: 1500,
        fecha_siembra: '2024-06-15',
        etapa: 'produccion',
        variedad: 'Colombia',
        sombra: ['guamo', 'café'],
        densidad_arboles_ha: 3500
      },
      {
        id: 'cult-cafe-sombra-02',
        nombre: 'SAF Café + Nogal',
        especie_id: 'coffea_arabica',
        area_m2: 800,
        fecha_siembra: '2023-08-20',
        etapa: 'produccion',
        variedad: 'Castillo',
        sombra: ['nogal cafetero', 'café'],
        densidad_arboles_ha: 4000
      },
      {
        id: 'cult-platano-01',
        nombre: 'Plátano asociado',
        especie_id: 'musa_aab',
        area_m2: 300,
        fecha_siembra: '2025-03-10',
        etapa: 'produccion',
        variedad: 'Plátano Hartón',
        asociado_con: 'café'
      }
    ],
    animales: [],
    zonas: [
      {
        id: 'zona-saf-cafetal-01',
        nombre: 'SAF Cafetal Principal',
        area_m2: 1500,
        tipo: 'saf_cafe',
        cultivos: ['café', 'guamo'],
        sombra: 'Guamo (Inga edulis)'
      },
      {
        id: 'zona-saf-cafetal-02',
        nombre: 'SAF Cafetal Ladera',
        area_m2: 800,
        tipo: 'saf_cafe',
        cultivos: ['café', 'nogal'],
        sombra: 'Nogal cafetero (Cordia alliodora)'
      },
      {
        id: 'zona-platanal-01',
        nombre: 'Platanal asociado',
        area_m2: 300,
        tipo: 'platanal',
        cultivos: ['plátano']
      },
      {
        id: 'zona-beneficio-01',
        nombre: 'Beneficio húmedo',
        area_m2: 100,
        tipo: 'beneficio_cafe',
        nota: 'Pila de despulpado, fermentación y secadero'
      }
    ],
    biopreparados: [
      {
        id: 'bio-bocashi-01',
        nombre: 'Bocashi café',
        aplicado_en: ['cult-cafe-sombra-01', 'cult-cafe-sombra-02'],
        fecha_aplicacion: '2026-04-15',
        objetivo: 'Fertilización orgánica del cafetal'
      }
    ]
  }),

  cacaotero: Object.freeze({
    nombre: 'Finca El Cacaotal - Cacaotero',
    altitud_msnm: '350',
    municipio: 'San Vicente de Chucurí',
    departamento: 'Santander',
    area_total_hectareas: 5.0,
    cultivos: [
      {
        id: 'cult-cacao-01',
        nombre: 'Cacao clonal CCN-51',
        especie_id: 'theobroma_cacao',
        area_m2: 2000,
        fecha_siembra: '2023-05-12',
        etapa: 'produccion',
        variedad: 'CCN-51',
        sombra: ['matarratón', 'plátano'],
        densidad_arboles_ha: 1200
      },
      {
        id: 'cult-cacao-02',
        nombre: 'Cacao híbrido ICS-1',
        especie_id: 'theobroma_cacao',
        area_m2: 1500,
        fecha_siembra: '2022-08-22',
        etapa: 'produccion',
        variedad: 'ICS-1',
        sombra: ['matarratón', 'guayaba'],
        densidad_arboles_ha: 1100
      },
      {
        id: 'cult-matarraton-01',
        nombre: 'Matarratón sombra',
        especie_id: 'erythrina_fusca',
        area_m2: 500,
        fecha_siembra: '2023-03-01',
        etapa: 'sombra_establecida',
        nota: 'Leguminosa arbórea de sombra permanente y fijación de N'
      },
      {
        id: 'cult-platano-cacao-01',
        nombre: 'Plátano asociado cacao',
        especie_id: 'musa_aab',
        area_m2: 400,
        fecha_siembra: '2025-02-15',
        etapa: 'produccion',
        variedad: 'Plátano Maqueño',
        asociado_con: 'cacao'
      }
    ],
    animales: [],
    zonas: [
      {
        id: 'zona-cacaotal-01',
        nombre: 'Cacaotal Principal',
        area_m2: 2000,
        tipo: 'cacaotal',
        cultivos: ['cacao', 'matarratón', 'plátano'],
        sistema: 'SAF cacao + sombra leguminosa'
      },
      {
        id: 'zona-cacaotal-02',
        nombre: 'Cacaotal Ladera',
        area_m2: 1500,
        tipo: 'cacaotal',
        cultivos: ['cacao', 'matarratón', 'guayaba'],
        sistema: 'SAF cacao + sombra diversa'
      },
      {
        id: 'zona-vivero-01',
        nombre: 'Vivero cacao',
        area_m2: 200,
        tipo: 'vivero',
        nota: 'Producción de plántulas de cacao'
      },
      {
        id: 'zona-fermentacion-01',
        nombre: 'Centro de fermentación',
        area_m2: 150,
        tipo: 'beneficio_cacao',
        nota: 'Cajas de fermentación y secadero solar'
      }
    ],
    biopreparados: [
      {
        id: 'bio-cal-02',
        nombre: 'Caldo sulfocálcico',
        aplicado_en: ['cult-cacao-01', 'cult-cacao-02'],
        fecha_aplicacion: '2026-05-10',
        objetivo: 'Control de monilia y mazorca negra'
      }
    ]
  }),

  corporativo: Object.freeze({
    nombre: 'Portafolio Multi-Finca - Corporativo',
    altitud_msnm: 'vario',
    municipio: 'Varios (Cundinamarca, Caldas, Santander)',
    departamento: 'Multiple',
    area_total_hectareas: 45,
    cultivos: [
      {
        id: 'cult-cafe-corp-01',
        nombre: 'Cafetal El Mirador',
        especie_id: 'coffea_arabica',
        area_m2: 12000,
        fecha_siembra: '2021-03-15',
        etapa: 'produccion',
        variedad: 'Colombia',
        finca: 'Finca El Mirador'
      },
      {
        id: 'cult-cacao-corp-01',
        nombre: 'Cacaotal San Vicente',
        especie_id: 'theobroma_cacao',
        area_m2: 18000,
        fecha_siembra: '2020-06-20',
        etapa: 'produccion',
        variedad: 'CCN-51',
        finca: 'Finca San Vicente'
      },
      {
        id: 'cult-huerta-corp-01',
        nombre: 'Huerta La Esperanza',
        especie_id: 'zea_mays',
        area_m2: 8000,
        fecha_siembra: '2026-02-10',
        etapa: 'vegetativa',
        variedad: 'Mixto',
        finca: 'Finca La Esperanza'
      }
    ],
    animales: [
      {
        id: 'anim-gallinas-corp-01',
        tipo: 'gallinas',
        cantidad: 150,
        raza: 'Gallina criolla',
        sistema: 'pastoreo libre',
        finca: 'Finca La Esperanza',
        nota: 'Producción de huevo y control de plagas'
      }
    ],
    zonas: [
      {
        id: 'zona-cafetal-corp-01',
        nombre: 'Zona Cafetera Central',
        area_m2: 12000,
        tipo: 'cafetal',
        cultivos: ['café'],
        finca: 'Finca El Mirador',
        indicadores: {
          produccion_quintales_por_hectarea: 18,
          rendimiento_porcentaje: 85
        }
      },
      {
        id: 'zona-cacaotal-corp-01',
        nombre: 'Zona Cacaotera',
        area_m2: 18000,
        tipo: 'cacaotal',
        cultivos: ['cacao', 'plátano'],
        finca: 'Finca San Vicente',
        indicadores: {
          produccion_quintales_por_hectarea: 12,
          certificacion: 'Orgánico en transición'
        }
      },
      {
        id: 'zona-huerta-corp-01',
        nombre: 'Zona de Seguridad Alimentaria',
        area_m2: 8000,
        tipo: 'huerta_mezclada',
        cultivos: ['maíz', 'fríjol', 'ahuyama'],
        finca: 'Finca La Esperanza',
        indicadores: {
          autosuficiencia_familiar: '85%',
          biodiversidad_especies: 24
        }
      }
    ],
    biopreparados: [],
    indicadores_corporativos: [
      {
        id: 'ind-psa-01',
        nombre: 'Huella de carbono',
        valor: '-450 ton CO2e/año',
        nota: 'Captura neta por SAF café+cacao'
      },
      {
        id: 'ind-servicios-01',
        nombre: 'Servicios ecosistémicos',
        valor: '78% del área',
        nota: 'Biodiversidad, captura de agua, suelo vivo'
      },
      {
        id: 'ind-produccion-01',
        nombre: 'Producción total',
        valor: '450 quintales/año',
        nota: 'Café + cacao procesado'
      }
    ]
  })
});

/**
 * Limpia todos los datos de demo anteriores del perfil especificado.
 * @param {string} profileId 
 */
async function clearPreviousProfileData(profileId) {
  const db = await openDB();
  
  try {
    const tx = db.transaction([STORES.FARM_PROCESSES, STORES.FARM_PROCESS_EVENTS, STORES.LOGS, STORES.ASSETS], 'readwrite');
    
    // Eliminar logs y eventos previos del perfil
    await Promise.all([
      new Promise((resolve, reject) => {
        const req = tx.objectStore(STORES.LOGS).openCursor(
          IDBKeyRange.bound(`demo-${profileId}-`, `demo-${profileId}-￿`)
        );
        req.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };
        req.onerror = () => reject(req.error);
      }),
      new Promise((resolve, reject) => {
        const req = tx.objectStore(STORES.FARM_PROCESS_EVENTS).openCursor(
          IDBKeyRange.bound(`demo-${profileId}-`, `demo-${profileId}-￿`)
        );
        req.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };
        req.onerror = () => reject(req.error);
      })
    ]);
    
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.warn('[demoPersonaSeeds] Error clearing previous profile data:', error);
    // No fallamos si la limpieza falla
  }
}

/**
 * Siembra en IndexedDB los datos específicos del perfil demo elegido.
 * 
 * Crea:
 * - Assets (zonas/parcelas de la finca)
 * - Farm processes (ciclos de cultivo activos)
 * - Logs (actividades recientes plausibles)
 * - Farm process events (eventos de los ciclos)
 * 
 * @param {string} profileId — id de perfil (campesino, cafetero, cacaotero, corporativo)
 */
export async function seedProfileData(profileId) {
  if (!PROFILE_SEEDS[profileId]) {
    console.warn(`[demoPersonaSeeds] No seed data for profile: ${profileId}`);
    return;
  }

  const seed = PROFILE_SEEDS[profileId];
  const db = await openDB();
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  try {
    // Limpiar datos previos del perfil para evitar duplicados
    await clearPreviousProfileData(profileId);

    const assetsToInsert = [];
    const processesToInsert = [];
    const logsToInsert = [];
    const eventsToInsert = [];

    // Crear assets (zonas) según el perfil
    for (const zona of seed.zonas) {
      assetsToInsert.push({
        id: zona.id,
        asset_type: 'land',
        name: zona.nombre,
        attributes: {
          area: { value: zona.area_m2, unit: 'm2' },
          zone_type: zona.tipo,
          ...(zona.finca && { finca: zona.finca }),
          ...(zona.indicadores && { indicadores: zona.indicadores }),
          ...(zona.sombra && { sombra: zona.sombra })
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-73.9250 + Math.random() * 0.01, 4.5280 + Math.random() * 0.01],
            [-73.9250 + Math.random() * 0.01, 4.5280 + Math.random() * 0.01],
            [-73.9250 + Math.random() * 0.01, 4.5280 + Math.random() * 0.01],
            [-73.9250 + Math.random() * 0.01, 4.5280 + Math.random() * 0.01],
            [-73.9250 + Math.random() * 0.01, 4.5280 + Math.random() * 0.01]
          ]]
        },
        cached_at: now
      });
    }

    // Crear procesos de cultivo según el perfil
    for (const cultivo of seed.cultivos) {
      const processId = `demo-${profileId}-cultivo-${cultivo.id}`;
      processesToInsert.push({
        process_id: processId,
        attributes: {
          process_type: 'crop_cycle',
          status: 'active',
          subject_kind: 'planting',
          location_land_asset_id: `zona-${cultivo.id}`,
          crop_variety: cultivo.variedad,
          planting_date: cultivo.fecha_siembra,
          updated_at: new Date(now - Math.random() * 7 * DAY).toISOString(),
          phase: cultivo.etapa,
          area_sqm: cultivo.area_m2,
          density: cultivo.densidad_arboles_ha ? cultivo.densidad_arboles_ha : null,
          notes: cultivo.nota || ''
        }
      });

      // Eventos recientes del cultivo
      const eventTypeOptions = ['planting', 'maintenance', 'harvest', 'observation'];
      for (let i = 0; i < 5; i++) {
        const eventType = eventTypeOptions[Math.floor(Math.random() * eventTypeOptions.length)];
        eventsToInsert.push({
          event_id: `demo-${profileId}-event-${cultivo.id}-${i}`,
          attributes: {
            process_id: processId,
            event_type: eventType,
            occurred_at: new Date(now - (Math.random() * 30 * DAY)).toISOString(),
            asset_id: `zona-${cultivo.id}`,
            notes: `${eventType} en ${cultivo.nombre.toLowerCase()}`
          }
        });

        // Logs correspondientes a los eventos
        logsToInsert.push({
          id: `demo-${profileId}-log-${cultivo.id}-${i}`,
          type: 'log--planting',
          asset_id: `zona-${cultivo.id}`,
          timestamp: new Date(now - (Math.random() * 30 * DAY)).toISOString(),
          name: `${eventType === 'planting' ? 'Siembra' : eventType === 'harvest' ? 'Cosecha' : 'Mantenimiento'} ${cultivo.nombre}`,
          status: 'done',
          category: 'cultivo'
        });
      }
    }

    // Crear procesos de animales si hay
    for (const animal of seed.animales) {
      const processId = `demo-${profileId}-animal-${animal.id}`;
      processesToInsert.push({
        process_id: processId,
        attributes: {
          process_type: 'livestock_cycle',
          status: 'active',
          subject_kind: 'animal',
          location_land_asset_id: `zona-${animal.id}`,
          animal_type: animal.tipo,
          quantity: animal.cantidad,
          breed: animal.raza,
          updated_at: new Date(now - Math.random() * 7 * DAY).toISOString()
        }
      });
    }

    // Insertar todo en IndexedDB
    const tx = db.transaction([
      STORES.ASSETS,
      STORES.FARM_PROCESSES,
      STORES.FARM_PROCESS_EVENTS,
      STORES.LOGS,
      STORES.SYNC_META
    ], 'readwrite');

    // Assets
    const assetStore = tx.objectStore(STORES.ASSETS);
    for (const asset of assetsToInsert) {
      assetStore.put(asset);
    }

    // Farm processes
    const fpStore = tx.objectStore(STORES.FARM_PROCESSES);
    for (const process of processesToInsert) {
      fpStore.put(process);
    }

    // Farm process events
    const fpeStore = tx.objectStore(STORES.FARM_PROCESS_EVENTS);
    for (const event of eventsToInsert) {
      fpeStore.put(event);
    }

    // Logs
    const logStore = tx.objectStore(STORES.LOGS);
    for (const log of logsToInsert) {
      logStore.put(log);
    }

    // Marcar el seed del perfil como aplicado
    const metaStore = tx.objectStore(STORES.SYNC_META);
    metaStore.put({ key: `demo_seed_${profileId}_applied`, value: true });

    await new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        console.log(`[demoPersonaSeeds] Seeded profile: ${profileId} (${assetsToInsert.length} assets, ${processesToInsert.length} processes, ${logsToInsert.length} logs)`);
        resolve(true);
      };
      tx.onerror = () => reject(tx.error);
    });

  } catch (error) {
    console.error(`[demoPersonaSeeds] Critical error seeding profile ${profileId}:`, error);
    throw error;
  }
}
