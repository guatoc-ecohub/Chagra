#!/usr/bin/env node
/**
 * Inventario estático del lenguaje visual del valle 3D.
 *
 * Cuenta recetas de geometría, polígonos nominales, materiales, sombreado
 * plano y colores declarados. Los polígonos son por receta JSX: los conteos
 * reales con loops e instancias los reporta auditar-valle-runtime.mjs.
 *
 * Uso:
 *   node scripts/diag/inventario-valle-3d.mjs --source . --output inventario.json
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve, relative, extname } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { parse } = require('@babel/parser');

const args = process.argv.slice(2);
const valor = (nombre, defecto) => {
  const i = args.indexOf(nombre);
  return i >= 0 && args[i + 1] ? args[i + 1] : defecto;
};
const raiz = resolve(valor('--source', '.'));
const salida = valor('--output', null);
const carpetas = [
  'src/mockups/valle',
  'src/visual/mundo3d/direccion',
  'src/visual/mundo3d/terreno',
  'src/visual/mundo3d/sierra',
  'src/visual/mundo3d/bosque',
];

function archivosEn(dir) {
  if (!statSafe(dir)?.isDirectory()) return [];
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = resolve(dir, nombre);
    const st = statSafe(ruta);
    if (st?.isDirectory()) return nombre === '__tests__' || nombre === '_archivo' ? [] : archivosEn(ruta);
    return ['.js', '.jsx'].includes(extname(nombre)) ? [ruta] : [];
  });
}

function statSafe(ruta) {
  try { return statSync(ruta); } catch { return null; }
}

function nombreJsx(nodo) {
  const n = nodo?.openingElement?.name;
  if (!n) return null;
  if (n.type === 'JSXIdentifier') return n.name;
  if (n.type === 'JSXMemberExpression') return `${n.object.name}.${n.property.name}`;
  return null;
}

function numero(n) {
  if (!n) return null;
  if (n.type === 'NumericLiteral') return n.value;
  if (n.type === 'UnaryExpression' && n.operator === '-' && n.argument.type === 'NumericLiteral') return -n.argument.value;
  return null;
}

function argsGeometria(nodo) {
  const atr = nodo.openingElement.attributes.find((a) => a.type === 'JSXAttribute' && a.name.name === 'args');
  const arr = atr?.value?.expression;
  if (arr?.type !== 'ArrayExpression') return null;
  const valores = arr.elements.map(numero);
  return valores.every((v) => v !== null) ? valores : null;
}

function triangulos(tipo, a) {
  if (!a) return null;
  switch (tipo) {
    case 'boxGeometry': return 12;
    case 'planeGeometry': return 2 * (a[2] ?? 1) * (a[3] ?? 1);
    case 'circleGeometry': return a[1] ?? 8;
    case 'ringGeometry': return 2 * (a[2] ?? 8) * (a[3] ?? 1);
    case 'sphereGeometry': return 2 * (a[1] ?? 32) * ((a[2] ?? 16) - 1);
    case 'coneGeometry': return (a[2] ?? 32) * (2 * (a[3] ?? 1) + 1);
    case 'cylinderGeometry': return 2 * (a[3] ?? 32) * ((a[4] ?? 1) + 1);
    case 'torusGeometry': return 2 * (a[2] ?? 12) * (a[3] ?? 48);
    case 'icosahedronGeometry': return 20 * (4 ** (a[1] ?? 0));
    case 'dodecahedronGeometry': return 36 * (4 ** (a[1] ?? 0));
    case 'octahedronGeometry': return 8 * (4 ** (a[1] ?? 0));
    case 'tetrahedronGeometry': return 4 * (4 ** (a[1] ?? 0));
    default: return null;
  }
}

function clase(componente, archivo) {
  const s = `${componente} ${archivo}`.toLowerCase();
  if (/atmos|nube|niebla|lluv|helada|luna|estrella|particula/.test(s)) return 'atmósfera';
  if (/terreno|suelo|cordillera|sierra|ladera|roca|piedra|corte/.test(s)) return 'terreno y relieve';
  if (/agua|quebrada|acequia|poza/.test(s)) return 'agua';
  if (/bosque|arbol|veget|flora|cafetal|paramo|fraile|cultivo|mata|pasto|dosel|quinua|yuca|maiz/.test(s)) return 'vegetación y cultivos';
  if (/casa|portico|sendero|patio|banco|cerca|invernadero|kiosco|estructura/.test(s)) return 'arquitectura e infraestructura';
  if (/animal|hato|perro|vaca|oveja|gallina|oso|fauna|abeja|condor|colibri|mariposa|escarabajo|lombriz/.test(s)) return 'fauna';
  if (/campesino|vecino|persona/.test(s)) return 'personas';
  if (/mundo|portal|ventana|viñeta|vigneta|lugar|beacon/.test(s)) return 'portales e hitos';
  return 'otros';
}

const archivos = carpetas.flatMap((p) => archivosEn(resolve(raiz, p)));
const porClase = {};
const materiales = {};
const colores = new Set();
const recetas = [];
let flatShading = 0;
let contornos = 0;
let erroresParseo = 0;

function sumarClase(nombre, campo, n = 1) {
  porClase[nombre] ??= { recetasGeometria: 0, triangulosNominales: 0, recetasSinCalculo: 0, materiales: 0 };
  porClase[nombre][campo] += n;
}

for (const ruta of archivos) {
  const fuente = readFileSync(ruta, 'utf8');
  for (const m of fuente.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) colores.add(m[0].toLowerCase());
  flatShading += (fuente.match(/\bflatShading\b/g) || []).length;
  contornos += (fuente.match(/\b(?:Outline|outline|strokeWidth|linewidth)\b/g) || []).length;
  let ast;
  try {
    ast = parse(fuente, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
  } catch {
    erroresParseo += 1;
    continue;
  }
  const rel = relative(raiz, ruta);
  const recorrer = (nodo, contexto = 'módulo') => {
    if (!nodo || typeof nodo !== 'object') return;
    let ctx = contexto;
    if (nodo.type === 'FunctionDeclaration' && nodo.id?.name) ctx = nodo.id.name;
    if ((nodo.type === 'ArrowFunctionExpression' || nodo.type === 'FunctionExpression') && nodo.__nombreVariable) ctx = nodo.__nombreVariable;
    if (nodo.type === 'VariableDeclarator' && nodo.id?.name && nodo.init) nodo.init.__nombreVariable = nodo.id.name;

    if (nodo.type === 'JSXElement') {
      const tipo = nombreJsx(nodo);
      const grupo = clase(ctx, rel);
      if (tipo?.endsWith('Geometry')) {
        const a = argsGeometria(nodo);
        const tris = triangulos(tipo, a);
        sumarClase(grupo, 'recetasGeometria');
        sumarClase(grupo, tris === null ? 'recetasSinCalculo' : 'triangulosNominales', tris ?? 1);
        recetas.push({ archivo: rel, componente: ctx, clase: grupo, geometria: tipo, args: a, triangulosNominales: tris });
      }
      if (/^(?:mesh|line|points)(?:Basic|Lambert|Phong|Toon|Standard|Physical|Depth|Normal)?Material$/.test(tipo || '')) {
        materiales[tipo] = (materiales[tipo] || 0) + 1;
        sumarClase(grupo, 'materiales');
      }
    }
    if (nodo.type === 'NewExpression' && nodo.callee?.type === 'MemberExpression') {
      const tipo = nodo.callee.property?.name;
      if (/Material$/.test(tipo || '')) materiales[tipo] = (materiales[tipo] || 0) + 1;
    }
    for (const [k, v] of Object.entries(nodo)) {
      if (k === 'loc' || k === 'start' || k === 'end' || k.startsWith('__')) continue;
      if (Array.isArray(v)) v.forEach((x) => recorrer(x, ctx));
      else if (v && typeof v === 'object' && typeof v.type === 'string') recorrer(v, ctx);
    }
  };
  recorrer(ast);
}

const resultado = {
  fuente: raiz,
  archivosAnalizados: archivos.length,
  erroresParseo,
  resumen: {
    recetasGeometria: recetas.length,
    triangulosNominalesPorReceta: recetas.reduce((s, r) => s + (r.triangulosNominales || 0), 0),
    recetasSinCalculo: recetas.filter((r) => r.triangulosNominales === null).length,
    materialesDeclarados: Object.values(materiales).reduce((a, b) => a + b, 0),
    tiposMaterial: Object.keys(materiales).length,
    coloresHexDistintos: colores.size,
    aparicionesFlatShading: flatShading,
    referenciasContorno2D3D: contornos,
  },
  porClase,
  materiales: Object.fromEntries(Object.entries(materiales).sort((a, b) => b[1] - a[1])),
  colores: [...colores].sort(),
  recetas,
  limitacion: 'Los triángulos nominales cuentan una receta JSX una vez. Use auditar-valle-runtime.mjs para loops, instancias y geometría procedural ya montada.',
};

const json = `${JSON.stringify(resultado, null, 2)}\n`;
if (salida) writeFileSync(resolve(salida), json);
else process.stdout.write(json);
