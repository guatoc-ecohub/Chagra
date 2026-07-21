/* eslint-disable chagra-i18n/no-hardcoded-spanish -- UI español intencional; ADR-050 i18n pendiente */
/*
 * CuadernoVivo — EL CUADERNO VIVO completo: observar → registrar → aprender.
 *
 * La columna educativa de Chagra hecha objeto. No es un dashboard con tema
 * de papel: es el cuaderno de finca que el campesino ya conoce — tapa de
 * cabuya, lomo cosido, renglón azuloso, margen destiñido — devolviéndole
 * su propia tierra con claridad:
 *
 *   1. LA MIRADA (observar): los cuatro gestos del método — envés,
 *      cogollo, suelo, mata vecina. Mirar es método, no casualidad.
 *   2. LAS PÁGINAS (registrar): anotar como cuidado, no como trámite. La
 *      tinta tiene edad; el fracaso tiene su página digna con su hoja
 *      prensada; el eco al margen es la finca hablando con las palabras
 *      del propio dueño.
 *   3. EL TABLÓN, TRES AÑOS (aprender): la misma era, tres temporadas
 *      lado a lado, y la lección en la voz del que anota.
 *   4. LO QUE VA A SU PASO (la paciencia): renglones por año, sin barra
 *      ni porcentaje.
 *
 * REGLA DURA (del operador): CERO gamificación. Ni puntos, ni rachas, ni
 * medallas, ni "¡va muy bien!". El cuaderno refleja; no premia.
 *
 * CONTRATO: pura vista (DOM/SVG, cero three, cero fetch). Consume `data`
 * con el shape de DEMO_CUADERNO y NUNCA fabrica estado; sin props muestra
 * el cuaderno de muestra. El cableo a las anotaciones reales de la finca
 * (logs → páginas, fechas → ecos) es de quien integre.
 *
 *   import CuadernoVivo from './visual/cuaderno/CuadernoVivo.jsx';
 *   <CuadernoVivo reducedMotion={reducedMotion} />
 *
 * `reducedMotion` apaga la entrada suave de las páginas (además del media
 * query, que aplica solo).
 */
import './cuadernoVivo.css';
import { DEMO_CUADERNO } from './cuadernoData.js';
import PaginaCuaderno from './PaginaCuaderno.jsx';
import TresTemporadas from './TresTemporadas.jsx';
import LaPaciencia from './LaPaciencia.jsx';
import { GlifoMirada, SubrayadoVivo } from './TrazoVivo.jsx';

/* ── La mirada: el método de observar ──────────────────────────────────── */

function LaMirada({ miradas }) {
  if (!miradas?.length) return null;
  return (
    <section className="cv-mirada" aria-label="Cómo se mira una finca">
      <h3 className="cv-seccion__titulo">Antes de anotar, mire</h3>
      <p className="cv-seccion__entrada">
        La lupa del campesino son sus ojos y sus manos. Mirar bien es un
        método, y el método cabe en cuatro gestos:
      </p>
      <ul className="cv-mirada__gestos">
        {miradas.map((m, i) => (
          <li key={m.id} className="cv-mirada__gesto" style={{ '--cv-giro': `${((i % 2 ? -1 : 1) * (0.4 + i * 0.15)).toFixed(2)}deg` }}>
            <GlifoMirada tipo={m.id} seed={19 + i * 7} className="cv-mirada__glifo" />
            <h4 className="cv-mirada__titulo">{m.titulo}</h4>
            <p className="cv-mirada__gesto-texto">{m.gesto}</p>
            <p className="cv-mirada__texto">{m.texto}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── El cuaderno completo ──────────────────────────────────────────────── */

export default function CuadernoVivo({ data = DEMO_CUADERNO, reducedMotion = false, className = '' }) {
  return (
    <div
      className={`cv-cuaderno ${className}`.trim()}
      data-reduced={reducedMotion ? 'true' : undefined}
    >
      {/* La tapa: cabuya, costura de lomo, título a mano */}
      <header className="cv-tapa">
        <div className="cv-tapa__costura" aria-hidden="true" />
        <h2 className="cv-tapa__titulo">{data.titulo}</h2>
        <SubrayadoVivo seed={3} className="cv-tapa__subrayado" />
        <p className="cv-tapa__lema">
          El que anota lo que pasa en su tierra, aprende de su propia tierra.
        </p>
      </header>

      <LaMirada miradas={data.miradas} />

      <section className="cv-registro" aria-label="Las páginas del cuaderno">
        <h3 className="cv-seccion__titulo">Las páginas</h3>
        <p className="cv-seccion__entrada">
          Anotar no es trámite: es llevarle la cuenta a lo vivo, como quien
          cuenta sus animales. Fecha, clima, qué hizo, qué vio. Con los años,
          estas páginas son las que hablan.
        </p>
        <div className="cv-registro__paginas">
          {(data.paginas || []).map((p) => (
            <PaginaCuaderno key={p.id} pagina={p} />
          ))}
        </div>
      </section>

      <TresTemporadas
        temporadas={data.temporadas}
        leccion={data.leccion}
        era={data.era}
      />

      <LaPaciencia paciencia={data.paciencia} />

      {/* El remate del objeto: la contratapa cosida, sin moraleja de coach */}
      <footer className="cv-contratapa">
        <div className="cv-tapa__costura" aria-hidden="true" />
        <p className="cv-contratapa__texto">
          Lo que usted anota es suyo. El cuaderno no felicita ni regaña:
          guarda, compara y devuelve. La que enseña es su tierra.
        </p>
      </footer>
    </div>
  );
}
