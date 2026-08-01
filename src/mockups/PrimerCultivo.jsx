/*
 * MOCKUP DEV (#/mockups/primer-cultivo): copy de muestra en español de
 * Colombia (usted) para el onboarding aspiracional del primer cultivo. No es
 * UI de producción; si se adopta, sus textos migran a src/config/messages.js
 * (ADR-050).
 */
/**
 * PrimerCultivo.jsx — MOCKUP DEV · "EL CAMINO DEL PRIMER CULTIVO"
 * (#/mockups/primer-cultivo, sin gate ni sesión — datos de muestra).
 *
 * Concepto: "ACOMPAÑAR LA PRIMERA SIEMBRA REAL, NO ENSEÑAR UNA APP".
 *   Quien nunca ha sembrado abre esta pantalla y un mentor campesino lo lleva
 *   de la mano por su PRIMERA MATA, honesto de principio a fin: qué se da en su
 *   clima (con la expectativa REAL, sin promesas mágicas), cómo escoger el
 *   sitio con lo mínimo, el gesto concreto de sembrar (hondura, distancia), qué
 *   MIRAR los próximos días (y qué es normal y qué no) y — el corazón del
 *   asunto — la PACIENCIA: si no asoma, no falló usted; así se aprende.
 *
 * Alineado con la dirección educativa de Chagra (observación + fracaso +
 * paciencia). ANTI-GAMIFICACIÓN ESTRICTA: no hay puntos, medallas, rachas ni
 * barra de "progreso/sube de nivel". El "camino" es un MAPA de cinco pasos por
 * el que se puede ir y volver sin afán — nunca un medidor de logro; ningún paso
 * se "completa" ni se premia. El único registro posible es la memoria del
 * cuaderno, no un trofeo.
 *
 * Cinco pasos (un pulgar, mentor que acompaña):
 *   1. ELEGIR — mire el cielo de su vereda; escoja según su clima y su época,
 *      con la espera real por delante (no todo se da en todas partes).
 *   2. EL SITIO — un pedazo de tierra bien escogido: sol, agua que escurra y
 *      suelo suelto. Lo MÍNIMO indispensable; no hay que comprar nada.
 *   3. SEMBRAR — el gesto: a qué hondura y a qué distancia va la semilla.
 *   4. OBSERVAR — qué mirar los próximos días: en cuánto asoma, qué es normal
 *      y qué sí es para ponerle ojo. Mirar despacio también es trabajo.
 *   5. ESPERAR — la paciencia y el reencuadre del fracaso: la primera mata no
 *      se mide en cosecha, se mide en lo que usted aprendió mirándola.
 *
 * Stack: SVG + CSS, cero deps nuevas. REUSA la librería visual: CapaCielo
 * (scenes) para el cielo real de la vereda, la clase .scn-kraft (scenes.css)
 * para el papel, los efectos vfx-grade por piso térmico / vfx-scrim-bottom /
 * vfx-draw + el helper AutoDibujo (effects) para el brote que se dibuja solo,
 * las láminas LaminaSiembra / LaminaAporque / LaminaCafeto (laminas) y la fauna
 * Lombriz / Mariposa / Colibri (creatures). Offline-trivial. Usted cordial.
 *
 * Es un MOCKUP HONESTO: los toques muestran "aquí se abre X" y NO navegan.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { CapaCielo } from '../visual/scenes';
import { Lombriz, Mariposa, Colibri } from '../visual/creatures';
import { LaminaSiembra, LaminaAporque, LaminaCafeto } from '../visual/laminas';
import { AutoDibujo } from '../visual/effects';
import '../visual/scenes/scenes.css';
import '../visual/effects/effects.css';
import './primer-cultivo.css';

// ── Finca de muestra (ficticia; los reales saldrían del perfil) ───────────────
const FINCA = {
  vereda: 'Vereda La Esperanza',
};

// ── El clima manda: qué se da, la mata para empezar y su ESPERA real ──────────
// Tres pisos térmicos, tres matas para el primer intento, cada una con su forma
// de siembra (la lámina LaminaSiembra resalta esa forma). La expectativa es
// HONESTA: la papa da en meses, la yuca casi un año, el café siembra futuro.
const CLIMAS = {
  frio: {
    id: 'frio',
    nombre: 'Tierra fría',
    rango: '2.400 a 2.800 metros',
    sena: 'Amanece con neblina y la ruana no sobra.',
    grade: 'vfx-grade--frio',
    cielo: { luz: 'dia', condicion: 'nublado' },
    tambien: [
      { nombre: 'La arveja', nota: 'rápida y noble' },
      { nombre: 'El cubio', nota: 'de la casa' },
      { nombre: 'La cebolla larga', nota: 'siempre a la mano' },
    ],
    maduraLamina: null,
    mata: {
      nombre: 'La papa',
      binomio: 'Solanum tuberosum',
      forma: 'tuberculo',
      formaNombre: 'una papa-semilla (un tubérculo con ojos)',
      porque: 'En su clima la papa se cría bien, y con pocas matas ya come la familia.',
      espera: 'No es de afán: de la siembra a la cosecha pasan de 4 a 5 meses.',
      epoca: 'Siémbrela cuando entren las lluvias buenas, no en plena seca.',
      asoma: 'El brote asoma por la tierra entre los 15 y los 25 días.',
      profundidad: 'Entierre la papa-semilla a un jeme (como 15 cm), con los ojos hacia arriba.',
      distancia: 'Deje una cuarta y media (30 a 40 cm) de una mata a la otra.',
      normal: 'Los primeros días no ve nada por fuera: abajo está echando raíz. Eso es normal.',
      ojo: 'Si el surco se encharca y la tierra huele agrio, afloje y deje escurrir: se le puede pudrir.',
    },
  },
  templado: {
    id: 'templado',
    nombre: 'Tierra templada',
    rango: '1.400 a 2.000 metros',
    sena: 'Da gusto estar afuera: ni frío ni bochorno.',
    grade: 'vfx-grade--templado',
    cielo: { luz: 'dia', condicion: 'despejado' },
    tambien: [
      { nombre: 'El maíz', nota: 'el de siempre' },
      { nombre: 'El fríjol', nota: 'trepa y da rápido' },
      { nombre: 'El tomate', nota: 'pide más cuidado' },
    ],
    maduraLamina: 'cafeto',
    mata: {
      nombre: 'El café',
      binomio: 'Coffea arabica',
      forma: 'colino',
      formaNombre: 'un colino (una matica de vivero, ya con sus hojas)',
      porque: 'Es el cultivo bandera de estas lomas y enseña la paciencia como ninguno.',
      espera: 'El que siembra café siembra futuro: da su primera cosecha de verdad a los dos años.',
      epoca: 'Lleve el colino al hueco al entrar las lluvias, para que no sufra de sed.',
      asoma: 'El colino ya viene con hojas; en 3 o 4 semanas echa raíz nueva y se afirma.',
      profundidad: 'Va a la misma altura que traía en la bolsa, ni más hondo. Que el cuello no quede enterrado.',
      distancia: 'Un metro largo entre mata y mata, para que cada una tenga su aire.',
      normal: 'Puede soltar una hoja o dos del trasplante y quedarse quieto un tiempo. Es normal, está pegando.',
      ojo: 'Si se pone amarillo y suelta todas las hojas, revise: quedó muy hondo o le falta sombra.',
    },
  },
  calido: {
    id: 'calido',
    nombre: 'Tierra caliente',
    rango: 'menos de 1.400 metros',
    sena: 'El sol pega duro y la camisa se pega al cuerpo.',
    grade: 'vfx-grade--calido',
    cielo: { luz: 'dia', condicion: 'despejado' },
    tambien: [
      { nombre: 'El plátano', nota: 'sombra y comida' },
      { nombre: 'El maíz', nota: 'el de siempre' },
      { nombre: 'La ahuyama', nota: 'se riega sola' },
    ],
    maduraLamina: null,
    mata: {
      nombre: 'La yuca',
      binomio: 'Manihot esculenta',
      forma: 'esqueje',
      formaNombre: 'un cangre (un pedazo de tallo con sus yemas)',
      porque: 'Aguanta el calor y la seca mejor que casi todo, y de un solo palo salen muchas.',
      espera: 'Es larga pero segura: se arranca de los 8 a los 10 meses.',
      epoca: 'Clávela al empezar las lluvias; el cangre necesita humedad para prender.',
      asoma: 'El cangre prende y saca sus primeros cogollos entre los 10 y los 20 días.',
      profundidad: 'Clave el cangre medio inclinado, dejando dos yemas por fuera de la tierra.',
      distancia: 'Un metro entre mata y mata: la yuca baja mucha raíz.',
      normal: 'Al principio solo ve el palo clavado. Tenga fe: abajo echa raíz antes de brotar.',
      ojo: 'Si el cangre se ablanda y se pone baboso, no prendió: saque otro de un tallo sano.',
    },
  },
};

// ── Los cinco pasos del camino (mapa, NO barra de progreso) ────────────────────
const PASOS = [
  { id: 'elegir', mojon: 'Elegir', titulo: 'Qué va a sembrar' },
  { id: 'sitio', mojon: 'El sitio', titulo: 'Dónde va a quedar' },
  { id: 'sembrar', mojon: 'Sembrar', titulo: 'El gesto de sembrar' },
  { id: 'observar', mojon: 'Observar', titulo: 'Los próximos días' },
  { id: 'esperar', mojon: 'Esperar', titulo: 'La paciencia' },
];

// ── Lo MÍNIMO indispensable del sitio (paso 2): sin comprar nada ──────────────
const NECESIDADES = [
  {
    icono: '☀️',
    titulo: 'Sol, pero no todo el día',
    texto: 'Con medio día de sol le basta. Ni a la sombra total ni al sol que raja piedras de sol a sol.',
  },
  {
    icono: '💧',
    titulo: 'Que el agua escurra',
    texto: 'Después de un aguacero, mire: si queda un charco que dura, busque otro puesto. La raíz se ahoga en agua parada.',
  },
  {
    icono: '🪏',
    titulo: 'Tierra suelta',
    texto: 'Afloje con azadón hasta donde entra la mano. Quítele piedras y raíces viejas. Nada más.',
  },
];

// ── El brote que se dibuja solo (paso 4): AutoDibujo de la librería effects ────
// Una semilla que abre raíz hacia abajo y cotiledón hacia arriba: el trazo se
// dibuja al entrar (vfx-draw), y en reduced-motion aparece completo y quieto.
function BroteDibujado() {
  return (
    <svg className="pc-brote" viewBox="0 0 120 120" role="img" aria-label="El primer brote asomando de la semilla">
      {/* la línea de la tierra */}
      <AutoDibujo as="line" stage={1} x1="14" y1="70" x2="106" y2="70" stroke="var(--pc-ocre)" strokeWidth="2.5" strokeLinecap="round" />
      {/* la semilla */}
      <AutoDibujo as="path" stage={2} d="M60 70 q-9 4 -9 12 q0 8 9 8 q9 0 9 -8 q0 -8 -9 -12 Z" stroke="var(--pc-tinta)" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
      {/* la raíz que baja */}
      <AutoDibujo as="path" stage={3} d="M60 90 q-3 12 -8 20 M60 90 q3 10 7 16" stroke="var(--pc-tinta2)" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* el tallito que sube */}
      <AutoDibujo as="path" stage={4} d="M60 70 q-1 -18 0 -30" stroke="var(--pc-verde)" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      {/* los dos cotiledones */}
      <AutoDibujo as="path" stage={5} d="M60 42 q-13 -3 -18 -12 q11 -2 18 6 Z" stroke="var(--pc-verde)" strokeWidth="2.4" fill="var(--pc-verde-suave)" strokeLinejoin="round" />
      <AutoDibujo as="path" stage={6} d="M60 42 q13 -3 18 -12 q-11 -2 -18 6 Z" stroke="var(--pc-verde)" strokeWidth="2.4" fill="var(--pc-verde-suave)" strokeLinejoin="round" />
    </svg>
  );
}

