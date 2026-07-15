/**
 * NavegadorGrafoDemo.jsx — demo aislada del navegador del grafo (B7).
 *
 * Envoltura mínima a propósito: todo el arte vive en
 * `src/visual/mundo3d/grafo/` y esta demo solo le da una pantalla completa
 * donde pararse. Así el navegador se puede montar mañana dentro del mundo, en
 * una pestaña o en un panel sin tocar una línea suya.
 *
 * Ruta sugerida (NO cableada aquí, la cablea quien integre):
 *   `#/mockups/navegador-grafo`
 *
 * Qué mirar cuando la abra:
 *  · La montaña. El eje vertical es el piso térmico REAL (Caldas, 1808): el aro
 *    ancho del medio es el frío —39 matas, el corazón de la chagra— y arriba los
 *    aros vacíos del superpáramo y el nival, donde ya no se siembra.
 *  · Las cuerdas de fique trenzadas: la milpa. Toque el maíz y sígalas.
 *  · Abajo, separado y en niebla, el aro de «sin altura declarada»: las 55 matas
 *    que el grafo describe pero de las que todavía no dice a qué piso van. El
 *    mapa muestra sus huecos en vez de inventarles una altura.
 *  · Toque cualquier nodo: el resto se hunde en la niebla y queda su vecindario.
 *    Los nombres de la carta son botones — se salta de mata en mata.
 */

import NavegadorGrafo from '../visual/mundo3d/grafo/NavegadorGrafo.jsx';

export default function NavegadorGrafoDemo() {
  return (
    <main style={{ width: '100%', height: '100dvh', background: '#302417' }}>
      <NavegadorGrafo />
    </main>
  );
}
