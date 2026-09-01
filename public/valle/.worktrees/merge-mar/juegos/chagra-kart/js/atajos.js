// ── atajos.js ── rutas de riesgo de Chagra Kart ─────────────────────────────
// Datos puros. Cada atajo se abre desde una línea lateral y deposita el kart
// más adelante en el mismo circuito, con una recompensa breve de velocidad.

const ATAJOS_DEFAULT = [
  {
    id: 'paramo-canal',
    nombre: 'Canal del frailejón',
    entrada: 0.112,
    salida: 0.158,
    lado: -1,
    ancho: 1.7,
    color: 0xf5cf54,
    pista: 'Cruza por la zanja dorada y salta la curva larga.',
  },
  {
    id: 'bosque-raiz',
    nombre: 'Raíz del bosque',
    entrada: 0.452,
    salida: 0.514,
    lado: 1,
    ancho: 1.8,
    color: 0x8fd36b,
    pista: 'Esquiva la raíz y corta por el claro de musgo.',
  },
];

const ATAJOS_CHORRERA = [
  {
    id: 'chorrera-piedras',
    nombre: 'Piedras de la caída',
    entrada: 0.224,
    salida: 0.249,
    lado: 1,
    ancho: 1.65,
    color: 0x72d7ff,
    pista: 'Salta las piedras mojadas entre dos golpes de agua.',
  },
  {
    id: 'chorrera-mirador',
    nombre: 'Mirador de la espuma',
    entrada: 0.274,
    salida: 0.307,
    lado: -1,
    ancho: 1.7,
    color: 0xffb84d,
    pista: 'Pasa por el mirador y cae de frente a la repisa.',
  },
];

export function mundoKartDesdeUrl(search = '') {
  const params = new URLSearchParams(search || (typeof location !== 'undefined' ? location.search : ''));
  const mundo = params.get('mundo');
  if (mundo === 'mar') return 'mar';
  return (params.get('vista') || mundo) === 'chorrera' ? 'chorrera' : 'default';
}

export function atajosDelMundo(mundo = 'default') {
  return (mundo === 'chorrera' ? ATAJOS_CHORRERA : ATAJOS_DEFAULT).map((atajo) => ({ ...atajo }));
}

export function nombreMundoKart(mundo = 'default') {
  if (mundo === 'mar') return 'Mar de la Chagra';
  return mundo === 'chorrera' ? 'La Chorrera' : 'Descenso del páramo';
}
