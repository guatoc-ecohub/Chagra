/*
 * EscenaEstiercol — EL MUNDO "la mierda volviéndose gas y abono".
 *
 * El estiércol es el problema más real y menos glamoroso de la finca: apesta,
 * cría mosca y pelea con el vecino. Esta escena no lo esconde ni lo maquilla —
 * lo abre en canal. Dos piezas en CORTE, una al lado de la otra, y el círculo
 * que las une:
 *
 *   · EL BIODIGESTOR (izquierda): la manga de polietileno en su zanja, partida
 *     a lo largo. Se ve el lodo llenando tres cuartos, la campana de gas en el
 *     cuarto de arriba, las burbujas de metano subiendo sin una gota de aire, y
 *     el biogás saliendo por la manguera hasta la hornilla, donde arde AZUL.
 *     Por el otro extremo sale el biol hacia el cultivo.
 *
 *   · LA BIOCOMPOSTERA (derecha): tres cajones en corte. Las capas (estiércol
 *     y material seco, y el seco más grueso), el corazón caliente que mata
 *     patógenos y semilla de maleza, el volteo, y la lombriz al final —solo al
 *     final—.
 *
 *   · EL ANILLO: animal → estiércol → biodigestor/compostera → gas + abono →
 *     suelo → comida → animal. Se camina con el ojo siguiendo un pulso.
 *
 *   · Y AFUERA, EL MONTÓN MAL LLEVADO: la única estación que no está en el
 *     círculo. Suelta amoníaco verde que se arrastra en vez de subir. Eso es
 *     nitrógeno yéndose al aire — plata. Está ahí para que esto no sea un
 *     folleto.
 *
 * ── LA CÁMARA MIRA DESDE +Z Y ESO NO ES CAPRICHO ───────────────────────────
 * Todas las piezas nacen cortadas en el plano z=0 conservando la mitad de
 * atrás (ver la convención en `biodigestor.geom.js`). Por eso los dos héroes
 * NO se rotan tangentes al anillo: quedan mirando a la cámara, que es de donde
 * el corte se lee. El anillo pasa por ellos; ellos no giran con él.
 *
 * ── TIER Y CALMA ───────────────────────────────────────────────────────────
 * Todo se degrada por `paramsDeTier` (menos burbujas, menos pulsos, sin
 * moscas, sin invernadero) sin perder NUNCA la lección. Con `reducedMotion`
 * monta quieto: las burbujas quedan repartidas por la columna, el humo
 * congelado en su jirón, la llama fija. Todo sigue ahí — la lección no depende
 * del movimiento.
 *
 * Componente r3f standalone: trae su propio `<Canvas>` y su `<LuzMadre>` (GUIA
 * §3). Importa three → montar SIEMPRE perezoso, dentro de un host que dé alto.
 */
import { Suspense, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr, Html } from '@react-three/drei';
import { LuzMadre, CIELOS, mezclarCielo } from '../paleta/index.js';
import { perfilDeTier } from '../deviceTier.js';
import { paramsDeTier, ESTACIONES, posEstacion } from './estiercol.geom.js';
import { CLIMAS } from './biodigestor.geom.js';
import Biodigestor from './Biodigestor.jsx';
import Biocompostera, { MontonMalLlevado } from './Biocompostera.jsx';
import CicloCerrado from './CicloCerrado.jsx';
import './estiercol.css';

/* ── UN HOTSPOT: el punto que se toca y la ficha que se abre. El texto sale de
      ESTACIONES (el corpus hablando, en usted). ── */
function Hotspot({ estacion, abierta, onToggle }) {
  const pos = useMemo(() => posEstacion(estacion.id), [estacion.id]);
  const malo = estacion.id === 'monton';
  const p = [pos.x, (estacion.pos ? pos.y : 0) + (estacion.alturaHot ?? 1.15), pos.z];

  if (abierta) {
    return (
      <Html position={p} center={false} zIndexRange={[20, 0]}>
        <div className="est-ficha">
          <button className="est-ficha__cerrar" onClick={onToggle} aria-label="Cerrar">
            ×
          </button>
          <p className="est-ficha__tit">{estacion.etiqueta}</p>
          <p className="est-ficha__txt">{estacion.nota}</p>
        </div>
      </Html>
    );
  }
  return (
    <Html position={p} center={false} zIndexRange={[10, 0]}>
      <div className={`est-hot ${malo ? 'est-hot--malo' : ''}`}>
        <button className="est-hot__btn" onClick={onToggle}>
          <span className="est-hot__pt" />
          {estacion.etiqueta}
        </button>
      </div>
    </Html>
  );
}

