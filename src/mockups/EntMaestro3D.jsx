/*
 * EntMaestro3D — vitrina pública del ENT MAESTRO, el guardián del suelo vivo.
 * Ruta #/mockups/ent-maestro, sin auth.
 *
 * Muestra a EscenaEntMaestro SOLA (el árbol con rostro tallado que abre la
 * tierra y enseña sus capas). La escena ya trae su propio Canvas y cámara
 * orbital, así que este mockup solo la monta como host standalone.
 *
 * Device-tiering REAL (`decidirTier`): gama media/alta ve el diorama 3D;
 * equipo humilde, sin WebGL o reduced-motion cae a la ficha 2D digna.
 * Copy en español de Colombia, en "usted". Autocontenido: CSS embebido, cero
 * CDN/imágenes externas.
 *
 * Nota sobre ciclo de horas: EscenaEntMaestro no expone una prop de hora
 * (tiene atmósfera de páramo fija). Por eso este mockup no incluye selector de
 * mañana/tarde/noche; queda para una fase futura si el contrato de la escena
 * crece.
 */
import { lazy, Suspense, useMemo, useState } from 'react';
import { decidirTier, permite3D } from '../visual/mundo3d/deviceTier.js';

const EscenaEntMaestro = lazy(() => import('../visual/mundo3d/bosque/EscenaEntMaestro.jsx'));

/* Lo que enseña el Ent maestro (verificado, en "usted"). */
const SABERES = [
  {
    emoji: '🍂',
    titulo: 'Hojarasca',
    texto: 'La capa de hojas caídas que abriga el suelo, como una cobija que retiene humedad y alimento para los bichos del suelo.',
  },
  {
    emoji: '🪱',
    titulo: 'Humus',
    texto: 'La tierra negra viva que las lombrices y microorganismos hacen a partir de la hojarasca. Es el estómago del suelo.',
  },
  {
    emoji: '🌱',
    titulo: 'Zona de raíces',
    texto: 'Donde las raíces de las plantas beben y se sostienen. Aquí el suelo ya no es tierra suelta: es un tejido vivo.',
  },
  {
    emoji: '🕸️',
    titulo: 'Red micorrízica',
    texto: 'Los hifos de los hongos se enredan con las raíces y reparten nutrientes de planta a planta, como internet bajo tierra.',
  },
  {
    emoji: '🪨',
    titulo: 'Roca madre',
    texto: 'El piso de abajo, de donde todo parte. Lenta, fría y paciente: de ella se desprenden los minerales que suben a la vida.',
  },
];

