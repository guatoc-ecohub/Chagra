import { describe, test, expect } from 'vitest';
import {
  isInCaucaRegion,
  normalizeUserInput,
  localizeAgentOutput,
  getGlosarioStats,
} from '../glosarioCaucaService';

describe('glosarioCaucaService — isInCaucaRegion', () => {
  describe('inputs degenerados → false (conservador)', () => {
    test('null → false', () => {
      expect(isInCaucaRegion(null)).toBe(false);
    });

    test('undefined → false', () => {
      expect(isInCaucaRegion(undefined)).toBe(false);
    });

    test('string → false', () => {
      expect(isInCaucaRegion('cauca')).toBe(false);
    });

    test('número → false', () => {
      expect(isInCaucaRegion(42)).toBe(false);
    });

    test('array → false', () => {
      expect(isInCaucaRegion(['cauca'])).toBe(false);
    });

    test('objeto vacío → false', () => {
      expect(isInCaucaRegion({})).toBe(false);
    });
  });

  describe('match por departamento cauca → true', () => {
    test('departamento = cauca → true', () => {
      expect(isInCaucaRegion({ departamento: 'cauca' })).toBe(true);
    });

    test('departamento = Cauca (mayúscula) → true', () => {
      expect(isInCaucaRegion({ departamento: 'Cauca' })).toBe(true);
    });

    test('departamento = CAUCA → true', () => {
      expect(isInCaucaRegion({ departamento: 'CAUCA' })).toBe(true);
    });

    test('departamento = cauca_dpto → true', () => {
      expect(isInCaucaRegion({ departamento: 'cauca_dpto' })).toBe(true);
    });

    test('region = cauca → true', () => {
      expect(isInCaucaRegion({ region: 'cauca' })).toBe(true);
    });
  });

  describe('match por zona biocultural → true', () => {
    test('biocultural_zone = valle_caucano → true', () => {
      expect(isInCaucaRegion({ biocultural_zone: 'valle_caucano' })).toBe(true);
    });

    test('biocultural_zone = Valle_Caucano → true', () => {
      expect(isInCaucaRegion({ biocultural_zone: 'Valle_Caucano' })).toBe(true);
    });

    test('biocultural_zone = pacifico → true', () => {
      expect(isInCaucaRegion({ biocultural_zone: 'pacifico' })).toBe(true);
    });

    test('biocultural_zone = Pacifico → true', () => {
      expect(isInCaucaRegion({ biocultural_zone: 'Pacifico' })).toBe(true);
    });
  });

  describe('departamentos/zonas fuera del Cauca → false', () => {
    test('departamento = antioquia → false', () => {
      expect(isInCaucaRegion({ departamento: 'antioquia' })).toBe(false);
    });

    test('departamento = valle → false (sin _caucano)', () => {
      expect(isInCaucaRegion({ departamento: 'valle' })).toBe(false);
    });

    test('biocultural_zone = andina → false', () => {
      expect(isInCaucaRegion({ biocultural_zone: 'andina' })).toBe(false);
    });

    test('biocultural_zone = caribe → false', () => {
      expect(isInCaucaRegion({ biocultural_zone: 'caribe' })).toBe(false);
    });
  });

  describe('prioridad: departamento sobre zona', () => {
    test('departamento cauca + zona any → true', () => {
      expect(
        isInCaucaRegion({
          departamento: 'cauca',
          biocultural_zone: 'caribe',
        })
      ).toBe(true);
    });

    test('departamento no-cauca + zona valle_caucano → true', () => {
      expect(
        isInCaucaRegion({
          departamento: 'antioquia',
          biocultural_zone: 'valle_caucano',
        })
      ).toBe(true);
    });
  });
});

