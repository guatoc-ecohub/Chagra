import DOMPurify from 'dompurify';

/**
 * renderAgentMarkdown — convierte el markdown que emite el agente (granite3.3)
 * a HTML *limpio y seguro* para mostrarlo en la burbuja del chat.
 *
 * POR QUÉ existe (task #58, queja del operador 2026-06-19): el agente respondía
 * con `**negritas**`, `*cursivas*`, `### títulos` y `* viñetas` en CRUDO. El
 * campesino —o una niña— veía asteriscos y almohadillas literales en pantalla.
 * Antes la burbuja pintaba `message.content` como texto plano (whitespace-pre-wrap),
 * así que el markdown quedaba a la vista. Aquí lo renderizamos de verdad: negritas
 * reales, viñetas reales, títulos legibles, cero asteriscos visibles.
 *
 * DISEÑO (mínimo + seguro, sin dependencias nuevas de parser):
 *   1. Escapamos TODO el HTML de entrada primero (`escapeHtml`). El texto del LLM
 *      NUNCA se trata como HTML — si el modelo emite `<script>`, queda como texto.
 *   2. Aplicamos un subconjunto pequeño de markdown sobre el texto ya escapado:
 *      encabezados, negrita, cursiva, código inline, viñetas, listas numeradas,
 *      enlaces (a texto plano — no abrimos URLs del modelo), y saltos de línea.
 *   3. Pasamos el resultado por DOMPurify con una allow-list ESTRECHA de etiquetas
 *      seguras (sin <a href>, sin <img>, sin atributos). Defensa en profundidad:
 *      aun si el paso 2 dejara pasar algo, DOMPurify lo limpia.
 *
 * El resultado es una cadena HTML lista para `dangerouslySetInnerHTML`. Es seguro
 * SOLO porque pasa por DOMPurify con esta config; no usar el output crudo del
 * paso 2 sin sanitizar.
 *
 * Tipografía / legibilidad pensada para campesino/niña: viñetas reales con punto,
 * negrita marcada, títulos un poco más grandes — el styling final lo da el
 * contenedor (clases `.agent-md` en ChatBubble), aquí solo emitimos la estructura.
 */

/** Etiquetas permitidas en la salida final (allow-list estrecha). */
const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'code',
  'ul', 'ol', 'li',
  'h3', 'h4',
  'blockquote',
];

/** Escapa los 5 caracteres HTML peligrosos. Primer y principal escudo anti-XSS. */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Aplica el markdown inline (negrita, cursiva, código, enlaces) a UNA línea
 * de texto YA escapada. No toca estructura de bloque (eso lo hace el caller).
 */
function inlineMarkdown(line) {
  return (
    line
      // Código inline `texto` (antes que negrita/cursiva para no romper el código)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Negrita **texto** o __texto__ (antes que cursiva: comparten el `*`)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_]+)__/g, '<strong>$1</strong>')
      // Cursiva *texto* o _texto_ (evita snake_case: _ debe estar entre no-letras)
      .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
      .replace(/(?<![A-Za-z0-9])_([^_\n]+)_(?![A-Za-z0-9])/g, '<em>$1</em>')
      // Enlaces [texto](url) → solo el texto visible (no exponemos URLs del modelo)
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  );
}

/**
 * Convierte markdown del agente a una cadena HTML segura y sanitizada.
 *
 * @param {string} text - Texto del agente (posiblemente con markdown).
 * @returns {string} HTML seguro (allow-list estrecha) listo para inyectar.
 */
export function renderAgentMarkdown(text) {
  if (typeof text !== 'string' || text.length === 0) return '';

  // 1) Escapar primero. A partir de aquí trabajamos sobre texto inerte.
  const escaped = escapeHtml(text);

  // 2) Recorremos línea por línea, agrupando bloques (listas, párrafos).
  const lines = escaped.split(/\r?\n/);
  const out = [];
  let listType = null; // 'ul' | 'ol' | null
  let paragraph = []; // líneas acumuladas del párrafo actual

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    // Saltos de línea simples dentro del párrafo → <br>.
    const html = paragraph.map(inlineMarkdown).join('<br>');
    out.push(`<p>${html}</p>`);
    paragraph = [];
  };

  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    const trimmed = line.trim();

    // Línea en blanco → cierra párrafo y lista (separa bloques).
    if (trimmed === '') {
      flushParagraph();
      closeList();
      continue;
    }

    // Separador horizontal (---, ***, ===) → lo ignoramos (ruido visual).
    if (/^([-*=])\1{2,}$/.test(trimmed)) {
      flushParagraph();
      closeList();
      continue;
    }

    // Encabezados # .. ###### → h3 (### y más profundos) / h4 (no usamos h1/h2
    // dentro de una burbuja para no romper la jerarquía de la página).
    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const tag = heading[1].length <= 3 ? 'h3' : 'h4';
      out.push(`<${tag}>${inlineMarkdown(heading[2].trim())}</${tag}>`);
      continue;
    }

    // Cita > texto → blockquote (una línea por simplicidad).
    const quote = trimmed.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      closeList();
      out.push(`<blockquote>${inlineMarkdown(quote[1].trim())}</blockquote>`);
      continue;
    }

    // Viñeta - * + texto → <ul><li>.
    const bullet = trimmed.match(/^[-*+]\s+(.*)$/);
    if (bullet) {
      flushParagraph();
      if (listType !== 'ul') {
        closeList();
        out.push('<ul>');
        listType = 'ul';
      }
      out.push(`<li>${inlineMarkdown(bullet[1].trim())}</li>`);
      continue;
    }

    // Numerada 1. 2) texto → <ol><li>.
    const numbered = trimmed.match(/^\d+[.)]\s+(.*)$/);
    if (numbered) {
      flushParagraph();
      if (listType !== 'ol') {
        closeList();
        out.push('<ol>');
        listType = 'ol';
      }
      out.push(`<li>${inlineMarkdown(numbered[1].trim())}</li>`);
      continue;
    }

    // Texto normal: si veníamos en lista, la cerramos y arrancamos párrafo.
    closeList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  closeList();

  const html = out.join('');

  // 3) Sanitización final con allow-list estrecha. Sin atributos, sin <a>,
  //    sin <img>, sin estilos inline. Defensa en profundidad.
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: [],
    USE_PROFILES: { html: true },
  });
}

export default renderAgentMarkdown;
