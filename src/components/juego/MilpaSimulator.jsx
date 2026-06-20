/*
 * i18n: este subjuego se sirve solo en español Colombia (tú/usted). El nombre
 * "La Milpa" y los textos para niños conviven en el componente; la migración a
 * messages.js (ADR-050) está fuera de alcance de esta PR.
 */
import { useCallback, useMemo, useState } from 'react';
import { ScreenShell } from '../common/ScreenShell';
import { Sprout, RotateCcw, Volume2, VolumeX, Sparkles } from 'lucide-react';

import { TRES_HERMANAS, HERMANA_POR_ID, RELACIONES, CIFRAS_MILPA, NUM_PARCELAS } from './milpaData';
import {
  crearParcela,
  sembrarEnParcela,
  esMilpaCompleta,
  diversidadParcela,
  saludParcela,
  nitrogenoFijado,
  coberturaSuelo,
  haySoporteMaizFrijol,
  aplicarEvento,
  resumenFinca,
  EVENTOS,
  SALUD_MAX,
} from '../../services/milpaGameEngine';
import { agentSounds, isSoundEnabled, setSoundEnabled } from '../../services/agentSoundService';
import { speak, stop as stopSpeak, isSupported as ttsSupported } from '../../services/ttsService';

import './milpa.css';

/** Acentos por hermana (estética Chagra: tierra, hoja, calabaza). */
const ACENTO = {
  amber: 'bg-amber-400 text-amber-950 ring-amber-300',
  emerald: 'bg-emerald-400 text-emerald-950 ring-emerald-300',
  orange: 'bg-orange-400 text-orange-950 ring-orange-300',
};

/** Color de la barra de salud según el valor (rojo → ámbar → verde). */
function colorSalud(salud) {
  if (salud >= 70) return 'from-emerald-500 via-lime-400 to-emerald-400';
  if (salud >= 40) return 'from-amber-500 to-yellow-400';
  return 'from-rose-500 to-orange-400';
}

/** Tarjeta de una parcela con sus hermanas sembradas y su salud. */
function ParcelaCard({ parcela, salud, seleccionada, onSelect }) {
  const d = diversidadParcela(parcela);
  const milpa = esMilpaCompleta(parcela);
  const cultivos = parcela.cultivos
    .map((id) => HERMANA_POR_ID[id])
    .filter(Boolean);

  return (
    <button
      type="button"
      data-testid={`milpa-parcela-${parcela.id}`}
      onClick={() => onSelect(parcela.id)}
      aria-pressed={seleccionada}
      aria-label={`Parcela ${parcela.id}, ${d} de 3 hermanas`}
      className={[
        'relative flex min-h-[112px] flex-col items-center justify-center gap-1 rounded-3xl border-2 p-3 transition active:scale-[0.98]',
        seleccionada
          ? 'border-lime-300 bg-emerald-800/60 ring-2 ring-lime-300'
          : 'border-emerald-800/50 bg-emerald-950/40 hover:border-emerald-600/60',
      ].join(' ')}
    >
      {milpa && (
        <span className="milpa-badge-pop absolute -top-2 -right-2 rounded-full bg-lime-400 px-2 py-0.5 text-[10px] font-black text-emerald-950 shadow">
          ¡Milpa!
        </span>
      )}
      {d === 0 ? (
        <span className="text-3xl opacity-40" aria-hidden="true">🟫</span>
      ) : (
        <span className="flex gap-0.5 text-3xl" aria-hidden="true">
          {cultivos.map((h) => (
            <span key={h.id} className="milpa-brota">{h.emoji}</span>
          ))}
        </span>
      )}
      <span className="text-[11px] font-bold text-emerald-200">
        {d === 0 ? 'Tierra lista' : `${d} de 3 hermanas`}
      </span>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-900/60">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${colorSalud(salud)} transition-all duration-500`}
          style={{ width: `${Math.max(salud, d > 0 ? 6 : 0)}%` }}
        />
      </div>
    </button>
  );
}