// ── Escena del camino: cielo real de la vereda + la loma con el sendero ───────
// El cielo (CapaCielo) responde al clima elegido; encima, el grade de luz por
// piso térmico (vfx-grade) tiñe la hora. El sendero que sube la loma ES la
// metáfora: un camino que se recorre paso a paso, no una carrera.
function EscenaCamino({ clima, paso }) {
  const madurando = paso === 'esperar';
  const buenTiempo = paso === 'elegir' || paso === 'sembrar';
  return (
    <div className="pc-escena-wrap">
      <svg className="pc-escena" viewBox="0 0 390 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <CapaCielo cielo={clima.cielo} cx={318} cy={50} r={19} lluviaY={70} w={390} h={200} />

        {/* lomas de la vereda */}
        <path fill="var(--pc-loma-lejos)" d="M0 120 L64 96 L128 114 L196 84 L262 108 L326 88 L390 104 L390 200 L0 200 Z" />
        <path fill="var(--pc-loma)" d="M0 150 L80 122 L156 144 L242 118 L318 142 L390 126 L390 200 L0 200 Z" />
        <rect x="0" y="170" width="390" height="30" fill="var(--pc-pasto)" />

        {/* el sendero que sube: mojones de piedra hacia la loma */}
        <path className="pc-sendero" d="M40 196 Q150 176 210 150 T330 96" fill="none" stroke="var(--pc-sendero-c)" strokeWidth="7" strokeLinecap="round" strokeDasharray="1 13" />

        {/* la matica sembrada en primer plano (crece en el paso de esperar) */}
        <g transform="translate(52 176)">
          <path d="M0 0 q-2 -10 0 -18" fill="none" stroke="var(--pc-verde-hondo)" strokeWidth={madurando ? 3 : 2.4} strokeLinecap="round" />
          {madurando && (
            <>
              <path d="M0 -18 q-9 -2 -13 -9 q8 -1 13 4 Z" fill="var(--pc-verde)" />
              <path d="M0 -18 q9 -2 13 -9 q-8 -1 -13 4 Z" fill="var(--pc-verde)" />
              <path d="M0 -10 q-8 -1 -12 -7 q7 -1 12 3 Z" fill="var(--pc-verde-hondo)" />
            </>
          )}
        </g>

        {/* fauna de la librería: revolotea con buen tiempo */}
        {buenTiempo && (
          <g transform="translate(150 70) scale(0.7)">
            <g className="pc-av-flota">
              <Mariposa inline size={0} animated title="" />
            </g>
          </g>
        )}
      </svg>
      <div className={`vfx-grade ${clima.grade} pc-grade`} aria-hidden="true" />
      <div className="vfx-scrim-bottom pc-scrim" aria-hidden="true" />
    </div>
  );
}

