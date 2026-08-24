/* eslint-disable chagra-i18n/no-hardcoded-spanish -- vitrina de discovery con
   copy curatorial en español a propósito (mismo caso AngelitaViva/CaraProd3D,
   ADR-050) */
import { useEffect, useState } from 'react';
import { GuacamayaEntrada } from '../visual/agente/GuacamayaEntrada.jsx';
import { GuacamayaSalida } from '../visual/agente/GuacamayaSalida.jsx';
import { GuacamayaCompai } from '../visual/creatures/GuacamayaCompai.jsx';
import BurbujaAngelita from '../visual/agente/BurbujaAngelita.jsx';
import { TEXTO_NO_SE } from '../visual/agente/angelitaEstados.js';

/*
 * GuacamayaViva — vitrina de LA GUACAMAYA al máximo (#/mockups/guacamaya-viva).
 *
 * El espejo de AngelitaViva.jsx (mismo formato, misma ruta pública de
 * discovery, cero auth) para la 7ma del elenco: la guacamaya bandera
 * (Ara macao, rig F24 del valle — arte aprobado, NO redibujado).
 *
 * Tres actos:
 *   1. LA ENTRADA TEATRAL — asoma pequeñita → pausa quieta (idleCerebro
 *      apagado, solo boil) → CRECE con overshoot + aro de energía → brillo.
 *      Sin gafas: la guacamaya no tiene accesorio equivalente (la fase se
 *      omite a propósito, ver GuacamayaEntrada.jsx).
 *   2. EL REPERTORIO — los 10 estados del agente traducidos al rig
 *      (ESTADO_RIG_DE_ESTADO_AGENTE): acicala en calma, gesticula el ala al
 *      hablar, celebra en V de bandera, jaula en el aviso, semillas al
 *      husmear. En los estados de atención LO MIRA: las pupilas siguen su
 *      puntero/dedo (gaze-follow, acérquese y muévalo).
 *   3. LA SALIDA ÉPICA — aletea la despedida y se desvanece hacia el bosque
 *      (Angelita aún no tiene salida en dev: la guacamaya estrena el espejo).
 *
 * ?estado=<nombre> agranda ese estado (deep-link para revisión/capturas) y
 * ?solo=entrada|estados|salida aísla un acto.
 */

const ESTADOS_VITRINA = [
  ['calma', 'acompana', 'Acompaña: se acicala el hombro, las alas respiran'],
  ['escucha', 'escuchando', 'Atenta — y LO MIRA: mueva el puntero cerca'],
  ['piensa', 'pensando', 'Se queda quieta, hojeando su memoria del dosel'],
  ['habla', 'respondiendo', 'Pico con lip-sync + el ala gesticula la frase'],
  ['celebra', 'contenta', 'Brinca y abre las alas en V: toda la bandera'],
  ['aviso', 'preocupada', 'Alerta honesta: colores apagados, aparece la jaula'],
  ['no sabe', 'no-se', 'Se queda quieta y lo dice explícito: "No sé"'],
  ['señala', 'senala', 'Ala derecha extendida hacia el bosque'],
  ['invita', 'invita', 'Alas semiabiertas de bienvenida: venga, hagamos pacto'],
  ['husmea', 'dispersar', 'Aletea amplio y riega semillas: así siembra volando'],
];

/* Visemas en bucle para que el pico HABLE en la vitrina (sin TTS real). */
const CICLO_VISEMAS = ['V3', 'V2', 'V1', 'V3', 'V4', 'V2', 'V3', 'V1'];

