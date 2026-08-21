// ── vehiculos.js — tabla de parámetros por vehículo (chiva incluida) ────────
// Puro (sin THREE, sin DOM): testeable en node. La física lee SOLO de aquí.
// Tuning arcade estilo Mario Kart: la chiva es el equilibrio (velocidad justa,
// agarre medio, derrape útil). Los demás son extremos para que la selección
// importe.

export const VEHICULOS = [
  {
    id: 'chiva',
    nombre: 'Chiva del Sumapaz',
    eslogan: 'La que sube y baja el páramo sin quejarse.',
    color: 0xc0392b,       // rojo clásico de chiva bogotana
    color2: 0xf2e2b0,      // madera/crema
    velMax: 26.5,          // m/s ≈ 95 km/h
    acel: 10.5,            // m/s²
    freno: 20,             // desaceleración de freno (m/s²)
    reversa: 6.5,          // vel máxima en reversa
    agarre: 0.95,          // tracción en asfalto (1 = referencia)
    giroMax: 1.5,          // yaw rate máx (rad/s)
    derrape: 1.0,          // velocidad de carga de mini-turbo
    tamano: 1.0,           // escala del modelo
    masa: 1.0,             // pesadez (roll, suspensiones)
    piloto: 'angelita',
  },
  {
    id: 'moto',
    nombre: 'Moto 250 campesina',
    eslogan: 'Ligera, rápida… y derrapa como si no hubiera mañana.',
    color: 0xe67e22,
    color2: 0x2c2c2c,
    velMax: 32,
    acel: 13.5,
    freno: 17,
    reversa: 6,
    agarre: 0.82,
    giroMax: 1.9,
    derrape: 1.4,
    tamano: 0.8,
    masa: 0.7,
    piloto: 'angelita',
  },
  {
    id: 'pickup',
    nombre: 'El Escarabajo Rojo',
    eslogan: 'Cuadrado, noble y con llantas de verdad.',
    color: 0xc62828,
    color2: 0xe3d6c3,
    velMax: 22.8,
    acel: 9.1,
    freno: 18.5,
    reversa: 6.2,
    agarre: 1.26,
    giroMax: 1.28,
    derrape: 0.72,
    tamano: 0.98,
    masa: 1.18,
    piloto: 'angelita',
  },
  {
    id: 'volqueta',
    nombre: 'Camión de campo',
    eslogan: 'Viejo, alto y terco. Cuando agarra, no lo movés.',
    color: 0x8f6a3a,
    color2: 0xc9b48a,
    velMax: 23.2,
    acel: 8.6,
    freno: 20.5,
    reversa: 6.8,
    agarre: 1.14,
    giroMax: 1.18,
    derrape: 0.52,
    tamano: 1.08,
    masa: 1.42,
    piloto: 'angelita',
  },
  {
    id: 'suv',
    nombre: 'El Lobo Gris',
    eslogan: 'Silencioso, suave y listo para arrancar al toque.',
    color: 0xb8bcc2,
    color2: 0xe4e7eb,
    color3: 0x7f8792,
    velMax: 27.8,
    acel: 15.4,
    freno: 20,
    reversa: 6.8,
    agarre: 1.08,
    giroMax: 1.55,
    derrape: 0.78,
    tamano: 0.94,
    masa: 0.94,
    piloto: 'angelita',
  },
  {
    id: 'coupe',
    nombre: 'El Blanco',
    eslogan: 'Rápido en asfalto, nervioso en tierra.',
    color: 0xf5f4f2,
    color2: 0xcfd3d9,
    color3: 0x5c6470,
    velMax: 29.6,
    acel: 12.2,
    freno: 21,
    reversa: 6.4,
    agarre: 0.84,
    giroMax: 1.72,
    derrape: 1.28,
    tamano: 0.9,
    masa: 0.9,
    piloto: 'angelita',
  },
  {
    id: 'carretilla',
    nombre: 'La Carretilla',
    eslogan: 'Lenta, ligera y filuda para doblar.',
    color: 0x9b6a3d,
    color2: 0x6b4c32,
    color3: 0xd1a86b,
    velMax: 15.6,
    acel: 7.4,
    freno: 16,
    reversa: 5.2,
    agarre: 1.36,
    giroMax: 2.1,
    derrape: 0.9,
    tamano: 0.82,
    masa: 0.55,
    piloto: 'angelita',
  },
  {
    id: 'skate',
    nombre: 'La Patineta electrica',
    eslogan: 'Tabla pegada al suelo. Sale disparada y se queda.',
    color: 0x2a2f33,
    color2: 0xb9bec3,
    color3: 0x636b72,
    velMax: 21.8,
    acel: 22.2,
    freno: 24.5,
    reversa: 3.8,
    agarre: 1.48,
    giroMax: 2.45,
    derrape: 1.55,
    tamano: 0.74,
    masa: 0.3,
    piloto: 'angelita',
  },
];

// Pendientes para la pasada 3: dejar la estructura armada sin inventar arte.
// {
//   id: 'pendiente-1',
//   nombre: 'Pendiente 1',
//   eslogan: 'Reservado para la pasada 3.',
// },
// {
//   id: 'pendiente-2',
//   nombre: 'Pendiente 2',
//   eslogan: 'Reservado para la pasada 3.',
// },

export const VEHICULO_IDS = VEHICULOS.map((v) => v.id);

// ── mini-turbo por niveles (azul → naranja → morado) ────────────────────────
// `carga` es una acumulación de 0..1 a ~0.5/s con derrape=1. Umbrales para
// curvas cortas (la pista no tiene los ess largos de Mario Kart): un derrape
// de ~0.4 s da azul, ~0.9 s naranja, ~1.5 s morado.
export const TURBO_NIVELES = [
  { umbral: 0.18, dur: 1.0, velMul: 1.18, acelMul: 2.2, color: 0x8fc8ff, nombre: 'TURBO AZUL' },
  { umbral: 0.45, dur: 1.35, velMul: 1.28, acelMul: 2.6, color: 0xffa63d, nombre: 'TURBO NARANJA' },
  { umbral: 0.75, dur: 1.6, velMul: 1.42, acelMul: 3.0, color: 0xc56bff, nombre: 'TURBO MORADO' },
];

export function nivelTurboDeCarga(carga) {
  let nivel = 0;
  for (let i = 0; i < TURBO_NIVELES.length; i++) if (carga >= TURBO_NIVELES[i].umbral) nivel = i;
  return nivel; // 0 = aún no alcanza nivel 1
}
