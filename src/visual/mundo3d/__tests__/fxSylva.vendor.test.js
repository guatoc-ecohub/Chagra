/*
 * Los FX del descenso (niebla estratificada, bruma volumétrica, CSM, rayos de
 * dosel) son una COPIA VERBATIM de los del valle. Este test es el control que
 * impide que las dos copias se separen sin que nadie lo note: fija el sha-256
 * del cuerpo copiado de cada archivo. Si alguien edita una copia (o el original
 * cambia y se re-sincroniza mal), falla acá y no seis meses después en una
 * captura que «se ve rara».
 *
 * Re-sincronizar (por archivo):
 *   cp ~/demos/3d/lib3d/<fx|post>/<archivo> src/visual/mundo3d/sierra/vendor/<archivo>
 *   (restaurar la cabecera de vendorizado y actualizar el sha en la tabla FX)
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const AQUI = dirname(fileURLToPath(import.meta.url));
const MARCADOR = '/* ── INICIO COPIA VERBATIM ── */\n';

// sha-256 del cuerpo posterior al marcador, calculado con node:crypto (no a mano).
// `notice`: dónde viaja el notice MIT completo — 'cuerpo' = ya viene al pie del
// original; 'cabecera' = el original no lo trae y lo retiene la cabecera vendor.
const FX = [
  { archivo: 'nieblaAltura.js', sha: 'f1e7c86b478a81cba2203188da2dfb79c2985c4c9733e6e43b1e09d99dffd70a', notice: 'cuerpo' },
  { archivo: 'brumaVolumetrica.js', sha: '58b84d4526af0c966172d6d0d65d37d376282d5dc417312793f6456001ab8194', notice: 'cabecera' },
  { archivo: 'csmSylva.js', sha: 'ff3cacab962e2bc1604b6f4d75b88223e1715f4e48878e05ed236c46fe7966ba', notice: 'cabecera' },
  { archivo: 'godRaysSylva.js', sha: '82ff14278a982f684dde4514ac0d43b9aa049789064601ef2320b657a89d883c', notice: 'cabecera' },
];

const leer = (archivo) => readFileSync(resolve(AQUI, '../sierra/vendor', archivo), 'utf8');

describe('FX Sylva vendorizados', () => {
  it.each(FX)('el cuerpo de $archivo es byte-a-byte el original del valle', ({ archivo, sha }) => {
    const txt = leer(archivo);
    const i = txt.indexOf(MARCADOR);
    expect(i).toBeGreaterThan(0);
    const cuerpo = txt.slice(i + MARCADOR.length);
    expect(createHash('sha256').update(cuerpo).digest('hex')).toBe(sha);
  });

  it.each(FX)('$archivo conserva el notice MIT de Sylva', ({ archivo, notice }) => {
    const txt = leer(archivo);
    const i = txt.indexOf(MARCADOR);
    expect(i).toBeGreaterThan(0);
    expect(txt).toContain('MIT License');
    expect(txt).toContain('Token Gremlin');
    expect(txt).toContain('Permission is hereby granted');
    // el notice completo viaja donde el original lo dejó (pie del cuerpo) o,
    // si no lo trae, en la cabecera vendor — pero nunca se pierde en la copia
    if (notice === 'cuerpo') {
      expect(txt.slice(i + MARCADOR.length)).toContain('Permission is hereby granted');
    } else {
      expect(txt.slice(0, i)).toContain('Permission is hereby granted');
    }
  });
});
