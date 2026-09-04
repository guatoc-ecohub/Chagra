/**
 * laminas-assets-regression.test.js — TEST DE REGRESIÓN: cada componente
 * *LaminaViva debe tener su asset en public/ y pesar más de 60KB.
 *
 * CONTEXTO MEDIDO 2026-08-22: origin/dev exportaba los CINCO componentes
 * src/visual/creatures/*LaminaViva.jsx pero public/compai/laminas/ tenía SOLO
 * 1 de 5 PNG (estaba jaguar-natural.png; faltaban chivito-punk.png,
 * luciernaga.png, oso.png, zariguya.png). Los cuatro daban 404, el componente
 * pintaba la caja de imagen rota, y TRES de esas cajas vacías se enviaron al
 * Telegram del operador declaradas OK. Nadie lo vio hasta mirar el PESO del
 * archivo (7.3 KB contra ~500 KB de una lámina real).
 *
 * Este test:
 * 1. Descubre dinámicamente los módulos *LaminaViva.jsx bajo
 *    src/visual/creatures/ de forma recursiva, incluso los archivados
 * 2. Extrae de cada uno las rutas de asset .png/.webp/.svg que referencia
 *    (leyendo las constantes CARPETA_LAMINA y ARCHIVO_LAMINA de su
 *    anatomia.js)
 * 3. Resuelve cada ruta contra public/compai/laminas/
 * 4. AFIRMA que el archivo existe en disco Y pesa más de 60000 bytes
 *    (el corte ya usado por el gate: separa la caja vacía de 7321 bytes de
 *    la lámina real más liviana de 401177)
 *
 * El descubrimiento es DINÁMICO: una lista hardcodeada de cinco nombres no
 * protege al sexto compai que se agregue.
 *
 * CONTROL OBLIGATORIO: probá que el test FALLA renombrando temporalmente
 * uno de los PNG y mostrá la salida del fallo; después restauralo y mostrá
 * el verde. Un test que pasa siempre no prueba nada.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirnameLocal = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirnameLocal, '../..');
const CREATURES_DIR = path.resolve(REPO_ROOT, 'src/visual/creatures');
const PUBLIC_LAMINAS_DIR = path.resolve(REPO_ROOT, 'public/compai/laminas');

// Tamaño mínimo en bytes para considerar una lámina válida.
// La caja vacía (imagen rota) pesa ~7321 bytes.
// La lámina real más liviana (luciernaga.png) pesa ~401177 bytes.
// Usamos 60000 como umbral conservador.
const MIN_BYTES = 60000;

/**
 * Descubre dinámicamente todos los archivos *LaminaViva.jsx en el directorio
 * de creatures.
 */
function discoverLaminaVivaComponents() {
  const hallados = [];
  const camina = (dir) => {
    for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
      const ruta = path.join(dir, entrada.name);
      if (entrada.isDirectory()) camina(ruta);
      else if (entrada.name.endsWith('LaminaViva.jsx')) hallados.push(ruta);
    }
  };
  camina(CREATURES_DIR);
  return hallados;
}

/**
 * Extrae las constantes CARPETA_LAMINA y ARCHIVO_LAMINA del archivo
 * anatomia.js correspondiente a un componente LaminaViva.
 *
 * @param {string} componentName - Nombre del componente (ej: 'JaguarLaminaViva')
 * @returns {{carpeta: string, archivo: string}|null}
 */