describe('glosarioCaucaService — normalizeUserInput', () => {
  describe('inputs degenerados → passthrough', () => {
    test('null → null', () => {
      expect(normalizeUserInput(null)).toBe(null);
    });

    test('undefined → undefined', () => {
      expect(normalizeUserInput(undefined)).toBe(undefined);
    });

    test('número → número', () => {
      expect(normalizeUserInput(/** @type {any} */ (42))).toBe(42);
    });

    test('objeto → objeto', () => {
      const obj = { q: 'hola' };
      expect(normalizeUserInput(/** @type {any} */ (obj))).toBe(obj);
    });

    test('string vacío → string vacío', () => {
      expect(normalizeUserInput('')).toBe('');
    });

    test('string solo whitespace → whitespace', () => {
      expect(normalizeUserInput('   \n\t  ')).toBe('   \n\t  ');
    });
  });

  describe('regional gate: sin finca cauca → aplica (útil para tests)', () => {
    test('texto con término regional + finca fuera del Cauca → sin cambios', () => {
      const text = 'cómo siembro papa runa';
      const result = normalizeUserInput(text, {
        finca: { departamento: 'antioquia' },
      });
      expect(result).toBe(text);
    });

    test('texto con término regional + finca null → aplica glosario', () => {
      const text = 'cómo siembro papa runa';
      const result = normalizeUserInput(text, { finca: null });
      expect(result).toBe('cómo siembro papa criolla');
    });

    test('texto con término regional + finca undefined → aplica glosario', () => {
      const text = 'cómo siembro papa runa';
      const result = normalizeUserInput(text, {});
      expect(result).toBe('cómo siembro papa criolla');
    });

    test('texto con término regional + sin opts → aplica glosario', () => {
      const text = 'cómo siembro papa runa';
      const result = normalizeUserInput(text);
      expect(result).toBe('cómo siembro papa criolla');
    });
  });

  describe('reemplazos directos regionales → estándar', () => {
    test('papa runa → papa criolla (force true)', () => {
      expect(normalizeUserInput('papa runa', { force: true })).toBe(
        'papa criolla'
      );
    });

    test('papas runas → papa criolla (force true)', () => {
      expect(normalizeUserInput('papas runas', { force: true })).toBe(
        'papa criolla'
      );
    });

    test('rascadero → rastrojo (force true)', () => {
      expect(normalizeUserInput('rascadero', { force: true })).toBe('rastrojo');
    });

    test('jelao → frío (force true)', () => {
      expect(normalizeUserInput('jelao', { force: true })).toBe('frío');
    });

    test('macheta → machete (force true)', () => {
      expect(normalizeUserInput('macheta', { force: true })).toBe('machete');
    });

    test('azadón → azada (force true)', () => {
      expect(normalizeUserInput('azadón', { force: true })).toBe('azada');
    });

    test('ñapanga → platanera de tipo dominico (Cauca) (force true)', () => {
      expect(normalizeUserInput('ñapanga', { force: true })).toBe(
        'platanera de tipo dominico (Cauca)'
      );
    });
  });

  describe('reemplazos en oraciones completas', () => {
    test('oración con papa runa → reemplaza', () => {
      expect(
        normalizeUserInput('¿cómo siembro papa runa en el Cauca?', {
          force: true,
        })
      ).toBe('¿cómo siembro papa criolla en el Cauca?');
    });

    test('oración con múltiples términos → reemplaza todos', () => {
      expect(
        normalizeUserInput('mi papa runa está jelada en el rascadero', {
          force: true,
        })
      ).toBe('mi papa criolla está helada en el rastrojo');
    });

    test('oración con rula y macheta → reemplaza ambos', () => {
      expect(
        normalizeUserInput('uso la rula y la macheta para limpiar', {
          force: true,
        })
      ).toBe('uso la machete grande y la machete para deshierbar');
    });

    test('oración con platanal → reemplaza', () => {
      expect(
        normalizeUserInput('el platanal necesita riego', { force: true })
      ).toBe('el platanera necesita riego');
    });

    test('oración con yucal → reemplaza', () => {
      expect(
        normalizeUserInput('tengo un yucal grande', { force: true })
      ).toBe('tengo un cultivo de yuca grande');
    });
  });

  describe('case-insensitive y acentos', () => {
    test('PAPA RUNA (mayúsculas) → papa criolla', () => {
      expect(normalizeUserInput('PAPA RUNA', { force: true })).toBe(
        'papa criolla'
      );
    });

    test('PaPa RuNa (mixto) → papa criolla', () => {
      expect(normalizeUserInput('PaPa RuNa', { force: true })).toBe(
        'papa criolla'
      );
    });

    test('JELAO (mayúsculas) → frío', () => {
      expect(normalizeUserInput('JELAO', { force: true })).toBe('frío');
    });

    test('Macheta (primera mayúscula) → machete', () => {
      expect(normalizeUserInput('Macheta', { force: true })).toBe('machete');
    });
  });

  describe('word boundaries: no debe reemplazar dentro de palabras', () => {
    test('paparruna (palabra compuesta) → sin reemplazo', () => {
      expect(normalizeUserInput('paparruna', { force: true })).toBe(
        'paparruna'
      );
    });

    test('rascaderos (plural) → reemplaza', () => {
      expect(normalizeUserInput('rascaderos', { force: true })).toBe('rastrojo');
    });

    test('rascaderola (compuesto) → sin reemplazo', () => {
      expect(normalizeUserInput('rascaderola', { force: true })).toBe(
        'rascaderola'
      );
    });

    test('jelado (con d) → sin reemplazo (no es jelao)', () => {
      expect(normalizeUserInput('jelado', { force: true })).toBe('jelado');
    });
  });

  describe('match por largo: términos más largos ganan', () => {
    test('miércoles del monte → pino (antes que miércoles)', () => {
      expect(normalizeUserInput('miércoles del monte', { force: true })).toBe(
        'pino'
      );
    });

    test('miércoles → pino', () => {
      expect(normalizeUserInput('miércoles', { force: true })).toBe('pino');
    });

    test('papa amarilla pequeña → papa criolla', () => {
      expect(
        normalizeUserInput('siembro papa amarilla pequeña', { force: true })
      ).toBe('siembro papa criolla');
    });

    test('papa runa y papas runas → ambos a papa criolla', () => {
      expect(
        normalizeUserInput('papa runa y papas runas', { force: true })
      ).toBe('papa criolla y papa criolla');
    });
  });

  describe('reemplazos compuestos en huerta/siembra', () => {
    test('siembrita → siembra pequeña', () => {
      expect(normalizeUserInput('hago una siembrita', { force: true })).toBe(
        'hago una siembra pequeña'
      );
    });

    test('siembra de pancoger → huerta de subsistencia', () => {
      expect(
        normalizeUserInput('tengo siembra de pancoger', { force: true })
      ).toBe('tengo huerta de subsistencia');
    });

    test('pancoger → huerta familiar de subsistencia', () => {
      expect(normalizeUserInput('mi pancoger', { force: true })).toBe(
        'mi huerta familiar de subsistencia'
      );
    });

    test('huerta casera → huerta familiar', () => {
      expect(normalizeUserInput('mi huerta casera', { force: true })).toBe(
        'mi huerta familiar'
      );
    });

    test('patio productivo → huerta familiar', () => {
      expect(
        normalizeUserInput('tengo patio productivo', { force: true })
      ).toBe('tengo huerta familiar');
    });
  });

  describe('términos de herramientas', () => {
    test('barretón → palo cavador', () => {
      expect(normalizeUserInput('uso el barretón', { force: true })).toBe(
        'uso el palo cavador'
      );
    });

    test('barreton → barretón → palo cavador', () => {
      expect(normalizeUserInput('uso el barreton', { force: true })).toBe(
        'uso el palo cavador'
      );
    });

    test('cuchara → azada pequeña', () => {
      expect(normalizeUserInput('uso la cuchara', { force: true })).toBe(
        'uso la azada pequeña'
      );
    });

    test('regaderita → regadera pequeña', () => {
      expect(normalizeUserInput('uso la regaderita', { force: true })).toBe(
        'uso la regadera pequeña'
      );
    });
  });

  describe('términos de cultivo y clima', () => {
    test('veranero → cultivo de temporada seca', () => {
      expect(normalizeUserInput('tengo veranero', { force: true })).toBe(
        'tengo cultivo de temporada seca'
      );
    });

    test('invernero → cultivo de temporada de lluvias', () => {
      expect(normalizeUserInput('tengo invernero', { force: true })).toBe(
        'tengo cultivo de temporada de lluvias'
      );
    });

    test('cosechar el verano → cosecha de temporada seca', () => {
      expect(
        normalizeUserInput('voy a cosechar el verano', { force: true })
      ).toBe('voy a cosecha de temporada seca');
    });

    test('viche → verde / inmaduro', () => {
      expect(normalizeUserInput('el plátano está viche', { force: true })).toBe(
        'el plátano está verde / inmaduro'
      );
    });

    test('biche → verde / inmaduro', () => {
      expect(normalizeUserInput('el plátano está biche', { force: true })).toBe(
        'el plátano está verde / inmaduro'
      );
    });
  });

  describe('idempotencia: aplicar dos veces da mismo resultado', () => {
    test('normalizeUserInput(normalizeUserInput(text)) === normalizeUserInput(text)', () => {
      const text = 'mi papa runa está jelada';
      const once = normalizeUserInput(text, { force: true });
      const twice = normalizeUserInput(once, { force: true });
      expect(once).toBe(twice);
    });

    test('término estándar no está en glosario como clave', () => {
      const text = 'papa criolla';
      const once = normalizeUserInput(text, { force: true });
      const twice = normalizeUserInput(once, { force: true });
      expect(once).toBe(twice);
      expect(once).toBe('papa criolla');
    });
  });

  describe('con finca en Cauca (sin force)', () => {
    test('finca en cauca + término regional → reemplaza', () => {
      const text = 'cómo siembro papa runa';
      const result = normalizeUserInput(text, {
        finca: { departamento: 'cauca' },
      });
      expect(result).toBe('cómo siembro papa criolla');
    });

    test('finca en valle_caucano + término regional → reemplaza', () => {
      const text = 'hace jelao';
      const result = normalizeUserInput(text, {
        finca: { biocultural_zone: 'valle_caucano' },
      });
      expect(result).toBe('hace frío');
    });

    test('finca en pacifico + término regional → reemplaza', () => {
      const text = 'mi rascadero';
      const result = normalizeUserInput(text, {
        finca: { biocultural_zone: 'pacifico' },
      });
      expect(result).toBe('mi rastrojo');
    });
  });
});

