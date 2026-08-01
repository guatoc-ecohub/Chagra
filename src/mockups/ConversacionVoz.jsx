/**
 * MOCKUP "La conversación con la finca" — ruta #/mockups/conversacion-voz.
 *
 * La pantalla de diálogo POR VOZ del agente: el campesino le pregunta a su
 * finca y la finca le responde. No es un chat con un botón de micrófono
 * pegado — es una conversación alrededor de una brasa: el IrisVoz
 * (src/visual/voz) es el protagonista y ÚNICO control de micrófono, y las
 * palabras van quedando en el hilo como quedan en la memoria.
 *
 * Guion determinista (datos de muestra, sin micrófono real ni permisos):
 * un ciclo completo de uso — reposo → «hola, Chagra» → pregunta por el
 * tomate amarillo → la finca piensa → responde en usted con UNA acción
 * concreta → repregunta del caldo de ortiga → respuesta + tarea apuntada
 * en el cuaderno de campo.
 *
 * Reusa de la casa:
 *  - IrisVoz (src/visual/voz): la identidad visual de la voz — escuchar
 *    entra, hablar sale, pensar se trenza, reposo respira.
 *  - src/visual/effects: GlowFilter (dentro del iris) + effects.css
 *    (--vfx-beat sincroniza la respiración de pistas y wake-hint).
 *  - Reglas: solo transform/opacity, cero setState por frame (el texto
 *    "vivo" avanza por palabras a ~7/s, no por frame), reduced-motion =
 *    fotograma legible por estado y texto completo sin coreografía.
 */
/* eslint-disable chagra-i18n/no-hardcoded-spanish -- mockup dev con datos de
   muestra (no UI de producto); si se productiza, el copy migra a messages.js
   (ADR-050). */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import IrisVoz from '../visual/voz';
import '../visual/effects/effects.css';
import './conversacionVoz.css';

/* ── El hilo de la conversación (datos de muestra) ─────────────────────────
 * Finca fría (~2.800 m), tomate bajo cubierta. La finca responde en usted,
 * corto, y SIEMPRE con una acción concreta que cabe en la mañana. */
const HILO = [
  {
    tipo: 'campesino',
    nombre: 'Usted',
    texto: 'Hola, Chagra.',
  },
  {
    tipo: 'campesino',
    nombre: 'Usted',
    texto: '¿Qué le hago al tomate que amaneció con las hojas amarillas?',
  },
  {
    tipo: 'chagra',
    nombre: 'Su finca',
    texto:
      'Mírele las hojas de abajo. Si el amarillo empezó por ahí, a esa mata le está faltando comida: échele hoy un puñado de compost maduro alrededor del tallo, sin arrimárselo, y riegue solo al pie, temprano.',
  },
  {
    tipo: 'campesino',
    nombre: 'Usted',
    texto: '¿Le sirve el caldo de ortiga que tengo guardado?',
  },
  {
    tipo: 'chagra',
    nombre: 'Su finca',
    texto:
      'Sí señor, le sirve. Rebaje un litro de caldo en diez litros de agua y aplíquelo al pie mañana, antes de las nueve. Yo le dejo apuntado revisar el sábado si las hojas nuevas salen verdes.',
  },
  {
    tipo: 'accion',
    texto: 'Quedó en el cuaderno de campo — sábado: revisar que las hojas nuevas del tomate salgan verdes.',
  },
];

/* ── El guion: qué hace la voz y qué se ve del hilo en cada paso ──────────── */
const GUION = [
  { estado: 'reposo', dur: 2000, visibles: 0 },
  { estado: 'escuchando', dur: 1700, visibles: 1, wake: true },
  { estado: 'escuchando', dur: 4400, visibles: 2 },
  { estado: 'pensando', dur: 2400, visibles: 2, pensando: 'Revisando el cuaderno del lote y las últimas lluvias…' },
  { estado: 'hablando', dur: 7200, visibles: 3 },
  { estado: 'escuchando', dur: 3800, visibles: 4 },
  { estado: 'pensando', dur: 2000, visibles: 4, pensando: 'Buscando la dosis del caldo de ortiga…' },
  { estado: 'hablando', dur: 8400, visibles: 5 },
  { estado: 'reposo', dur: 0, visibles: 6, fin: true },
];

/* Lo que la voz anuncia bajo el iris (aria-live: el estado NUNCA es solo color). */
const VOZ_DICE = {
  reposo: 'Quieta. Diga «hola, Chagra» cuando la necesite.',
  escuchando: 'Escuchando…',
  pensando: 'Pensando…',
  hablando: 'Su finca le responde.',
};

/* ¿El usuario pidió quietud? Se lee una vez: gobierna guion y coreografías. */
const prefiereQuieto = () =>
  typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── TextoVivo: la transcripción aparece palabra por palabra ────────────────
 * Todas las palabras se montan de una (cero reflow); solo cambia opacity.
 * `vivo` = burbuja recién dicha: avanza a ~7 palabras/s con UN interval
 * (nada por frame). Con reduced-motion o burbuja vieja: texto completo. */
function TextoVivo({ texto, vivo }) {
  const palabras = useMemo(() => texto.split(' '), [texto]);
  const [dichas, setDichas] = useState(0);

  useEffect(() => {
    if (!vivo) return undefined;
    const timer = setInterval(() => {
      setDichas((n) => (n >= palabras.length ? n : n + 1));
    }, 140);
    return () => clearInterval(timer);
  }, [vivo, palabras]);

  /* derivado, no sincronizado: burbuja vieja (o quietud pedida) = texto entero */
  const mostradas = vivo ? dichas : palabras.length;

  return (
    <>
      {palabras.map((p, i) => (
        <span key={`${i}-${p}`} className={`cvz-palabra${i < mostradas ? ' cvz-palabra--dicha' : ''}`}>
          {p}
          {i < palabras.length - 1 ? ' ' : ''}
        </span>
      ))}
    </>
  );
}

