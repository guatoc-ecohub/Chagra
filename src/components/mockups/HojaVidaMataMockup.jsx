/*
 * i18n (ADR-050): copy de campo en español Colombia (usted). Es un MOCKUP de
 * galería con datos de muestra, sin gate ni auth; el copy final migraría a
 * src/config/messages.js — mismo criterio que los hubs de mundo.
 */
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import LaminaMataEtapa from './LaminaMataEtapa';
import { ETAPAS_MATA, MATA_MUESTRA } from './hojaVidaMataData.js';
import './hoja-vida-mata.css';

/**
 * HojaVidaMataMockup — la HOJA DE VIDA VIVA de una mata individual.
 *
 * Moonshot de galería: la ficha de UNA planta concreta como una lámina de
 * cuaderno de campo que EVOLUCIONA con su estado real. Un selector recorre las
 * seis etapas (semilla → plántula → juvenil → adulta → floración → cosecha) y la
 * lámina se REDIBUJA distinta en cada una (ver LaminaMataEtapa). Debajo, la
 * línea de tiempo de eventos reales de esta mata al estilo cuaderno.
 *
 * Anti-gamificación (dirección educativa de Chagra): no hay puntos ni medallas.
 * El eje es la OBSERVACIÓN y la PACIENCIA — la ficha narra lo que se vio y lo que
 * se hizo, no lo que se "ganó". Tono campesino, usted colombiano.
 *
 * Ruta pública `#/mockups/hoja-vida-mata` (sin auth, datos de muestra).
 *
 * @param {Object} props
 * @param {Function} [props.onBack] volver al dashboard.
 */

// La línea de tiempo: lo que REALMENTE le pasó a esta mata. `tipo` marca el
// punto (hito de crecimiento / cuidado que se atendió / estado de hoy).
const EVENTOS = [
  {
    etapa: 'semilla',
    fecha: '08 mar',
    tipo: 'hito',
    titulo: 'Se sembró',
    nota: 'Se puso la semilla en el semillero, en era 3, sobre lombricompuesto. Se anotó la fecha para contar los días.',
  },
  {
    etapa: 'plantula',
    fecha: '20 mar',
    tipo: 'hito',
    titulo: 'Sacó la primera hoja',
    nota: 'A los 12 días asomó el tallito con sus dos cotiledones y, al centro, la primera hoja verdadera.',
  },
  {
    etapa: 'juvenil',
    fecha: '05 abr',
    tipo: 'hito',
    titulo: 'Se pasó al surco',
    nota: 'Trasplante a la era. Prendió bien; a los tres días ya estaba parada y con color.',
  },
  {
    etapa: 'adulto',
    fecha: '22 abr',
    tipo: 'hito',
    titulo: 'Se le puso el tutor',
    nota: 'La mata se hizo y empezó a pesar. Se entutoró con una estaca y se amarró suave para no ahorcar el tallo.',
  },
  {
    etapa: 'floracion',
    fecha: '04 may',
    tipo: 'hito',
    titulo: 'Empezó a florecer',
    nota: 'Primeros racimos de flor amarilla. Se cuidó el riego parejo para que cuajaran y no botara flor.',
  },
  {
    etapa: 'floracion',
    fecha: '18 may',
    tipo: 'cuidado',
    titulo: 'Aguantó la gota',
    nota: 'Aparecieron manchas de gota (tizón) en las hojas de abajo. Se quitaron esas hojas, se aireó la mata y se ayudó con caldo de cola de caballo. Se recuperó.',
  },
  {
    etapa: 'cosecha',
    fecha: '26 jun',
    tipo: 'actual',
    titulo: 'Primeros tomates',
    nota: 'Cuajó y maduró el primer racimo. Desde acá se cosecha parejo, a medida que van pintando.',
  },
];

const TIPO_CLASE = { hito: 'is-hito', cuidado: 'is-cuidado', actual: 'is-actual' };

