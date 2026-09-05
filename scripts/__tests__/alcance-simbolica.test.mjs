import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { analizarAlcance } from '../lib/alcance-simbolica.mjs';

/**
 * Tests del MOTOR compartido (scripts/lib/alcance-simbolica.mjs).
 *
 * REGRESIÓN 2026-09-05 (task audit-gate-remate-20260905): el RE_IMPORT_FROM
 * del motor tenía la cláusula de import acotada a {0,400} chars. Un import
 * multi-línea con muchos nombres (data/aguaFinca en AguaScreen.jsx: 27
 * nombres, 421 chars) NO hacía match y el motor daba el módulo por huérfano
 * CON LA PANTALLA MONTADA importándolo de verdad. El control de importadores
 * del remate lo pescó antes de declarar: declararlo habría sido matar en el
 * allowlist un archivo vivo. Medido sobre dev el 2026-09-05: 12 imports de
 * src/ superaban los 400 chars (el mayor, 699).
 */

function construirFixture() {
  const root = mkdtempSync(join(tmpdir(), 'alcance-simbolica-fixture-'));
  mkdirSync(join(root, 'src'), { recursive: true });

  // Entrada → App (import estático) → Pantalla (cláusula >400 chars) → apoyo.
  writeFileSync(
    join(root, 'index.html'),
    '<!doctype html><html><body><script type="module" src="/src/main.jsx"></script></body></html>',
  );
  writeFileSync(join(root, 'src/main.jsx'), "import App from './App.jsx';\nApp();\n");
  writeFileSync(
    join(root, 'src/App.jsx'),
    "import { Pantalla } from './Pantalla.jsx';\nexport default function App() { return Pantalla; }\n",
  );

  // La cláusula tiene 30 nombres (~450 chars): por encima del tope viejo de
  // 400, por debajo del nuevo de 4000.
  const nombres = Array.from({ length: 30 }, (_, i) => `SIMBOLO_${i}`).join(',\n  ');
  writeFileSync(
    join(root, 'src/Pantalla.jsx'),
    `import {\n  ${nombres},\n} from './datosApoyo.js';\nexport const Pantalla = SIMBOLO_0;\n`,
  );
  writeFileSync(join(root, 'src/datosApoyo.js'), 'export const SIMBOLO_0 = "dato real";\n');

  // Control: un apoyo de verdad sin nadie que lo importe sigue siendo hallazgo.
  writeFileSync(join(root, 'src/huerfanoDeVerdad.js'), 'export const NADIE = 1;\n');

  return root;
}

describe('alcance-simbolica (regresión cláusula de import >400 chars)', function () {
  it('un módulo importado con cláusula multi-línea larga sale MONTADO, no huérfano', function () {
    const root = construirFixture();
    try {
      const a = analizarAlcance({ root, conConsumo: false });
      expect(a.ok).toBe(true);
      const apoyo = a.resultadosA.find((r) => r.id === 'src/datosApoyo.js');
      expect(apoyo, 'el fixture no registró datosApoyo.js').toBeTruthy();
      expect(
        `${apoyo.veredicto}: ${apoyo.porque}`,
        'el motor no vio el import multi-línea largo (¿regresión del tope de cláusula?)',
      ).toMatch(/^MONTADO/);
      // Y el que SÍ es huérfano sigue saliendo: el fix no calló el gate.
      const huerfano = a.resultadosA.find((r) => r.id === 'src/huerfanoDeVerdad.js');
      expect(huerfano.veredicto).toBe('HUERFANO');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
