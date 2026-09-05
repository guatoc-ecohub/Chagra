import React from 'react';
import ClimaBoletinScreen from '../components/clima/ClimaBoletinScreen.jsx';

/**
 * #/mockups/clima-atmosfera — la ruta que embebe el mundo `el-tiempo` de
 * 3d.guatoc.co (`demos/3d/el-tiempo/index.html`, producción: no se toca).
 *
 * Historia: aquí vivió el mockup "El clima como atmósfera viva" (PR #2276);
 * el 2026-08-12 (PR #2833) se reemplazó por el mundo 3D del clima. Desde el
 * spec 2026-09-06-unificar-2d-clima los efectos de aquel mockup viven en
 * `components/clima/EscenaAtmosfera.jsx` DENTRO de la página del tiempo
 * canónica, así que esta ruta ya no redirige a ningún prototipo: renderiza la
 * pantalla canónica tal cual (CA-11: la ruta vieja no muere en silencio).
 * Sigue siendo ruta pública de mockups (sin sesión), como el iframe la necesita.
 */
export default function ClimaAtmosfera({ onBack, onNavigate }) {
  return <ClimaBoletinScreen onBack={onBack} onNavigate={onNavigate} />;
}
