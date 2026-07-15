/*
 * TresTemporadas — la misma era, tres temporadas, lado a lado.
 *
 * Aquí es donde el aprendizaje se VE de verdad: tres tiras de papel del
 * mismo tablón, cada una con su siembra, sus hitos de clima y su cosecha
 * escrita en palabras ("tres bultos", "se perdió", "cinco bultos") — no en
 * barras ni porcentajes, porque el cuaderno registra, no califica.
 *
 * El año del fracaso va EN LA MISMA FILA y CON EL MISMO PAPEL que los
 * demás: más viejo de tinta (como le toca por edad), con su glifo de
 * helada, pero sin rojo, sin tachón, sin ícono de error. Es un año más del
 * tablón, y es el que más enseñó.
 *
 * Abajo, la lección: una sola frase en la voz del que anota, subrayada a
 * pulso. No la dijo la IA — estaba en las páginas.
 */
import { tintaPorEdad, giroDePagina } from './cuadernoTokens.js';
import { SubrayadoVivo, GlifoClima } from './TrazoVivo.jsx';

function TiraTemporada({ temporada, seed }) {
  const tinta = tintaPorEdad(temporada.temporadasAtras);
  const giro = giroDePagina(seed);
  return (
    <li
      className={`cv-tira cv-tira--${temporada.tono}`}
      style={{ '--cv-tinta-pagina': tinta, '--cv-giro': `${giro.toFixed(2)}deg` }}
    >
      <span className="cv-tira__anio">{temporada.anio}</span>
      <p className="cv-tira__siembra">{temporada.siembra}</p>
      <ul className="cv-tira__hitos">
        {(temporada.hitos || []).map((h, i) => (
          <li key={h.texto} className="cv-tira__hito">
            <GlifoClima tipo={h.clima} tinta={tinta} seed={seed + 3 + i} className="cv-tira__hito-glifo" />
            <span>{h.texto}</span>
          </li>
        ))}
      </ul>
      <p className="cv-tira__cosecha">{temporada.cosecha}</p>
    </li>
  );
}

export default function TresTemporadas({ temporadas = [], leccion, era, className = '' }) {
  if (!temporadas.length) return null;
  return (
    <section className={`cv-temporadas ${className}`.trim()} aria-label="La misma era, tres temporadas">
      {era && <h3 className="cv-temporadas__era">{era}</h3>}
      <ol className="cv-temporadas__tiras">
        {temporadas.map((t, i) => (
          <TiraTemporada key={t.anio} temporada={t} seed={11 + i * 17} />
        ))}
      </ol>
      {leccion && (
        <footer className="cv-temporadas__leccion">
          <p>{leccion}</p>
          <SubrayadoVivo seed={41} className="cv-temporadas__subrayado" />
        </footer>
      )}
    </section>
  );
}
