import { useState } from 'react';
import { EscenaAgua } from '../GemelosMundos2D.jsx';
import {
  FOTO_DIAGNOSTICO_CAFE,
  HALLAZGOS_DIAGNOSTICO_CAFE,
} from '../diagnosticoFotoData.js';
import { LaminaCicloAntracnosis } from '../EvidenciaIlustrada.jsx';
import LaminaMataEtapa from '../../components/mockups/LaminaMataEtapa.jsx';
import {
  ETAPAS_MATA,
  MATA_MUESTRA,
} from '../../components/mockups/hojaVidaMataData.js';
import { FICHAS_POR_MURAL } from './fichasMuralData.js';
import './fichas-mural.css';

function FichaDiagnosticoCafe() {
  return (
    <article className="fm-ficha fm-diagnostico" aria-label="Ficha de diagnóstico sobre foto">
      <figure className="fm-foto">
        <img
          src={FOTO_DIAGNOSTICO_CAFE}
          alt="Hoja de café con manchas de roya por el envés"
          width="900"
          height="675"
        />
        <svg viewBox="0 0 900 675" preserveAspectRatio="none" aria-hidden="true">
          {HALLAZGOS_DIAGNOSTICO_CAFE.map((hallazgo) => (
            <g key={hallazgo.n}>
              <circle
                className="fm-hallazgo"
                cx={hallazgo.cx}
                cy={hallazgo.cy}
                r={hallazgo.r}
              />
              <circle
                className="fm-hallazgo-numero"
                cx={hallazgo.cx + hallazgo.r * 0.72}
                cy={hallazgo.cy - hallazgo.r * 0.72}
                r="25"
              />
              <text
                x={hallazgo.cx + hallazgo.r * 0.72}
                y={hallazgo.cy - hallazgo.r * 0.72}
              >
                {hallazgo.n}
              </text>
            </g>
          ))}
        </svg>
        <figcaption>Aquí: el polvillo naranja</figcaption>
      </figure>
      <div className="fm-lectura">
        <p className="fm-sobrelinea">Chagra mira su foto</p>
        <h3>Es roya del café</h3>
        <p>El síntoma está en el envés de la hoja y ya está soltando esporas.</p>
        <div className="fm-confianza">
          <span>Confianza alta</span>
          <strong>88%</strong>
        </div>
        <p className="fm-nota">Revise también las hojas cercanas antes de decidir el manejo.</p>
      </div>
    </article>
  );
}

function FichaEvidenciaCafe() {
  return (
    <article className="fm-ficha fm-evidencia" aria-label="Ficha de evidencia ilustrada">
      <figure className="fm-lamina-evidencia">
        <LaminaCicloAntracnosis />
        <figcaption>El ciclo de la mancha</figcaption>
      </figure>
      <div className="fm-lectura">
        <p className="fm-sobrelinea">Consejo con respaldo</p>
        <h3>Proteja antes de la lluvia</h3>
        <p>Las salpicaduras llevan la mancha de fruto en fruto. La barrera de cobre corta ese ciclo.</p>
        <div className="fm-fuente">
          <span className="fm-semaforo" aria-hidden="true" />
          <span><strong>Confianza alta</strong><small>Cartilla Cenicafé</small></span>
        </div>
      </div>
    </article>
  );
}

function FichaAgua() {
  return (
    <article className="fm-ficha fm-agua" aria-label="Ficha del recorrido del agua">
      <figure className="fm-lamina-agua">
        <EscenaAgua />
        <figcaption>Del nacimiento a la huerta</figcaption>
      </figure>
      <div className="fm-lectura">
        <p className="fm-sobrelinea">Gemelo 2D del mundo Agua</p>
        <h3>El agua recorre la finca</h3>
        <ol className="fm-pasos">
          <li><span>1</span> Nace en la montaña</li>
          <li><span>2</span> La ronda la protege</li>
          <li><span>3</span> La toma guarda lo justo</li>
          <li><span>4</span> El riego la vuelve comida</li>
        </ol>
      </div>
    </article>
  );
}

function FichaSemillero() {
  const [etapaId, setEtapaId] = useState('plantula');
  const etapa = ETAPAS_MATA.find((item) => item.id === etapaId) || ETAPAS_MATA[0];

  return (
    <article className="fm-ficha fm-semillero" aria-label="Ficha de hoja de vida de una mata">
      <figure className="fm-lamina-mata">
        <LaminaMataEtapa etapa={etapa.id} />
        <figcaption>{MATA_MUESTRA.nombre}: día {etapa.dia}</figcaption>
      </figure>
      <div className="fm-lectura">
        <p className="fm-sobrelinea">Cuaderno del semillero</p>
        <h3>{etapa.nombre}</h3>
        <p>{etapa.lectura}</p>
        <div className="fm-etapas" role="group" aria-label="Etapas de la mata">
          {ETAPAS_MATA.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Ver etapa ${item.nombre}`}
              aria-pressed={item.id === etapaId}
              onClick={() => setEtapaId(item.id)}
            >
              {item.orden}
            </button>
          ))}
        </div>
        <p className="fm-nota">Observe lo que cambió y anote lo que usted hizo.</p>
      </div>
    </article>
  );
}

const CONTENIDO = {
  'diagnostico-foto': FichaDiagnosticoCafe,
  'evidencia-ilustrada': FichaEvidenciaCafe,
  'gemelos-2d': FichaAgua,
  'hoja-vida-mata': FichaSemillero,
};

export function FichasMural({ mundo, reducedMotion = false }) {
  const fichas = FICHAS_POR_MURAL[mundo] || [];
  const [activa, setActiva] = useState(fichas[0]?.id);

  if (fichas.length === 0) return null;

  return (
    <section
      className="fm-panel"
      data-mundo={mundo}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      aria-label={`Fichas del mural de ${mundo}`}
    >
      <header className="fm-cabecera">
        <span>Fichas del mundo</span>
        {fichas.length > 1 ? (
          <div className="fm-tabs" role="tablist" aria-label="Fichas del mural">
            {fichas.map((ficha) => (
              <button
                key={ficha.id}
                type="button"
                role="tab"
                aria-selected={activa === ficha.id}
                onClick={() => setActiva(ficha.id)}
              >
                {ficha.etiqueta}
              </button>
            ))}
          </div>
        ) : (
          <strong>{fichas[0].etiqueta}</strong>
        )}
      </header>
      <div className="fm-contenidos">
        {fichas.map((ficha) => {
          const ContenidoFicha = CONTENIDO[ficha.id];
          return (
            <div
              key={ficha.id}
              className="fm-contenido"
              data-ficha={ficha.id}
              data-ficha-origen={ficha.origen}
              role="tabpanel"
              hidden={activa !== ficha.id}
            >
              <ContenidoFicha />
            </div>
          );
        })}
      </div>
    </section>
  );
}
