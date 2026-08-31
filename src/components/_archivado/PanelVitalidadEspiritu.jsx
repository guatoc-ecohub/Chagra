import './panel-vitalidad-espiritu.css';

/**
 * PanelVitalidadEspiritu — el "VITALIDAD DEL ESPÍRITU" del mockup aprobado
 * #/mockups/avatar-biopunk (AvatarGameBiopunk, panel `agb-panel`), integrado
 * al home "menú vivo" (FincaVivaHero, escena Finca Organismo) con GROUNDING
 * TOTAL: el modelo lo arma vitalidadEspirituService desde los datos REALES
 * de la finca (ver el contrato "FUENTE REAL DE CADA VALOR" en ese módulo).
 *
 * Qué pinta (idéntico al panel del mockup, prefijo `pve-`):
 *   · Medidor circular de vitalidad (anillo neón + número grande).
 *   · Badge "N sp. ESPECIES VIVAS".
 *   · 4 barras horizontales con ícono: 💧 clima · 🪱 suelo · 🦋 biodiversidad
 *     · 🔥 energía, cada una con su gradiente c1→c2 del mockup.
 *   · 3 contadores: 🍃 especies registradas · ✦ cosechas anotadas ·
 *     ◎ anillos del frailejón (anillos concéntricos dibujados).
 *
 * SLOT PENDIENTE: cuando un dato real aún no existe, el slot muestra "—" con
 * riel punteado y el panel cierra con la nota "— = dato en camino". NUNCA un
 * número inventado. Cada slot lleva su fuente en el `title` (trazabilidad).
 *
 * Presentacional puro: recibe el `modelo` ya calculado. SVG/CSS solamente
 * (rsvg-safe), animaciones en panel-vitalidad-espiritu.css con
 * prefers-reduced-motion. Español de Colombia (tú/usted), sin voseo.
 *
 * @param {Object} props
 * @param {ReturnType<import('../../services/vitalidadEspirituService').buildVitalidadEspiritu>} props.modelo
 */
export default function PanelVitalidadEspiritu({ modelo }) {
  if (!modelo) return null;
  const { vitalidad, especiesVivas, ejes, conteos, algunPendiente } = modelo;

  const CIRC = 2 * Math.PI * 26;
  const vitalidadOk = vitalidad.estado === 'ok';
  const offset = vitalidadOk ? CIRC * (1 - vitalidad.valor / 100) : CIRC;

  const num = (slot) => (slot.estado === 'ok' ? slot.valor : '—');

  return (
    <aside
      className="pve"
      data-testid="panel-vitalidad-espiritu"
      aria-label="Vitalidad del espíritu de su finca, calculada con los registros reales"
    >
      <p className="pve-cab">VITALIDAD DEL ESPÍRITU</p>

      <div className="pve-cuerpo">
        {/* ── medidor circular + especies vivas ── */}
        <div className="pve-vital">
          <span
            className="pve-anillo-wrap"
            title={vitalidad.fuente}
            data-estado={vitalidad.estado}
            data-testid="pve-vitalidad"
          >
            <svg width="62" height="62" viewBox="0 0 62 62" role="img"
              aria-label={vitalidadOk
                ? `Vitalidad de la finca: ${vitalidad.valor} de 100. ${vitalidad.fuente}`
                : `Vitalidad de la finca: dato en camino. ${vitalidad.fuente}`}
            >
              <circle className="pve-ring-track" cx="31" cy="31" r="26" fill="none" strokeWidth="4" />
              {/* --pve-circ = punto de partida (anillo vacío) de la animación
                  de llenado al montar (pve-ring-in en el CSS) */}
              <circle
                className="pve-ring-val" cx="31" cy="31" r="26" fill="none" strokeWidth="4"
                strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={offset}
                transform="rotate(-90 31 31)"
                style={{ '--pve-circ': CIRC }}
              />
              <text x="31" y="36" textAnchor="middle" className="pve-ring-num">
                {vitalidadOk ? vitalidad.valor : '—'}
              </text>
            </svg>
          </span>
          <div
            className="pve-vivas"
            title={especiesVivas.fuente}
            data-estado={especiesVivas.estado}
            data-testid="pve-especies-vivas"
          >
            <span className="pve-vivas-num">
              {num(especiesVivas)}
              <small> sp.</small>
            </span>
            <span className="pve-vivas-cap">ESPECIES VIVAS</span>
          </div>
        </div>

        {/* ── 4 barras: clima · suelo · biodiversidad · energía ── */}
        <div className="pve-ejes" role="list">
          {ejes.map((eje) => {
            const lectura = eje.estado === 'ok'
              ? (eje.texto || `${eje.valor} de 100`)
              : 'dato en camino';
            return (
              <div
                className="pve-eje"
                key={eje.id}
                role="listitem"
                data-eje={eje.id}
                data-estado={eje.estado}
                title={`${eje.label}: ${lectura}. ${eje.fuente}`}
                aria-label={`${eje.label}: ${lectura}`}
              >
                <span className="pve-eje-emoji" aria-hidden="true">{eje.emoji}</span>
                <span className="pve-eje-riel">
                  {eje.estado === 'ok' && eje.valor != null && (
                    <span
                      className="pve-eje-fill"
                      style={{ width: `${eje.valor}%`, '--pve-c1': eje.c1, '--pve-c2': eje.c2 }}
                    />
                  )}
                </span>
                <span className="pve-eje-val">
                  {eje.estado === 'ok' ? (eje.valor != null ? eje.valor : eje.texto) : '—'}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── 3 contadores ── */}
        <div className="pve-conteos">
          <span title={conteos.especies.fuente} data-estado={conteos.especies.estado} data-testid="pve-conteo-especies">
            <i aria-hidden="true">🍃</i> <b>{num(conteos.especies)}</b> especies registradas
          </span>
          <span title={conteos.cosechas.fuente} data-estado={conteos.cosechas.estado} data-testid="pve-conteo-cosechas">
            <i aria-hidden="true">✦</i> <b>{num(conteos.cosechas)}</b> cosechas anotadas
          </span>
          <span title={conteos.anillos.fuente} data-estado={conteos.anillos.estado} data-testid="pve-conteo-anillos">
            <AnillosFrailejon anillos={conteos.anillos.estado === 'ok' ? conteos.anillos.valor : 0} />
            {' '}
            <b>{num(conteos.anillos)}</b> anillos del frailejón
          </span>
        </div>
      </div>

      {algunPendiente && (
        <p className="pve-nota" data-testid="pve-nota-pendiente">
          — = dato en camino: regístrelo en la finca y el espíritu lo siente.
        </p>
      )}
    </aside>
  );
}

/**
 * Anillos concéntricos del frailejón (uno por temporada cuidando la tierra),
 * la misma idea del mockup VerdeVivo pero con la paleta neón del panel.
 * Dibuja máximo 8 anillos (más se vuelven ruido a este tamaño); el número
 * real siempre va en el texto.
 */
function AnillosFrailejon({ anillos = 0 }) {
  const n = Math.max(0, Math.min(8, Math.floor(anillos)));
  return (
    <svg className="pve-anillos-svg" viewBox="0 0 30 30" width="15" height="15" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <circle
          key={i}
          cx="15" cy="15" r={3.5 + i * 1.55}
          fill="none"
          stroke={i % 2 ? '#9dff3f' : '#2dffc4'}
          strokeWidth="1.1"
          opacity={Math.max(0.25, 0.95 - i * 0.09)}
        />
      ))}
      <circle cx="15" cy="15" r="1.6" fill="#ffb54f" />
    </svg>
  );
}