describe('glosarioCaucaService — localizeAgentOutput', () => {
  describe('inputs degenerados → passthrough', () => {
    test('null → null', () => {
      expect(localizeAgentOutput(null)).toBe(null);
    });

    test('undefined → undefined', () => {
      expect(localizeAgentOutput(undefined)).toBe(undefined);
    });

    test('número → número', () => {
      expect(localizeAgentOutput(/** @type {any} */ (42))).toBe(42);
    });

    test('objeto → objeto', () => {
      const obj = { text: 'hola' };
      expect(localizeAgentOutput(/** @type {any} */ (obj))).toBe(obj);
    });

    test('string vacío → string vacío', () => {
      expect(localizeAgentOutput('')).toBe('');
    });

    test('string solo whitespace → whitespace', () => {
      expect(localizeAgentOutput('   \n\t  ')).toBe('   \n\t  ');
    });
  });

  describe('regional gate: sin finca cauca → aplica (útil para tests)', () => {
    test('texto con término estándar + finca fuera del Cauca → sin cambios', () => {
      const text = 'debes usar papa criolla';
      const result = localizeAgentOutput(text, {
        finca: { departamento: 'antioquia' },
      });
      expect(result).toBe(text);
    });

    test('texto con término estándar + finca null → aplica glosario', () => {
      const text = 'debes usar papa criolla';
      const result = localizeAgentOutput(text, { finca: null });
      expect(result).toBe('debes usar papa runa');
    });

    test('texto con término estándar + sin opts → aplica glosario', () => {
      const text = 'debes usar papa criolla';
      const result = localizeAgentOutput(text);
      expect(result).toBe('debes usar papa runa');
    });
  });

  describe('reemplazos estándar → regional', () => {
    test('papa criolla → papa runa (force true)', () => {
      expect(localizeAgentOutput('papa criolla', { force: true })).toBe(
        'papa runa'
      );
    });

    test('rastrojo → rascadero (force true)', () => {
      expect(localizeAgentOutput('rastrojo', { force: true })).toBe('rascadero');
    });

    test('frío → jelao (force true)', () => {
      expect(localizeAgentOutput('frío', { force: true })).toBe('jelao');
    });

    test('machete → macheta (force true)', () => {
      expect(localizeAgentOutput('machete', { force: true })).toBe('macheta');
    });

    test('azada → azadón (force true)', () => {
      expect(localizeAgentOutput('azada', { force: true })).toBe('azadón');
    });

    test('cultivo → vegetal (force true)', () => {
      expect(localizeAgentOutput('cultivo', { force: true })).toBe('vegetal');
    });
  });

  describe('reemplazos en oraciones completas', () => {
    test('oración con papa criolla → reemplaza', () => {
      expect(
        localizeAgentOutput('Para tu cultivo, usa papa criolla', {
          force: true,
        })
      ).toBe('Para tu vegetal, usa papa runa');
    });

    test('oración con múltiples términos → reemplaza todos', () => {
      expect(
        localizeAgentOutput(
          'La papa criolla necesita protegerse del frío y el rastrojo',
          { force: true }
        )
      ).toBe('La papa runa necesita protegerse del jelao y el rascadero');
    });

    test('oración con machete → macheta', () => {
      expect(
        localizeAgentOutput('Usa el machete para podar', { force: true })
      ).toBe('Usa el macheta para podar');
    });

    test('oración con cultivo → vegetal', () => {
      expect(
        localizeAgentOutput('El cultivo necesita agua', { force: true })
      ).toBe('El vegetal necesita agua');
    });
  });

  describe('case-insensitive', () => {
    test('PAPA CRIOLLA (mayúsculas) → papa runa', () => {
      expect(localizeAgentOutput('PAPA CRIOLLA', { force: true })).toBe(
        'papa runa'
      );
    });

    test('Frío (primera mayúscula) → jelao', () => {
      expect(localizeAgentOutput('Frío', { force: true })).toBe('jelao');
    });

    test('Rastrojo (primera mayúscula) → rascadero', () => {
      expect(localizeAgentOutput('Rastrojo', { force: true })).toBe('rascadero');
    });
  });

  describe('word boundaries: no debe reemplazar dentro de palabras', () => {
    test('papacriolla (palabra compuesta) → sin reemplazo', () => {
      expect(localizeAgentOutput('papacriolla', { force: true })).toBe(
        'papacriolla'
      );
    });

    test('rastrojera (palabra compuesta) → sin reemplazo', () => {
      expect(localizeAgentOutput('rastrojera', { force: true })).toBe(
        'rastrojera'
      );
    });
  });

  describe('mejor-effort: si no matchea, deja el texto tal cual', () => {
    test('términos que no están en el glosario → sin cambios', () => {
      const text = 'debes usar tomate y cebolla';
      const result = localizeAgentOutput(text, { force: true });
      expect(result).toBe(text);
    });

    test('mix de términos que matchean y no → reemplaza solo los que matchean', () => {
      const result = localizeAgentOutput(
        'usa papa criolla y también tomate',
        { force: true }
      );
      expect(result).toBe('usa papa runa y también tomate');
    });
  });

  describe('con finca en Cauca (sin force)', () => {
    test('finca en cauca + término estándar → reemplaza', () => {
      const text = 'debes sembrar papa criolla';
      const result = localizeAgentOutput(text, {
        finca: { departamento: 'cauca' },
      });
      expect(result).toBe('debes sembrar papa runa');
    });

    test('finca en valle_caucano + término estándar → reemplaza', () => {
      const text = 'hace frío';
      const result = localizeAgentOutput(text, {
        finca: { biocultural_zone: 'valle_caucano' },
      });
      expect(result).toBe('hace jelao');
    });

    test('finca en pacifico + término estándar → reemplaza', () => {
      const text = 'quita el rastrojo';
      const result = localizeAgentOutput(text, {
        finca: { biocultural_zone: 'pacifico' },
      });
      expect(result).toBe('quita el rascadero');
    });
  });

  describe('reverse mapping: solo primera ocurrencia por estándar', () => {
    test('papa criolla tiene múltiples regionales → usa primera (papa runa)', () => {
      expect(localizeAgentOutput('papa criolla', { force: true })).toBe(
        'papa runa'
      );
    });

    test('rastrojo tiene múltiples regionales → usa primera (rascadero)', () => {
      expect(localizeAgentOutput('rastrojo', { force: true })).toBe('rascadero');
    });
  });
});

