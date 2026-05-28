import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Fallback estable para getActiveFinca cuando el array fincas está vacío
// (cold boot antes de que se hidrate desde fincas-publicas.json). Definido
// OUT del closure del store para mantener referencial-equal en cada call
// → evita React error #185 (infinite update loop) cuando se consume vía
// useFincaActiveStore((s) => s.getActiveFinca()) en componentes.
const FALLBACK_FINCA = Object.freeze({
    slug: 'guatoc',
    nombre: 'Guatoc',
    biocultural_zone: 'andino_alto_páramo',
});

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

            // Resolver el endpoint de FarmOS para la finca activa.
            //
            // Bug 2026-05-18 (operator: 100+ registros stuck pendientes con WiFi):
            // si retorna URL absoluta cross-origin (ej. 'https://farmos.guatoc.co'
            // desde 'https://chagra.guatoc.co'), Cloudflare Access devuelve 302
            // redirect a login → sync falla. Solución: si la URL absoluta del
            // farmos_endpoint comparte hostname o es el "farmos." pair del
            // origin actual de la PWA, usar relative '' → fetch same-origin
            // pasa por Nginx local que inyecta service token CF Access
            // server-side (ver PR #91).
            getActiveEndpoint: () => {
                const state = get();
                const finca = state.fincas.find(f => f.slug === state.activeFincaSlug);
                const candidate = finca?.farmos_endpoint
                    || state.fincas.find(f => f.slug === 'guatoc')?.farmos_endpoint
                    || '';
                if (!candidate) return '';
                if (typeof window !== 'undefined' && window.location?.origin) {
                    try {
                        const candidateUrl = new URL(candidate);
                        const currentHost = window.location.hostname;
                        const sameOrCousinHost =
                            candidateUrl.hostname === currentHost ||
                            candidateUrl.hostname === currentHost.replace(/^chagra\./, 'farmos.') ||
                            currentHost === candidateUrl.hostname.replace(/^farmos\./, 'chagra.');
                        if (sameOrCousinHost) return '';
                    } catch (_) { /* candidate no es URL válida, retornarlo como está */ }
                }
                return candidate;
            },

            getActiveFinca: () => {
                const state = get();
                // BUGFIX 2026-05-28 React error #185 infinite loop: el fallback
                // estaba inline `|| {...}` lo cual creaba un NUEVO objeto en
                // cada call. Cuando un componente usaba el selector
                // `useFincaActiveStore((s) => s.getActiveFinca())` y NO había
                // match, el selector retornaba refs distintos cada render →
                // Zustand strict-equal cache miss → re-render → loop infinito.
                // Fix: usar la primera finca del array como fallback, o el
                // objeto FALLBACK_FINCA estable (definido fuera del store).
                return (
                    state.fincas.find(f => f.slug === state.activeFincaSlug)
                    || state.fincas[0]
                    || FALLBACK_FINCA
                );
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
