/*
 * NavegacionPisosTermicos — vitrina de la navegación unificada por pisos
 * térmicos (ruta `#/mockups/navegacion-pisos`, sin auth).
 *
 * Monta el host real `NavegacionPisos` (los tres zooms: minimapa siempre
 * visible, mapa estratégico y vista global) sobre un fondo sencillo que hace
 * de "usted está en un mundo": aquí se valida la navegación, no el mundo.
 * Demo con el usuario parado en el mundo del café (piso templado) para que
 * el "usted está aquí" se vea en los tres zooms.
 */
import NavegacionPisos from '../visual/navegacion/NavegacionPisos.jsx';

/**
 * @param {object} props
 * @param {(view: string, data?: object|null) => void} [props.onNavigate]
 * @param {() => void} [props.onBack]
 */
export default function NavegacionPisosTermicos({ onNavigate, onBack }) {
  return (
    <div className="navv-fondo">
      <style>{`
        .navv-fondo { position: fixed; inset: 0; overflow: hidden;
          background: linear-gradient(#b9d2df 0%, #d9e2d2 42%, #6f9e4a 70%, #4c6b33 100%); }
        .navv-tarjeta { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          max-width: 520px; padding: 22px 28px; border-radius: 16px; text-align: center;
          background: rgba(20, 26, 20, 0.72); color: #f2ead4; font-family: 'Baloo 2', Georgia, serif; }
        .navv-tarjeta h1 { margin: 0 0 8px; font-size: 22px; }
        .navv-tarjeta p { margin: 0; font-size: 14.5px; line-height: 1.5; color: #ded5b8; }
        .navv-volver { position: absolute; top: 14px; left: 14px; border: 1.5px solid #cdbf9b;
          background: rgba(26, 32, 27, 0.82); color: #f2ead4; font: 600 14px 'Baloo 2', Georgia, serif;
          padding: 8px 14px; border-radius: 999px; cursor: pointer; }
      `}</style>
      <div className="navv-tarjeta">
        <h1>Navegación por pisos térmicos</h1>
        <p>
          Usted está en el mundo del café (piso templado). Use el minimapa de la
          esquina para orientarse, el mapa de la finca para ver todas las fichas,
          o la vista global para recorrer la lámina completa — del valle cálido
          al páramo con su Chorrera, junto al nevado.
        </p>
      </div>
      {onBack && (
        <button type="button" className="navv-volver" onClick={onBack} aria-label="Volver">
          ← Volver
        </button>
      )}
      <NavegacionPisos mundoActual="cafe" onNavigate={onNavigate} />
    </div>
  );
}
