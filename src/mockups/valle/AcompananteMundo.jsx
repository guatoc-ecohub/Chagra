/*
 * AcompananteMundo — la CAPA ACOMPAÑANTE reutilizable de las vitrinas 3D.
 *
 * BUG P1 (auditoría triple, "vitrinas mudas"): las rutas de demo
 * #/mockups/mundo3d-* montaban `<Mundo>` a pelo, SIN el shell de
 * EntradaValle3D — sin voz, sin narración de Angelita y sin la barra del
 * agente. Cuartos mudos justo donde se muestra la tesis "3D + agente = un
 * cuerpo". Esta capa extrae del shell lo que hace que un mundo HABLE:
 *
 *   · useAcompanante(mundoId) — la voz (Web Speech API, es-CO) + `decir()`
 *     (voz + burbuja SIEMPRE: si el equipo no trae voz o el usuario la apaga,
 *     la burbuja ES la voz — nunca mudo) + la narración de ENTRADA del mundo
 *     (consume `MUNDO[id].entrada.narra` → NARRACION, el mismo dato que narra
 *     el shell; BUG-AG-01/BUG-AG-02) + `decirPuerta()` para que Angelita
 *     acuse los hotspots.
 *   · <AcompananteMundo> — el marco visual: envuelve al `<Mundo>` de la
 *     vitrina, flota la burbuja de Angelita sobre la escena y pinta la barra
 *     del agente ("Pregúntele a su finca…" + 🔊 Escuchar + toggle de voz).
 *
 * UNA SOLA ABEJA (#2341): Angelita ya vive DENTRO de la escena del mundo
 * (3D y lámina 2D reciben animo/energia). Aquí NO se pinta otra abeja: la
 * capa es solo su burbuja de voz + los controles — el mismo reparto que usa
 * el shell dentro de un mundo (`valle-companero--mundo`).
 *
 * Device-tier: cero costo para gama baja — puro DOM ligero, sin three, sin
 * assets; la voz es un plus que nunca bloquea. Copy en español de Colombia
 * ("usted"); si se productiza, migra a messages.js (ADR-050) y la voz real
 * es Kokoro vía ttsService.
 */
/* eslint-disable react-refresh/only-export-components -- capa acompañante:
   el hook (useAcompanante) y su marco (<AcompananteMundo>) son UNA pieza —
   la vitrina necesita ambos juntos; separarlos duplicaría el contexto (patrón
   useEntradaAbeja.jsx). Es un mockup: sin HMR-state que preservar. */
import { Children, cloneElement, isValidElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MUNDO, tituloDeMundo, tinteDeMundo } from '../../visual/mundo3d/index.js';
import { parseComandoMundo, puertasDeMundo } from '../../visual/mundo3d/comandoMundo.js';
import { NARRACION, MUNDO_VALLE_BY_ID } from './valleData';
import { speak, speakKokoro, stop as stopSpeak } from '../../services/ttsService.js';
import './acompananteMundo.css';

/* La narración de un mundo, con la MISMA cadena de fallbacks del shell:
   la clave `entrada.narra` del registro → la del propio id → el lema del
   valle → un "está aquí" digno. Nunca vacío. */
export function narracionDeMundo(mundoId) {
  const clave = MUNDO[mundoId]?.entrada?.narra;
  return (
    (clave && NARRACION[clave]) ||
    NARRACION[mundoId] ||
    MUNDO_VALLE_BY_ID[mundoId]?.lema ||
    `Está en ${tituloDeMundo(mundoId)}.`
  );
}

/**
 * El acompañante de una vitrina: voz + burbuja + narración de entrada.
 * La vitrina pasa `hablando` al `<Mundo>` (la abeja de la escena gesticula
 * mientras Angelita habla) y `decirPuerta` a `onHotspot`.
 */
