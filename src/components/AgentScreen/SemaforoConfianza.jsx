import React, { useState } from 'react';
import {
  BadgeCheck, AlertTriangle, OctagonAlert, ChevronDown, ExternalLink, Leaf,
} from 'lucide-react';
import {
  computeSemaforoTurno,
  SEMAFORO_COPY,
  MOTIVO_COPY,
  describeFuente,
  nivelValidacionInfo,
  humanizarEntidad,
  confianzaPorcentaje,
} from '../../services/semaforoConfianza';

/**
 * SemaforoConfianza — el semáforo de confianza POR-RESPUESTA + el panel de
 * procedencia POR-AFIRMACIÓN del chat del agente (lever "hacer visible el
 * moat anti-alucinación", decisión del operador: TODAS las cuentas — NO
 * depende del pref showSourceBadges, a diferencia de los sellos detallados).
 *
 * Anatomía: un sello (misma anatomía .sello de sello-confianza.css que los
 * demás badges — lámpara + etiqueta + caret) que se lee de un vistazo:
 *
 *   verde → dato respaldado y revisado (expert_reviewed / OpenAlex / POWO /
 *           Agrosavia / publicado) con política answer del sidecar.
 *   ámbar → respaldo parcial: borrador claude_draft, una sola fuente,
 *           fuentes en disputa, o política hedge.
 *   rojo  → sin verificar — el agente prefirió decirlo de frente (abstain).
 *
 * Al toque, el sello abre el PANEL DE PROCEDENCIA (.procedencia-panel):
 * una tarjeta-papel cosida al cuaderno con un renglón por afirmación fuerte
 * (entidad del grafo), cada uno con sus chips: fuente ("Catálogo Chagra",
 * "Agrosavia", "Verificado OpenAlex", DOI/URL clickeable CSP-safe),
 * nivel de curaduría y confianza del match. Es la superficie "modo
 * científico" — trazable y seria, pero con calidez de cuaderno de campo:
 * el "sin verificar" se lee como HONESTIDAD, no como error.
 *
 * Datos: SOLO metadata ya persistida en el turno (grounding_semaphore /
 * grounding_policy / grounding_provenance — wiring en AgentScreen.jsx).
 * El cómputo vive en services/semaforoConfianza.js (puro, testeado);
 * este componente es presentación. Graceful: sin señal de grounding en la
 * metadata (mensajes viejos, offline, sidecar apagado) no renderiza nada.
 */

const NIVEL_ICON = {
  verde: BadgeCheck,
  ambar: AlertTriangle,
  rojo: OctagonAlert,
};

/** Un renglón del panel: la afirmación (entidad) + sus chips de procedencia. */
function ProcedenciaItem({ item }) {
  const fuente = describeFuente(item.source);
  const validacion = nivelValidacionInfo(
    item.verificado_openalex === true ? 'verificado_openalex' : item.validation_level
  );
  const pct = confianzaPorcentaje(item.confidence);

  return (
    <li className="procedencia-item" data-testid="procedencia-item">
      <span className="procedencia-entidad">
        <Leaf size={11} aria-hidden="true" className="procedencia-entidad-hoja" />
        {humanizarEntidad(item.entity_id)}
      </span>
      <span className="procedencia-chips">
        {/* Chip de FUENTE: link CSP-safe (<a> nativo, noopener) si hay
            DOI/URL; texto plano si es institucional sin recurso puntual. */}
        {fuente.url ? (
          <a
            href={fuente.url}
            target="_blank"
            rel="noopener noreferrer"
            className="procedencia-chip procedencia-chip-fuente"
            data-testid="procedencia-fuente-link"
            title={`Abrir la fuente citada (${fuente.label}) en una pestaña nueva`}
          >
            {fuente.label}
            <ExternalLink size={9} aria-hidden="true" />
          </a>
        ) : (
          <span
            className="procedencia-chip procedencia-chip-fuente"
            data-testid="procedencia-fuente"
          >
            {fuente.label}
          </span>
        )}
        {/* Chip de CURADURÍA: el validation_level del catálogo, coloreado. */}
        <span
          className="procedencia-chip"
          data-nivel={validacion.nivel}
          data-testid="procedencia-validacion"
        >
          {validacion.label}
        </span>
        {/* Chip de CONFIANZA del match contra el grafo (si viene numérica). */}
        {pct != null && (
          <span className="procedencia-chip procedencia-chip-confianza" data-testid="procedencia-confianza">
            coincidencia {pct}%
          </span>
        )}
      </span>
    </li>
  );
}

export default function SemaforoConfianza({ metadata }) {
  const [abierto, setAbierto] = useState(false);
  const semaforo = computeSemaforoTurno(metadata);
  if (!semaforo) return null;

  const { nivel, motivo, provenance } = semaforo;
  const copy = SEMAFORO_COPY[nivel] || SEMAFORO_COPY.ambar;
  const Icon = NIVEL_ICON[nivel] || AlertTriangle;
  const motivoTexto = MOTIVO_COPY[motivo] || null;
  const hayProcedencia = Array.isArray(provenance) && provenance.length > 0;

  return (
    <>
      <button
        type="button"
        className="sello"
        data-nivel={nivel}
        data-testid="semaforo-respuesta"
        title={copy.explica}
        aria-expanded={abierto}
        onClick={(e) => {
          e.stopPropagation();
          setAbierto((v) => !v);
        }}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <span className="sello-lampara" aria-hidden="true">
          <Icon size={10} strokeWidth={2.75} />
        </span>
        <span className="sello-texto">{copy.label}</span>
        <ChevronDown size={10} className="sello-caret" aria-hidden="true" />
      </button>

      {abierto && (
        <div
          className="procedencia-panel"
          data-nivel={nivel}
          data-testid="panel-procedencia"
          role="region"
          aria-label="De dónde sale esta respuesta"
        >
          <p className="procedencia-titulo">¿De dónde sale esta respuesta?</p>
          <p className="procedencia-explica">{copy.explica}</p>
          {motivoTexto && <p className="procedencia-motivo">{motivoTexto}</p>}

          {hayProcedencia ? (
            <ul className="procedencia-lista">
              {provenance.map((item, i) => (
                <ProcedenciaItem key={`${item.entity_id || 'item'}-${i}`} item={item} />
              ))}
            </ul>
          ) : (
            <p className="procedencia-vacia" data-testid="procedencia-vacia">
              Esta vez no hubo datos del catálogo que respalden la respuesta.
              Eso también se lo decimos: preferimos un &ldquo;no sé&rdquo; honesto a un
              invento bonito.
            </p>
          )}

          <p className="procedencia-pie">
            Chagra le muestra sus fuentes para que usted decida con los ojos
            abiertos. Lo que no está verificado, se dice.
          </p>
        </div>
      )}
    </>
  );
}
