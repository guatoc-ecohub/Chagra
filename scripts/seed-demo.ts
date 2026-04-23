import { openDB, STORES } from '../src/db/dbCore';

export async function loadDemoSeedData() {
    const db = await openDB();

    // Check if seed already applied
    const txMeta = db.transaction([STORES.SYNC_META], 'readonly');
    const storeMeta = txMeta.objectStore(STORES.SYNC_META);
    const flagReq = storeMeta.get('demo_seed_applied');

    const isApplied = await new Promise((resolve) => {
        flagReq.onsuccess = () => resolve(flagReq.result?.value === true);
        flagReq.onerror = () => resolve(false);
    });

    if (isApplied) {
        console.log('[DEMO] Seed already applied. Idempotent load skipped.');
        return;
    }

    const strategyPath = import.meta.env.VITE_CHAGRA_STRATEGY_PATH || '../Chagra-strategy';

    try {
        let zonesContent = '';
        let invasorasContent = '';

        try {
            const resZ = await fetch(`${strategyPath}/demo/SEED_DATA_ESCUELA_SAN_FRANCISCO.yaml`);
            if (resZ.ok) zonesContent = await resZ.text();
        } catch (e) {
            console.warn('[DEMO] Could not load SEED_DATA_ESCUELA_SAN_FRANCISCO.yaml via fetch, using default parsed.', e);
        }

        try {
            const resI = await fetch(`${strategyPath}/demo/INVASORAS_CATALOG.yaml`);
            if (resI.ok) invasorasContent = await resI.text();
        } catch (e) {
            console.warn('[DEMO] Could not load INVASORAS_CATALOG.yaml via fetch, using default parsed.', e);
        }

        // Extracting conditionally or assuming truth if yaml fails lightly 
        // to provide the offline degradation requirement explicitly
        const hasParamo = zonesContent.includes('zona-paramo-restauracion-01') || zonesContent === '';
        const hasHuerta = zonesContent.includes('zona-huerta-escuela') || zonesContent === '';
        const hasOjo = invasorasContent.includes('thunbergia_alata') || invasorasContent === '';
        const hasRetamo = invasorasContent.includes('ulex_europaeus') || invasorasContent === '';

        const assetsToInsert = [];
        if (hasParamo) {
            assetsToInsert.push({
                id: 'zona-paramo-restauracion-01',
                asset_type: 'land',
                name: 'Zona de restauración páramo',
                geometry: { type: 'Polygon', coordinates: [[[-73.9250, 4.5280], [-73.9248, 4.5282], [-73.9245, 4.5281], [-73.9247, 4.5279], [-73.9250, 4.5280]]] },
                cached_at: Date.now(),
                area_m2: 300,
                altitud_msnm: "2650-2800",
            });
        }
        if (hasHuerta) {
            assetsToInsert.push({
                id: 'zona-huerta-escuela',
                asset_type: 'land',
                name: 'Huerta escolar',
                geometry: { type: 'Polygon', coordinates: [[[-73.9253, 4.5275], [-73.9251, 4.5277], [-73.9249, 4.5276], [-73.9251, 4.5274], [-73.9253, 4.5275]]] },
                cached_at: Date.now(),
                area_m2: 50,
                altitud_msnm: "2550",
            });
        }

        const taxonomyToInsert = [];
        if (hasOjo) {
            taxonomyToInsert.push({
                id: 'thunbergia_alata',
                type: 'invasive',
                name: 'Ojo de poeta'
            });
        }
        if (hasRetamo) {
            taxonomyToInsert.push({
                id: 'ulex_europaeus',
                type: 'invasive',
                name: 'Retamo espinoso'
            });
        }

        const logsToInsert = [];
        const _now = Date.now();
        const DAY = 24 * 60 * 60 * 1000;

        // 15 de ojo de poeta
        for (let i = 0; i < 15; i++) {
            logsToInsert.push({
                id: `inv-ojo-poeta-demo-${i}`,
                type: 'observation',
                asset_id: 'zona-paramo-restauracion-01',
                timestamp: new Date(_now - (Math.random() * 90 * DAY)).toISOString(),
                name: 'Observación Ojo de poeta',
                geometry: { type: 'Point', coordinates: [-73.9249 + (Math.random() - 0.5) * 0.001, 4.5280 + (Math.random() - 0.5) * 0.001] },
                taxonomy_id: 'thunbergia_alata',
                category: 'invasive_observations',
                status: 'done',
                photos: [{ uri: `/demo-assets/invasoras/ojo_de_poeta_01.jpg` }]
            });
        }

        // 8 de retamo
        for (let i = 0; i < 8; i++) {
            logsToInsert.push({
                id: `inv-retamo-demo-${i}`,
                type: 'observation',
                asset_id: 'zona-paramo-restauracion-01',
                timestamp: new Date(_now - (Math.random() * 90 * DAY)).toISOString(),
                name: 'Observación Retamo espinoso',
                geometry: { type: 'Point', coordinates: [-73.9246 + (Math.random() - 0.5) * 0.001, 4.5279 + (Math.random() - 0.5) * 0.001] },
                taxonomy_id: 'ulex_europaeus',
                category: 'invasive_observations',
                status: 'done',
                photos: [{ uri: `/demo-assets/invasoras/retamo_01.jpg` }]
            });
        }

        const tx = db.transaction([STORES.ASSETS, STORES.TAXONOMY, STORES.LOGS, STORES.SYNC_META], 'readwrite');
        const assetStore = tx.objectStore(STORES.ASSETS);
        const taxStore = tx.objectStore(STORES.TAXONOMY);
        const logStore = tx.objectStore(STORES.LOGS);
        const mStore = tx.objectStore(STORES.SYNC_META);

        assetsToInsert.forEach(ast => assetStore.put(ast));
        taxonomyToInsert.forEach(t => taxStore.put(t));
        logsToInsert.forEach(l => logStore.put(l));
        mStore.put({ key: 'demo_seed_applied', value: true });

        await new Promise((resolve, reject) => {
            tx.oncomplete = () => {
                console.log('[DEMO] Seed data loaded manually via script.');
                resolve(true);
            };
            tx.onerror = () => reject(tx.error);
        });

    } catch (error) {
        console.error('[DEMO] Critical Error loading seed:', error);
    }
}