export function useAcompanante(mundoId) {
  const [voz, setVoz] = useState(true);

  const vozDisponible = useMemo(
    () => typeof window !== 'undefined',
    [],
  );

  // El toggle vive en un ref para que `hablar`/`decir` sean ESTABLES (mismo
  // patrón del shell): prender/apagar la voz no re-dispara la narración.
  const vozRef = useRef(voz);
  useEffect(() => {
    vozRef.current = voz;
  }, [voz]);

  const hablar = useCallback((texto) => {
    if (!vozRef.current || !texto) return;
    speakKokoro(texto, { lang: 'es', rate: 0.98 })
      .then((audio) => {
        if (!audio && vozRef.current) speak(texto, { rate: 0.98, pitch: 1 });
      })
      .catch(() => {
        if (vozRef.current) speak(texto, { rate: 0.98, pitch: 1 });
      });
  }, []);

  // ── Angelita DICE (voz + burbuja): el texto SIEMPRE va a la burbuja
  //    (aria-live). Sin voz (equipo o toggle), la burbuja es la voz.
  const [dicho, setDicho] = useState(null);
  const dichoTimer = useRef(null);
  const decir = useCallback(
    (texto) => {
      if (!texto) return;
      setDicho(texto);
      if (dichoTimer.current) clearTimeout(dichoTimer.current);
      dichoTimer.current = setTimeout(
        () => setDicho(null),
        Math.min(14000, 4000 + texto.length * 55),
      );
      hablar(texto);
    },
    [hablar],
  );
  useEffect(
    () => () => {
      if (dichoTimer.current) clearTimeout(dichoTimer.current);
      stopSpeak();
    },
    [],
  );

  // ── LA ENTRADA HABLA (el corazón del fix): al montar la vitrina, Angelita
  //    narra el mundo — misma pauta y misma pista de puertas que el shell.
  //    La voz puede quedar bloqueada por autoplay hasta el primer gesto
  //    (iOS/Chrome): la burbuja sale igual, y "🔊 Escuchar" es el camino
  //    con gesto para oírla.
  useEffect(() => {
    const t = setTimeout(
      () => decir(`${narracionDeMundo(mundoId)} Toque un punto para ver a dónde lo lleva.`),
      900,
    );
    return () => clearTimeout(t);
  }, [mundoId, decir]);

  // Re-narrar bajo demanda (botón 🔊 Escuchar — gesto real, la voz ya puede).
  const narrar = useCallback(() => decir(narracionDeMundo(mundoId)), [mundoId, decir]);

  // ── Una puerta tocada: en la vitrina (sin sesión) no navega — Angelita la
  //    NOMBRA (voz + burbuja) y cuenta a qué pantalla real de la app lleva
  //    (regla de oro del framework). Firma compatible con `onHotspot`.
  const decirPuerta = useCallback(
    (view, data) => {
      const puertas = MUNDO[mundoId]?.hotspots || [];
      const hs =
        puertas.find((h) => h.view === view && (h.data === data || (!h.data && !data))) ||
        puertas.find((h) => h.view === view);
      decir(
        `«${hs?.label || view}» es una puerta real: dentro de la app abre la pantalla «${view}».`,
      );
    },
    [mundoId, decir],
  );

  // ── EL LAZO agente→escena (spec S1, la SEGUNDA vía): un pedido de voz/texto
  //    ("muéstreme las trampas", "dónde está el agua") se resuelve contra los
  //    hotspots del mundo (comandoMundo) y, si hay match, MUEVE el foco de la
  //    escena a ese punto (el mismo que la abeja persigue) + lo resalta, y
  //    Angelita lo nombra. Sin match: respuesta cordial que ofrece las puertas.
  //    `focoCmd` fluye al `<Mundo>` como { focoId, focoToken }; el token sube por
  //    comando para re-enfocar/re-pulsar aunque se repita el mismo punto.
  const [focoCmd, setFocoCmd] = useState({ id: null, token: 0 });
  const comando = useCallback(
    (texto) => {
      const t = (texto || '').trim();
      if (!t) return false;
      const m = parseComandoMundo(t, mundoId);
      if (m) {
        setFocoCmd((f) => ({ id: m.hotspot.id, token: f.token + 1 }));
        decir(`¡Claro! Ahí lo tiene: «${m.hotspot.label}». Se lo resalto.`);
        return true;
      }
      const puertas = puertasDeMundo(mundoId);
      const sugerencias = puertas.slice(0, 2).map((p) => `«${p}»`).join(' o ');
      decir(
        sugerencias
          ? `No veo eso por aquí. ¿Quiere que le muestre ${sugerencias}?`
          : 'No veo eso por aquí. Toque un punto para ver a dónde lo lleva.',
      );
      return false;
    },
    [mundoId, decir],
  );

  return {
    dicho,
    hablando: !!dicho,
    decir,
    narrar,
    decirPuerta,
    comando,
    focoId: focoCmd.id,
    focoToken: focoCmd.token,
    voz,
    setVoz,
    vozDisponible,
  };
}

/**
 * El marco acompañado: envuelve al `<Mundo>` de la vitrina (children), flota
 * la burbuja de Angelita sobre la escena y pinta la barra del agente debajo.
 *
 *   const acompanante = useAcompanante('agua');
 *   <AcompananteMundo mundoId="agua" acompanante={acompanante}>
 *     <Mundo mundoId="agua" … hablando={acompanante.hablando} onHotspot={acompanante.decirPuerta} />
 *   </AcompananteMundo>
 */
