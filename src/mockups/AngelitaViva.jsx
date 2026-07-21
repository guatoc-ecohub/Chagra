import { useEffect, useState } from 'react';
import { AngelitaEntrada } from '../visual/agente/AngelitaEntrada.jsx';
import { Angelita } from '../visual/agente/Angelita.jsx';

/*
 * AngelitaViva — vitrina de LA COMPAÑERA al máximo (#/mockups/angelita-viva).
 *
 * Dos actos, sin auth (vitrina de discovery como las demás):
 *   1. LA ENTRADA TEATRAL — el número completo tras el paneo: asoma pequeñita,
 *      si hace sol se pone las gafas (caída + destello) y CRECE con overshoot
 *      a asistente. Botones para repetirla soleada o nublada.
 *   2. EL REPERTORIO — los estados del agente uno al lado del otro (calma,
 *      escucha, piensa, habla con lip-sync, celebra, aviso, no-sé, señala,
 *      invita y el nuevo HUSMEA), cada uno actuando con cuerpo, ojos y cejas.
 *
 * ?estado=<nombre> agranda ese estado (deep-link para revisión/capturas) y
 * ?solo=entrada|estados aísla un acto (más liviano para revisar la entrada:
 * el grid completo son ~12 cuerpos con filtros vivos).
 */

const ESTADOS_VITRINA = [
  ['calma', 'acompana', 'Acompaña: flota viva, mira, se acicala'],
  ['escucha', 'escuchando', 'Se posa y ladea la cabeza hacia usted'],
  ['piensa', 'pensando', 'Hojea su memoria de la finca'],
  ['habla', 'respondiendo', 'Lip-sync + gestos + cejas vivas'],
  ['celebra', 'contenta', 'Brinca con chispas y ojos de dicha'],
  ['aviso', 'preocupada', 'Alerta honesta: cejas, sudor, aro'],
  ['no sabe', 'no-se', 'Se encoge de hombros y lo dice'],
  ['señala', 'senala', 'Se inclina y apunta al lugar'],
  ['invita', 'invita', 'Venga, le muestro'],
  ['husmea', 'husmea', 'Fisgonea el rastro, cejas fruncidas'],
];

/* Visemas en bucle para que la boquita HABLE en la vitrina (sin TTS real). */
const CICLO_VISEMAS = ['V3', 'V2', 'V1', 'V3', 'V4', 'V2', 'V3', 'V1'];

export default function AngelitaViva({ onBack }) {
  const [replay, setReplay] = useState(0);
  const [soleado, setSoleado] = useState(true);
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

  const cielo = soleado
    ? 'linear-gradient(180deg, #aee3ff 0%, #dff4ff 55%, #f4ead0 100%)'
    : 'linear-gradient(180deg, #b9c6cc 0%, #d8dfe2 55%, #e9e4d4 100%)';

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fdf6e3',
      color: '#2a1a0c',
      fontFamily: 'system-ui, sans-serif',
      padding: '16px 14px 48px',
    }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            style={{
              border: '2px solid #2a1a0c', background: '#fffaf0', borderRadius: 10,
              padding: '6px 12px', fontWeight: 700, cursor: 'pointer',
            }}
          >
            ← Volver
          </button>
        )}
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>Angelita, la compañera viva</h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, opacity: 0.75 }}>
            La entrada teatral y el repertorio completo del agente
          </p>
        </div>
      </header>

      {/* ── ACTO 1: LA ENTRADA ─────────────────────────────────────────────── */}
      {solo !== 'estados' && (
      <section
        data-vitrina="entrada"
        style={{
          border: '2.5px solid #2a1a0c', borderRadius: 18, overflow: 'hidden',
          marginBottom: 22, background: '#fffaf0',
        }}
      >
        <div style={{
          background: cielo, minHeight: 300, display: 'flex',
          alignItems: 'center', justifyContent: 'center', position: 'relative',
        }}>
          {soleado && (
            <div aria-hidden style={{
              position: 'absolute', top: 18, right: 26, width: 54, height: 54,
              borderRadius: '50%', background: '#ffd76a',
              boxShadow: '0 0 34px 12px rgba(255, 215, 106, 0.75)',
            }} />
          )}
          <AngelitaEntrada
            key={`${replay}-${soleado}`}
            activa
            conGafas={soleado}
            clima={soleado ? 'soleado' : null}
            size={190}
            retrasoMs={400}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, padding: '10px 12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => { setSoleado(true); setReplay((n) => n + 1); }}
            style={{
              border: '2px solid #2a1a0c', background: '#ffd76a', borderRadius: 10,
              padding: '8px 14px', fontWeight: 700, cursor: 'pointer',
            }}
          >
            Repetir con sol (se pone las gafas)
          </button>
          <button
            type="button"
            onClick={() => { setSoleado(false); setReplay((n) => n + 1); }}
            style={{
              border: '2px solid #2a1a0c', background: '#dfe7ea', borderRadius: 10,
              padding: '8px 14px', fontWeight: 700, cursor: 'pointer',
            }}
          >
            Repetir nublado (sin gafas)
          </button>
        </div>
      </section>
      )}

      {/* ── ACTO 2: EL REPERTORIO ──────────────────────────────────────────── */}
      {solo !== 'entrada' && (
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
                  margin: 0, border: '2px solid #2a1a0c', borderRadius: 14,
                  background: '#fffaf0', padding: '10px 8px 8px', textAlign: 'center',
                  gridColumn: grande ? '1 / -1' : undefined,
                }}
              >
                <Angelita
                  estado={estado}
                  size={grande ? 260 : 148}
                  visema={estado === 'respondiendo' ? visema : null}
                  confianza={estado === 'respondiendo' ? 'alta' : null}
                />
                <figcaption style={{ fontSize: 13 }}>
                  <strong style={{ textTransform: 'capitalize' }}>{nombre}</strong>
                  <div style={{ fontSize: 11.5, opacity: 0.7, marginTop: 2 }}>{nota}</div>
                </figcaption>
              </figure>
            );
          })}
          {/* bonus: la de gafas puestas, quieta, para verla de asistente al sol */}
          <figure
            data-estado="gafas"
            style={{
              margin: 0, border: '2px solid #2a1a0c', borderRadius: 14,
              background: 'linear-gradient(180deg, #dff4ff, #fffaf0)', padding: '10px 8px 8px',
              textAlign: 'center',
            }}
          >
            <Angelita estado="acompana" size={148} gafas />
            <figcaption style={{ fontSize: 13 }}>
              <strong>Con gafas</strong>
              <div style={{ fontSize: 11.5, opacity: 0.7, marginTop: 2 }}>Día soleado: quedan puestas</div>
            </figcaption>
          </figure>
        </div>
      </section>
      )}
    </div>
  );
}
