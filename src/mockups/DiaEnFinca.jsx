/*
 * MOCKUP DEV (#/mockups/dia-en-finca): copy de muestra en español de
 * Colombia (usted) para decidir la superficie completa del "qué hacer hoy".
 * No es UI de producción; si se adopta, sus textos migran a
 * src/config/messages.js (ADR-050).
 */
/**
 * DiaEnFinca.jsx — MOCKUP DEV · "EL DÍA EN SU FINCA"
 * (#/mockups/dia-en-finca, sin gate ni sesión — datos de muestra).
 *
 * Concepto: "LA PÁGINA DE HOY DEL CUADERNO, BAJO EL CIELO REAL".
 *   Es la EXPANSIÓN a superficie completa del sí-o-sí #1 (la tarjeta "HOY EN
 *   SU FINCA" de la entrada campesina): el campesino abre esta pantalla y sabe
 *   QUÉ HACER HOY, con su PORQUÉ en cristiano y el paso concreto. El día tiene
 *   un TITULAR (una sola causa manda: el aguacero de la tarde) y todo lo demás
 *   desciende de él — por eso el elemento firma es EL HILO DEL DÍA: un hilo
 *   cosido (efecto `vfx-flow` de la librería) que baja desde el cielo y anuda
 *   cada tarea a su causa. Arriba, el cielo VIVO de la hora (CapaCielo de
 *   `src/visual/scenes`) es a la vez contexto y razón: la lluvia que la
 *   pantalla anuncia se VE llegar al cambiar la franja.
 *
 * Jerarquía (un pulgar, de arriba a abajo):
 *   0. CIELO VIVO — fecha + titular del día + pulso vital (clima, matas, agua).
 *   1. LO PRIMERO HOY — la acción prioritaria, grande, con sus DOS porqués
 *      (el cielo + lo que usted mismo anotó en su cuaderno) y el paso concreto.
 *   2. TAMBIÉN HOY — 1-2 acciones secundarias, más pequeñas, cada una con su
 *      porqué (una ilustrada con LaminaMataEtapa de `src/visual/laminas`).
 *   3. PARA OBSERVAR HOY — la dimensión educativa: una invitación a mirar
 *      (la Lombriz de `src/visual/creatures`), SIN estado "completado", sin
 *      puntos ni medallas: mirar despacio también es trabajo de finca.
 *
 * Anti-gamificación deliberada: marcar "Ya lo hice" solo deja constancia en el
 * cuaderno (memoria, no premio); no hay contadores de tareas, rachas ni
 * celebraciones. La observación no se "completa".
 *
 * Stack: SVG + CSS, cero deps nuevas. REUSA la librería visual: CapaCielo +
 * cieloEscena (scenes), clase .scn-kraft (scenes.css), efectos vfx-flow y
 * vfx-scrim-bottom (effects), fauna Colibri/Mariposa/Lombriz (creatures) y
 * LaminaMataEtapa (laminas). Offline-trivial. Español de Colombia (usted).
 *
 * Es un MOCKUP HONESTO: los toques muestran "aquí se abre X" y NO navegan.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { CapaCielo, cieloEscena } from '../visual/scenes';
import { Colibri, Mariposa, Lombriz } from '../visual/creatures';
import { LaminaMataEtapa } from '../visual/laminas';
import { AngelitaGuia } from '../visual/agente';
import '../visual/effects/effects.css';
import './dia-en-finca.css';

// ── Finca de muestra (ficticia; los reales saldrían del perfil) ───────────────
const FINCA = {
  nombre: 'María',
  vereda: 'Vereda El Hato',
  msnm: 2000,
};

// ── Estado vivo de muestra (en prod sale de los logs, nunca inventado) ───────
const ESTADO = {
  matas: 14,
  agua: 'Tanque a la mitad',
};

// ── El día por franja: cielo (CapaCielo), clima en cristiano y titular ────────
// La MISMA causa (el aguacero de la tarde) contada según la hora: la pantalla
// respira el día — el cielo del header ES el porqué de la acción prioritaria.
const DIA = {
  amanecer: {
    cielo: { luz: 'amanecer', condicion: 'despejado' },
    titular: 'Hoy manda el aguacero de la tarde.',
    clima: { emoji: '🌄', frase: 'Amaneció despejado' },
    hora: 'Hágalo antes de las 2 de la tarde.',
  },
  dia: {
    cielo: { luz: 'dia', condicion: 'nublado' },
    titular: 'Hoy manda el aguacero de la tarde.',
    clima: { emoji: '⛅', frase: 'Se está nublando' },
    hora: 'Hágalo antes de las 2 de la tarde.',
  },
  tarde: {
    cielo: { luz: 'atardecer', condicion: 'lluvia' },
    titular: 'Llegó el aguacero: lo de afuera, bajo techo.',
    clima: { emoji: '🌧️', frase: 'Está lloviendo' },
    hora: 'Ya está lloviendo: si el café sigue afuera, cúbralo con plástico.',
  },
  noche: {
    cielo: { luz: 'noche', condicion: 'despejado' },
    titular: 'El aguacero ya pasó. La tierra quedó bebida.',
    clima: { emoji: '🌙', frase: 'Ya escampó' },
    hora: 'El aguacero cayó a las 3 de la tarde.',
  },
};

// ── LO PRIMERO HOY: la acción prioritaria con sus DOS porqués ─────────────────
// El porqué cruza el cielo con el propio cuaderno del campesino: ahí está el
// valor — Chagra se acuerda de lo que usted anotó y lo mira contra el clima.
const PRIORIDAD = {
  id: 'cafe',
  titulo: 'Guarde el café que tiene secando',
  paso: 'Recoja el café de la era y métalo bajo techo. De paso, destape el desagüe de la era del tomate.',
  porques: [
    { icono: '🌧️', texto: 'Por la tarde cae un aguacero' },
    { icono: '📓', texto: 'El martes usted anotó que puso café a secar en la era' },
  ],
};

// ── TAMBIÉN HOY: secundarias, cada una con su porqué en cristiano ─────────────
const SECUNDARIAS = [
  {
    id: 'tomate',
    titulo: 'Amarre el tomate que abrió flor',
    porque: 'Tres matas de la era 2 entraron en floración esta semana; el aguacero las puede quebrar.',
    lamina: 'floracion',
  },
  {
    id: 'tanque',
    titulo: 'Deje el tanque destapado cuando empiece a llover',
    porque: 'Va por la mitad, y el agua lluvia le sirve limpia para el semillero.',
    icono: '💧',
  },
];

// ── PARA OBSERVAR HOY: la invitación educativa (sin marcar, sin premio) ───────
const OBSERVAR = {
  invitacion: 'Cuando escampe, levante la hojarasca al pie del maíz y quédese mirando un momento.',
  pregunta: '¿Salieron lombrices? Donde hay lombriz después del aguacero, la tierra está viva.',
};

// ── LA GUÍA DE ANGELITA: qué enseña en cada punto de esta pantalla ───────────
// El mecanismo (useAngelitaGuia + <AngelitaGuia>, src/hooks y src/visual/agente)
// es GENÉRICO — cualquier vista 2D lo adopta declarando { ref, texto, gesto }
// por elemento. Aquí solo ponemos el contenido: qué hay y el PORQUÉ
// agroecológico real detrás de cada tarea del día (nunca relleno). El gesto
// reutiliza el repertorio ya existente de angelitaEstados.js — cero estados
// nuevos.
const GUIA_ANGELITA = {
  cielo: {
    texto: 'Los aguaceros de la tarde casi siempre llegan después del mediodía: por eso conviene adelantarse.',
    gesto: 'senala',
    tipo: 'informativa',
  },
  cafe: {
    texto: 'El café mojado por el aguacero coge hongos y pierde calidad — guárdelo antes de que llueva.',
    gesto: 'senala',
    tipo: 'atencion',
  },
  tomate: {
    texto: 'El tallo se pone quebradizo justo donde nace la flor: un aguacero fuerte se lo puede tronar.',
    gesto: 'senala',
    tipo: 'sugerencia',
  },
  tanque: {
    texto: 'El agua de lluvia no trae cloro ni sales: es mejor para el semillero que la del acueducto.',
    gesto: 'invita',
    tipo: 'sugerencia',
  },
  // El único punto HONESTO a propósito: ella sabe que la lombriz es señal de
  // suelo vivo, pero NO sabe si hoy salieron — eso solo lo sabe quien mire.
  // Estado 'nose' (angelitaEstados.js): decir "no sé" es la conducta correcta
  // del proyecto, no un relleno.
  lombriz: {
    texto: 'Lombriz después del aguacero es señal de suelo vivo — pero eso solo lo sabe quien mire, yo no.',
    gesto: 'nose',
    tipo: 'informativa',
  },
};

/* La escena del header: cielo paramétrico REUSADO (CapaCielo) + las lomas y la
   era de café secando de esta finca. La era es narrativa: si la tarea prioritaria
   se marca hecha, el café desaparece de la era (quedó bajo techo). aria-hidden:
   el texto del header narra el estado. */