export default function EntMaestro3D() {
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
  const tier = ver2d || !puede3D ? 'bajo' : decision.tier;
  const mostrar3D = puede3D && !ver2d;

  return (
    <main className="entm3d">
      <style>{CSS}</style>
      <header className="entm3d__head">
        <p className="entm3d__kicker">El suelo vivo · vitrina</p>
        <h1>El Ent maestro</h1>
        <p className="entm3d__lema">
          El guardián del páramo abre la tierra y enseña sus capas. Gírelo con el
          dedo, acérquese al corte y mire cómo la red de hongos reparte la comida.
        </p>
      </header>

      <section className="entm3d__escena" aria-label="El Ent maestro en 3D">
        <div className="entm3d__lienzo">
          {mostrar3D ? (
            <Suspense
              fallback={
                <div className="entm3d__cargando" role="status">
                  Despertando al guardián del suelo…
                </div>
              }
            >
              <EscenaEntMaestro tier={tier} reducedMotion={reducedMotion} />
            </Suspense>
          ) : (
            <FichaEntMaestro />
          )}
        </div>

        <div className="entm3d__barra">
          <p className="entm3d__tier">
            {mostrar3D
              ? 'Está viendo el Ent maestro en 3D. Gírelo con el dedo o el mouse.'
              : puede3D
                ? 'Está viendo la ficha del guardián.'
                : 'Su equipo ve la ficha del guardián (va parejo en cualquier teléfono).'}
          </p>
          {puede3D && (
            <button
              type="button"
              className="entm3d__toggle"
              onClick={() => setVer2d((v) => !v)}
            >
              {ver2d ? 'Ver el Ent en 3D' : 'Ver la ficha'}
            </button>
          )}
        </div>
      </section>

      <section className="entm3d__saberes" aria-label="Lo que enseña el Ent maestro">
        <h2>Lo que enseña el guardián del suelo</h2>
        <ol>
          {SABERES.map((s) => (
            <li key={s.titulo}>
              <span className="entm3d__emoji" aria-hidden="true">{s.emoji}</span>
              <div>
                <b>{s.titulo}</b>
                <p>{s.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="entm3d__cierre">
          Cuidar el suelo vivo es cuidar la finca de arriba abajo. El Ent no la
          enseña para asustar: la abre para que sepa qué está sosteniendo cada cosecha.
        </p>
      </section>
    </main>
  );
}

/* La ficha del guardián: el fallback digno para equipo humilde / sin-WebGL. */
function FichaEntMaestro() {
  return (
    <div className="entm3d__ficha" role="img" aria-label="El Ent maestro, guardián del suelo vivo">
      <div className="entm3d__arbol2d" aria-hidden="true">
        <span className="entm3d__copa" />
        <span className="entm3d__tronco" />
        <span className="entm3d__cara">
          <span className="entm3d__ojo" />
          <span className="entm3d__ojo" />
        </span>
        <span className="entm3d__raiz" />
        <span className="entm3d__raiz entm3d__raiz--derecha" />
      </div>
      <p className="entm3d__ficha-nombre">Ent maestro · guardián del páramo</p>
      <p className="entm3d__ficha-sub">Abre la tierra y enseña el suelo vivo</p>
    </div>
  );
}

const CSS = `
.entm3d {
  min-height: 100vh;
  min-height: 100dvh;
  padding: 1rem 0.9rem 2.5rem;
  background: linear-gradient(180deg, #cfd8d6 0%, #dce2dc 44%, #e8e6d8 100%);
  color: #26302b;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}
.entm3d__head {
  max-width: 46rem;
  margin: 0 auto 1rem;
}
.entm3d__kicker {
  margin: 0 0 0.2rem;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #5c6f47;
}
.entm3d__head h1 {
  margin: 0;
  font-size: clamp(1.5rem, 5vw, 2.2rem);
  line-height: 1.15;
  color: #2a3b31;
}
.entm3d__lema {
  margin: 0.4rem 0 0;
  font-size: 0.98rem;
  line-height: 1.45;
  max-width: 40rem;
}

.entm3d__escena {
  max-width: 46rem;
  margin: 0 auto;
}
.entm3d__lienzo {
  position: relative;
  height: min(66vh, 32rem);
  min-height: 320px;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(92, 111, 71, 0.25);
  box-shadow: 0 12px 30px rgba(40, 52, 44, 0.16);
  background: radial-gradient(120% 90% at 50% 20%, #c7d1cf 0%, #aeb9b3 100%);
}
.entm3d__lienzo canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
  touch-action: none;
}
.entm3d__cargando {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 0.9rem;
  color: #3a4a40;
  opacity: 0.85;
}

.entm3d__barra {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.6rem;
}
.entm3d__tier {
  margin: 0;
  font-size: 0.85rem;
  opacity: 0.85;
}
.entm3d__toggle {
  border: 1.5px solid #5c6f47;
  background: #fff;
  color: #5c6f47;
  font-weight: 700;
  font-size: 0.85rem;
  padding: 0.45rem 0.9rem;
  border-radius: 999px;
  cursor: pointer;
}
.entm3d__toggle:hover,
.entm3d__toggle:focus-visible {
  background: #5c6f47;
  color: #fff;
  outline-offset: 2px;
}

/* ---- Ficha 2D (fallback digno, sin GPU) ---- */
.entm3d__ficha {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  background: radial-gradient(120% 90% at 50% 25%, #cfd7d0 0%, #9fa89f 100%);
}
.entm3d__arbol2d {
  position: relative;
  width: 140px;
  height: 190px;
  margin-bottom: 0.4rem;
}
.entm3d__copa {
  position: absolute;
  top: 0;
  left: 50%;
  width: 130px;
  height: 110px;
  transform: translateX(-50%);
  border-radius: 46% 54% 60% 40% / 58% 56% 44% 42%;
  background: radial-gradient(circle at 40% 35%, #8b9c72 0%, #5c6f47 70%, #4a5b3a 100%);
  box-shadow: inset -8px -6px 14px rgba(0, 0, 0, 0.18);
}
.entm3d__tronco {
  position: absolute;
  bottom: 18px;
  left: 50%;
  width: 34px;
  height: 98px;
  transform: translateX(-50%);
  border-radius: 40% 40% 30% 30%;
  background: linear-gradient(90deg, #5c3226 0%, #9a5236 45%, #c4835c 60%, #6e3a2a 100%);
}
.entm3d__cara {
  position: absolute;
  bottom: 48px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
}
.entm3d__ojo {
  width: 8px;
  height: 10px;
  border-radius: 50%;
  background: #17110d;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.25), inset 1px -1px 0 rgba(240, 245, 235, 0.6);
}
.entm3d__raiz {
  position: absolute;
  bottom: 0;
  left: 32px;
  width: 52px;
  height: 26px;
  border-radius: 50% 50% 0 0 / 80% 80% 0 0;
  background: #6b4a2e;
  transform: rotate(-20deg);
  transform-origin: top center;
  opacity: 0.85;
}
.entm3d__raiz--derecha {
  left: auto;
  right: 32px;
  transform: rotate(20deg);
}
.entm3d__ficha-nombre {
  margin: 0;
  font-weight: 800;
  font-size: 1rem;
  color: #2a3b31;
}
.entm3d__ficha-sub {
  margin: 0;
  font-size: 0.85rem;
  color: #4a5a4a;
}

/* ---- Saberes ---- */
.entm3d__saberes {
  max-width: 46rem;
  margin: 1.6rem auto 0;
}
.entm3d__saberes h2 {
  font-size: 1.15rem;
  margin: 0 0 0.7rem;
  color: #2a3b31;
}
.entm3d__saberes ol {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.6rem;
}
@media (min-width: 640px) {
  .entm3d__saberes ol {
    grid-template-columns: 1fr 1fr;
  }
}
.entm3d__saberes li {
  display: flex;
  gap: 0.65rem;
  align-items: flex-start;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(92, 111, 71, 0.16);
  border-radius: 12px;
  padding: 0.7rem 0.8rem;
}
.entm3d__emoji {
  font-size: 1.4rem;
  line-height: 1.2;
}
.entm3d__saberes b {
  display: block;
  font-size: 0.92rem;
  color: #2a3b31;
}
.entm3d__saberes li p {
  margin: 0.15rem 0 0;
  font-size: 0.86rem;
  line-height: 1.42;
}
.entm3d__cierre {
  margin: 1rem 0 0;
  font-size: 0.95rem;
  line-height: 1.5;
  font-style: italic;
  color: #3a4a3a;
}

@media (prefers-reduced-motion: reduce) {
  .entm3d__lienzo canvas {
    transition: none;
  }
}
`;
