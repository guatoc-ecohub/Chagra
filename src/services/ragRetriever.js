const CORPUS_PATH = '/cycle-content/';

const BM25_PARAMS = {
  k1: 1.5,
  b: 0.75,
};

let corpusCache = null;
let termDocFreq = new Map();
let avgDocLen = 0;

function tokenize(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\sáéíóúñ]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function buildInvertedIndex(docs) {
  const df = new Map();
  docs.forEach((doc) => {
    const terms = new Set(tokenize(doc.text));
    terms.forEach((term) => {
      df.set(term, (df.get(term) || 0) + 1);
    });
  });
  return df;
}

function computeIDF(df, N) {
  const idf = new Map();
  df.forEach((freq, term) => {
    idf.set(term, Math.log((N - freq + 0.5) / (freq + 0.5) + 1));
  });
  return idf;
}

function scoreBM25(doc, queryTerms, idf, avgLen) {
  const docTerms = tokenize(doc.text);
  const docLen = docTerms.length;
  const termCounts = new Map();
  docTerms.forEach((t) => termCounts.set(t, (termCounts.get(t) || 0) + 1));

  let score = 0;
  queryTerms.forEach((term) => {
    const tf = termCounts.get(term) || 0;
    if (tf > 0) {
      const idfVal = idf.get(term) || 0;
      const tfNorm = (tf * (BM25_PARAMS.k1 + 1)) / (tf + BM25_PARAMS.k1 * (1 - BM25_PARAMS.b + (BM25_PARAMS.b * docLen) / avgLen));
      score += idfVal * tfNorm;
    }
  });
  return score;
}

function flattenDoc(doc, prefix = '') {
  const passages = [];
  const addPassage = (key, val) => {
    if (typeof val === 'string' && val.length > 20) {
      passages.push({ key: `${prefix}${key}`, text: val, species: doc.species_slug });
    } else if (Array.isArray(val)) {
      val.forEach((item, i) => {
        if (typeof item === 'string' && item.length > 20) {
          passages.push({ key: `${prefix}${key}[${i}]`, text: item, species: doc.species_slug });
        } else if (typeof item === 'object' && item !== null) {
          flattenDoc(item, `${prefix}${key}[${i}].`).forEach((p) => passages.push(p));
        }
      });
    } else if (typeof val === 'object' && val !== null) {
      flattenDoc(val, `${prefix}${key}.`).forEach((p) => passages.push(p));
    }
  };

  Object.entries(doc).forEach(([k, v]) => addPassage(k, v));
  return passages;
}

async function loadCorpus() {
  if (corpusCache) return corpusCache;

  const species = ['fresa', 'lechuga', 'tomate_chonto'];
  const docs = [];

  for (const slug of species) {
    try {
      const res = await fetch(`${CORPUS_PATH}${slug}.json`);
      if (!res.ok) continue;
      const data = await res.json();
      const passages = flattenDoc(data);
      passages.forEach((p) => {
        docs.push(p);
      });
    } catch (e) {
      console.warn(`[RAG] Failed to load ${slug}:`, e);
    }
  }

  termDocFreq = buildInvertedIndex(docs);
  const totalLen = docs.reduce((sum, d) => sum + tokenize(d.text).length, 0);
  avgDocLen = docs.length > 0 ? totalLen / docs.length : 1;

  const idf = computeIDF(termDocFreq, docs.length);
  corpusCache = { docs, idf };
  return corpusCache;
}

export async function retrieve(query, topK = 5) {
  const { docs, idf } = await loadCorpus();
  const queryTerms = tokenize(query);

  if (queryTerms.length === 0) return [];

  const scored = docs.map((doc) => ({
    ...doc,
    score: scoreBM25(doc, queryTerms, idf, avgDocLen),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).filter((d) => d.score > 0);
}

export async function getCorpusStats() {
  const { docs, idf } = await loadCorpus();
  return {
    totalDocs: docs.length,
    uniqueTerms: idf.size,
    avgDocLen: Math.round(avgDocLen),
  };
}

export const RAG_SERVICE = {
  retrieve,
  getCorpusStats,
};