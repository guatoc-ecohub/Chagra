import React, { useMemo } from 'react';
import { renderAgentMarkdown } from '../../utils/renderAgentMarkdown';

/**
 * AgentMarkdown — pinta el texto de una respuesta del agente como markdown
 * renderizado (negritas, viñetas, títulos) en vez de mostrar `**`/`###` crudos.
 *
 * SEGURIDAD: el HTML que inyectamos viene EXCLUSIVAMENTE de `renderAgentMarkdown`,
 * que escapa todo el HTML de entrada y luego sanitiza con DOMPurify (allow-list
 * estrecha, sin atributos, sin <a>/<img>/onclick). Por eso el uso de
 * `dangerouslySetInnerHTML` es seguro aquí: la cadena nunca contiene HTML del
 * usuario ni del modelo sin sanitizar. NO pasar a este componente HTML de otra
 * fuente.
 *
 * El styling (tipografía clara, viñetas con punto, títulos legibles) lo aporta
 * la clase `agent-md` definida en index.css — pensado para que un campesino o una
 * niña lo lea limpio, sin asteriscos a la vista.
 *
 * @param {Object} props
 * @param {string} props.content - Texto del agente (con o sin markdown).
 * @param {string} [props.className] - Clases extra para el contenedor.
 */
export default function AgentMarkdown({ content, className = '' }) {
  const html = useMemo(() => renderAgentMarkdown(content), [content]);
  return (
    <div
      className={`agent-md text-sm leading-relaxed ${className}`.trim()}
      /* HTML ya sanitizado por renderAgentMarkdown (escape de entrada + DOMPurify
         con allow-list estrecha, sin atributos/href/onclick). Seguro por contrato. */
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
