/*
 * DemoCicloAgua — la viñeta AISLADA del ciclo del agua (QA/arte, no producto).
 *
 * Sirve para lo que un video no deja hacer: PARAR el aguacero donde uno quiera y
 * comparar las dos laderas en el mismo instante. Con el deslizador de FASE se
 * recorre el ciclo entero — antes / llueve / escurre / escampa / verano — y ahí
 * se ve lo que la escena tiene que enseñar:
 *
 *   fase 0.10  llueve igual sobre las dos.
 *   fase 0.30  la izquierda se traga el agua (bajan los poros azules); la
 *              derecha ya la está botando, con la loma adentro.
 *   fase 0.55  escampó. La derecha se apagó de una: no guardó nada.
 *   fase 0.90  el verano. La izquierda SIGUE manando y la banda azul honda no
 *              se ha ido. La derecha lleva rato seca. Esa es la escena.
 *
 * Y con el deslizador de HORA, la otra lección: llevá la hora a la una de la
 * tarde y mirá el aspersor de enfrente — las gotas se evaporan antes de tocar
 * el suelo. Volvé a las 6 y llegan enteras. El goteo llega siempre.
 *
 * NO está cableada a ninguna ruta (mismo contrato que DemoAtmosferaViva). Quien
 * quiera verla la monta donde guste:
 *   import DemoCicloAgua from '.../agua/DemoCicloAgua.jsx';
 *   <DemoCicloAgua />
 */
import { useState } from 'react';
import { decidirTier } from '../deviceTier.js';
import EscenaCicloAgua from './EscenaCicloAgua.jsx';

const PANEL = {
  position: 'absolute',
  left: 12,
  bottom: 12,
  padding: '10px 14px',
  borderRadius: 10,
  background: 'rgba(20, 16, 10, 0.72)',
  color: '#f4e9d4',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 13,
  lineHeight: 1.7,
  maxWidth: 330,
};

const BOTON = (activo) => ({
  marginRight: 6,
  marginTop: 4,
  padding: '3px 10px',
  borderRadius: 8,
  border: '1px solid #a98a5c',
  background: activo ? '#a98a5c' : 'transparent',
  color: activo ? '#1d150c' : '#f4e9d4',
  cursor: 'pointer',
  fontSize: 12,
});

/* Qué está pasando en cada tramo del ciclo, en cristiano. */
function relato(f) {
  if (f < 0.08) return 'Antes del aguacero. Mire el suelo, no el cielo.';
  if (f < 0.2) return 'Empieza a llover — la MISMA lluvia para las dos laderas.';
  if (f < 0.42) return 'Aguacero. La viva se lo traga; la pelada lo bota con tierra adentro.';
  if (f < 0.55) return 'Escampando. La escorrentía se apaga de una: no guardó nada.';
  if (f < 0.75) return 'Ya escampó. La esponja sigue entregando por el nacimiento.';
  return 'Verano. La viva todavía mana. La otra lleva rato seca.';
}

export default function DemoCicloAgua() {
  const [{ tier: tierAuto, reducedMotion }] = useState(() => decidirTier());
  const [tier, setTier] = useState(tierAuto);
  const [fase, setFase] = useState(/** @type {number|null} */ (null));
  const [hora, setHora] = useState(/** @type {number|null} */ (null));
  const [temporada, setTemporada] = useState(
    /** @type {'lluvia'|'seca'|'auto'} */ ('lluvia'),
  );

  const etiquetaHora = (h) =>
    `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 460 }}>
      <EscenaCicloAgua
        tier={tier}
        reducedMotion={reducedMotion}
        hora={hora}
        temporada={temporada}
        fase={fase}
      />

      <div style={PANEL}>
        <div>
          <strong>La misma loma, bajo la misma nube</strong> — a la izquierda,
          suelo vivo: se traga el aguacero y lo devuelve todo el verano. A la
          derecha, suelo pelado: lo bota de una y se lleva la tierra.
        </div>

        <div style={{ marginTop: 6 }}>
          Fase del aguacero: <strong>{fase === null ? 'corriendo sola' : fase.toFixed(2)}</strong>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={fase ?? 0}
          onChange={(e) => setFase(Number(e.target.value))}
          style={{ width: '100%' }}
          aria-label="Fase del aguacero"
        />
        <div style={{ opacity: 0.85, fontSize: 12, minHeight: '2.4em' }}>
          {fase === null ? 'El ciclo corre solo (46 s).' : relato(fase)}
        </div>
        <button type="button" style={BOTON(fase === null)} onClick={() => setFase(null)}>
          ciclo automático
        </button>

        <div style={{ marginTop: 8 }}>
          Hora: <strong>{hora === null ? 'reloj real' : etiquetaHora(hora)}</strong>
          {hora !== null && hora > 11.5 && hora < 15 ? ' — sol pico: mire el aspersor' : ''}
        </div>
        <input
          type="range"
          min={0}
          max={24}
          step={0.1}
          value={hora ?? 12}
          onChange={(e) => setHora(Number(e.target.value))}
          style={{ width: '100%' }}
          aria-label="Hora del día"
        />
        <button type="button" style={BOTON(hora === null)} onClick={() => setHora(null)}>
          reloj real
        </button>

        <div style={{ marginTop: 8 }}>
          {['lluvia', 'seca', 'auto'].map((t) => (
            <button
              key={t}
              type="button"
              style={BOTON(temporada === t)}
              onClick={() => setTemporada(/** @type {any} */ (t))}
            >
              {t}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 4 }}>
          {['alto', 'medio', 'bajo'].map((t) => (
            <button
              key={t}
              type="button"
              style={BOTON(tier === t)}
              onClick={() => setTier(/** @type {any} */ (t))}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