function extractAssetPaths(componentPath) {
  const componentName = path.basename(componentPath, '.jsx');
  // Deriva el nombre del directorio de anatomía desde el componente
  // Ej: JaguarLaminaViva -> jaguarLamina
  // Ej: ChivitoPunkLaminaViva -> chivitoLamina
  // Ej: OsoBastonLaminaViva -> osoLamina
  
  let laminaDir;
  if (componentName === 'JaguarLaminaViva') {
    laminaDir = 'jaguarLamina';
  } else if (componentName === 'ChivitoPunkLaminaViva') {
    laminaDir = 'chivitoLamina';
  } else if (componentName === 'OsoBastonLaminaViva') {
    laminaDir = 'osoLamina';
  } else if (componentName === 'LuciernagaLaminaViva') {
    laminaDir = 'luciernagaLamina';
  } else if (componentName === 'ZariguyaLaminaViva') {
    laminaDir = 'zariguyaLamina';
  } else if (componentName === 'ZariguyaGeminiLaminaViva') {
    laminaDir = 'zariguyaGeminiLamina';
  } else {
    // Fallback: intenta derivar automáticamente
    // Quita 'LaminaViva' y convierte la primera letra a minúscula
    const base = componentName.replace(/LaminaViva$/, '');
    laminaDir = base.charAt(0).toLowerCase() + base.slice(1);
  }

  const anatomiaPath = path.resolve(path.dirname(componentPath), laminaDir, 'anatomia.js');
  const anatomiaViva = path.resolve(CREATURES_DIR, laminaDir, 'anatomia.js');
  const rutaAnatomia = fs.existsSync(anatomiaPath) ? anatomiaPath : anatomiaViva;
  
  if (!fs.existsSync(rutaAnatomia)) {
    return null;
  }

  const content = fs.readFileSync(rutaAnatomia, 'utf-8');
  
  // Extrae CARPETA_LAMINA
  const carpetaMatch = content.match(/export\s+const\s+CARPETA_LAMINA\s*=\s*['"`]([^'"`]+)['"`]/);
  // Extrae ARCHIVO_LAMINA
  const archivoMatch = content.match(/export\s+const\s+ARCHIVO_LAMINA\s*=\s*['"`]([^'"`]+)['"`]/);
  
  if (!carpetaMatch || !archivoMatch) {
    return null;
  }

  return {
    carpeta: carpetaMatch[1],
    archivo: archivoMatch[1],
  };
}

/**
 * Resuelve la ruta del asset en el sistema de archivos.
 * CARPETA_LAMINA es algo como '/compai/laminas/' -> resuelve a
 * REPO_ROOT/public/compai/laminas/
 */
function resolveAssetPath(carpeta, archivo) {
  // carpeta empieza con '/' -> es una ruta absoluta desde public/
  // Ej: '/compai/laminas/' + 'chivito-punk.png' -> public/compai/laminas/chivito-punk.png
  const relativePath = carpeta.replace(/^\//, '') + archivo;
  return path.resolve(REPO_ROOT, 'public', relativePath);
}

describe('REGRESIÓN: Cada componente *LaminaViva tiene su asset en public/', () => {
  const components = discoverLaminaVivaComponents();
  
  it(`descubre dinámicamente los componentes *LaminaViva.jsx`, () => {
    // Este test documenta cuántos componentes encontramos
    // No es un test de regresión, solo informativo
    expect(components.length).toBeGreaterThan(0);
    expect(components).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/LaminaViva\.jsx$/)
      ])
    );
  });

  describe.each(components.map((f) => [path.basename(f, '.jsx'), f]))(
    '%s',
    (componentName, componentPath) => {
      let assetInfo;
      let resolvedPath;

      beforeAll(() => {
        assetInfo = extractAssetPaths(componentPath);
        if (assetInfo) {
          resolvedPath = resolveAssetPath(assetInfo.carpeta, assetInfo.archivo);
        }
      });

      it('extrae CARPETA_LAMINA y ARCHIVO_LAMINA de su anatomia.js', () => {
        expect(assetInfo).not.toBeNull();
        expect(assetInfo).toHaveProperty('carpeta');
        expect(assetInfo).toHaveProperty('archivo');
        expect(assetInfo.carpeta).toMatch(/^\/compai\/laminas\/?$/);
        expect(assetInfo.archivo).toMatch(/\.(png|webp|svg)$/i);
      });

      it('resuelve la ruta del asset en public/', () => {
        expect(resolvedPath).toBeDefined();
        const expectedPath = path.resolve(PUBLIC_LAMINAS_DIR, assetInfo.archivo);
        // Normalizar paths para comparación cross-platform
        expect(resolvedPath.replace(/\\/g, '/')).toBe(expectedPath.replace(/\\/g, '/'));
      });

      it('el archivo existe en disco', () => {
        expect(resolvedPath).toBeDefined();
        expect(fs.existsSync(resolvedPath)).toBe(true);
      });

      it('el archivo pesa más de 60000 bytes (no es la caja vacía de 7KB)', () => {
        expect(resolvedPath).toBeDefined();
        const stats = fs.statSync(resolvedPath);
        expect(stats.size).toBeGreaterThan(MIN_BYTES);
      });
    }
  );
});
