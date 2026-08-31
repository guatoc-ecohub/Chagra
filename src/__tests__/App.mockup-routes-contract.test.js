import { describe, expect, it } from 'vitest';
import appSource from '../App.jsx?raw';

function getRouteEntries(constantName) {
  const block = appSource.match(new RegExp(`const ${constantName} = \\{([\\s\\S]*?)^\\};`, 'm'));
  if (!block) throw new Error(`No se encontro ${constantName} en App.jsx`);

  return [...block[1].matchAll(/^ {2}'([^']+)': '([^']+)'/gm)]
    .map(([, route, view]) => ({ route, view }));
}

const switchCases = new Set([...appSource.matchAll(/case '([^']+)'/g)].map(([, view]) => view));

describe('App route contracts', () => {
  it('conecta cada ruta publica mockups con un case de render', () => {
    const mockupRoutes = getRouteEntries('MOCKUP_HASH_ROUTES');

    expect(mockupRoutes).not.toHaveLength(0);
    expect(mockupRoutes.filter(({ view }) => !switchCases.has(view))).toEqual([]);
  });

  it.each([
    ['mundo-subsuelo', 'subsuelo'],
    ['almacenamiento-conservacion', 'almacenamiento'],
    ['bosque-comestible', 'restauracion'],
    ['comida-que-alimenta', 'nutricion'],
  ])('conecta el alias %s con la vista %s', (route, view) => {
    const hashRoutes = new Map(getRouteEntries('HASH_VIEW_ROUTES').map(({ route: key, view: value }) => [key, value]));

    expect(hashRoutes.get(route)).toBe(view);
    expect(switchCases.has(view)).toBe(true);
  });

  it('conecta ShowcaseArtesania como ruta mockup publica', () => {
    const mockupRoutes = new Map(getRouteEntries('MOCKUP_HASH_ROUTES').map(({ route, view }) => [route, view]));

    expect(mockupRoutes.get('mockups/showcase-artesania')).toBe('mockup_showcase_artesania');
    expect(switchCases.has('mockup_showcase_artesania')).toBe(true);
  });
});