/** Botón grande para sembrar/quitar una hermana en la parcela activa. */
function HermanaButton({ hermana, activa, onToggle }) {
  return (
    <button
      type="button"
      data-testid={`milpa-sembrar-${hermana.id}`}
      onClick={() => onToggle(hermana.id)}
      aria-pressed={activa}
      className={[
        'flex min-h-[64px] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-2 ring-2 transition active:scale-95',
        activa ? ACENTO[hermana.color] : 'bg-emerald-950/50 text-emerald-200 ring-emerald-800/50',
      ].join(' ')}
    >
      <span className="text-2xl" aria-hidden="true">{hermana.emoji}</span>
      <span className="text-xs font-black leading-tight">{hermana.nombre}</span>
    </button>
  );
}

/**
 * MilpaSimulator — el subjuego JUGABLE de la milpa (las tres hermanas).
 *
 * Flujo en tres fases, mobile-first y táctil:
 *   1. SIEMBRA: el jugador toca una parcela y siembra maíz/fríjol/ahuyama.
 *      Ve en vivo cómo la salud sube cuando asocia (fijación de N, soporte,
 *      cobertura) frente al monocultivo.
 *   2. TEMPORADA: llega un evento real (sequía, cogollero, aguacero, maleza) y
 *      golpea cada parcela. La diversidad amortigua el daño (resiliencia real).
 *   3. RESULTADO: compara el rendimiento de la finca asociada contra el mismo
 *      número de parcelas en monocultivo, con las cifras reales de la milpa.
 *
 * Lógica pura en milpaGameEngine; aquí solo se orquesta la UI. Offline-safe:
 * sin red, sin canvas pesado, rinde en gama baja. Estética Chagra.
 *
 * @param {Object} props
 * @param {Function} [props.onBack]
 * @param {Function} [props.onHome]
 */