describe('glosarioCaucaService — getGlosarioStats', () => {
  test('retorna metadata del glosario', () => {
    const stats = getGlosarioStats();
    expect(stats).toHaveProperty('version');
    expect(stats).toHaveProperty('region');
    expect(stats).toHaveProperty('totalTerminos');
  });

  test('version es v1', () => {
    const stats = getGlosarioStats();
    expect(stats.version).toBe('v1');
  });

  test('region es cauca', () => {
    const stats = getGlosarioStats();
    expect(stats.region).toBe('cauca');
  });

  test('totalTerminos es mayor que 0', () => {
    const stats = getGlosarioStats();
    expect(stats.totalTerminos).toBeGreaterThan(0);
  });

  test('totalTerminos coincide con JSON real (80 términos)', () => {
    const stats = getGlosarioStats();
    expect(stats.totalTerminos).toBe(80);
  });
});

describe('glosarioCaucaService — casos borde compuestos', () => {
  test('normalizeUserInput con emoji y término regional → reemplaza término, mantiene emoji', () => {
    const result = normalizeUserInput('🌱 papa runa', { force: true });
    expect(result).toBe('🌱 papa criolla');
  });

  test('localizeAgentOutput con emoji y término estándar → reemplaza término, mantiene emoji', () => {
    const result = localizeAgentOutput('🌱 papa criolla', { force: true });
    expect(result).toBe('🌱 papa runa');
  });

  test('normalizeUserInput con puntuación → mantiene puntuación', () => {
    const result = normalizeUserInput(
      '¿cómo siembro papa runa, jelao?',
      { force: true }
    );
    expect(result).toBe('¿cómo siembro papa criolla, frío?');
  });

  test('normalizeUserInput con comillas → mantiene comillas', () => {
    const result = normalizeUserInput('"papa runa" es un término', {
      force: true,
    });
    expect(result).toBe('"papa criolla" es un término');
  });

  test('normalizeUserInput con paréntesis → mantiene paréntesis', () => {
    const result = normalizeUserInput('uso papa runa (y otras)', {
      force: true,
    });
    expect(result).toBe('uso papa criolla (y otras)');
  });

  test('normalizeUserInput reemplaza múltiples ocurrencias del mismo término', () => {
    const result = normalizeUserInput(
      'papa runa, papa runa y más papa runa',
      { force: true }
    );
    expect(result).toBe('papa criolla, papa criolla y más papa criolla');
  });

  test('normalizeUserInput idempotencia con múltiples términos', () => {
    const text = 'papa runa y rascadero';
    const once = normalizeUserInput(text, { force: true });
    const twice = normalizeUserInput(once, { force: true });
    expect(once).toBe(twice);
    expect(once).toBe('papa criolla y rastrojo');
  });

  test('términos regionales y estándar mezclados → solo reemplaza regionales', () => {
    const result = normalizeUserInput(
      'papa runa y papa criolla',
      { force: true }
    );
    expect(result).toBe('papa criolla y papa criolla');
  });

  test('término regional al inicio y final de oración', () => {
    const result = normalizeUserInput('papa runa es buena, quiero papa runa', {
      force: true,
    });
    expect(result).toBe('papa criolla es buena, quiero papa criolla');
  });

  test('término regional con mayúsculas intercaladas → reemplaza todo a minúsculas', () => {
    const result = normalizeUserInput('PaPa RuNa', { force: true });
    expect(result).toBe('papa criolla');
  });
});
