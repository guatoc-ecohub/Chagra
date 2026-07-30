/*
 * MOCKUP "El clima como atmósfera viva" — ruta #/mockups/clima-atmosfera.
 *
 * Esta ruta quedo como puente al mundo climatico real. El demo externo la
 * embebe por iframe, asi que el componente debe montar el mismo mundo que
 * usa la ruta publica #/mockups/mundo3d-clima, no una pantalla paralela.
 */
import Mundo3DClima from './Mundo3DClima.jsx';

export default function ClimaAtmosfera({ onBack }) {
  return <Mundo3DClima onBack={onBack} />;
}
