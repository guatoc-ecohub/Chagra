// ── pilotos.js — elenco, poderes e ítems canónicos de Chagra Kart ──────────
// Datos puros para que la UI, la física y los efectos consuman IDs estables.

export const PILOTOS = [
  {
    id: 'angelita',
    nombre: 'Angelita',
    especie: 'abeja sin aguijon',
    cientifico: 'Tetragonisca angustula',
    desbloqueado: true,
    costoSemillas: 0,
    poder: 'Remolino de alas',
    resumen: 'Succiona y gira a los rivales cercanos.',
    color: 0xf5cf54,
    estilo: 'angelita',
  },
  {
    id: 'jaguar',
    nombre: 'El Jaguar',
    especie: 'felino tope',
    cientifico: 'Panthera onca',
    desbloqueado: true,
    costoSemillas: 0,
    poder: 'Paisaje del miedo',
    resumen: 'Los rivales frenan solos y pierden agarre.',
    color: 0x4d3724,
    estilo: 'jaguar',
  },
  {
    id: 'oso',
    nombre: 'El Oso',
    especie: 'oso',
    cientifico: '',
    desbloqueado: true,
    costoSemillas: 0,
    poder: 'Poder pendiente',
    resumen: 'Piloto compai aprobado en lámina 2.5D.',
    color: 0x34322d,
    estilo: 'oso',
  },
  {
    id: 'zariguya',
    nombre: 'La Zarigüeya',
    especie: 'zarigüeya',
    cientifico: '',
    desbloqueado: true,
    costoSemillas: 0,
    poder: 'Poder pendiente',
    resumen: 'Piloto compai aprobado en lámina 2.5D.',
    color: 0x3b302b,
    estilo: 'zariguya',
  },
  {
    id: 'dante',
    nombre: 'Dante',
    especie: 'beagle',
    cientifico: '',
    desbloqueado: true,
    costoSemillas: 0,
    poder: 'Las babas',
    resumen: 'Deja un hilo largo que hace patinar.',
    color: 0xcaa064,
    estilo: 'dante',
  },
  {
    id: 'oliver',
    nombre: 'Oliver',
    especie: 'dalmata',
    cientifico: '',
    desbloqueado: true,
    costoSemillas: 0,
    poder: 'La locura',
    resumen: 'Desordena a todos y provoca choques.',
    color: 0xeae7de,
    estilo: 'oliver',
  },
  {
    id: 'luciernaga',
    nombre: 'La Luciernaga',
    especie: 'luciernaga',
    cientifico: '',
    desbloqueado: true,
    costoSemillas: 0,
    poder: 'La luz fria',
    resumen: 'Piloto compai aprobado en lamina 2.5D.',
    color: 0x4a4033,
    estilo: 'luciernaga',
  },
  {
    id: 'chivito-punk',
    nombre: 'El Chivito Punk',
    especie: 'chivito',
    cientifico: '',
    desbloqueado: true,
    costoSemillas: 0,
    poder: 'El chispazo',
    resumen: 'Piloto compai aprobado en lamina 2.5D. Version punk del chivito.',
    color: 0x3a352e,
    estilo: 'chivito-punk',
  },
  {
    id: 'chivito',
    nombre: 'El Chivito',
    especie: 'chivito',
    cientifico: '',
    desbloqueado: true,
    costoSemillas: 0,
    poder: 'Poder pendiente',
    resumen: 'Piloto compai aprobado en lamina 2.5D.',
    color: 0x4a4438,
    estilo: 'chivito',
  },
  {
    id: 'guacamaya',
    nombre: 'La Guacamaya',
    especie: 'guacamaya bandera',
    cientifico: 'Ara macao',
    desbloqueado: true,
    costoSemillas: 0,
    poder: 'Poder pendiente',
    resumen: 'Piloto compai aprobado en lamina 2.5D.',
    color: 0xd6422f,
    estilo: 'guacamaya',
  },
];

export const ITEMS = [
  {
    id: 'biol',
    nombre: 'Biol',
    efecto: 'turbo',
    color: 0x65b85d,
    duracion: 1.6,
  },
  {
    id: 'ceniza',
    nombre: 'Ceniza',
    efecto: 'humo',
    color: 0x8a8a82,
    duracion: 1.5,
  },
  {
    id: 'melaza',
    nombre: 'Melaza',
    efecto: 'pegajoso',
    color: 0xcd8f44,
    duracion: 2.0,
  },
  {
    id: 'ortiga',
    nombre: 'Ortiga',
    efecto: 'pica',
    color: 0x7ec95e,
    duracion: 1.6,
  },
  {
    id: 'trampa-azul',
    nombre: 'Trampa azul',
    efecto: 'pega',
    color: 0x5f8fd9,
    duracion: 2.0,
  },
  {
    id: 'caldo-bordeles',
    nombre: 'Caldo bordeles',
    efecto: 'encandila',
    color: 0x7fc4d9,
    duracion: 1.7,
  },
  {
    id: 'semilla-nativa',
    nombre: 'Semillas nativas',
    efecto: 'moneda',
    color: 0xe7d46a,
    duracion: 0,
  },
];

export const PILOTO_POR_ID = Object.fromEntries(PILOTOS.map((p) => [p.id, p]));
export const ITEM_POR_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

export const PILOTOS_CASA = [
  'angelita', 'jaguar', 'oso', 'zariguya', 'dante', 'oliver',
  'luciernaga', 'chivito-punk', 'chivito', 'guacamaya',
];

export const PILOTO_POR_COMPAI = Object.freeze({
  angelita: 'angelita',
  jaguar: 'jaguar',
  dante: 'dante',
  chivito: 'chivito',
  oso: 'oso',
  zariguya: 'zariguya',
  luciernaga: 'luciernaga',
  oliver: 'oliver',
  guacamaya: 'guacamaya',
});

export function pilotoDesdeCompai(compaiId) {
  const pilotoId = PILOTO_POR_COMPAI[String(compaiId || '').trim()];
  return pilotoId && PILOTO_POR_ID[pilotoId] ? pilotoId : null;
}

export function pilotoDesbloqueado(pilotoId, semillas = 0) {
  const p = PILOTO_POR_ID[pilotoId];
  if (!p) return false;
  return p.desbloqueado || semillas >= p.costoSemillas;
}

export function semillasParaPiloto(pilotoId) {
  return PILOTO_POR_ID[pilotoId]?.costoSemillas ?? 0;
}

export function pilotosDisponibles(semillas = 0) {
  return PILOTOS.map((p) => ({
    ...p,
    desbloqueado: pilotoDesbloqueado(p.id, semillas),
  }));
}
