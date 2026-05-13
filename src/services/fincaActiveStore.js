import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * fincaActiveStore
 * ================================================================
 * Gestiona qué finca está "activa" en la sesión del usuario.
 * Persiste en localStorage para mantener el contexto entre recargas.
 * ================================================================
 */
const useFincaActiveStore = create(
    persist(
        (set, get) => ({
            activeFincaSlug: 'guatoc',
            fincas: [], // Cache local de fincas-publicas.json

            setActiveFinca: (slug) => set({ activeFincaSlug: slug }),

            setFincas: (fincas) => set({ fincas }),

            // Resolver el endpoint de FarmOS para la finca activa (Fase 1)
            getActiveEndpoint: () => {
                const state = get();
                const finca = state.fincas.find(f => f.slug === state.activeFincaSlug);
                // Default a Guatoc si no hay coincidencia (seguridad v2-strict)
                return finca?.farmos_endpoint || '';
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
