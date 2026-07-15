/*
 * PaginaCuaderno — una página del cuaderno vivo.
 *
 * La unidad de REGISTRAR: fecha con su subrayado a pulso, el clima apuntado
 * en la esquina, el texto en la voz del que anota, y los gestos de mirada
 * que usó (envés, cogollo, suelo, vecina) como constancia de MÉTODO, no
 * como insignias.
 *
 * Dos momentos delicados viven aquí:
 *
 *  - EL ECO (`pagina.eco`): cuando una anotación despierta una página
 *    vieja, el cuaderno la devuelve AL MARGEN, en tinta índigo, colgada de
 *    un hilo de cabuya. La cita es SIEMPRE textual del propio campesino —
 *    la finca hablando con las palabras de su dueño, jamás la IA dando
 *    cátedra. Ese es el momento de APRENDER.
 *
 *  - EL FRACASO (`tipo: 'fracaso'`): página vieja, tinta desteñida, una
 *    hoja seca prensada como reliquia. NADA rojo, nada de error: el remate
 *    lo dice el propio cuaderno ("una pérdida escrita no se pierde dos
 *    veces"). El fracaso es dato digno; esta página es la regla hecha
 *    forma.
 *
 * La edad de la tinta sale de `temporadasAtras` (tintaPorEdad): lo viejo
 * se ve viejo sin un solo contador.
 */
import { MIRADAS } from './cuadernoData.js';
import { tintaPorEdad, giroDePagina, TINTAS } from './cuadernoTokens.js';
import {
  SubrayadoVivo,
  GlifoClima,
  GlifoMirada,
  HojaPrensada,
  HiloQueUne,
} from './TrazoVivo.jsx';

/* seed estable por id (suma de charCodes): misma página, mismo temblor */
function seedDe(id = '') {
  let s = 7;
  for (let i = 0; i < id.length; i += 1) s = (s + id.charCodeAt(i) * 31) % 9973;
  return s;
}

/* ── El eco: la finca hablando con palabras propias ────────────────────── */

export function EcoDelCuaderno({ eco, seed = 7 }) {
  if (!eco) return null;
  return (
    <aside className="cv-eco" aria-label="Lo que el cuaderno le devuelve">
      <HiloQueUne className="cv-eco__hilo" seed={seed} />
      <div className="cv-eco__papel">
        <p className="cv-eco__de">De su página del {eco.de}:</p>
        <blockquote className="cv-eco__cita">“{eco.cita}”</blockquote>
        {eco.nota && <p className="cv-eco__nota">{eco.nota}</p>}
      </div>
    </aside>
  );
}

/* ── La página ─────────────────────────────────────────────────────────── */

export default function PaginaCuaderno({ pagina, className = '' }) {
  if (!pagina) return null;
  const seed = seedDe(pagina.id);
  const tinta = tintaPorEdad(pagina.temporadasAtras);
  const esFracaso = pagina.tipo === 'fracaso';
  const giro = giroDePagina(seed);
  const miradasUsadas = (pagina.miradas || [])
    .map((id) => MIRADAS.find((m) => m.id === id))
    .filter(Boolean);

  return (
    <article
      className={`cv-pagina cv-pagina--${pagina.tipo} ${className}`.trim()}
      data-vieja={pagina.temporadasAtras > 0 ? 'true' : undefined}
      style={{ '--cv-tinta-pagina': tinta, '--cv-giro': `${giro.toFixed(2)}deg` }}
    >
      <header className="cv-pagina__cabeza">
        <div className="cv-pagina__fecha-bloque">
          <span className="cv-pagina__fecha">{pagina.fecha}</span>
          <span className="cv-pagina__anio">{pagina.anio}</span>
          <SubrayadoVivo color={tinta} seed={seed + 1} className="cv-pagina__subrayado" />
        </div>
        <GlifoClima
          tipo={pagina.clima}
          tinta={pagina.temporadasAtras > 0 ? tinta : undefined}
          seed={seed + 2}
          className="cv-pagina__clima"
        />
      </header>

      <p className="cv-pagina__texto">{pagina.texto}</p>

      {esFracaso && (
        <figure className="cv-pagina__reliquia">
          <HojaPrensada seed={seed + 3} />
          <figcaption className="cv-pagina__reliquia-pie">
            La hoja que guardó ese día.
          </figcaption>
        </figure>
      )}

      {miradasUsadas.length > 0 && (
        <ul className="cv-pagina__miradas" aria-label="Cómo miró ese día">
          {miradasUsadas.map((m) => (
            <li key={m.id} className="cv-pagina__mirada">
              <GlifoMirada tipo={m.id} color={tinta} seed={seed + 4} />
              <span>{m.titulo.toLowerCase()}</span>
            </li>
          ))}
        </ul>
      )}

      {pagina.remate && <p className="cv-pagina__remate">{pagina.remate}</p>}

      <EcoDelCuaderno eco={pagina.eco} seed={seed + 5} />
    </article>
  );
}

/* La tinta del eco es fija (índigo textil): se exporta para quien componga
   variantes sin re-derivarla. */
// eslint-disable-next-line react-refresh/only-export-components -- constante compartida, no amerita archivo aparte
export const TINTA_ECO = TINTAS.eco;