/* Check propio (SVG inline, cero assets externos) para la tarea apuntada. */
function SelloCuaderno() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" className="cvz-accion-sello">
      <circle cx="12" cy="12" r="10.4" fill="none" stroke="currentColor" strokeWidth="1.6" opacity="0.55" />
      <path d="M7.6 12.4l3 3.1 5.8-6.6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ConversacionVoz() {
  const [reproduciendo, setReproduciendo] = useState(false);
  const [paso, setPaso] = useState(0);
  const [termino, setTermino] = useState(false);
  const hiloRef = useRef(null);
  const quieto = useMemo(() => prefiereQuieto(), []);

  const pasoActual = GUION[reproduciendo ? paso : (termino ? GUION.length - 1 : 0)];
  const estado = reproduciendo ? pasoActual.estado : 'reposo';
  const visibles = pasoActual.visibles;

  /* El guion: cada paso agenda el siguiente dentro del timeout (nunca setState
     en el cuerpo del efecto); al final la voz se aquieta sola — no dejamos
     loop infinito pidiendo atención. */
  useEffect(() => {
    if (!reproduciendo) return undefined;
    const esUltimo = paso >= GUION.length - 1;
    const timer = setTimeout(() => {
      if (esUltimo) {
        setReproduciendo(false);
        setTermino(true);
      } else {
        setPaso((p) => p + 1);
      }
    }, GUION[paso].dur || 400);
    return () => clearTimeout(timer);
  }, [reproduciendo, paso]);

  /* El hilo acompaña la conversación: al aparecer algo, baja hasta lo último. */
  useEffect(() => {
    const el = hiloRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: quieto ? 'auto' : 'smooth' });
  }, [visibles, pasoActual.pensando, quieto]);

  const alternar = () => {
    if (reproduciendo) {
      /* Tocar el iris mientras habla = "ya, gracias": la voz se aquieta. */
      setReproduciendo(false);
      setTermino(true);
      setPaso(GUION.length - 1);
      return;
    }
    setTermino(false);
    setPaso(0);
    setReproduciendo(true);
  };

  const vozDice = termino && !reproduciendo
    ? 'La finca queda pendiente de su tomate.'
    : VOZ_DICE[estado];

  return (
    <div className="cvz" data-estado={estado}>
      <div className="cvz-luz" aria-hidden="true" />

      {/* ── cabecera: con quién habla usted ─────────────────────────────── */}
      <header className="cvz-cab">
        <div className="cvz-cab-finca">
          <h1 className="cvz-cab-nombre">Finca El Recuerdo</h1>
          <p className="cvz-cab-detalle">Lote 2 · tomate bajo cubierta · 2.800 m</p>
        </div>
        <p className="cvz-cab-estado">
          <span className="cvz-cab-punto" aria-hidden="true" />
          {estado === 'reposo' ? 'En reposo' : VOZ_DICE[estado].replace(/[.…]+$/, '')}
        </p>
      </header>
      <p className="cvz-eyebrow">Mockup · conversación guionada · datos de muestra</p>

      {/* ── el hilo: lo dicho va quedando ────────────────────────────────── */}
      <main className="cvz-hilo" ref={hiloRef} aria-live="polite">
        {visibles === 0 && (
          <div className="cvz-vacio">
            <p className="cvz-vacio-verso">
              Su finca está despierta.
              <br />
              Pregúntele por sus matas como le pregunta a un vecino.
            </p>
            <span className="cvz-vacio-wake">«hola, Chagra»</span>
          </div>
        )}

        {HILO.slice(0, visibles).map((b, i) =>
          b.tipo === 'accion' ? (
            <div key={b.texto} className="cvz-accion">
              <SelloCuaderno />
              <p>{b.texto}</p>
            </div>
          ) : (
            <article key={b.texto} className={`cvz-burbuja cvz-burbuja--${b.tipo}`}>
              <span className="cvz-burbuja-quien">{b.nombre}</span>
              <p className="cvz-burbuja-texto">
                <TextoVivo texto={b.texto} vivo={reproduciendo && !quieto && i === visibles - 1} />
              </p>
            </article>
          ))}

        {reproduciendo && pasoActual.pensando && (
          <div className="cvz-pensando">
            <span className="cvz-pensando-puntos" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <p>{pasoActual.pensando}</p>
          </div>
        )}
      </main>

      {/* ── el fogón: la voz con forma ES el micrófono ───────────────────── */}
      <footer className="cvz-fogon">
        {reproduciendo && pasoActual.wake && (
          <span className="cvz-wake" aria-hidden="true">«hola, Chagra»</span>
        )}
        <button
          type="button"
          className="cvz-iris-btn"
          onClick={alternar}
          aria-pressed={reproduciendo}
          aria-label={reproduciendo
            ? 'Detener la conversación de muestra'
            : 'Oír una conversación de muestra con la finca'}
        >
          <IrisVoz estado={estado} size={168} className="cvz-iris" />
        </button>
        <p className="cvz-voz-dice" aria-live="polite">{vozDice}</p>
        {!reproduciendo && (
          <p className="cvz-pista">
            {termino ? 'Toque el iris para oírla otra vez.' : 'O toque el iris para oír una conversación de muestra.'}
          </p>
        )}
      </footer>
    </div>
  );
}