function EscenaFinca({ cielo, franja, cafeGuardado }) {
  const [cieloA, cieloB] = cieloEscena(cielo, 'finca');
  const esNoche = franja === 'noche';
  const lloviendo = franja === 'tarde';
  const cafeEnEra = !cafeGuardado && !esNoche && !lloviendo;

  return (
    <svg className="df-escena" viewBox="0 0 390 210" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="df-cielo-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={cieloA} />
          <stop offset="1" stopColor={cieloB} />
        </linearGradient>
      </defs>

      {/* el cielo de la hora: fondo + astro/nubes/lluvia de la librería */}
      <rect x="0" y="0" width="390" height="210" fill="url(#df-cielo-grad)" />
      <CapaCielo cielo={cielo} cx={312} cy={54} r={19} lluviaY={64} w={390} h={210} />

      {/* lomas de la vereda */}
      <path fill="var(--df-loma-lejos)" d="M0 128 L58 100 L118 118 L188 88 L256 112 L320 92 L390 108 L390 210 L0 210 Z" />
      <path fill="var(--df-loma)" d="M0 158 L76 128 L152 150 L238 124 L316 148 L390 132 L390 210 L0 210 Z" />
      <rect x="0" y="176" width="390" height="34" fill="var(--df-pasto)" />

      {/* la casita de la finca */}
      <g transform="translate(296 142)">
        <path fill="var(--df-casa)" d="M0 16 L16 3 L32 16 L32 36 L0 36 Z" />
        <path fill="var(--df-casa-techo)" d="M-3 17 L16 1 L35 17 Z" />
        <rect x="13" y="24" width="7" height="12" fill="var(--df-casa-puerta)" />
        {esNoche && <rect x="4" y="21" width="5" height="5" fill="#ffd97a" />}
      </g>

      {/* la era de secado: el café está AFUERA hasta que se guarde (o llueva) */}
      <g transform="translate(56 172)">
        <rect x="0" y="6" width="84" height="7" rx="2.5" fill="var(--df-era)" />
        <rect x="6" y="13" width="5" height="14" fill="var(--df-era-pata)" />
        <rect x="73" y="13" width="5" height="14" fill="var(--df-era-pata)" />
        {cafeEnEra && (
          <g fill="#a8552e">
            <circle cx="14" cy="4" r="2.4" /><circle cx="24" cy="5" r="2.2" />
            <circle cx="33" cy="3.6" r="2.5" /><circle cx="43" cy="5" r="2.3" />
            <circle cx="52" cy="4" r="2.4" /><circle cx="62" cy="5" r="2.2" />
            <circle cx="71" cy="4" r="2.3" />
          </g>
        )}
      </g>

      {/* fauna de la librería: vuela con buen tiempo, se guarda con lluvia/noche */}
      {(franja === 'amanecer' || franja === 'dia') && (
        <>
          <g transform="translate(64 64) scale(0.82)">
            <g className="scn-av-vuela">
              <Colibri inline size={0} animated title="" />
            </g>
          </g>
          <g transform="translate(168 96) scale(0.72)">
            <g className="scn-av-flota">
              <Mariposa inline size={0} animated title="" />
            </g>
          </g>
        </>
      )}
    </svg>
  );
}

