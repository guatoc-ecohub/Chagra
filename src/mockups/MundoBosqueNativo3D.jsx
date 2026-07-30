/*
 * MundoBosqueNativo3D — vitrina pública del MUNDO BOSQUE NATIVO ALTOANDINO
 * (ruta #/mockups/mundo-bosque-nativo, sin auth).
 *
 * NO reimplementa nada: monta `<Mundo mundoId="bosque">` del framework
 * (src/visual/mundo3d) con el device-tiering REAL (`decidirTier`), para probar
 * de punta a punta el cableado del arquetipo NUEVO `bosque` (registro en
 * arquetipos/Mundo/mundoData) que sirve `EscenaBosque` — el bosque de niebla de
 * tres estratos leído como una lámina de Humboldt viva. En equipo humilde (o con
 * "menos movimiento") se ve el gemelo 2D digno (la lámina de los tres estratos);
 * en gama media/alta, el diorama 3D low-poly (chunk perezoso `vendor-three`).
 *
 * Autocontenida: cero CDN/imágenes externas. Móvil-first. Copy en español de
 * Colombia, en "usted".
 */
import { useMemo, useState } from 'react';
import Mundo, { decidirTier, permite3D } from '../visual/mundo3d/index.js';

const TINTE = ['#3f6f3a', '#c4d6c0'];

export default function MundoBosqueNativo3D() {
  const decision = useMemo(() => decidirTier(), []);
  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  const puede3D = permite3D(decision.tier);
  const [ver2d, setVer2d] = useState(false);
  const tier = ver2d ? 'bajo' : decision.tier;

  return (
    <main
      className="mbn"
      style={{
        '--mbn-a': TINTE[0],
        '--mbn-b': TINTE[1],
        position: 'relative',
        width: '100%',
        /* Altura DEFINIDA (no min-height): el canvas del mundo se dimensiona con
           `height:100%`, y sin una altura definida en la cadena de padres se
           colapsaba a la caja por defecto de 150px (el bosque salía en una
           tira). Con 100dvh definida, el `flex:1` de la sección le da alto real. */
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: TINTE[1],
        overflow: 'hidden',
      }}
    >
      <header style={{ flex: '0 0 auto', padding: '0.9rem 1rem 0' }}>
        <p style={{ margin: 0, font: '600 0.72rem/1.2 system-ui, sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#43593b' }}>
          Los mundos de su finca · vitrina
        </p>
        <h1 style={{ margin: '0.2rem 0 0', font: '800 1.3rem/1.15 system-ui, sans-serif', color: '#22301f' }}>
          El bosque nativo altoandino
        </h1>
        <p style={{ margin: '0.3rem 0 0', maxWidth: '40rem', font: '500 0.9rem/1.4 system-ui, sans-serif', color: '#33452c' }}>
          El monte de niebla que abraza la finca, arriba en el frío: sus tres
          estratos —dosel, sotobosque y suelo—, sus epífitas y su bruma, leídos
          como una lámina de Humboldt viva. Puede girarlo con el dedo.
        </p>
      </header>

      <section
        aria-label="El bosque nativo altoandino y sus tres estratos"
        style={{ position: 'relative', flex: '1 1 auto', minHeight: 0, display: 'flex' }}
      >
        <Mundo
          mundoId="bosque"
          tier={tier}
          reducedMotion={reducedMotion}
          onHotspot={() => {}}
          onSalir={null}
          animo="sereno"
          energia={0.85}
        />
      </section>

      {puede3D && (
        <div style={{ padding: '0.6rem 1rem max(0.9rem, env(safe-area-inset-bottom))', display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => setVer2d((v) => !v)}
            style={{
              appearance: 'none', border: '1px solid rgba(30,46,28,0.4)', borderRadius: '999px',
              padding: '0.5rem 1.1rem', background: 'rgba(236,244,228,0.92)', color: '#253320',
              font: '600 0.82rem/1.1 system-ui, sans-serif', cursor: 'pointer',
            }}
          >
            {ver2d ? 'Ver en 3D' : 'Ver la lámina 2D'}
          </button>
        </div>
      )}
    </main>
  );
}