export default function HojaVidaMataMockup({ onBack }) {
  const [etapaId, setEtapaId] = useState(MATA_MUESTRA.etapaActual);
  const etapa = ETAPAS_MATA.find((e) => e.id === etapaId) || ETAPAS_MATA[0];
  const volver = onBack || (() => { window.location.hash = ''; });

  return (
    <div className="hvm">
      <div className="hvm-top">
        <button type="button" className="hvm-volver" onClick={volver}>
          <ArrowLeft size={16} aria-hidden="true" /> Volver
        </button>
        <span className="hvm-sello">Muestra</span>
      </div>

      {/* Cabecera de la ficha */}
      <header className="hvm-cabecera">
        <h1 className="hvm-titulo">{MATA_MUESTRA.nombre} · {MATA_MUESTRA.ubicacion.split(' · ')[0]}</h1>
        <p className="hvm-sub">{MATA_MUESTRA.variedad}</p>
        <div className="hvm-meta">
          <span className="hvm-chip">Sembrada el {MATA_MUESTRA.sembrada}</span>
          <span className="hvm-chip">{MATA_MUESTRA.ubicacion}</span>
          <span className="hvm-chip">Hoy: {etapa.nombre.toLowerCase()} · día {ETAPAS_MATA.find((e) => e.id === MATA_MUESTRA.etapaActual).dia}</span>
        </div>
      </header>

      {/* Lámina viva + selector de etapa */}
      <section className="hvm-lamina-card" aria-label="Lámina de la mata por etapa">
        <div className="hvm-lamina-marco">
          <LaminaMataEtapa etapa={etapa.id} />
        </div>

        <div className="hvm-etapas" role="group" aria-label="Etapas de la mata">
          {ETAPAS_MATA.map((e) => (
            <button
              key={e.id}
              type="button"
              className="hvm-etapa-btn"
              aria-pressed={e.id === etapaId}
              onClick={() => setEtapaId(e.id)}
            >
              <span className="hvm-etapa-orden">{e.orden} de {ETAPAS_MATA.length}</span>
              <span className="hvm-etapa-nom">{e.nombre}</span>
              <span className="hvm-etapa-dia">día {e.dia}</span>
            </button>
          ))}
        </div>

        <div className="hvm-lamina-pie">
          <p className="hvm-estado-hoy">
            {etapa.nombre}
            {etapa.id === MATA_MUESTRA.etapaActual ? ' — así está hoy' : ` — día ${etapa.dia}`}
          </p>
          <p className="hvm-estado-desc">{etapa.lectura}</p>
        </div>
      </section>

      {/* Línea de tiempo del cuaderno de campo */}
      <h2 className="hvm-seccion-tit">Lo que le ha pasado a esta mata</h2>
      <p className="hvm-seccion-lema">Sin puntos ni medallas. Solo lo que se vio, cuándo, y qué se hizo.</p>
      <ol className="hvm-linea">
        {EVENTOS.map((ev, i) => (
          <li
            key={`${ev.fecha}-${i}`}
            className={`hvm-evento ${TIPO_CLASE[ev.tipo] || ''} ${ev.etapa === etapaId ? 'is-foco' : ''}`}
          >
            <span className="hvm-evento-punto" aria-hidden="true" />
            <div className="hvm-evento-fecha">{ev.fecha}</div>
            <div className="hvm-evento-tit">{ev.titulo}</div>
            <p className="hvm-evento-nota">{ev.nota}</p>
            {ev.tipo === 'actual' && <span className="hvm-evento-ahora">Aquí va hoy</span>}
          </li>
        ))}
      </ol>

      {/* Nota de cierre — dimensión educativa, anti-gamificación */}
      <p className="hvm-cierre">
        Esta hoja de vida no premia ni califica. Es un cuaderno: usted anota lo que
        vio y lo que hizo, y la mata le va enseñando con su tiempo. <strong>A veces se
        demora, a veces le da duro una plaga y la supera.</strong> Observar y tener
        paciencia es el trabajo — no ganar puntos.
      </p>
    </div>
  );
}
