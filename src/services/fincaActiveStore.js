import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * fincaActiveStore
 * ================================================================
 * Gestiona qué finca está "activa" en la sesión del usuario.
 * Persiste en localStorage para mantener el contexto entre recargas.
 *
 * Extendido en 062 (GPS context-aware multi-finca):
 *   - gpsOverride: boolean — true cuando el operador eligió finca manual;
 *     el banner GPS deja de consultar Geolocation hasta que se vuelva auto.
 *   - indoorZone: string|null — última zona indoor (invernadero) recordada
 *     cuando GPS pierde fix (062.7).
 *   - gpsHistoryEnabled: boolean — opt-in para sincronizar GPS history al
 *     server (default false, privacy-first 062.8).
 * ================================================================
 */
const useFincaActiveStore = create(
    persist(
        (set, get) => ({
            activeFincaSlug: 'guatoc',
            fincas: [], // Cache local de fincas-publicas.json
            gpsOverride: false,
            indoorZone: null,
            gpsHistoryEnabled: false,

            setActiveFinca: (slug) => set({ activeFincaSlug: slug }),

            setFincas: (fincas) => set({ fincas }),

            // 062.3: GPS detectó match → cambiar finca activa sin marcar override
            // (operador queda en modo auto-detect, el banner sigue activo).
            setActiveFincaFromGps: (slug) => set({ activeFincaSlug: slug, gpsOverride: false }),

            // 062.3: operador eligió manualmente → marcar override para que
            // el banner deje de consultar GPS hasta clearGpsOverride.
            setActiveFincaManual: (slug) => set({ activeFincaSlug: slug, gpsOverride: true }),

            // 062.3: volver a modo auto-detect.
            clearGpsOverride: () => set({ gpsOverride: false }),

            // 062.7: registrar/limpiar zona indoor para fallback cuando GPS
            // pierde fix bajo techo invernadero.
            setIndoorZone: (zone) => set({ indoorZone: zone }),

            // 062.8: opt-in privacy para sync GPS history al server.
            setGpsHistoryEnabled: (enabled) => set({ gpsHistoryEnabled: !!enabled }),

            // Resolver el endpoint de FarmOS para la finca activa (Fase 1)
            // Fallback chain: activa.farmos_endpoint → guatoc.farmos_endpoint → ''
            // Fase 1 v2-strict: si la finca activa NO tiene endpoint propio
            // (asesor externo, finca sin FarmOS server), operador opera
            // contra Guatoc default para no romper UX. Test cubre el caso.
            getActiveEndpoint: () => {
                const state = get();
                const finca = state.fincas.find(f => f.slug === state.activeFincaSlug);
                if (finca?.farmos_endpoint) return finca.farmos_endpoint;
                const guatoc = state.fincas.find(f => f.slug === 'guatoc');
                return guatoc?.farmos_endpoint || '';
            },

            getActiveFinca: () => {
                const state = get();
                return state.fincas.find(f => f.slug === state.activeFincaSlug) || {
                    slug: 'guatoc',
                    nombre: 'Guatoc',
                    biocultural_zone: 'andino_alto_páramo'
                };
            }
        }),
        {
            name: 'chagra:active-finca',
            storage: createJSONStorage(() => localStorage),
        }
    )
);

export { useFincaActiveStore };
export default useFincaActiveStore;
