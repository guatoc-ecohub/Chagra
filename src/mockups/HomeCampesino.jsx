/* eslint-disable chagra-i18n/no-hardcoded-spanish --
 * MOCKUP DEV (#/mockups/home-campesino): copy de muestra en español de
 * Colombia para decidir dirección visual. No es UI de producción; si el
 * rediseño se adopta, sus textos migran a src/config/messages.js (ADR-050). */
/**
 * HomeCampesino.jsx — MOCKUP DEV del HOME CON OJOS DE CAMPESINO
 * (#/mockups/home-campesino, sin gate ni sesión — datos de muestra).
 *
 * Auditoría 2026-07-09 del home actual (FincaVivaHero + secciones): para una
 * campesina con poca costumbre de apps, con afán y a veces sin leer de
 * corrido, el home de hoy es LARGO (≈6 pantallas de scroll, ~20 tarjetas y
 * ~35 chips), repite "preguntar" en 4 formas distintas sin que ninguna mande,
 * esconde "anotar lo que hice" a 2.5 pantallas, y habla en ingeniero
 * ("IA LOCAL", "Cola de tareas", "fenología", "análisis"). Este mockup
 * invierte la jerarquía:
 *
 *   1. EL CORAZÓN ES EL BOTÓN DE HABLAR. La metáfora central de la escena
 *      biopunk (el corazón-semilla que late bajo la finca) deja de ser
 *      decoración y pasa a ser LA acción principal: un botón gigante que
 *      late, "PREGUNTE — toque y hable".
 *   2. Dos acciones dominan el fold: PREGUNTAR (voz) y ANOTAR SU DÍA.
 *      Lo demás espera.
 *   3. SEIS PUERTAS grandes de una-dos palabras (Mis matas / Mis animales /
 *      El tiempo / Vender / Aprender / Toda mi finca). Sin descripciones,
 *      sin chips: dibujo grande + palabra grande.
 *   4. El TIEMPO de hoy en palabras del campo, arriba, junto al saludo.
 *   5. UN solo recado en cristiano ("Mañana llueve — guarde el café").
 *   6. TODO se puede ESCUCHAR (🔊): pensado para baja alfabetización.
 *   7. Vista "pleno sol": variante clara de alto contraste para leer el
 *      teléfono a mediodía en el campo (el biopunk nocturno va bien de
 *      noche, pero de día al rayo del sol un fondo oscuro no se ve).
 *
 * Técnica: CSS puro + emojis grandes (cero deps, cero fotos), targets
 * mínimos 88px, tipografía Baloo 2 / Nunito ya self-host. Los toques
 * muestran un aviso "aquí se abre X" (mockup honesto: no navega de verdad).
 * `prefers-reduced-motion` apaga el latido. Español de Colombia (usted).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import './home-campesino.css';

// ── Datos de muestra (los reales saldrían de perfil + clima + recordatorios) ──
const MUESTRA = {
  nombre: 'María',
  vereda: 'Vereda La Esperanza',
  climaNoche: { emoji: '🌧️', frase: 'Esta noche llueve suave', manana: 'Mañana sale el sol' },
  climaDia: { emoji: '⛅', frase: 'Hoy: sol con nubes', manana: 'Por la tarde puede llover' },
  recado: 'Mañana llueve por la tarde. Guarde el café que tiene secando.',
};

const PUERTAS = [
  { id: 'matas', emoji: '🌱', nombre: 'Mis matas', tinte: 'verde', abre: 'sus siembras y cultivos' },
  { id: 'animales', emoji: '🐔', nombre: 'Mis animales', tinte: 'teja', abre: 'sus gallinas, cerdos y demás animales' },
  { id: 'tiempo', emoji: '🌦️', nombre: 'El tiempo', tinte: 'cielo', abre: 'el clima de hoy y los próximos días' },
  { id: 'vender', emoji: '🧺', nombre: 'Vender', tinte: 'ambar', abre: 'precios, mercado y su despensa' },
  { id: 'aprender', emoji: '📖', nombre: 'Aprender', tinte: 'uva', abre: 'las lecciones y guías del campo' },
  { id: 'finca', emoji: '🏡', nombre: 'Toda mi finca', tinte: 'menta', abre: 'todos los mundos de su finca' },
];

function saludoPorHora(h) {
  if (h >= 5 && h < 12) return 'Buenos días';
  if (h >= 12 && h < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function HomeCampesino({ onBack }) {
  const hora = new Date().getHours();
  const esDeNoche = hora >= 18 || hora < 5;
  const [modo, setModo] = useState(esDeNoche ? 'noche' : 'dia');
  const [aviso, setAviso] = useState(null);
  const avisoTimer = useRef(null);

  const clima = modo === 'noche' ? MUESTRA.climaNoche : MUESTRA.climaDia;
  const saludo = `${saludoPorHora(modo === 'noche' ? 20 : 10)}, ${MUESTRA.nombre}`;

  // Aviso honesto del mockup: qué abriría cada toque en la app real.
  const avisar = (texto) => {
    setAviso(texto);
    if (avisoTimer.current) clearTimeout(avisoTimer.current);
    avisoTimer.current = setTimeout(() => setAviso(null), 2600);
  };
  useEffect(() => () => { if (avisoTimer.current) clearTimeout(avisoTimer.current); }, []);

  // 🔊 Escuchar: lee el home en voz alta (baja alfabetización). En la app real
  // esto usa el TTS propio (kokoro); aquí, la voz del sistema como demo.
  const textoLectura = useMemo(
    () => `${saludo}. ${clima.frase}. ${clima.manana}. `
      + 'Puede preguntar con su voz, anotar su día, o entrar a: mis matas, mis animales, '
      + `el tiempo, vender, aprender, o toda su finca. Recado de hoy: ${MUESTRA.recado}`,
    [saludo, clima],
  );
  const escuchar = () => {
    try {
      const u = new SpeechSynthesisUtterance(textoLectura);
      u.lang = 'es-CO';
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (_) {
      avisar('Aquí Chagra le lee la pantalla en voz alta.');
    }
  };

  return (
    <div className="hcm" data-modo={modo} data-testid="mockup-home-campesino">
      {/* ── Barra del mockup (no es parte del diseño propuesto) ── */}
      <div className="hcm-mockbar">
        {typeof onBack === 'function' && (
          <button type="button" className="hcm-mockchip" onClick={onBack}>← Salir del mockup</button>
        )}
        <div className="hcm-mockmodos" role="group" aria-label="Vista del mockup">
          <button
            type="button"
            className={`hcm-mockchip ${modo === 'noche' ? 'on' : ''}`}
            aria-pressed={modo === 'noche'}
            onClick={() => setModo('noche')}
          >
            🌙 Noche
          </button>
          <button
            type="button"
            className={`hcm-mockchip ${modo === 'dia' ? 'on' : ''}`}
            aria-pressed={modo === 'dia'}
            onClick={() => setModo('dia')}
          >
            ☀️ Pleno sol
          </button>
        </div>
      </div>

      <main className="hcm-shell">
        {/* ── 1. CIELO: saludo + el tiempo en palabras, y el botón de escuchar ── */}
        <header className="hcm-cielo">
          <span className="hcm-astro" aria-hidden="true">{modo === 'noche' ? '🌙' : '☀️'}</span>
          <h1 className="hcm-saludo">{saludo}</h1>
          <p className="hcm-clima">
            <span className="hcm-clima-emoji" aria-hidden="true">{clima.emoji}</span>
            {clima.frase}. <b>{clima.manana}.</b>
          </p>
          <button type="button" className="hcm-escuchar" onClick={escuchar}>
            🔊 Escuchar
          </button>
        </header>

        {/* ── 2. LAS DOS ACCIONES GRANDES ── */}
        <button
          type="button"
          className="hcm-accion hcm-preguntar"
          data-testid="hcm-preguntar"
          onClick={() => avisar('Aquí se abre el agente: usted habla y Chagra le contesta.')}
        >
          {/* El corazón de la finca — ahora ES el botón de hablar */}
          <span className="hcm-corazon" aria-hidden="true">
            <span className="hcm-pulso" />
            <span className="hcm-pulso hcm-pulso2" />
            <svg viewBox="0 0 24 24" width="34" height="34" fill="none" aria-hidden="true">
              <rect x="9" y="2.5" width="6" height="11.5" rx="3" fill="#12260a" />
              <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" stroke="#12260a" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </span>
          <span className="hcm-accion-txt">
            <b>Pregunte</b>
            <small>Toque y hable. Chagra le contesta.</small>
          </span>
        </button>

        <button
          type="button"
          className="hcm-accion hcm-anotar"
          data-testid="hcm-anotar"
          onClick={() => avisar('Aquí se abre Registrar: cuente qué hizo, por voz o a mano.')}
        >
          <span className="hcm-accion-icono" aria-hidden="true">✍️</span>
          <span className="hcm-accion-txt">
            <b>Anote su día</b>
            <small>Qué cosechó, qué abonó, qué vio.</small>
          </span>
        </button>

        {/* ── 3. LAS SEIS PUERTAS ── */}
        <h2 className="hcm-tit">¿A dónde va?</h2>
        <nav className="hcm-puertas" aria-label="Lugares de su finca">
          {PUERTAS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`hcm-puerta t-${p.tinte}`}
              aria-label={`${p.nombre}: abre ${p.abre}`}
              onClick={() => avisar(`Aquí se abren ${p.abre}.`)}
            >
              <span className="hcm-puerta-emoji" aria-hidden="true">{p.emoji}</span>
              <span className="hcm-puerta-nombre">{p.nombre}</span>
            </button>
          ))}
        </nav>

        {/* ── 4. UN SOLO RECADO, EN CRISTIANO ── */}
        <section className="hcm-recado" aria-label="Recado de hoy">
          <span className="hcm-recado-icono" aria-hidden="true">🔔</span>
          <p><b>Recado de hoy:</b> {MUESTRA.recado}</p>
        </section>

        {/* ── 5. AYUDA Y PERFIL, GRANDES Y AL FINAL ── */}
        <div className="hcm-pie">
          <button type="button" className="hcm-pie-btn" onClick={() => avisar('Aquí se abre la ayuda, con explicación paso a paso.')}>
            🙋 Necesito ayuda
          </button>
          <button type="button" className="hcm-pie-btn" onClick={() => avisar('Aquí se abre su perfil y su finca.')}>
            👤 Mi perfil
          </button>
        </div>

        <p className="hcm-marca">{MUESTRA.vereda} · 1.800 msnm</p>
        <p className="hcm-mocknota">MOCKUP · datos de muestra</p>
      </main>

      {/* Aviso honesto del mockup */}
      {aviso && (
        <div className="hcm-aviso" role="status">{aviso}</div>
      )}
    </div>
  );
}
