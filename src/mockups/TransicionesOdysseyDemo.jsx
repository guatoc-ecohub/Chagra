/*
 * TransicionesOdysseyDemo — la VITRINA del lenguaje de cruce entre mundos.
 *
 * Prueba en vivo el paquete `visual/mundo3d/transiciones/`: cuatro velos con
 * identidad andina (niebla del páramo, tierra que se abre, remolino de hojas,
 * luz de la casa), asimetría entrar/volver y degradación por tier — todo con
 * "mundos" de mentiras (telones DOM) para no tocar NINGUNA escena real.
 *
 * Qué mirar aquí:
 *   · ENTRAR: el velo se recoge (anticipación), se lanza, cubre — el swap
 *     ocurre bajo tapa — y revela con overshoot: el mundo ATERRIZA.
 *   · VOLVER: más corto y tibio; el letrero acoge ("De vuelta a casa…").
 *   · TIER bajo: mismo velo sin decoraciones, 30% más corto — digno, nunca
 *     pantalla en blanco. Reduced: corte simple con el tinte del velo.
 *
 * DOM puro (cero three): la CamaraCruce se prueba donde haya canvas — esta
 * vitrina es del VELO y su reloj. Sin ruta cableada: la conecta Opus si la
 * quiere en el índice de mockups.
 */
import { useState } from 'react';
import VeloOdyssey from '../visual/mundo3d/transiciones/VeloOdyssey.jsx';
import { useCruceMundo } from '../visual/mundo3d/transiciones/useCruceMundo.js';
import { veloDeDestino } from '../visual/mundo3d/transiciones/velosData.js';
import { decidirTier } from '../visual/mundo3d/deviceTier.js';
import './transiciones-odyssey.css';

/* Los telones: la luz de cada lugar, sin escena real. */
const LUGARES = {
  casa: {
    titulo: 'La casa (el valle)',
    emoji: '🏡',
    fondo: 'linear-gradient(170deg, #ffe9b0 0%, #8fbf6a 42%, #274a2e 100%)',
    nota: 'Desde aquí se sale a descubrir. Toque un destino y mire el cruce.',
  },
  bosque_vivo: {
    titulo: 'El bosque vivo',
    emoji: '🌳',
    fondo: 'linear-gradient(170deg, #a9c86a 0%, #4f8f3e 40%, #16331f 100%)',
    nota: 'Se entró por el remolino de hojas: el monte cerró y abrió su follaje.',
  },
  microsuelo: {
    titulo: 'El microsuelo',
    emoji: '🪱',
    fondo: 'linear-gradient(170deg, #c98f4e 0%, #7a4f2a 38%, #33200f 100%)',
    nota: 'La tierra se abrió y lo tragó a uno: bajó por el horizonte de humus.',
  },
  sierra_paramo: {
    titulo: 'La sierra (páramo)',
    emoji: '🏔️',
    fondo: 'linear-gradient(170deg, #eef4f4 0%, #aec7cf 40%, #587c88 100%)',
    nota: 'La niebla del páramo subió, envolvió y se abrió en jirones.',
  },
};

const DESTINOS = ['bosque_vivo', 'microsuelo', 'sierra_paramo'];

export default function TransicionesOdysseyDemo() {
  const inicial = decidirTier();
  const [tier, setTier] = useState(inicial.tier);
  const [calma, setCalma] = useState(inicial.reducedMotion);
  const [lugar, setLugar] = useState('casa');

  const cruce = useCruceMundo({
    tier,
    reducedMotion: calma,
    // El swap bajo tapa: null = de vuelta a casa.
    onSwap: (destino) => setLugar(destino || 'casa'),
  });

  const l = LUGARES[lugar] || LUGARES.casa;
  const enCasa = lugar === 'casa';

  return (
    <div className="tod">
      <div className="tod__mundo" style={{ background: l.fondo }}>
        <div className="tod__emoji" aria-hidden="true">
          {l.emoji}
        </div>
        <h1 className="tod__titulo">{l.titulo}</h1>
        <p className="tod__nota">{l.nota}</p>
      </div>

      <div className="tod__mando">
        {enCasa ? (
          DESTINOS.map((d) => (
            <button
              key={d}
              type="button"
              className="tod__boton"
              disabled={cruce.viajando}
              onClick={() => cruce.entrar(d)}
            >
              {`${LUGARES[d].emoji} ${LUGARES[d].titulo} · ${veloDeDestino(d).etiqueta}`}
            </button>
          ))
        ) : (
          <button
            type="button"
            className="tod__boton tod__boton--volver"
            disabled={cruce.viajando}
            onClick={cruce.volver}
          >
            🏡 Volver a casa
          </button>
        )}
        <label className="tod__ajustes">
          Equipo
          <select value={tier} onChange={(e) => setTier(/** @type {'alto'|'medio'|'bajo'} */ (e.target.value))}>
            <option value="alto">alto</option>
            <option value="medio">medio</option>
            <option value="bajo">bajo</option>
          </select>
        </label>
        <label className="tod__ajustes">
          <input type="checkbox" checked={calma} onChange={(e) => setCalma(e.target.checked)} />
          menos movimiento
        </label>
      </div>

      <VeloOdyssey
        {...cruce.propsVelo}
        letrero={
          cruce.fase === 'entrando' && cruce.destino
            ? `Entrando por ${veloDeDestino(cruce.destino).etiqueta}…`
            : undefined
        }
      />
    </div>
  );
}