/* ── EL MUNDO: las piezas puestas en su sitio. Los dos héroes van a sus
      estaciones SIN rotar (el corte mira a la cámara — ver cabecera). ── */
function Mundo({ perfil, params, clima, reducedMotion }) {
  const posBio = useMemo(() => posEstacion('biodigestor'), []);
  const posComp = useMemo(() => posEstacion('compostera'), []);
  const posMonton = useMemo(() => posEstacion('monton'), []);

  return (
    <>
      <CicloCerrado perfil={perfil} params={params} reducedMotion={reducedMotion} />

      <group position={posBio}>
        <Biodigestor perfil={perfil} params={params} clima={clima} reducedMotion={reducedMotion} />
      </group>

      <group position={posComp}>
        <Biocompostera perfil={perfil} params={params} reducedMotion={reducedMotion} />
      </group>

      {/* fuera del anillo, a propósito: de aquí no vuelve nada al suelo */}
      {params.montonMalo && (
        <group position={posMonton}>
          <MontonMalLlevado perfil={perfil} params={params} reducedMotion={reducedMotion} />
        </group>
      )}
    </>
  );
}

/**
 * La escena completa.
 * @param {object} props
 * @param {'alto'|'medio'|'bajo'} [props.tier]
 * @param {boolean} [props.reducedMotion]
 * @param {'calido'|'frio'} [props.climaInicial]  el régimen térmico (ver CLIMAS)
 */
export default function EscenaEstiercol({
  tier = 'alto',
  reducedMotion = false,
  climaInicial = 'frio',
}) {
  const [lista, setLista] = useState(false);
  const [abierta, setAbierta] = useState(null);
  const [clima, setClima] = useState(climaInicial);

  const perfil = useMemo(() => perfilDeTier(tier), [tier]);
  const params = useMemo(() => paramsDeTier(tier), [tier]);

  /* la familia de cielo: 'corral'. Es literalmente el patio de la finca — y la
     ley 60%-hacia-la-madre la aplica `mezclarCielo`, nunca un hex a mano. */
  const cielo = useMemo(() => mezclarCielo(CIELOS.corral), []);

  const estaciones = useMemo(
    () => ESTACIONES.filter((e) => e.id !== 'monton' || params.montonMalo),
    [params.montonMalo],
  );

  return (
    <>
      <Canvas
        className={`est-canvas ${lista ? 'est-canvas--lista' : ''}`}
        dpr={perfil.dpr}
        gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
        shadows={perfil.sombras}
        camera={{ position: [0, 5.6, 15.5], fov: 44 }}
        frameloop={reducedMotion ? 'demand' : 'always'}
        onCreated={() => setLista(true)}
      >
        <color attach="background" args={[cielo.fondo]} />
        {perfil.fog && <fog attach="fog" args={[cielo.niebla, 16, 42]} />}
        <LuzMadre cielo={CIELOS.corral} perfil={perfil} />

        <Suspense fallback={null}>
          <Mundo perfil={perfil} params={params} clima={clima} reducedMotion={reducedMotion} />
          {estaciones.map((e) => (
            <Hotspot
              key={e.id}
              estacion={e}
              abierta={abierta === e.id}
              onToggle={() => setAbierta(abierta === e.id ? null : e.id)}
            />
          ))}
        </Suspense>

        <OrbitControls
          target={[0, 1.1, 3.4]}
          enablePan={false}
          minDistance={7}
          maxDistance={22}
          maxPolarAngle={Math.PI / 2.15} /* no dejamos meter la cámara bajo tierra */
          enableDamping={!reducedMotion}
        />
        <AdaptiveDpr pixelated />
      </Canvas>

      {/* ── TIERRA FRÍA / TIERRA CALIENTE: el mismo biodigestor, otro
             rendimiento. En frío hay menos burbujas y más lentas, y aparece el
             invernadero encima de la zanja. No es un filtro de color: es la
             razón por la que en el páramo esto rinde menos ── */}
      <div className="est-clima" role="group" aria-label="Clima del biodigestor">
        {Object.values(CLIMAS).map((c) => (
          <button
            key={c.id}
            className={`est-clima__btn ${clima === c.id ? 'est-clima__btn--on' : ''}`}
            onClick={() => setClima(c.id)}
            aria-pressed={clima === c.id}
          >
            {c.etiqueta}
          </button>
        ))}
      </div>
    </>
  );
}
