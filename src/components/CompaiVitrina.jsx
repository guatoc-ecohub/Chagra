import {
  ChivitoAntes,
  ChivitoDespues,
  JaguarAntes,
  JaguarDespues,
  LuciernagaAntes,
  LuciernagaDespues,
  OsoAntes,
  OsoDespues,
  ZariguyaAntes,
  ZariguyaDespues,
} from '../visual/creatures/vitrina/index.js';
import { createElement } from 'react';
import './CompaiVitrina.css';

const COMPAIS = [
  {
    id: 'jaguar',
    nombre: 'Jaguar',
    especie: 'Panthera onca',
    Antes: JaguarAntes,
    Despues: JaguarDespues,
    acento: 'amber',
  },
  {
    id: 'zariguya',
    nombre: 'Zarigüeya',
    especie: 'Didelphis marsupialis',
    Antes: ZariguyaAntes,
    Despues: ZariguyaDespues,
    acento: 'rose',
  },
  {
    id: 'luciernaga',
    nombre: 'Luciérnaga',
    especie: 'Lampyridae',
    Antes: LuciernagaAntes,
    Despues: LuciernagaDespues,
    acento: 'lime',
  },
  {
    id: 'oso-baston',
    nombre: 'Oso de anteojos',
    especie: 'Tremarctos ornatus',
    Antes: OsoAntes,
    Despues: OsoDespues,
    acento: 'green',
  },
  {
    id: 'chivito-punk',
    nombre: 'Chivito de páramo',
    especie: 'Oxypogon guerinii',
    Antes: ChivitoAntes,
    Despues: ChivitoDespues,
    acento: 'violet',
  },
];

function EstadoListo() {
  return (
    <span className="compai-vitrina__status" data-status="listo">
      <span aria-hidden="true" /> listo
    </span>
  );
}

function CompaiPanel({ Component, label, id, acento }) {
  return (
    <div className={`compai-vitrina__panel compai-vitrina__panel--${acento}`}>
      <div className="compai-vitrina__panel-head">
        <span>{label}</span>
        <span className="compai-vitrina__motion">caminando</span>
      </div>
      <div className="compai-vitrina__stage" data-creature={id} data-motion="caminando">
        {createElement(Component, {
          estado: 'caminando',
          animated: true,
          size: 156,
          title: `${label} ${id}`,
        })}
      </div>
    </div>
  );
}

export default function CompaiVitrina() {
  return (
    <main className="compai-vitrina">
      <div className="compai-vitrina__grain" aria-hidden="true" />
      <header className="compai-vitrina__hero">
        <div className="compai-vitrina__eyebrow">
          <span className="compai-vitrina__eyebrow-mark" aria-hidden="true" />
          Registro de láminas vivas
        </div>
        <h1>Compais: Antes / Después</h1>
        <p>
          Cinco compañeros, dos momentos de la misma piel. Compare el rig vivo,
          el gesto y el movimiento que ya están cayendo en Chagra.
        </p>
        <div className="compai-vitrina__legend" aria-label="Leyenda de la comparación">
          <span><i className="compai-vitrina__legend-swatch compai-vitrina__legend-swatch--before" /> Antes</span>
          <span><i className="compai-vitrina__legend-swatch compai-vitrina__legend-swatch--after" /> Después</span>
          <span><i className="compai-vitrina__legend-dot" /> estado vivo</span>
        </div>
      </header>

      <section className="compai-vitrina__grid" aria-label="Comparación de los cinco compais">
        <div className="compai-vitrina__column-head" aria-hidden="true">
          <span>Compañero</span>
          <span>Antes</span>
          <span>Después</span>
        </div>
        {COMPAIS.map(({ id, nombre, especie, Antes, Despues, acento }) => (
          <article className="compai-vitrina__row" key={id} data-creature={id}>
            <div className={`compai-vitrina__identity compai-vitrina__identity--${acento}`}>
              <div className="compai-vitrina__identity-top">
                <span className="compai-vitrina__index">0{COMPAIS.findIndex((compai) => compai.id === id) + 1}</span>
                <EstadoListo />
              </div>
              <h2>{nombre}</h2>
              <p>{especie}</p>
              <span className="compai-vitrina__identity-line" aria-hidden="true" />
              <small>lámina viva integrada</small>
            </div>
            <CompaiPanel Component={Antes} label="Antes" id={`${id}-antes`} acento={acento} />
            <CompaiPanel Component={Despues} label="Después" id={`${id}-despues`} acento={acento} />
          </article>
        ))}
      </section>
      <footer className="compai-vitrina__footer">
        <span>Chagra / compai registry</span>
        <span>Selector PWA conectado</span>
        <span>Valle y kart listos para el siguiente enlace</span>
      </footer>
    </main>
  );
}
