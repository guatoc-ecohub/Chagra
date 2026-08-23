export const catalogoArboles = [
  'arbol de mango',
  'arbol de guayaba',
  'arbol de aguacate',
  'bosque altoandino',
];

export function listarEspecies() {
  return catalogoArboles.map((nombre) => nombre.toUpperCase());
}
