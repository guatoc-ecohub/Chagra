/*
 * La ruta legacy #/mockups/clima-atmosfera redirige a la pantalla 2D canónica.
 * Conserva la entrada usada por los iframes existentes.
 */
import { useEffect } from 'react';

export default function ClimaAtmosfera({ onNavigate }) {
  useEffect(() => {
    onNavigate('clima_boletin');
  }, [onNavigate]);

  return null;
}
