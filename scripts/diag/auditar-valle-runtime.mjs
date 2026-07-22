#!/usr/bin/env node
/**
 * Mide el grafo Three.js realmente montado y captura el valle por franja.
 * El host auditado debe exponer { gl, scene, camera } en
 * window.__VALLE_AUDITORIA__. Esto se hace solo en la copia diagnóstica.
 *
 * Uso:
 *   node scripts/diag/auditar-valle-runtime.mjs \
 *     --url 'http://127.0.0.1:43177/' --output valle-runtime.json --capturas /tmp/capturas
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const valor = (nombre, defecto) => {
  const i = args.indexOf(nombre);
  return i >= 0 && args[i + 1] ? args[i + 1] : defecto;
};
const base = valor('--url', 'http://127.0.0.1:43177/');
const salida = resolve(valor('--output', 'valle-runtime.json'));
const capturas = resolve(valor('--capturas', 'capturas-auditoria-valle'));
const ciclos = valor('--ciclos', '6,12,18,0,16').split(',').map(Number);

function chromiumPath() {
  const candidatos = [process.env.CHROMIUM_PATH, '/run/current-system/sw/bin/chromium'];
  for (const p of candidatos) if (p && existsSync(p)) return p;
  try { return execSync('which chromium', { encoding: 'utf8' }).trim(); } catch { return undefined; }
}

mkdirSync(capturas, { recursive: true });
const browser = await chromium.launch({
  executablePath: chromiumPath(),
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const contexto = await browser.newContext({
  viewport: { width: 1998, height: 1248 },
  serviceWorkers: 'block',
  reducedMotion: 'reduce',
});

async function medir(ciclo) {
  const page = await contexto.newPage();
  const ruta = `${base.replace(/\/$/, '')}/?ciclo=${ciclo}#/mockups/entrada-3d`;
  await page.goto(ruta, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__VALLE_AUDITORIA__?.scene?.children?.length > 5, null, { timeout: 120000 });
  await page.waitForTimeout(4500);
  const metrica = await page.evaluate(() => {
    const { gl, scene, camera } = window.__VALLE_AUDITORIA__;
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    const materiales = {};
    const colores = new Set();
    const geometrias = {};
    const idsGeo = new Set();
    const idsMat = new Set();
    const distancia = { primerPlanoMenos10: 0, planoMedio10a25: 0, fondoMas25: 0 };
    const tercios = { alto: 0, medio: 0, bajo: 0, fuera: 0 };
    let mallas = 0;
    let instancias = 0;
    let triangulos = 0;
    let flat = 0;
    let suaves = 0;
    let transparentes = 0;
    let conVertexColor = 0;
    const triangulosGeo = (g) => g.index ? g.index.count / 3 : (g.attributes?.position?.count || 0) / 3;
    scene.traverse((o) => {
      if (!o.isMesh || !o.geometry || !o.visible) return;
      mallas += 1;
      const n = o.isInstancedMesh ? o.count : 1;
      instancias += n;
      const t = triangulosGeo(o.geometry) * n;
      triangulos += t;
      geometrias[o.geometry.type] = (geometrias[o.geometry.type] || 0) + n;
      idsGeo.add(o.geometry.uuid);
      o.geometry.computeBoundingBox();
      const centro = o.geometry.boundingBox.getCenter(o.geometry.boundingBox.min.clone()).applyMatrix4(o.matrixWorld);
      const d = centro.distanceTo(camera.position);
      distancia[d < 10 ? 'primerPlanoMenos10' : d < 25 ? 'planoMedio10a25' : 'fondoMas25'] += t;
      const p = centro.clone().project(camera);
      const tercio = p.x < -1 || p.x > 1 || p.y < -1 || p.y > 1 ? 'fuera' : p.y > 1 / 3 ? 'alto' : p.y < -1 / 3 ? 'bajo' : 'medio';
      tercios[tercio] += t;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const mat of mats) {
        if (!mat) continue;
        materiales[mat.type] = (materiales[mat.type] || 0) + 1;
        idsMat.add(mat.uuid);
        if (mat.flatShading) flat += 1; else suaves += 1;
        if (mat.transparent) transparentes += 1;
        if (mat.vertexColors) conVertexColor += 1;
        if (mat.color?.getHexString) colores.add(`#${mat.color.getHexString()}`);
      }
    });
    const limites = (obj) => {
      if (!obj) return null;
      let minY = Infinity; let maxY = -Infinity; let piezas = 0;
      obj.updateMatrixWorld(true);
      obj.traverse((o) => {
        if (!o.isMesh || !o.geometry) return;
        o.geometry.computeBoundingBox();
        const b = o.geometry.boundingBox;
        for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
          const v = b.min.clone().set(x, y, z).applyMatrix4(o.matrixWorld);
          minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
        }
        piezas += 1;
      });
      return piezas ? { minY, maxY, altura: maxY - minY, piezas } : { altura: null, piezas: 0 };
    };
    const nombres = ['audit-casa', 'audit-terreno', 'audit-cordillera', 'audit-hato', 'audit-perro-oliver', 'audit-perro-dante'];
    const alturas = Object.fromEntries(nombres.map((n) => [n, limites(scene.getObjectByName(n))]));
    const estadisticaGrupo = (nombre) => {
      const raiz = scene.getObjectByName(nombre);
      if (!raiz) return null;
      const puntos = [];
      let mallasGrupo = 0; let instanciasGrupo = 0; let trisGrupo = 0;
      raiz.updateMatrixWorld(true);
      raiz.traverse((o) => {
        if (!o.isMesh || !o.geometry) return;
        mallasGrupo += 1;
        const tri = triangulosGeo(o.geometry);
        o.geometry.computeBoundingBox();
        const centroLocal = o.geometry.boundingBox.getCenter(o.geometry.boundingBox.min.clone());
        if (o.isInstancedMesh) {
          const paso = Math.max(1, Math.ceil(o.count / 500));
          const im = o.matrix.clone();
          for (let i = 0; i < o.count; i++) {
            instanciasGrupo += 1; trisGrupo += tri;
            if (i % paso !== 0) continue;
            o.getMatrixAt(i, im);
            const mundo = o.matrixWorld.clone().multiply(im);
            const p = centroLocal.clone().applyMatrix4(mundo);
            puntos.push([p.x, p.z]);
          }
        } else {
          instanciasGrupo += 1; trisGrupo += tri;
          const p = centroLocal.clone().applyMatrix4(o.matrixWorld);
          puntos.push([p.x, p.z]);
        }
      });
      const cercanos = [];
      for (let i = 0; i < puntos.length; i++) {
        let mejor = Infinity;
        for (let j = 0; j < puntos.length; j++) if (i !== j) mejor = Math.min(mejor, Math.hypot(puntos[i][0] - puntos[j][0], puntos[i][1] - puntos[j][1]));
        if (Number.isFinite(mejor)) cercanos.push(mejor);
      }
      const media = cercanos.reduce((a, b) => a + b, 0) / (cercanos.length || 1);
      const desv = Math.sqrt(cercanos.reduce((s, x) => s + (x - media) ** 2, 0) / (cercanos.length || 1));
      return { mallas: mallasGrupo, instancias: instanciasGrupo, triangulos: trisGrupo, posicionesMuestreadas: puntos.length, vecinoMasCercanoMedio: media, vecinoMasCercanoDesviacion: desv, coeficienteVariacionVecino: desv / Math.max(media, 1e-9) };
    };
    const grupos = ['audit-bosque-denso', 'audit-cafetal', 'audit-paramo', 'audit-ladera-alta', 'detalle-suelo-valle', 'audit-vegetacion-pisos'];
    const distribucionGrupos = Object.fromEntries(grupos.map((n) => [n, estadisticaGrupo(n)]));
    const campesinos = [...document.querySelectorAll('[data-campesino]')].map((el) => {
      const r = el.getBoundingClientRect();
      return { id: el.dataset.campesino, anchoPx: r.width, altoPx: r.height, x: r.x, y: r.y };
    });
    const rotulos = [...document.querySelectorAll('.valle-rotulo, .valle-lugar-label, [class*="rotulo"]')];
    const areaRotulos = rotulos.reduce((s, el) => { const r = el.getBoundingClientRect(); return s + r.width * r.height; }, 0);
    return {
      ciclo: Number(new URLSearchParams(location.search).get('ciclo')),
      franja: document.querySelector('.valle-root')?.dataset.clima,
      render: { ...gl.info.render },
      camara: { posicion: camera.position.toArray(), fov: camera.fov, cerca: camera.near, lejos: camera.far },
      fog: scene.fog ? { tipo: scene.fog.type, color: `#${scene.fog.color.getHexString()}`, near: scene.fog.near, far: scene.fog.far, density: scene.fog.density } : null,
      luces: scene.children.filter((o) => o.isLight).map((l) => ({ tipo: l.type, intensidad: l.intensity, color: `#${l.color.getHexString()}`, posicion: l.position.toArray(), sombra: Boolean(l.castShadow) })),
      escena: {
        mallas, instancias, triangulos, geometriasUnicas: idsGeo.size, materialesUnicos: idsMat.size,
        tiposGeometria: geometrias, tiposMaterial: materiales, coloresMaterialDistintos: colores.size,
        flatShadingUsos: flat, shadingSuaveUsos: suaves, materialesTransparentes: transparentes,
        materialesVertexColor: conVertexColor, triangulosPorDistancia: distancia, triangulosPorTercioProyectado: tercios,
      },
      alturas, distribucionGrupos, campesinos,
      interfaz: { rotulos: rotulos.length, areaRotulosPx2: areaRotulos, fraccionPantallaRotulos: areaRotulos / (innerWidth * innerHeight) },
    };
  });
  const cdp = await page.context().newCDPSession(page);
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
  writeFileSync(resolve(capturas, `valle-ciclo-${ciclo}.png`), Buffer.from(shot.data, 'base64'));
  if (ciclo === 12) {
    const angulos = [
      { id: 'rasante', posicion: [13, 5.2, 14], mira: [0, 1.6, 1.4] },
      { id: 'contracampo', posicion: [-12, 7.5, 12], mira: [0, 1.8, 1.4] },
    ];
    for (const angulo of angulos) {
      await page.evaluate(({ posicion, mira }) => {
        const { gl, scene, camera } = window.__VALLE_AUDITORIA__;
        camera.position.set(...posicion);
        camera.lookAt(...mira);
        camera.updateMatrixWorld(true);
        gl.render(scene, camera);
      }, angulo);
      const extra = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
      writeFileSync(resolve(capturas, `valle-ciclo-12-${angulo.id}.png`), Buffer.from(extra.data, 'base64'));
    }
  }
  await page.close();
  return metrica;
}

const resultados = [];
for (const ciclo of ciclos) resultados.push(await medir(ciclo));
await browser.close();
writeFileSync(salida, `${JSON.stringify({ url: base, viewport: [1998, 1248], serviceWorkers: 'block', resultados }, null, 2)}\n`);
console.log(`Auditoría escrita en ${salida}`);
