/*
 * RestauracionEnElTiempo — la pieza completa: la ladera y el tiempo.
 *
 * El anfitrión. Junta las tres cosas y no hace nada más:
 *   · decide el tier del equipo (`decidirTier`),
 *   · monta la ladera —3D si el equipo da, corte SVG si no—,
 *   · le pone abajo la línea de tiempo.
 *
 * El año vive ACÁ, en un estado de React, y baja como un simple número. Adentro
 * del <Canvas> ese número entra a un ref y de ahí no vuelve a salir: la escena se
 * mueve sola, sin re-renderizar el árbol de React sesenta veces por segundo.
 *
 * La 3D va SOLO perezosa (lazy): un equipo de gama baja jamás se descarga three.
 * Y no se queda sin la pieza — se lleva el corte SVG, que cuenta lo mismo con las
 * mismas curvas y pesa lo que pesa un ícono.
 *
 * Demo aislada: se monta sola, sin rutas ni datos de finca. Es un cuadro, no una
 * pantalla del app.
 */
import { lazy, Suspense, useMemo, useState } from 'react';
import { decidirTier, permite3D } from '../deviceTier.js';
import LineaTiempo from './LineaTiempo.jsx';
import LaderaEnFranjas from './LaderaEnFranjas.jsx';
import './restauracion.css';

/* three + @react-three entran acá y en ningún otro lado. */
const EscenaRestauracion = lazy(() => import('./EscenaRestauracion.jsx'));

/**
 * @param {{
 *   tier?: 'alto'|'medio'|'bajo',
 *   reducedMotion?: boolean,
 *   anioInicial?: number,
 * }} props
 */
export default function RestauracionEnElTiempo({
  tier: tierForzado,
  reducedMotion: calmaForzada,
  anioInicial = 0,
}) {
  // Se decide UNA vez: el equipo no cambia a mitad de camino.
  const decision = useMemo(() => decidirTier(), []);
  const tier = tierForzado || decision.tier;
  const reducedMotion = calmaForzada ?? decision.reducedMotion;

  const [anio, setAnio] = useState(anioInicial);
  const [andando, setAndando] = useState(false);

  const conTres = permite3D(tier);

  return (
    <div className="rest">
      <div className="rest__lienzo">
        {conTres ? (
          <Suspense fallback={<div className="rest__esperando" aria-hidden="true" />}>
            <EscenaRestauracion anio={anio} tier={tier} reducedMotion={reducedMotion} />
          </Suspense>
        ) : (
          <LaderaEnFranjas anio={anio} />
        )}
      </div>

      <LineaTiempo
        anio={anio}
        onAnio={setAnio}
        andando={andando}
        onAndando={setAndando}
        reducedMotion={reducedMotion}
      />
    </div>
  );
}