export default function GuacamayaViva({ onBack }) {
  const [replayEntrada, setReplayEntrada] = useState(0);
  const [replaySalida, setReplaySalida] = useState(0);
  const [visema, setVisema] = useState('V3');
  const params = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : null;
  const estadoGrande = params?.get('estado') || null;
  const solo = params?.get('solo') || null;

  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      i = (i + 1) % CICLO_VISEMAS.length;
      setVisema(CICLO_VISEMAS[i]);
    }, 210);
    return () => clearInterval(t);
  }, []);

  const dosel = 'linear-gradient(180deg, #63c7e6 0%, #8fd6c4 45%, #dfe7a8 80%, #c8d68e 100%)';
  const botonEstilo = {
    border: '2px solid #2a140b', background: '#ffc61e', borderRadius: 10,
    padding: '8px 14px', fontWeight: 700, cursor: 'pointer',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fdf6e3',
      color: '#2a140b',
      fontFamily: 'system-ui, sans-serif',
      padding: '16px 14px 48px',
    }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            style={{
              border: '2px solid #2a140b', background: '#fffaf0', borderRadius: 10,
              padding: '6px 12px', fontWeight: 700, cursor: 'pointer',
            }}
          >
            ← Volver
          </button>
        )}
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>La Guacamaya, la compañera viva</h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, opacity: 0.75 }}>
            La entrada teatral, el repertorio del agente y la salida épica
          </p>
        </div>
      </header>

      {/* ── ACTO 1: LA ENTRADA ─────────────────────────────────────────────── */}
      {solo !== 'estados' && solo !== 'salida' && (
      <section
        data-vitrina="entrada"
        style={{
          border: '2.5px solid #2a140b', borderRadius: 18, overflow: 'hidden',
          marginBottom: 22, background: '#fffaf0',
        }}
      >
        <div style={{
          background: dosel, minHeight: 300, display: 'flex',
          alignItems: 'center', justifyContent: 'center', position: 'relative',
        }}>
          <GuacamayaEntrada
            key={replayEntrada}
            activa
            size={190}
            retrasoMs={400}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, padding: '10px 12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setReplayEntrada((n) => n + 1)}
            style={botonEstilo}
          >
            Repetir la entrada
          </button>
          <span style={{ fontSize: 11.5, opacity: 0.65 }}>
            Asoma → pausa quieta → crece con overshoot + aro → brillo. Sin gafas: no hay accesorio equivalente.
          </span>
        </div>
      </section>
      )}

      {/* ── ACTO 2: EL REPERTORIO ──────────────────────────────────────────── */}
      {solo !== 'entrada' && solo !== 'salida' && (
      <section data-vitrina="estados">
        <h2 style={{ fontSize: 17, margin: '0 0 10px' }}>El repertorio del agente</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))',
          gap: 12,
        }}>
          {ESTADOS_VITRINA.map(([nombre, estado, nota]) => {
            const grande = estadoGrande === estado || estadoGrande === nombre;
            return (
              <figure
                key={estado}
                data-estado={estado}
                style={{
                  margin: 0, border: '2px solid #2a140b', borderRadius: 14,
                  background: '#fffaf0', padding: '10px 8px 8px', textAlign: 'center',
                  gridColumn: grande ? '1 / -1' : undefined,
                }}
              >
                <GuacamayaCompai
                  estado={estado}
                  size={grande ? 260 : 148}
                  visema={estado === 'respondiendo' ? visema : null}
                />
                {/* no-se: quietud + texto EXPLÍCITO, nunca solo el uno o el
                    otro (feedback del operador — mismo contrato que Angelita). */}
                {estado === 'no-se' && (
                  <BurbujaAngelita mensaje={TEXTO_NO_SE} tipo="informativa" animado={false} />
                )}
                <figcaption style={{ fontSize: 13 }}>
                  <strong style={{ textTransform: 'capitalize' }}>{nombre}</strong>
                  <div style={{ fontSize: 11.5, opacity: 0.7, marginTop: 2 }}>{nota}</div>
                </figcaption>
              </figure>
            );
          })}
          {/* bonus: el espejo — direccion='izquierda' voltea el dibujo completo
              (el contrato que AngelitaGuia usa para percharla a ambos lados). */}
          <figure
            data-estado="espejo"
            style={{
              margin: 0, border: '2px solid #2a140b', borderRadius: 14,
              background: 'linear-gradient(180deg, #dff4ff, #fffaf0)', padding: '10px 8px 8px',
              textAlign: 'center',
            }}
          >
            <GuacamayaCompai estado="senala" direccion="izquierda" size={148} />
            <figcaption style={{ fontSize: 13 }}>
              <strong>Espejo</strong>
              <div style={{ fontSize: 11.5, opacity: 0.7, marginTop: 2 }}>direccion=izquierda: señala al otro lado</div>
            </figcaption>
          </figure>
        </div>
      </section>
      )}

      {/* ── ACTO 3: LA SALIDA ──────────────────────────────────────────────── */}
      {solo !== 'entrada' && solo !== 'estados' && (
      <section
        data-vitrina="salida"
        style={{
          border: '2.5px solid #2a140b', borderRadius: 18, overflow: 'hidden',
          marginTop: 22, background: '#fffaf0',
        }}
      >
        <div style={{
          background: dosel, minHeight: 260, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <GuacamayaSalida
            key={replaySalida}
            activa
            size={170}
            retrasoMs={600}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, padding: '10px 12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setReplaySalida((n) => n + 1)}
            style={botonEstilo}
          >
            Repetir la salida
          </button>
          <span style={{ fontSize: 11.5, opacity: 0.65 }}>
            Aletea la despedida (invita) y se desvanece hacia el bosque.
          </span>
        </div>
      </section>
      )}
    </div>
  );
}