/** @param {{onBack?: () => void}} [props] */
export default function DiaEnFinca({ onBack = undefined } = {}) {
  const [franja, setFranja] = useState('dia');
  const [hechas, setHechas] = useState({});
  const [aviso, setAviso] = useState(null);
  const avisoTimer = useRef(null);

  // ── Los elementos reales que Angelita señala (useAngelitaGuia) ────────────
  // Las secundarias son una lista (SECUNDARIAS.map): un mapa de refs por id en
  // vez de un useRef fijo por parada — el hook acepta esa forma vía un getter
  // función (`ref: () => refsSecundarias.current[id]`).
  const refTitular = useRef(null);
  const refPrioridad = useRef(null);
  const refObservar = useRef(null);
  const refsSecundarias = useRef({});

  const paradasGuia = useMemo(
    () => [
      { id: 'cielo', ref: refTitular, ...GUIA_ANGELITA.cielo },
      { id: 'cafe', ref: refPrioridad, ...GUIA_ANGELITA.cafe },
      { id: 'tomate', ref: () => refsSecundarias.current.tomate, ...GUIA_ANGELITA.tomate },
      { id: 'tanque', ref: () => refsSecundarias.current.tanque, ...GUIA_ANGELITA.tanque },
      { id: 'lombriz', ref: refObservar, ...GUIA_ANGELITA.lombriz },
    ],
    [],
  );

  const f = DIA[franja];

  const fecha = useMemo(() => {
    const cruda = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
    return cruda.charAt(0).toUpperCase() + cruda.slice(1);
  }, []);

  const avisar = (t) => {
    setAviso(t);
    if (avisoTimer.current) clearTimeout(avisoTimer.current);
    avisoTimer.current = setTimeout(() => setAviso(null), 2800);
  };
  useEffect(() => () => { if (avisoTimer.current) clearTimeout(avisoTimer.current); }, []);

  // Marcar hecho = memoria del cuaderno, no premio: sin puntos, sin festejo.
  const marcar = (id) => {
    const quedaHecha = !hechas[id];
    setHechas((h) => ({ ...h, [id]: quedaHecha }));
    avisar(quedaHecha
      ? 'Quedó anotado en el cuaderno de su finca.'
      : 'Listo, quedó pendiente otra vez.');
  };

  // 🔊 Escuchar el día completo (baja alfabetización / manos ocupadas).
  const textoLectura = useMemo(
    () => `${f.titular} Lo primero: ${PRIORIDAD.titulo.toLowerCase()}. `
      + `¿Por qué? ${PRIORIDAD.porques[0].texto.toLowerCase()}, y ${PRIORIDAD.porques[1].texto.toLowerCase()}. `
      + `${PRIORIDAD.paso} ${f.hora} `
      + `También hoy, si alcanza: ${SECUNDARIAS.map((s) => s.titulo.toLowerCase()).join('; y ')}. `
      + `Y para observar: ${OBSERVAR.invitacion.toLowerCase()} ${OBSERVAR.pregunta}`,
    [f],
  );
  const escuchar = () => {
    try {
      const u = new SpeechSynthesisUtterance(textoLectura);
      u.lang = 'es-CO';
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {
      avisar('Aquí Chagra le lee el día en voz alta.');
    }
  };

  return (
    <div className="df" data-franja={franja} data-testid="mockup-dia-en-finca">
      {/* ── Barra del mockup (NO es parte del diseño propuesto) ── */}
      <div className="df-mockbar">
        {typeof onBack === 'function' && (
          <button type="button" className="df-mockchip" onClick={onBack}>← Salir</button>
        )}
        <div className="df-mockfranjas" role="group" aria-label="Hora del mockup">
          {[
            ['amanecer', '🌅'],
            ['dia', '☀️'],
            ['tarde', '🌧️'],
            ['noche', '🌙'],
          ].map(([id, txt]) => (
            <button
              key={id}
              type="button"
              className={`df-mockchip ${franja === id ? 'on' : ''}`}
              aria-pressed={franja === id}
              aria-label={`Ver el día en la franja ${id}`}
              onClick={() => setFranja(id)}
            >
              {txt}
            </button>
          ))}
        </div>
      </div>

      <main className="df-shell">
        {/* ── 0. EL CIELO VIVO: contexto y razón a la vez ── */}
        <header className="df-cielo">
          <EscenaFinca cielo={f.cielo} franja={franja} cafeGuardado={!!hechas[PRIORIDAD.id]} />
          <div className="vfx-scrim-bottom df-scrim" aria-hidden="true" />
          <div className="df-cielo-txt">
            <p className="df-fecha">
              El día en su finca · {fecha}
            </p>
            <h1 className="df-titular" ref={refTitular}>{f.titular}</h1>
            <ul className="df-pulso" aria-label="Cómo está su finca ahora">
              <li><span aria-hidden="true">{f.clima.emoji}</span> {f.clima.frase}</li>
              <li><span aria-hidden="true">🌱</span> {ESTADO.matas} matas vivas</li>
              <li><span aria-hidden="true">💧</span> {ESTADO.agua}</li>
            </ul>
            <p className="df-lugar">{FINCA.vereda} · {FINCA.msnm.toLocaleString('es-CO')} msnm · {FINCA.nombre}</p>
          </div>
        </header>

        {/* ── La página de hoy del cuaderno ── */}
        <section className="df-pagina" aria-label="Lo de hoy en su finca">
          <div className="scn-kraft df-grano" aria-hidden="true" />

          {/* EL HILO DEL DÍA: baja del cielo y anuda cada tarea a su causa */}
          <svg className="df-hilo" aria-hidden="true">
            <line x1="10" y1="0" x2="10" y2="100%" className="vfx-flow df-hilo-linea" />
          </svg>

          {/* ── 1. LO PRIMERO HOY ── */}
          <p className="df-ceja">Lo primero hoy</p>
          <article ref={refPrioridad} className={`df-carta df-carta-mayor ${hechas[PRIORIDAD.id] ? 'df-hecha' : ''}`}>
            <span className="df-nudo" aria-hidden="true" />
            <ul className="df-porques" aria-label="Por qué hoy">
              {PRIORIDAD.porques.map((p) => (
                <li key={p.icono}><span aria-hidden="true">{p.icono}</span> {p.texto}</li>
              ))}
            </ul>
            <h2 className="df-carta-tit">{PRIORIDAD.titulo}</h2>
            <p className="df-paso">{PRIORIDAD.paso}</p>
            <p className="df-hora">{f.hora}</p>
            <div className="df-carta-pie">
              <button
                type="button"
                className="df-hice"
                data-testid="df-hice-cafe"
                aria-pressed={!!hechas[PRIORIDAD.id]}
                onClick={() => marcar(PRIORIDAD.id)}
              >
                {hechas[PRIORIDAD.id] ? '✓ Hecho · quedó en su cuaderno' : 'Ya lo hice'}
              </button>
              <button type="button" className="df-oir" aria-label="Escuchar lo de hoy" onClick={escuchar}>
                🔊
              </button>
            </div>
          </article>

          {/* ── 2. TAMBIÉN HOY, SI ALCANZA ── */}
          <p className="df-ceja">También hoy, si alcanza</p>
          {SECUNDARIAS.map((s) => (
            <article
              key={s.id}
              ref={(el) => { refsSecundarias.current[s.id] = el; }}
              className={`df-carta df-carta-menor ${hechas[s.id] ? 'df-hecha' : ''}`}
            >
              <span className="df-nudo" aria-hidden="true" />
              <div className="df-menor-cuerpo">
                <h3 className="df-carta-tit df-carta-tit-menor">{s.titulo}</h3>
                <p className="df-porque-menor">
                  <span className="df-porque-marca">Porque</span> {s.porque}
                </p>
                <button
                  type="button"
                  className="df-hice df-hice-menor"
                  data-testid={`df-hice-${s.id}`}
                  aria-pressed={!!hechas[s.id]}
                  onClick={() => marcar(s.id)}
                >
                  {hechas[s.id] ? '✓ Hecho' : 'Ya lo hice'}
                </button>
              </div>
              {s.lamina ? (
                <div className="df-menor-lamina" aria-hidden="true">
                  <LaminaMataEtapa etapa={s.lamina} />
                </div>
              ) : (
                <span className="df-menor-medalla" aria-hidden="true">{s.icono}</span>
              )}
            </article>
          ))}

          {/* ── 3. PARA OBSERVAR HOY (educativo: sin marcar, sin premio) ── */}
          <p className="df-ceja">Para observar hoy</p>
          <aside ref={refObservar} className="df-observar">
            <span className="df-nudo df-nudo-hoja" aria-hidden="true" />
            <div className="df-observar-bicho">
              <Lombriz size={52} title="Lombriz de tierra" />
            </div>
            <div className="df-observar-txt">
              <p className="df-observar-invita">{OBSERVAR.invitacion}</p>
              <p className="df-observar-pregunta">{OBSERVAR.pregunta}</p>
              <button
                type="button"
                className="df-contar"
                data-testid="df-contar"
                onClick={() => avisar('Aquí usted le cuenta a Chagra con su voz lo que vio, y queda en su cuaderno.')}
              >
                🎙️ Cuéntele a Chagra qué vio
              </button>
            </div>
          </aside>

          <p className="df-remate">Mirar despacio también es trabajo de finca.</p>
          <p className="df-mocknota">MOCKUP · datos de muestra · no navega</p>
        </section>
      </main>

      {aviso && <div className="df-aviso" role="status">{aviso}</div>}

      {/* Angelita guía: vuela hasta cada tarea/observación y explica su
          porqué agroecológico — mecanismo reutilizable (src/hooks/
          useAngelitaGuia.js), NO exclusivo de esta pantalla. Con
          recordarCierreId: si el campesino la cierra, no vuelve a insistir
          en este dispositivo. */}
      <AngelitaGuia paradas={paradasGuia} recordarCierreId="mockup-dia-en-finca" />
    </div>
  );
}
