/* eslint-disable chagra-i18n/no-hardcoded-spanish -- fixtures de test (entradas
   de markdown del agente), no strings de UI; exentas de ADR-050. */
import { describe, it, expect } from 'vitest';
import { renderAgentMarkdown } from './renderAgentMarkdown';

/**
 * Tests del renderer de markdown del agente (task #58). La queja del operador:
 * el agente mostraba `**`, `*` y `###` CRUDOS, ilegible para el campesino/niña.
 * Aquí blindamos: (a) el markdown se convierte a HTML real, (b) NO quedan
 * asteriscos/almohadillas residuales a la vista, (c) la entrada está sanitizada
 * (sin XSS, sin <script>, sin onclick, sin href de javascript:).
 */
describe('renderAgentMarkdown — negritas y cursivas', () => {
  it('**x** → <strong>x</strong>, sin asteriscos visibles', () => {
    const html = renderAgentMarkdown('Usa **caldo bordelés** en la mañana.');
    expect(html).toContain('<strong>caldo bordelés</strong>');
    expect(html).not.toContain('*');
  });

  it('__x__ también es negrita', () => {
    const html = renderAgentMarkdown('Esto es __importante__.');
    expect(html).toContain('<strong>importante</strong>');
    expect(html).not.toContain('_');
  });

  it('*x* → <em>x</em> (cursiva), sin asteriscos visibles', () => {
    const html = renderAgentMarkdown('Es *opcional* aplicarlo.');
    expect(html).toContain('<em>opcional</em>');
    expect(html).not.toContain('*');
  });

  it('NO confunde snake_case con cursiva (coffea_arabica intacto)', () => {
    const html = renderAgentMarkdown('La especie coffea_arabica crece bien.');
    expect(html).toContain('coffea_arabica');
    expect(html).not.toContain('<em>');
  });
});

describe('renderAgentMarkdown — encabezados', () => {
  it('### Título → <h3>, sin almohadillas visibles', () => {
    const html = renderAgentMarkdown('### Cómo preparar\nMezcla los ingredientes.');
    expect(html).toContain('<h3>Cómo preparar</h3>');
    expect(html).not.toContain('#');
  });

  it('#### o más profundo → <h4>', () => {
    const html = renderAgentMarkdown('#### Detalle fino');
    expect(html).toContain('<h4>Detalle fino</h4>');
    expect(html).not.toContain('#');
  });

  it('# y ## se degradan a h3 dentro de la burbuja (no rompen jerarquía)', () => {
    const html = renderAgentMarkdown('# Plagas comunes');
    expect(html).toContain('<h3>Plagas comunes</h3>');
  });
});

describe('renderAgentMarkdown — listas (viñetas reales)', () => {
  it('viñetas con * o - → <ul><li>, cero asteriscos a la vista', () => {
    const md = 'Compañeras:\n* Caléndula\n* Albahaca\n- Cilantro';
    const html = renderAgentMarkdown(md);
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>Caléndula</li>');
    expect(html).toContain('<li>Albahaca</li>');
    expect(html).toContain('<li>Cilantro</li>');
    expect(html).not.toContain('*');
  });

  it('lista numerada 1. 2. → <ol><li>', () => {
    const md = 'Pasos:\n1. Hervir el agua\n2. Agregar la planta';
    const html = renderAgentMarkdown(md);
    expect(html).toContain('<ol>');
    expect(html).toContain('<li>Hervir el agua</li>');
    expect(html).toContain('<li>Agregar la planta</li>');
  });

  it('viñetas con negrita interna se renderizan combinadas', () => {
    const html = renderAgentMarkdown('* **Riego**: cada 3 días');
    expect(html).toContain('<li><strong>Riego</strong>: cada 3 días</li>');
    expect(html).not.toContain('*');
  });
});

describe('renderAgentMarkdown — estructura y saltos', () => {
  it('párrafos separados por línea en blanco → <p> distintos', () => {
    const html = renderAgentMarkdown('Primer párrafo.\n\nSegundo párrafo.');
    expect(html).toContain('<p>Primer párrafo.</p>');
    expect(html).toContain('<p>Segundo párrafo.</p>');
  });

  it('salto de línea simple dentro de un párrafo → <br>', () => {
    const html = renderAgentMarkdown('Línea uno\nLínea dos');
    expect(html).toContain('Línea uno<br>Línea dos');
  });

  it('texto plano sin markdown → un solo párrafo legible', () => {
    const html = renderAgentMarkdown('Hola, soy tu asistente.');
    expect(html).toBe('<p>Hola, soy tu asistente.</p>');
  });

  it('entrada vacía o no-string → cadena vacía', () => {
    expect(renderAgentMarkdown('')).toBe('');
    expect(renderAgentMarkdown(null)).toBe('');
    expect(renderAgentMarkdown(undefined)).toBe('');
    expect(renderAgentMarkdown(42)).toBe('');
  });
});

describe('renderAgentMarkdown — sanitización (anti-XSS)', () => {
  it('NO ejecuta <script>: queda escapado, no como tag', () => {
    const html = renderAgentMarkdown('Hola <script>alert("xss")</script>');
    expect(html).not.toContain('<script>');
    expect(html.toLowerCase()).not.toContain('<script');
  });

  it('NO deja un <div onclick> VIVO: el tag entra escapado (inerte)', () => {
    const html = renderAgentMarkdown('<div onclick="alert(1)">click</div>');
    // El div NO es un elemento real (quedó escapado como texto), por eso no hay
    // atributo onclick ejecutable. "onclick" puede sobrevivir como TEXTO inerte.
    expect(html).not.toContain('<div');
    expect(html).toContain('&lt;div');
  });

  it('NO produce <a href> (los enlaces se aplanan a texto)', () => {
    const html = renderAgentMarkdown('Mira [esto](javascript:alert(1)) aquí.');
    expect(html).not.toContain('<a');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('esto');
  });

  it('NO produce <img> (sin vectores de carga remota)', () => {
    const html = renderAgentMarkdown('![x](https://evil.example/x.png)');
    expect(html).not.toContain('<img');
  });

  it('caracteres HTML en el texto se escapan, no se interpretan', () => {
    const html = renderAgentMarkdown('1 < 2 && 3 > 2');
    expect(html).not.toContain('<2');
    // El contenido sigue siendo legible para el usuario tras desescapar.
    expect(html).toMatch(/&lt;|&amp;|&gt;/);
  });
});
