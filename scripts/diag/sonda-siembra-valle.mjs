#!/usr/bin/env node
// Sonda rápida de la siembra ecológica del bosque del valle: rendimiento por
// especie, NN por clase y verificaciones ecológicas SIN levantar el navegador.
// Réplica de la configuración de BosqueDensoValle.jsx (si cambia allá, aquí).
import * as THREE from 'three';
import {
  rngDe,
  distanciaACauce,
  sembrarArboleda,
  sembrarSotobosque,
} from '../../src/mockups/valle/siembraValle.js';

function alturaTerreno(x, z) {
  const subida = THREE.MathUtils.smoothstep(-z, -8, 11) * 5.4;
  const ondul = Math.sin(x * 0.42) * 0.14 + Math.cos(z * 0.36 + x * 0.2) * 0.12;
  const cauce = -0.32 * Math.exp(-((x - 1.2) ** 2) / 6) * Math.exp(-((z + 1) ** 2) / 55);
  return subida + ondul + cauce;
}

const ZONA = [
  { cx: 8.4, cz: -5.4, rx: 5.4, rz: 4.2 },
  { cx: 5.4, cz: -1.8, rx: 3.2, rz: 2.4 },
  { cx: 11.6, cz: -8.2, rx: 2.8, rz: 2.2 },
  { cx: 14.2, cz: -4.6, rx: 2.4, rz: 3.4 },
];
const ZONA_RIPARIA = [{ cx: 0.9, cz: -2.0, rx: 1.5, rz: 3.6 }];
const CLAROS = [
  { x: 5.2, z: -3.4, r: 1.9 },
  { x: 9.7, z: -2.9, r: 1.5 },
  { x: 3.1, z: -1.0, r: 1.2 },
  { x: 6.4, z: -7.0, r: 1.3 },
];
const Z_LOD = -5.6;
const ESTRATO = {
  yarumo: { escMin: 0.62, escMax: 0.9, esp: 1.4, zLod: Z_LOD, nicho: [0.10, 0.72], bordeClaro: 0.35, bordeLibre: true },
  aliso: { escMin: 0.62, escMax: 0.9, esp: 1.3, zLod: Z_LOD, zona: ZONA_RIPARIA, nicho: [0.08, 1.0], agua: { radio: 2.4, peso: 0.55, minDist: 0.55 } },
  roble: { escMin: 0.5, escMax: 0.74, esp: 1.35, zLod: Z_LOD, nicho: [0.36, 1.0], rodales: 3, emergentes: 0.1 },
  encenillo: { escMin: 0.5, escMax: 0.74, esp: 1.3, zLod: Z_LOD, nicho: [0.38, 1.0], rodales: 2 },
  gaque: { escMin: 0.46, escMax: 0.64, esp: 1.15, zLod: Z_LOD, nicho: [0.22, 0.95], bordeClaro: 0.3 },
  soto: { escMin: 0.34, escMax: 0.72, esp: 0.42, hundir: 0.02, zLod: Z_LOD },
};
const cupo = { yarumo: 10, aliso: 12, roble: 17, encenillo: 16, gaque: 10, mortino: 185, romerillo: 165 };

const r = rngDe(4113);
const arboleda = sembrarArboleda([
  { clave: 'roble', n: cupo.roble, ...ESTRATO.roble },
  { clave: 'encenillo', n: cupo.encenillo, ...ESTRATO.encenillo },
  { clave: 'gaque', n: cupo.gaque, ...ESTRATO.gaque },
  { clave: 'aliso', n: cupo.aliso, ...ESTRATO.aliso },
  { clave: 'yarumo', n: cupo.yarumo, ...ESTRATO.yarumo },
], ZONA, CLAROS, alturaTerreno, r);
const dosel = Object.values(arboleda).flat();
const soto = sembrarSotobosque([
  { clave: 'mortino', n: cupo.mortino, ...ESTRATO.soto },
  { clave: 'romerillo', n: cupo.romerillo, ...ESTRATO.soto },
], dosel, ZONA, CLAROS, alturaTerreno, r, { fraccionLibre: 0.3, radioCopa: [0.7, 1.9] });

const todo = { ...arboleda, ...soto };
let total = 0;
for (const [k, items] of Object.entries(todo)) {
  total += items.length;
  console.log(k.padEnd(11), 'rindió', String(items.length).padStart(3), '/', cupo[k]);
}
console.log('TOTAL bosque:', total, '(+6 vahos =', total + 6, ') — banda aceptación 292..418');

function nnMedia(items) {
  let s = 0;
  for (let i = 0; i < items.length; i++) {
    let m = Infinity;
    for (let j = 0; j < items.length; j++) {
      if (i === j) continue;
      const d = Math.hypot(items[i].pos[0] - items[j].pos[0], items[i].pos[2] - items[j].pos[2]);
      if (d < m) m = d;
    }
    s += m;
  }
  return s / items.length;
}
const matas = [...soto.mortino, ...soto.romerillo];
console.log('NN arbol↔arbol:', nnMedia(dosel).toFixed(3));
console.log('NN mata↔mata:', nnMedia(matas).toFixed(3));
console.log('NN global:', nnMedia([...dosel, ...matas]).toFixed(3));
let minArbol = Infinity;
for (let i = 0; i < dosel.length; i++) {
  for (let j = i + 1; j < dosel.length; j++) {
    const d = Math.hypot(dosel[i].pos[0] - dosel[j].pos[0], dosel[i].pos[2] - dosel[j].pos[2]);
    if (d < minArbol) minArbol = d;
  }
}
console.log('MIN arbol↔arbol:', minArbol.toFixed(3));
if (arboleda.aliso.length) {
  const dAliso = arboleda.aliso.reduce((s, it) => s + distanciaACauce(it.pos[0], it.pos[2]), 0) / arboleda.aliso.length;
  const dRoble = arboleda.roble.reduce((s, it) => s + distanciaACauce(it.pos[0], it.pos[2]), 0) / arboleda.roble.length;
  console.log('dist media aliso→cauce:', dAliso.toFixed(2), '| roble→cauce:', dRoble.toFixed(2));
}
