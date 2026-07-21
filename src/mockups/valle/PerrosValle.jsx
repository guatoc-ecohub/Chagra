/*
 * Los perros de la casa en el valle: dos billboards rubber-hose livianos,
 * posados sobre el terreno y con aire suficiente para que cada raza se lea.
 * Viven en todos los tiers; los componentes de criatura podan su movimiento
 * internamente y reducedMotion los deja en un fotograma quieto.
 */
import { Html } from '@react-three/drei';
import { Dalmata } from '../../visual/creatures/Dalmata.jsx';
import { Beagle } from '../../visual/creatures/Beagle.jsx';

const PERROS = [
  {
    id: 'oliver-dalmata',
    Component: Dalmata,
    punto: [-2.5, 3.25],
    px: 42,
    factor: 7.8,
    dy: 0.36,
  },
  {
    id: 'dante-beagle',
    Component: Beagle,
    punto: [0.85, 3.85],
    px: 38,
    factor: 7.4,
    dy: 0.3,
  },
];

function PerroBillboard({ perro, alturaDe, tier, animated }) {
  const { Component } = perro;
  const [x, z] = perro.punto;
  const y = (alturaDe ? alturaDe(x, z) : 0) + perro.dy;

  return (
    <group position={[x, y, z]}>
      <Html center distanceFactor={perro.factor} zIndexRange={[6, 0]} pointerEvents="none">
        <div className="valle-critter" data-perro={perro.id} aria-hidden="true">
          <Component
            size={perro.px}
            animated={animated}
            tier={tier}
            vida={animated}
          />
        </div>
      </Html>
    </group>
  );
}

/**
 * @param {Object} props
 * @param {(x:number, z:number) => number} props.alturaDe
 * @param {'bajo'|'medio'|'alto'} [props.tier='alto']
 * @param {boolean} [props.reducedMotion=false]
 */
export function PerrosValle({ alturaDe, tier = 'alto', reducedMotion = false }) {
  const animated = !reducedMotion;

  return (
    <group>
      {PERROS.map((perro) => (
        <PerroBillboard
          key={perro.id}
          perro={perro}
          alturaDe={alturaDe}
          tier={tier}
          animated={animated}
        />
      ))}
    </group>
  );
}

export default PerrosValle;
