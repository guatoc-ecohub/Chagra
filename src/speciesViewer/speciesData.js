/**
 * Small, public prototype slice of the AGE species export.
 * Presentation fields live with the species record, not inside the viewer.
 */

export const SPECIES = [
  {
    id: 'solanum_lycopersicum',
    name: 'Tomate chonto',
    scientific: 'Solanum lycopersicum L.',
    family: 'Solanaceae',
    zone: 'Templado / cálido',
    role: 'Cultivo de fruto',
    poster: '/hortalizas/tomate.jpg',
    modelUrl: null,
    modelProfile: 'fruiting-herb',
    modelRotation: [0.05, 0.14, -0.03],
    modelPivot: [0, 0.25, 0],
    modelViewportFill: 0.76,
    autoRotateArc: 0.12,
    facts: [
      ['Familia', 'Solanaceae'],
      ['Altitud óptima', '800 a 1.800 m'],
      ['Ciclo', 'Anual'],
      ['Agua', 'Media'],
    ],
    hotspots: [
      { id: 'fruto', label: 'Fruto', note: 'Punto de cosecha y semilla', tone: 'coral', position: [0.25, 0.22, 0.2] },
      { id: 'hoja', label: 'Hoja', note: 'Superficie activa de la planta', tone: 'gold', position: [-0.34, 0.66, 0.12] },
      { id: 'tallo', label: 'Tallo', note: 'Eje que sostiene el racimo', tone: 'blue', position: [0, 0.42, -0.28] },
    ],
  },
  {
    id: 'zea_mays',
    name: 'Maíz criollo',
    scientific: 'Zea mays L.',
    family: 'Poaceae',
    zone: 'Frío / templado / cálido',
    role: 'Cereal y biomasa',
    poster: '/milpa/maiz.jpg',
    modelUrl: null,
    modelProfile: 'tall-grass',
    modelRotation: [0, -0.28, 0],
    modelPivot: [0, 0.45, 0],
    modelViewportFill: 0.72,
    autoRotateArc: 0.1,
    facts: [
      ['Familia', 'Poaceae'],
      ['Altitud óptima', '1.800 a 2.800 m'],
      ['Ciclo', '6 meses'],
      ['Rol', 'Productor de biomasa'],
    ],
    hotspots: [
      { id: 'mazorca', label: 'Mazorca', note: 'Órgano de cosecha', tone: 'coral', position: [0.2, 0.08, 0.18] },
      { id: 'lamina', label: 'Lámina', note: 'Hoja que captura luz', tone: 'gold', position: [-0.44, 0.7, 0.08] },
      { id: 'envés', label: 'Envés', note: 'Ancla posterior, visible al girar', tone: 'blue', position: [0, 0.48, -0.3] },
    ],
  },
  {
    id: 'persea_americana',
    name: 'Aguacate',
    scientific: 'Persea americana Mill.',
    family: 'Lauraceae',
    zone: 'Templado / cálido',
    role: 'Frutal perenne',
    poster: '/aguacate/arbol.jpg',
    modelUrl: null,
    modelProfile: 'perennial-tree',
    modelRotation: [0.02, 0.46, 0],
    modelPivot: [0, 0.4, 0],
    modelViewportFill: 0.7,
    autoRotateArc: 0.08,
    facts: [
      ['Familia', 'Lauraceae'],
      ['Altitud óptima', '800 a 2.200 m'],
      ['Ciclo', 'Perenne'],
      ['Drenaje', 'Excelente'],
    ],
    hotspots: [
      { id: 'fruto', label: 'Fruto', note: 'Reserva y cosecha del árbol', tone: 'coral', position: [0.3, 0.36, 0.18] },
      { id: 'copa', label: 'Copa', note: 'Estrato alto y sombra viva', tone: 'gold', position: [-0.34, 0.85, 0.1] },
      { id: 'raiz', label: 'Raíz', note: 'Zona sensible al encharcamiento', tone: 'blue', position: [0, -0.42, -0.32] },
    ],
  },
];

export function getSpecies(id) {
  return SPECIES.find((species) => species.id === id) || SPECIES[0];
}