export default function MilpaSimulator({ onBack, onHome }) {
  const [parcelas, setParcelas] = useState(() =>
    Array.from({ length: NUM_PARCELAS }, (_, i) => crearParcela(String(i + 1))),
  );
  const [activa, setActiva] = useState('1');
  const [fase, setFase] = useState('siembra'); // 'siembra' | 'temporada' | 'resultado'
  const [evento, setEvento] = useState(null);
  const [danos, setDanos] = useState(null); // { [parcelaId]: { saludAntes, saludDespues, danoAplicado } }
  const [audioOn, setAudioOn] = useState(() => isSoundEnabled());

  const parcelaActiva = useMemo(
    () => parcelas.find((p) => p.id === activa) || parcelas[0],
    [parcelas, activa],
  );

  // Salud de cada parcela: en fase resultado usa la salud tras el evento.
  const saludDe = useCallback(
    (parcela) => {
      if (danos && danos[parcela.id]) return danos[parcela.id].saludDespues;
      return saludParcela(parcela);
    },
    [danos],
  );

  const resumen = useMemo(() => resumenFinca(parcelas), [parcelas]);
  const algunaSembrada = resumen.parcelasSembradas > 0;

  const hablar = useCallback(
    (texto) => {
      if (!audioOn || !texto) return;
      try {
        if (ttsSupported()) speak(texto, { rate: 0.95, pitch: 1.05 });
      } catch { /* TTS no disponible: el juego sigue sin audio */ }
    },
    [audioOn],
  );

  const toggleAudio = useCallback(() => {
    const next = !audioOn;
    setAudioOn(next);
    setSoundEnabled(next);
    if (!next) {
      try { stopSpeak(); } catch { /* noop */ }
    }
  }, [audioOn]);

  const toggleHermana = useCallback(
    (hermanaId) => {
      setParcelas((prev) =>
        prev.map((p) => (p.id === activa ? sembrarEnParcela(p, hermanaId) : p)),
      );
      try { agentSounds.listen(); } catch { /* noop */ }
    },
    [activa],
  );

  const seleccionarParcela = useCallback((id) => {
    setActiva(id);
    try { agentSounds.start(); } catch { /* noop */ }
  }, []);

  // Inicia la temporada: elige un evento (determinista por estado del tablero
  // para que el juego sea reproducible y no use aleatoriedad oculta) y lo aplica.
  const iniciarTemporada = useCallback(() => {
    const indice = resumen.parcelasSembradas % EVENTOS.length;
    const ev = EVENTOS[indice];
    const nuevosDanos = {};
    parcelas.forEach((p) => {
      if (diversidadParcela(p) > 0) {
        nuevosDanos[p.id] = aplicarEvento(p, ev);
      }
    });
    setEvento(ev);
    setDanos(nuevosDanos);
    setFase('temporada');
    try { agentSounds.start(); } catch { /* noop */ }
    hablar(`Llegó ${ev.nombre}. ${ev.relacion}`);
  }, [parcelas, resumen.parcelasSembradas, hablar]);

  const verResultado = useCallback(() => {
    setFase('resultado');
    try { agentSounds.chime(); } catch { /* noop */ }
    const msg = resumen.ventajaPct > 0
      ? `Tu milpa rindió ${resumen.ventajaPct} por ciento más que sembrar cada cultivo solo.`
      : 'Asocia las tres hermanas y verás cómo rinde mejor que el monocultivo.';
    hablar(msg);
  }, [resumen.ventajaPct, hablar]);

  const reiniciar = useCallback(() => {
    setParcelas(Array.from({ length: NUM_PARCELAS }, (_, i) => crearParcela(String(i + 1))));
    setActiva('1');
    setFase('siembra');
    setEvento(null);
    setDanos(null);
    try { agentSounds.listen(); } catch { /* noop */ }
  }, []);

  return (
    <ScreenShell
      title="La Milpa"
      icon={Sprout}
      onBack={onBack}
      onHome={onHome}
      actions={
        <button
          type="button"
          onClick={toggleAudio}
          aria-pressed={audioOn}
          aria-label={audioOn ? 'Apagar el sonido' : 'Encender el sonido'}
          className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-700/60 text-white hover:bg-emerald-600/60 active:scale-95 transition"
        >
          {audioOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      }
    >
      <div
        data-testid="milpa-simulator"
        className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-12 pt-3"
      >
        {/* Intro pedagógica corta */}
        <header className="rounded-3xl border border-lime-300/30 bg-gradient-to-br from-emerald-900/60 to-emerald-950/60 p-4">
          <p className="text-xs font-black uppercase tracking-widest text-lime-300">
            Las tres hermanas
          </p>
          <h2 className="mt-1 text-2xl font-black leading-tight text-white">
            Siembra tu milpa: maíz, fríjol y ahuyama
          </h2>
          <p className="mt-2 text-sm font-medium leading-relaxed text-emerald-100">
            Juntas se ayudan: el fríjol alimenta al maíz, el maíz sostiene al
            fríjol y la ahuyama cuida el suelo. Siembra y mira cómo rinden mejor
            que sembrar cada una sola.
          </p>
        </header>

        {/* Tablero de parcelas */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-black text-emerald-200">Tu finca</h3>
            <span className="text-xs font-bold text-emerald-300">
              {resumen.milpasCompletas} milpa(s) completa(s)
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3" data-testid="milpa-tablero">
            {parcelas.map((p) => (
              <ParcelaCard
                key={p.id}
                parcela={p}
                salud={saludDe(p)}
                seleccionada={p.id === activa && fase === 'siembra'}
                onSelect={fase === 'siembra' ? seleccionarParcela : () => {}}
              />
            ))}
          </div>
        </section>

        {/* FASE SIEMBRA: panel para sembrar en la parcela activa */}
        {fase === 'siembra' && (
          <section
            data-testid="milpa-panel-siembra"
            className="rounded-3xl border border-emerald-800/50 bg-emerald-950/40 p-4"
          >
            <p className="mb-2 text-sm font-bold text-emerald-100">
              Parcela {activa}: toca una hermana para sembrarla o quitarla.
            </p>
            <div className="flex gap-2">
              {TRES_HERMANAS.map((h) => (
                <HermanaButton
                  key={h.id}
                  hermana={h}
                  activa={parcelaActiva.cultivos.includes(h.id)}
                  onToggle={toggleHermana}
                />
              ))}
            </div>

            {/* Sinergias activas en VIVO de la parcela seleccionada */}
            <div className="mt-3 flex flex-col gap-1.5" data-testid="milpa-sinergias">
              <SinergiaLinea
                ok={haySoporteMaizFrijol(parcelaActiva)}
                texto="El maíz sostiene al fríjol 🌽🫘"
              />
              <SinergiaLinea
                ok={nitrogenoFijado(parcelaActiva) > 0}
                texto={`El fríjol fija nitrógeno (${nitrogenoFijado(parcelaActiva)}%) 💧`}
              />
              <SinergiaLinea
                ok={coberturaSuelo(parcelaActiva) > 0}
                texto={`La ahuyama cubre el suelo (−${coberturaSuelo(parcelaActiva)}% maleza) 🎃`}
              />
            </div>

            <p className="mt-3 rounded-2xl bg-emerald-900/50 p-3 text-center text-sm font-black text-lime-200">
              Salud de la parcela: {saludParcela(parcelaActiva)} / {SALUD_MAX}
            </p>

            <button
              type="button"
              data-testid="milpa-iniciar-temporada"
              disabled={!algunaSembrada}
              onClick={iniciarTemporada}
              className="mt-3 min-h-[56px] w-full rounded-2xl bg-lime-400 text-lg font-black text-emerald-950 shadow-lg transition hover:bg-lime-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              ▶️ Empezar la temporada
            </button>
          </section>
        )}

        {/* FASE TEMPORADA: el evento golpea y se ve la resistencia */}
        {fase === 'temporada' && evento && (
          <section
            data-testid="milpa-panel-evento"
            className="rounded-3xl border-2 border-amber-400/50 bg-gradient-to-br from-amber-900/40 to-emerald-950/60 p-4 text-center"
          >
            <div className="text-5xl" aria-hidden="true">{evento.emoji}</div>
            <h3 className="mt-1 text-xl font-black text-white">¡Llegó {evento.nombre}!</h3>
            <p className="mt-2 text-sm font-medium text-amber-100">{evento.relacion}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {parcelas
                .filter((p) => diversidadParcela(p) > 0)
                .map((p) => {
                  const dato = danos?.[p.id];
                  const milpa = esMilpaCompleta(p);
                  return (
                    <div
                      key={p.id}
                      className="rounded-2xl bg-emerald-950/50 p-2 text-left ring-1 ring-emerald-800/50"
                    >
                      <p className="text-[11px] font-bold text-emerald-200">
                        Parcela {p.id} {milpa ? '🛡️' : ''}
                      </p>
                      <p className="text-sm font-black text-white">
                        −{dato?.danoAplicado ?? 0} salud
                      </p>
                      <p className="text-[11px] text-emerald-300">
                        {milpa ? 'La milpa resistió mejor' : 'Recibió más daño'}
                      </p>
                    </div>
                  );
                })}
            </div>
            <button
              type="button"
              data-testid="milpa-ver-resultado"
              onClick={verResultado}
              className="mt-4 min-h-[56px] w-full rounded-2xl bg-lime-400 text-lg font-black text-emerald-950 shadow-lg transition hover:bg-lime-300 active:scale-[0.98]"
            >
              Ver mi cosecha 🌾
            </button>
          </section>
        )}

        {/* FASE RESULTADO: comparación milpa vs monocultivo + lecciones */}
        {fase === 'resultado' && (
          <section
            data-testid="milpa-panel-resultado"
            className="flex flex-col gap-3"
          >
            <div className="rounded-3xl border-2 border-lime-300/40 bg-gradient-to-br from-emerald-800/60 to-emerald-950/60 p-4 text-center">
              <div className="text-4xl" aria-hidden="true">🌾</div>
              <h3 className="mt-1 text-xl font-black text-white">Tu cosecha</h3>
              {resumen.ventajaPct > 0 ? (
                <p className="mt-2 text-base font-bold text-lime-200">
                  Tu milpa rindió{' '}
                  <span className="text-2xl font-black text-lime-300">+{resumen.ventajaPct}%</span>{' '}
                  más que sembrar cada cultivo solo.
                </p>
              ) : (
                <p className="mt-2 text-sm font-bold text-amber-200">
                  Asocia las tres hermanas en una parcela y verás cómo rinde
                  mucho más que el monocultivo.
                </p>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <ResultadoCelda etiqueta="Milpa asociada" valor={resumen.saludTotal} acento />
                <ResultadoCelda etiqueta="Monocultivo" valor={resumen.rendimientoMono} />
              </div>
            </div>

            {/* Indicadores reales de la milpa */}
            <div className="grid grid-cols-3 gap-2" data-testid="milpa-indicadores">
              <IndicadorMini emoji="📏" valor={`${resumen.lerPromedio}`} etiqueta="LER (usa mejor la tierra)" />
              <IndicadorMini emoji="💧" valor={`${resumen.nitrogenoPromedio}%`} etiqueta="Nitrógeno fijado" />
              <IndicadorMini emoji="🎃" valor={`−${resumen.coberturaPromedio}%`} etiqueta="Menos maleza" />
            </div>

            {/* Las tres lecciones reales */}
            <div className="rounded-3xl border border-emerald-800/50 bg-emerald-950/40 p-4">
              <h4 className="mb-2 flex items-center gap-2 text-sm font-black text-white">
                <Sparkles size={16} className="text-lime-300" aria-hidden="true" />
                Lo que aprendiste
              </h4>
              <ul className="flex flex-col gap-2">
                {RELACIONES.map((r) => (
                  <li key={r.id} className="flex items-start gap-2 text-sm text-emerald-100">
                    <span className="text-lg" aria-hidden="true">{r.emoji}</span>
                    <span>
                      <strong className="text-white">{r.titulo}.</strong> {r.detalle}
                    </span>
                  </li>
                ))}
              </ul>
              <details className="mt-3 text-xs text-emerald-300/80">
                <summary className="cursor-pointer font-bold text-emerald-200">Fuente de las cifras</summary>
                <p className="mt-1 break-words leading-relaxed">{CIFRAS_MILPA.fuente}</p>
              </details>
            </div>

            <button
              type="button"
              data-testid="milpa-reiniciar"
              onClick={reiniciar}
              className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 text-lg font-black text-white shadow-lg transition hover:bg-emerald-600 active:scale-[0.98]"
            >
              <RotateCcw size={20} aria-hidden="true" />
              Sembrar otra vez
            </button>
          </section>
        )}

        {/* Nota honesta: el juego no inventa, refleja la agroecología real */}
        <p className="px-1 text-xs leading-relaxed text-slate-400">
          Las cifras de este juego son reales: vienen de la agroecología de la
          milpa colombiana. Sembrar asociado de verdad usa mejor la tierra,
          ahorra abono y resiste mejor las plagas y la sequía. 🌿
        </p>
      </div>
    </ScreenShell>
  );
}

/** Línea de sinergia con check/cruz para feedback inmediato. */
function SinergiaLinea({ ok, texto }) {
  return (
    <p
      className={[
        'flex items-center gap-2 text-xs font-bold',
        ok ? 'text-lime-300' : 'text-emerald-400/40',
      ].join(' ')}
    >
      <span aria-hidden="true">{ok ? '✅' : '⬜'}</span>
      {texto}
    </p>
  );
}

/** Celda de la comparación milpa vs mono. */
function ResultadoCelda({ etiqueta, valor, acento }) {
  return (
    <div
      className={[
        'rounded-2xl p-3',
        acento ? 'bg-lime-400/20 ring-1 ring-lime-300/50' : 'bg-slate-800/60',
      ].join(' ')}
    >
      <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-200">{etiqueta}</p>
      <p className={`mt-0.5 text-2xl font-black ${acento ? 'text-lime-300' : 'text-slate-300'}`}>
        {valor}
      </p>
    </div>
  );
}

/** Indicador compacto con emoji + valor + etiqueta. */
function IndicadorMini({ emoji, valor, etiqueta }) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-emerald-950/40 p-2 text-center ring-1 ring-emerald-800/40">
      <span className="text-xl" aria-hidden="true">{emoji}</span>
      <span className="text-base font-black text-lime-200">{valor}</span>
      <span className="text-[10px] leading-tight text-emerald-300/80">{etiqueta}</span>
    </div>
  );
}
