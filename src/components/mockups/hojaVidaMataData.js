export const MATA_MUESTRA = {
  nombre: 'Tomate #7',
  variedad: 'Tomate chonto',
  ubicacion: 'era 3 · huerta de la casa',
  sembrada: '08 de marzo, 2026',
  etapaActual: 'cosecha',
};

export const ETAPAS_MATA = [
  {
    id: 'semilla',
    orden: 1,
    nombre: 'Semilla',
    dia: 0,
    lectura:
      'La semilla en la tierra. Arriba no se ve nada: está echando raíz. Aquí toca esperar y mantener el semillero húmedo, sin encharcarlo.',
  },
  {
    id: 'plantula',
    orden: 2,
    nombre: 'Plántula',
    dia: 12,
    lectura:
      'Rompió el suelo. Esos dos gajitos de abajo (los cotiledones) no son hoja de verdad; la hoja verdadera es la del centro. Está tiernita: cuídela del sol fuerte y del frío.',
  },
  {
    id: 'juvenil',
    orden: 3,
    nombre: 'Juvenil',
    dia: 28,
    lectura:
      'Ya es una matica. Echa hojas y sube derecha. Es buen momento para pasarla al surco, con la tierra suelta y bien abonada.',
  },
  {
    id: 'adulto',
    orden: 4,
    nombre: 'Adulta',
    dia: 45,
    lectura:
      'La mata se hizo. Pide tutor para no irse al suelo con el peso. Tallo grueso y hojas grandes: está lista para florecer.',
  },
  {
    id: 'floracion',
    orden: 5,
    nombre: 'Floración',
    dia: 57,
    lectura:
      'Salieron las flores amarillas en racimo. De cada flor, si cuaja, sale un tomate. No le falte agua pareja en esta etapa o bota la flor.',
  },
  {
    id: 'cosecha',
    orden: 6,
    nombre: 'Cosecha',
    dia: 110,
    lectura:
      'Los racimos cargados. Se recoge el tomate cuando empieza a pintar y termina de madurar en la mata. Vaya cosechando parejo para que siga cargando.',
  },
];
