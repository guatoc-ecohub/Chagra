import { demoPunto, demoReferencias, demoTerritorioGeojson } from './fixtures.mjs';
import { oraculo } from './oraculo.mjs';

const resultado = oraculo(demoPunto, {
  geojson: demoTerritorioGeojson,
  referencias: demoReferencias,
});

console.dir(resultado, { depth: null, colors: false });
