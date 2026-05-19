/**
 * plantMeta.js — Helpers puros para el blob `_chagra_plant_meta` que el
 * form de siembra de AssetsDashboard escribe en `attributes` del asset
 * (plant) recién creado.
 *
 * Audit finding 070.3 (2026-05-18): el operador puede declarar 3 campos
 * opcionales sobre el estado actual de la planta (fecha de siembra,
 * altura, etapa fenológica). Se persisten en
 * `attributes._chagra_plant_meta` para no chocar con el schema oficial
 * FarmOS, y como fallback se serializa una línea legible al final de
 * `attributes.notes` para sobrevivir al sync.
 *
 * Se extrae a un util independiente para que los tests unitarios no
 * tengan que cargar todo el árbol de imports de `AssetsDashboard.jsx`
 * (zustand stores + IDB + lucide-react + react-virtuoso + leaflet, etc.).
 */

/**
 * Opciones canónicas de etapa fenológica. UI las usa para el `<select>`
 * y AssetDetailView las usa para etiquetar legibles.
 */
export const ETAPA_FENOLOGICA_OPTIONS = [
    { value: 'semillero', label: 'Semillero' },
    { value: 'vegetativo', label: 'Vegetativo' },
    { value: 'floracion', label: 'Floración' },
    { value: 'fructificacion', label: 'Fructificación' },
    { value: 'madurez', label: 'Madurez' },
    { value: 'senescencia', label: 'Senescencia' },
];

/**
 * Construye el blob `_chagra_plant_meta` a partir del state del form.
 * Retorna `null` si ningún campo opcional fue capturado, para que el
 * caller no inyecte un objeto vacío en `attributes` (mantiene el payload
 * limpio cuando el operador omite la sección colapsable).
 *
 * @param {object} formData — state del formulario de planta.
 * @param {string} [formData.fechaGerminacion] — yyyy-mm-dd (input date).
 * @param {string|number} [formData.alturaCm] — string del input number.
 * @param {string} [formData.etapaFenologica] — value de ETAPA_FENOLOGICA_OPTIONS.
 * @returns {object|null} `{ fecha_germinacion, altura_cm, etapa_fenologica }`
 *   con solo las claves capturadas. `null` si todo está vacío.
 */
export const buildPlantMeta = (formData) => {
    if (!formData || typeof formData !== 'object') return null;

    const meta = {};

    if (formData.fechaGerminacion) {
        meta.fecha_germinacion = formData.fechaGerminacion;
    }

    if (formData.alturaCm !== '' && formData.alturaCm != null) {
        const n = Number(formData.alturaCm);
        if (Number.isFinite(n) && n >= 0) {
            meta.altura_cm = Math.round(n);
        }
    }

    if (formData.etapaFenologica) {
        meta.etapa_fenologica = formData.etapaFenologica;
    }

    return Object.keys(meta).length > 0 ? meta : null;
};

/**
 * Formato fallback para `attributes.notes` cuando el server FarmOS no
 * soporta el campo namespaced `_chagra_plant_meta`. Línea single-string
 * que sobrevive al round-trip y es legible por humanos.
 *
 * @param {object} meta — output de buildPlantMeta (puede ser null).
 * @returns {string|null}
 */
export const formatPlantMetaFallbackLine = (meta) => {
    if (!meta || typeof meta !== 'object') return null;
    const parts = [];
    if (meta.fecha_germinacion) parts.push(`siembra: ${meta.fecha_germinacion}`);
    if (meta.altura_cm != null) parts.push(`altura: ${meta.altura_cm} cm`);
    if (meta.etapa_fenologica) parts.push(`etapa: ${meta.etapa_fenologica}`);
    return parts.length > 0 ? `[estado-planta] ${parts.join(' · ')}` : null;
};

/**
 * Labels legibles de etapa fenológica para AssetDetailView. Espejo de
 * ETAPA_FENOLOGICA_OPTIONS, pero accesible como mapa rápido.
 */
export const ETAPA_FENOLOGICA_LABELS = Object.fromEntries(
    ETAPA_FENOLOGICA_OPTIONS.map((opt) => [opt.value, opt.label]),
);
