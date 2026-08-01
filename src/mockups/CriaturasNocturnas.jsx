/* eslint-disable chagra-i18n/no-hardcoded-spanish -- mockup de diseño: texto de muestra, no cadenas de UI de producción (ADR-050) */
/**
 * CriaturasNocturnas — VITRINA de la fauna NOCTURNA colombiana (+ el cóndor
 * diurno del valle) en el lenguaje biopunk aprobado de GuardianEspiritu:
 * cuerpos oscuros casi negros, contornos neón por especie, ojos con glow.
 * El look oscuro+neón calza con animales que salen de noche.
 *
 * Es un mockup de dirección: pinta las 8 criaturas grandes sobre un cielo
 * nocturno con luna y estrellas, cada una con su nombre, nombre científico y
 * su rol agroecológico REAL (grounding). Datos y avatares se importan del
 * componente reutilizable src/components/dashboard/CriaturasNocturnas.jsx —
 * sin duplicar. Ruta pública #/mockups/criaturas-nocturnas (sin gate). Prefijo `cnv-`.
 */
import {
  CRIATURAS_NOCTURNAS,
  CriaturaNocturnaAvatar,
} from '../components/dashboard/CriaturasNocturnas';
import './criaturas-nocturnas.css';

export default function CriaturasNocturnas({ onBack }) {
  return (
    <div className="cnv">
      <div className="cnv-cielo" aria-hidden="true">
        <span className="cnv-luna" />
        <span className="cnv-estrellas" />
      </div>

      <header className="cnv-head">
        {typeof onBack === 'function' && (
          <button type="button" className="cnv-back" onClick={onBack}>← Volver</button>
        )}
        <span className="cnv-kicker">LA FINCA DE NOCHE</span>
        <h1 className="cnv-title">Criaturas nocturnas de su finca</h1>
        <p className="cnv-sub">
          Siete aliados que trabajan cuando usted duerme —y el cóndor que vigila el valle de día—.
          Fauna nativa colombiana, real y verificable, en el mismo estilo de sus guardianes.
        </p>
      </header>

      <ul className="cnv-grid" aria-label="Criaturas nocturnas">
        {CRIATURAS_NOCTURNAS.map((c) => (
          <li
            key={c.id}
            className="cnv-card"
            style={{ '--cnv-acc': c.acc, '--cnv-acc-rgb': c.accRgb }}
            data-especie={c.id}
          >
            <div className="cnv-card-avatar">
              <CriaturaNocturnaAvatar id={c.id} size={132} />
            </div>
            <div className="cnv-card-txt">
              <span className="cnv-card-eje">{c.eje}</span>
              <h2 className="cnv-card-nombre">{c.nombre}</h2>
              <p className="cnv-card-cientifico">{c.cientifico}</p>
              <p className="cnv-card-rol">{c.rol}</p>
              <span className="cnv-card-fuente">{c.fuente}</span>
            </div>
          </li>
        ))}
      </ul>

      <footer className="cnv-foot">
        <p>Grounding: cada especie es fauna nativa colombiana con nombre científico correcto y rol agroecológico real. Ninguna es inventada.</p>
      </footer>
    </div>
  );
}
