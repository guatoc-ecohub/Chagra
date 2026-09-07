/*
 * usePerfilFincaStore — EL PERFIL DE LA FINCA, vivo, para la UI.
 *
 * Paso 1 del spec del valle dinámico: UN SOLO ORIGEN DE VERDAD de "cómo es SU
 * finca". El valle deja de ser el mismo para todos y se arma con ESTO.
 *
 * NO duplica persistencia: la verdad sigue viviendo en el perfil del usuario
 * (`chagra:profile:*`, userProfileService) — lo que el onboarding ya escribe.
 * Este store es la CARA REACTIVA de ese perfil: lo normaliza (perfilFincaService),
 * lo mantiene fresco cuando el usuario se ubica o cambia su perfil, y ofrece
 * los setters de los datos que faltan (escala · invernadero · agua · mundos
 * agregados) para que los pasos 3-5 solo tengan que llamarlos.
 *
 * Regla dura heredada: un dato que FALTA nunca resta. Sin perfil, el store
 * entrega `PERFIL_FINCA_DEMO` y el valle se ve como siempre.
 */
import { create } from 'zustand';
import {
  ESCALAS_FINCA,
  FUENTES_AGUA,
  PERFIL_FINCA_DEMO,
  TIPOS_INVERNADERO,
  getPerfilFinca,
} from '../services/perfilFincaService';
import { getProfile, saveProfile } from '../services/userProfileService';

/** Eventos que dejan el perfil desactualizado en pantalla. */
const EVENTOS_PERFIL = [
  'chagra:location-updated', // el onboarding acaba de ubicar la finca
  'chagra:profile-changed', // cambió algo del perfil (presets, guardián…)
  'chagra:profile:demo-switched', // se entró/salió del perfil de demo
];

function leerPerfil() {
  try {
    return getPerfilFinca();
  } catch (_) {
    return { ...PERFIL_FINCA_DEMO };
  }
}

/** Persiste en el perfil real y re-hidrata el store desde ahí (una verdad). */
function persistir(partial, set) {
  try {
    saveProfile(partial);
  } catch (_) {
    /* sin storage (SSR / tests): el store igual refleja el cambio abajo */
  }
  set({ perfil: leerPerfil() });
}

const usePerfilFincaStore = create((set, get) => ({
  /** @type {import('../services/perfilFincaService').PerfilFinca} */
  perfil: leerPerfil(),

  /** Re-lee el perfil desde localStorage (tras onboarding, import, demo…). */
  hidratar: () => set({ perfil: leerPerfil() }),

  /**
   * ESCALA del mundo: 'balcon' | 'invernadero' | 'finca'. Es lo que decide el
   * tamaño del valle (paso 3 del spec la pregunta en el onboarding).
   */
  setEscala: (escala) => {
    if (!ESCALAS_FINCA.includes(escala)) return;
    persistir({ escala }, set);
  },

  /**
   * Invernadero: `null` = no tiene. `{ tipo, tamano }` = sí, y de qué forma.
   * Escribe las MISMAS claves planas que ya usa el onboarding/escena F2.
   */
  setInvernadero: (inv) => {
    if (!inv) {
      persistir({ invernadero_tiene: 'no', invernadero_forma: undefined }, set);
      return;
    }
    const tipo = TIPOS_INVERNADERO.includes(inv.tipo) ? inv.tipo : undefined;
    const tamano = typeof inv.tamano === 'string' && inv.tamano.trim() ? inv.tamano.trim() : undefined;
    persistir({ invernadero_tiene: 'si', invernadero_forma: tipo, invernadero_tamano: tamano }, set);
  },

  /** De dónde toma el agua la finca: quebrada | tanque | lluvia | acueducto. */
  setAgua: (agua) => {
    if (!FUENTES_AGUA.includes(agua)) return;
    persistir({ agua }, set);
  },

  /**
   * AGREGAR un mundo que la persona NO tiene, para conocerlo (paso 5 del spec:
   * la vitrina maestra como catálogo). Se guarda aparte de lo que sí tiene —
   * el valle puede distinguir "su finca" de "lo que puede conocer".
   */
  agregarMundo: (id) => {
    if (typeof id !== 'string' || !id.trim()) return;
    const actuales = get().perfil.mundosActivos || [];
    if (actuales.includes(id)) return;
    persistir({ mundos_activos: [...actuales, id] }, set);
  },

  /** Quitar un mundo agregado a mano (no toca los que la finca sí tiene). */
  quitarMundo: (id) => {
    const actuales = get().perfil.mundosActivos || [];
    if (!actuales.includes(id)) return;
    persistir({ mundos_activos: actuales.filter((m) => m !== id) }, set);
  },

  /** El perfil PLANO crudo (escape hatch para quien necesite una clave suelta). */
  perfilCrudo: () => {
    try {
      return getProfile();
    } catch (_) {
      return {};
    }
  },
}));

/* El valle vive montado mientras el usuario se ubica en el onboarding: sin
   esto el 3D seguiría mostrando la finca de demo hasta recargar. Fail-silent
   en SSR/tests sin window. */
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  const rehidratar = () => {
    try {
      usePerfilFincaStore.getState().hidratar();
    } catch (_) {
      /* noop */
    }
  };
  EVENTOS_PERFIL.forEach((evt) => window.addEventListener(evt, rehidratar));
}

/** Snapshot sin hooks (servicios, builders, tests). */
export function getPerfilFincaActual() {
  return usePerfilFincaStore.getState().perfil;
}

export default usePerfilFincaStore;