/** @param {{onBack?: () => void}} [props] */
export default function PrimerCultivo({ onBack = undefined } = {}) {
  const [climaId, setClimaId] = useState('templado');
  const [pasoIx, setPasoIx] = useState(0);
  const [aviso, setAviso] = useState(null);
  const avisoTimer = useRef(null);
  const shellRef = useRef(null);

  const clima = CLIMAS[climaId];
  const mata = clima.mata;
  const paso = PASOS[pasoIx];

  const avisar = (t) => {
    setAviso(t);
    if (avisoTimer.current) clearTimeout(avisoTimer.current);
    avisoTimer.current = setTimeout(() => setAviso(null), 3000);
  };
  useEffect(() => () => { if (avisoTimer.current) clearTimeout(avisoTimer.current); }, []);

  const irA = (ix) => {
    setPasoIx(ix);
    // Subir la vista al empezar el paso (el camino no es un scroll infinito).
    if (typeof shellRef.current?.scrollIntoView === 'function') {
      shellRef.current.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  };

  // 🔊 Leer el paso en voz alta (baja alfabetización / manos en la tierra).
  const textoLectura = useMemo(() => {
    switch (paso.id) {
      case 'elegir':
        return `Primero, mire el cielo de su vereda. En ${clima.nombre}, para empezar, siembre ${mata.nombre.toLowerCase()}. ${mata.porque} ${mata.espera}`;
      case 'sitio':
        return `La primera mata no necesita finca, necesita un pedazo de tierra bien escogido. ${NECESIDADES.map((n) => n.texto).join(' ')}`;
      case 'sembrar':
        return `Llegó el momento. Con ${mata.formaNombre} en la mano: ${mata.profundidad} ${mata.distancia}`;
      case 'observar':
        return `Ya sembró. Ahora aprenda a mirar. ${mata.asoma} Esto es normal: ${mata.normal} Póngale ojo si: ${mata.ojo}`;
      case 'esperar':
        return 'Puede que asome, puede que no. Si no asoma, no falló usted: así se aprende. La primera mata no se mide en cosecha, se mide en lo que usted aprendió mirándola.';
      default:
        return '';
    }
  }, [paso.id, clima.nombre, mata]);

  const escuchar = () => {
    try {
      const u = new SpeechSynthesisUtterance(textoLectura);
      u.lang = 'es-CO';
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {
      avisar('Aquí Chagra le lee el paso en voz alta.');
    }
  };

  return (
    <div className="pc" data-clima={climaId} data-paso={paso.id} data-testid="mockup-primer-cultivo">
      {/* ── Barra del mockup (NO es parte del diseño propuesto) ── */}
      <div className="pc-mockbar">
        {typeof onBack === 'function' && (
          <button type="button" className="pc-mockchip" onClick={onBack}>← Salir</button>
        )}
        <span className="pc-mocknota">MOCKUP · datos de muestra · no navega</span>
      </div>

      <main className="pc-shell" ref={shellRef}>
        {/* ── El cielo de la vereda + el sendero ── */}
        <header className="pc-cielo">
          <EscenaCamino clima={clima} paso={paso.id} />
          <div className="pc-cielo-txt">
            <p className="pc-kicker">El camino del primer cultivo</p>
            <h1 className="pc-titulo">{paso.titulo}</h1>
            <p className="pc-lugar">{FINCA.vereda} · {clima.nombre}</p>
          </div>
        </header>

        {/* ── El sendero: mapa de cinco pasos (NO barra de progreso) ── */}
        <nav className="pc-mapa" aria-label="Los cinco pasos del camino">
          <ol className="pc-mojones">
            {PASOS.map((p, ix) => (
              <li key={p.id} className="pc-mojon-li">
                <button
                  type="button"
                  className={`pc-mojon ${ix === pasoIx ? 'on' : ''}`}
                  aria-current={ix === pasoIx ? 'step' : undefined}
                  aria-label={`Paso ${ix + 1}: ${p.mojon}`}
                  onClick={() => irA(ix)}
                >
                  <span className="pc-mojon-punto" aria-hidden="true" />
                  <span className="pc-mojon-txt">{p.mojon}</span>
                </button>
              </li>
            ))}
          </ol>
          <p className="pc-mapa-nota">Cinco pasos. Sin afán: puede ir y volver cuando quiera.</p>
        </nav>

        {/* ── El cuerpo del paso, sobre el papel del cuaderno ── */}
        <section className="scn-kraft pc-pagina" aria-live="polite">

          {/* ── 1. ELEGIR ── */}
          {paso.id === 'elegir' && (
            <div className="pc-paso">
              <p className="pc-lead">
                Antes de meter la mano en la tierra, mire el cielo de su vereda. No todo se da en
                todas partes, y está bien. Empiece por lo que su clima cría fácil.
              </p>

              <p className="pc-ceja">¿Cómo es el clima donde usted vive?</p>
              <div className="pc-climas" role="group" aria-label="Escoja su clima">
                {Object.values(CLIMAS).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`pc-clima ${c.id === climaId ? 'on' : ''}`}
                    aria-pressed={c.id === climaId}
                    onClick={() => setClimaId(c.id)}
                  >
                    <span className="pc-clima-nombre">{c.nombre}</span>
                    <span className="pc-clima-rango">{c.rango}</span>
                    <span className="pc-clima-sena">{c.sena}</span>
                  </button>
                ))}
              </div>

              <article className="pc-carta pc-carta-mata">
                <p className="pc-carta-ceja">Para empezar, siembre</p>
                <h2 className="pc-carta-tit">
                  {mata.nombre} <em className="pc-binomio">{mata.binomio}</em>
                </h2>
                <p className="pc-carta-txt">{mata.porque}</p>

                {clima.maduraLamina === 'cafeto' && (
                  <div className="pc-carta-lamina">
                    <LaminaCafeto className="pc-lamina" />
                  </div>
                )}

                <ul className="pc-tambien" aria-label="Otras que también se dan en su clima">
                  <li className="pc-tambien-lbl">En su clima también se dan:</li>
                  {clima.tambien.map((t) => (
                    <li key={t.nombre} className="pc-tambien-it">
                      <span className="pc-tambien-n">{t.nombre}</span>
                      <span className="pc-tambien-nota"> — {t.nota}</span>
                    </li>
                  ))}
                </ul>

                <div className="pc-espera">
                  <p><span className="pc-espera-lbl">La espera:</span> {mata.espera}</p>
                  <p><span className="pc-espera-lbl">La época:</span> {mata.epoca}</p>
                </div>
              </article>
            </div>
          )}

          {/* ── 2. EL SITIO ── */}
          {paso.id === 'sitio' && (
            <div className="pc-paso">
              <p className="pc-lead">
                La primera mata no necesita finca: necesita un pedazo de tierra bien escogido.
                No compre nada todavía. Con esto basta para empezar.
              </p>

              {NECESIDADES.map((n) => (
                <article key={n.titulo} className="pc-carta pc-carta-menor">
                  <span className="pc-menor-icono" aria-hidden="true">{n.icono}</span>
                  <div className="pc-menor-cuerpo">
                    <h3 className="pc-menor-tit">{n.titulo}</h3>
                    <p className="pc-menor-txt">{n.texto}</p>
                  </div>
                </article>
              ))}

              <article className="pc-carta pc-carta-suelo">
                <div className="pc-suelo-lamina" aria-hidden="true">
                  <LaminaAporque className="pc-lamina" />
                </div>
                <div className="pc-suelo-txt">
                  <h3 className="pc-menor-tit">Así se ve una tierra viva</h3>
                  <p className="pc-menor-txt">
                    Al aflojar, mírela por dentro: oscura, que huele a tierra mojada, sin encharcar.
                  </p>
                  <p className="pc-suelo-lombriz">
                    <span className="pc-lombriz-icono" aria-hidden="true">
                      <Lombriz size={40} title="Lombriz de tierra" />
                    </span>
                    Si salen lombrices, alégrese: esa tierra está viva y le va a criar bien la mata.
                  </p>
                </div>
              </article>
            </div>
          )}

          {/* ── 3. SEMBRAR ── */}
          {paso.id === 'sembrar' && (
            <div className="pc-paso">
              <p className="pc-lead">
                Llegó el momento. Con {mata.formaNombre} en la mano, esto es lo único que tiene que
                hacer bien:
              </p>

              <div className="pc-siembra-lamina">
                <LaminaSiembra activo={mata.forma} className="pc-lamina" />
                <p className="pc-lamina-pie">La forma de sembrar {mata.nombre.toLowerCase()}</p>
              </div>

              <div className="pc-gestos">
                <article className="pc-gesto">
                  <span className="pc-gesto-lbl">A qué hondura</span>
                  <p className="pc-gesto-txt">{mata.profundidad}</p>
                </article>
                <article className="pc-gesto">
                  <span className="pc-gesto-lbl">A qué distancia</span>
                  <p className="pc-gesto-txt">{mata.distancia}</p>
                </article>
              </div>

              <p className="pc-consejo">
                <span className="pc-consejo-lbl">Un consejo de viejo:</span> el error más común es
                enterrar muy hondo por miedo. Si duda, más bien poquito.
              </p>
              <p className="pc-nota-epoca">{mata.epoca}</p>
            </div>
          )}

          {/* ── 4. OBSERVAR ── */}
          {paso.id === 'observar' && (
            <div className="pc-paso">
              <p className="pc-lead">
                Ya sembró. Ahora empieza lo más difícil: no hacer casi nada y aprender a mirar.
              </p>

              <div className="pc-observar-brote">
                <BroteDibujado />
                <p className="pc-asoma">{mata.asoma}</p>
              </div>

              <div className="pc-dos">
                <article className="pc-carta pc-carta-normal">
                  <h3 className="pc-dos-tit">Esto es normal</h3>
                  <p className="pc-menor-txt">{mata.normal}</p>
                </article>
                <article className="pc-carta pc-carta-ojo">
                  <h3 className="pc-dos-tit">Esto sí es para ponerle ojo</h3>
                  <p className="pc-menor-txt">{mata.ojo}</p>
                </article>
              </div>

              <p className="pc-consejo">
                <span className="pc-consejo-lbl">La costumbre que vale:</span> pase todos los días,
                aunque sea un momento. No para apurarla — para conocerla. La mata le va enseñando.
              </p>
            </div>
          )}

          {/* ── 5. ESPERAR (el corazón: paciencia + reencuadre del fracaso) ── */}
          {paso.id === 'esperar' && (
            <div className="pc-paso pc-paso-esperar">
              <div className="pc-esperar-fauna" aria-hidden="true">
                <span className="pc-fauna-a"><Colibri size={46} animated title="" /></span>
                <span className="pc-fauna-b"><Mariposa size={40} animated title="" /></span>
              </div>

              <p className="pc-lead pc-lead-hondo">
                Puede que asome. Puede que no.
              </p>
              <p className="pc-esperar-txt">
                Si no asoma, <strong>no falló usted</strong>: falló esa semilla, o el clima, o la
                tierra — y así se aprende. El campo no es de una sola vez. Guarde otra, vuelva a
                sembrar, y anote qué cambió.
              </p>
              <p className="pc-remate">
                La primera mata no se mide en cosecha. Se mide en lo que usted aprendió mirándola.
              </p>

              <button
                type="button"
                className="pc-anotar"
                data-testid="pc-anotar"
                onClick={() => avisar('Aquí usted le cuenta a Chagra con su voz cómo le fue, y queda en su cuaderno.')}
              >
                🎙️ Cuéntele a Chagra cómo le fue
              </button>

              <p className="pc-cierre">
                Ese es el camino. No hay más premio que la mata misma — y lo que usted aprendió.
              </p>
              <button type="button" className="pc-reinicio" onClick={() => irA(0)}>
                Volver al principio del camino
              </button>
            </div>
          )}

        </section>

        {/* ── Avanzar / retroceder + oír el paso ── */}
        <nav className="pc-pies" aria-label="Moverse por el camino">
          <button
            type="button"
            className="pc-pie pc-atras"
            disabled={pasoIx === 0}
            onClick={() => irA(Math.max(0, pasoIx - 1))}
          >
            ← Atrás
          </button>
          <button type="button" className="pc-oir" aria-label="Escuchar este paso" onClick={escuchar}>
            🔊 Oír
          </button>
          {pasoIx < PASOS.length - 1 ? (
            <button
              type="button"
              className="pc-pie pc-siguiente"
              data-testid="pc-siguiente"
              onClick={() => irA(Math.min(PASOS.length - 1, pasoIx + 1))}
            >
              Siguiente →
            </button>
          ) : (
            <button type="button" className="pc-pie pc-siguiente pc-fin" onClick={() => irA(0)}>
              Recomenzar
            </button>
          )}
        </nav>
      </main>

      {aviso && <div className="pc-aviso" role="status">{aviso}</div>}
    </div>
  );
}
