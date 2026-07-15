/* eslint-disable chagra-i18n/no-hardcoded-spanish -- UI español intencional; ADR-050 i18n pendiente */
/*
 * LaPaciencia — lo que se mide en años y vale la espera.
 *
 * El tiempo largo (el árbol que crece lento, el suelo que se recupera en
 * años) suele pintarse como barra de progreso — y una barra dice "falta",
 * dice "apúrese". Aquí NO hay barra: hay renglones de cuaderno, uno por
 * año, donde la tinta se va asentando de vieja a fresca. El crecimiento se
 * lee en las palabras del que lo vio ("me llega a la rodilla", "primera
 * sombra de verdad") y el tiempo se ve en el color de la tinta.
 *
 * El remate ("El aliso no corre. Va.") cierra en la voz del cuaderno: la
 * paciencia como valor, no como espera. Sin porcentaje, sin "¡ya casi!".
 */
import { tintaPorEdad } from './cuadernoTokens.js';
import { SubrayadoVivo, HiloQueUne } from './TrazoVivo.jsx';

export default function LaPaciencia({ paciencia, className = '' }) {
  if (!paciencia || !paciencia.renglones?.length) return null;
  return (
    <section className={`cv-paciencia ${className}`.trim()} aria-label="Lo que crece a su paso">
      <h3 className="cv-paciencia__titulo">{paciencia.titulo}</h3>
      <div className="cv-paciencia__cuerpo">
        <HiloQueUne className="cv-paciencia__hilo" seed={53} />
        <ol className="cv-paciencia__renglones">
          {paciencia.renglones.map((r) => (
            <li
              key={r.anio}
              className="cv-paciencia__renglon"
              style={{ '--cv-tinta-pagina': tintaPorEdad(r.temporadasAtras) }}
            >
              <span className="cv-paciencia__anio">{r.anio}</span>
              <span className="cv-paciencia__nota">{r.nota}</span>
            </li>
          ))}
        </ol>
      </div>
      {paciencia.remate && (
        <footer className="cv-paciencia__remate">
          <p>{paciencia.remate}</p>
          <SubrayadoVivo seed={59} className="cv-paciencia__subrayado" />
        </footer>
      )}
    </section>
  );
}