export default function AcompananteMundo({ mundoId, acompanante, children }) {
  const { dicho, narrar, comando, focoId, focoToken, voz, setVoz, vozDisponible } = acompanante;
  const tinte = tinteDeMundo(mundoId);

  // El texto del pedido (barra de dos vías) y el estado del dictado por voz.
  const [texto, setTexto] = useState('');
  const [oyendo, setOyendo] = useState(false);
  const recRef = useRef(null);

  // ¿Trae este equipo dictado por voz (Web Speech API — reconocimiento)? Es un
  // PLUS: sin él, la barra de texto hace lo mismo (fallback sin voz = escrito).
  const reconoceVoz = useMemo(
    () =>
      typeof window !== 'undefined' &&
      !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    [],
  );

  // Al cambiar de mundo, cortá un dictado en curso (que no persiga al siguiente).
  useEffect(
    () => () => {
      if (recRef.current) {
        try { recRef.current.stop(); } catch { /* no-op */ }
        recRef.current = null;
      }
    },
    [mundoId],
  );

  // Enviar el pedido a Angelita (voz/texto → foco de la escena). Cierra el lazo.
  const enviar = useCallback(
    (e) => {
      if (e) e.preventDefault();
      const t = texto.trim();
      if (!t) return;
      comando?.(t);
      setTexto('');
    },
    [texto, comando],
  );

  // 🎤 Dictado: llena la barra y ejecuta el comando con lo que se oyó. es-CO,
  //    no bloqueante — si algo falla, la barra de texto siempre queda.
  const escuchar = useCallback(() => {
    const SR =
      typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) return;
    try {
      if (recRef.current) { try { recRef.current.stop(); } catch { /* no-op */ } }
      const rec = new SR();
      rec.lang = 'es-CO';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = (ev) => {
        const dicho2 = ev.results?.[0]?.[0]?.transcript || '';
        setTexto(dicho2);
        if (dicho2.trim()) comando?.(dicho2);
      };
      rec.onend = () => setOyendo(false);
      rec.onerror = () => setOyendo(false);
      recRef.current = rec;
      setOyendo(true);
      rec.start();
    } catch {
      setOyendo(false);
    }
  }, [comando]);

  // "Abrir el chat" salta al flujo REAL del agente por el mismo camino
  // desacoplado del shell (BUG-CAMP-01): el evento global `chagraNavigate` que
  // App.jsx escucha desde cualquier pantalla.
  const preguntarAlAgente = useCallback(() => {
    if (typeof window === 'undefined') return;
    stopSpeak();
    window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view: 'agente' } }));
  }, []);

  // Inyecta el foco comandado al `<Mundo>` hijo (una sola pieza: la vitrina no
  // tiene que recablear cada mockup — la capa acompañante cierra el lazo).
  const escena = Children.map(children, (hijo) =>
    isValidElement(hijo) ? cloneElement(hijo, { focoId, focoToken }) : hijo,
  );

  return (
    <div className="acomp" style={{ '--acomp-tinte': (tinte && tinte[0]) || '#3f8f4e' }}>
      <div className="acomp__marco">
        {escena}
        {/* La burbuja de Angelita: SU voz escrita (la abeja vive en la escena
            — una sola compañera, #2341). aria-live: también es la voz de los
            lectores de pantalla. */}
        {dicho && (
          <div className="acomp__burbuja" role="status" aria-live="polite">
            {dicho}
          </div>
        )}
      </div>
      <footer className="acomp__agente">
        {/* LA BARRA DE DOS VÍAS: pídale por voz/texto y la escena enfoca. */}
        <form className="acomp__cmd" onSubmit={enviar}>
          <span className="acomp__punto" aria-hidden="true" />
          <input
            type="text"
            className="acomp__input"
            value={texto}
            onChange={(ev) => setTexto(ev.target.value)}
            placeholder="Dígale a Angelita: «muéstreme el agua»"
            aria-label="Pídale a Angelita que le muestre un punto del mundo"
            enterKeyHint="search"
          />
          {reconoceVoz && (
            <button
              type="button"
              className={`acomp__btn acomp__mic${oyendo ? ' on' : ''}`}
              aria-label={oyendo ? 'Escuchando…' : 'Hablar'}
              aria-pressed={oyendo}
              onClick={escuchar}
            >
              🎤
            </button>
          )}
          <button type="submit" className="acomp__btn acomp__ir" aria-label="Mostrar en la escena">
            Ir
          </button>
        </form>
        <div className="acomp__ctrls">
          <button type="button" className="acomp__btn" onClick={narrar}>
            🔊 Escuchar
          </button>
          <button
            type="button"
            className={`acomp__btn acomp__voz${voz && vozDisponible ? ' on' : ''}`}
            aria-pressed={voz && vozDisponible}
            disabled={!vozDisponible}
            title={vozDisponible ? undefined : 'Este equipo no trae voz: Angelita le escribe.'}
            onClick={() => {
              const n = !voz;
              setVoz(n);
              if (!n) stopSpeak();
            }}
          >
            {!vozDisponible ? '💬 Texto' : voz ? '🔊 Voz' : '🔇 Voz'}
          </button>
          <button type="button" className="acomp__btn acomp__chat" onClick={preguntarAlAgente}>
            💬 Abrir el chat
          </button>
        </div>
      </footer>
    </div>
  );
}
