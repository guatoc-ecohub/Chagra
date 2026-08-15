import { readFileSync } from 'node:fs';
import { detectarSlugEnTexto, elegirInsight } from '../src/hooks/useInsightProactivo.js';

const cards = JSON.parse(readFileSync(new URL('../src/data/agro-insight-cards.json', import.meta.url), 'utf8'));

const probes = [
  ['papaya', 'falso positivo: papaya -> papa'],
  ['mi cultivo es papaya', 'papaya x2'],
  ['papayo', 'falso positivo: papayo -> papa'],
  ['la papa esta con gota', 'papa real'],
  ['papa criolla nariño', 'papa real'],
  ['tomate larga vida', 'tomate (sin card)'],
  ['tomate de arbol', 'tomate de árbol (sin card)'],
  ['tengo cebada criolla', 'cebada (sin card)'],
  ['cebada para cerveza', 'cebada (sin card)'],
  ['maiz choclo cogollero', 'maiz real'],
  ['frijol antracnosis', 'frijol real'],
  ['trigo jawahir', 'trigo real'],
  ['aguacate hass', 'fuera del map -> null'],
  ['mango y guanabana', 'fuera del map -> null'],
  ['platano y banano', 'fuera del map -> null'],
  ['cacao arroz quinua', 'fuera del map -> null'],
  ['uchuva curuba gulupa', 'fuera del map -> null'],
  ['mora lulo naranja limon', 'fuera del map -> null'],
  ['yuca camote arveja haba', 'fuera del map -> null'],
  ['lechuga zanahoria cebolla', 'fuera del map -> null'],
  ['no le cayo ni una gota', 'gota (palabra común) -> papa?'],
  ['la broca del metal', 'broca (palabra común) -> cafe?'],
  ['cafeteria de la esquina', 'cafeteria -> cafe?'],
  ['el cafe tiene broca', 'cafe real'],
  ['milpa ancestral', 'milpa -> maiz'],
  ['la mazorca quedo buena', 'mazorca -> maiz'],
  ['el cogollero dano el maiz', 'cogollero -> maiz'],
];

const keys = [...new Set(cards.map((c) => c.entity_slug))];
console.log('entity_slugs en cards:', keys.join(', '), '| total cards:', cards.length);

for (const [t, desc] of probes) {
  const slug = detectarSlugEnTexto(t);
  const tieneCard = slug ? elegirInsight(slug, []) !== null : false;
  console.log(`${slug ?? 'null'.padEnd(6)} ${tieneCard ? 'CON-CARD ' : 'sin-card '} <- ${desc}`);
}

const cardsSinCifra = cards.filter((c) => !c.cifra);
const cardsSinFuente = cards.filter((c) => !c.fuente || !c.doi);
const co = cards.filter((c) => !c.non_co).length;
const nonCo = cards.filter((c) => c.non_co).length;
console.log('cards sin cifra:', cardsSinCifra.length, '| sin fuente/doi:', cardsSinFuente.length, '| co:', co, '| non_co:', nonCo);
