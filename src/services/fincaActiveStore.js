import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Store para gestionar la finca activa en la arquitectura multi-finca.
 * P1: Tono cercano y persistencia en localStorage.
 */
export const useFincaActiveStore = create(
    persist(
        (set, get) => ({
            activeFincaSlug: 'guatoc',
            fincas: [], // Cargado dinámicamente desde /fincas-publicas.json

            setFincas: (fincas) => set({ fincas }),

            setActiveFinca: (slug) => {
                set({ activeFincaSlug: slug });
            },

            getActiveFinca: () => {
                const { fincas, activeFincaSlug } = get();
                const found = fincas.find(f => f.slug === activeFincaSlug);
                if (found) return found;

                return {
                    slug: 'guatoc',
                    nombre: 'Guatoc',
                    farmos_endpoint: 'https://guatoc.farmos.net',
                    coords: [4.5167, -73.9333]
                };
            },

            getActiveEndpoint: () => {
                const finca = get().getActiveFinca();
                return finca.farmos_endpoint || import.meta.env.VITE_FARMOS_URL;
            }
        }),
        {
            name: 'chagra:active-finca',
            partialize: (state) => ({
                activeFincaSlug: state.activeFincaSlug
            }),
        }
    )
);
