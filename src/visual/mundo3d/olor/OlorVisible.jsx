/*
 * OlorVisible — la pieza completa: la cochera y su aire.
 *
 * El anfitrión. Junta las tres cosas y no hace nada más:
 *   · decide el tier del equipo (`decidirTier`),
 *   · monta la cochera —3D si el equipo da, corte de perfil si no—,
 *   · le pone abajo la palada de material seco.
 *
 * El carbono vive ACÁ, en un estado de React, y baja como un simple número.
 * Adentro del <Canvas> ese número entra a un ref y de ahí no vuelve a salir: la
 * escena se mueve sola, sin re-renderizar el árbol sesenta veces por segundo.
 *
 * La 3D va SOLO perezosa (lazy): un equipo de gama baja jamás se descarga three.
 * Y no se queda sin la pieza — se lleva el corte SVG, que cuenta lo mismo con el
 * mismo modelo y pesa lo que pesa un ícono. En esta pieza el corte además tiene
 * una ventaja propia: el argumento es una altura, y el perfil es el dibujo que
 * mejor muestra alturas. No es la versión pobre; es la otra lectura.
 *
 * ARRANCA EN CERO, y eso no es un default cualquiera: la pieza empieza en la
 * cochera que el que mira ya tiene. Primero se reconoce, después se mueve.
 *
 * Demo aislada: se monta sola, sin rutas ni datos de finca. Es un cuadro, no una
 * pantalla del app.
 */
import { lazy, Suspense, useMemo, useState } from 'react';
import { decidirTier, permite3D } from '../deviceTier.js';
import PaladaDeSeco from './PaladaDeSeco.jsx';
import CocheraEnCorte from './CocheraEnCorte.jsx';
import './olor.css';

/* three + @react-three entran acá y en ningún otro lado. */
const EscenaOlorVisible = lazy(() => import('./EscenaOlorVisible.jsx'));

/**
 * @param {{
 *   tier?: 'alto'|'medio'|'bajo',
 *   reducedMotion?: boolean,
 *   carbonoInicial?: number,
 * }} props
 */
export default function OlorVisible({
  tier: tierForzado,
  reducedMotion: calmaForzada,
  carbonoInicial = 0,
}) {
  // Se decide UNA vez: el equipo no cambia a mitad de camino.
  const decision = useMemo(() => decidirTier(), []);
  const tier = tierForzado || decision.tier;
  const reducedMotion = calmaForzada ?? decision.reducedMotion;

  const [carbono, setCarbono] = useState(carbonoInicial);

  const conTres = permite3D(tier);

  return (
    <div className="olor">
      <div className="olor__lienzo">
        {conTres ? (
          <Suspense fallback={<div className="olor__esperando" aria-hidden="true" />}>
            <EscenaOlorVisible carbono={carbono} tier={tier} reducedMotion={reducedMotion} />
          </Suspense>
        ) : (
          <CocheraEnCorte carbono={carbono} />
        )}
      </div>

      <PaladaDeSeco carbono={carbono} onCarbono={setCarbono} />
    </div>
  );
}
