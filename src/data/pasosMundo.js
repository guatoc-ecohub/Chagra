export const PASOS_MUNDO = {
  suelo: {
    titulo: 'El suelo vivo',
    pasos: [
      'Mire el corte como una ventana. Aqui ve la hojarasca, la raiz y el subsuelo.',
      'Toque cada capa para entender que cambia debajo de sus botas.',
      'Siga la vida pequena: lombrices, raices y hongos son la fabrica del suelo.',
      'Abra el cuaderno del suelo si quiere pasar de mirar a corregir y alimentar.',
    ],
  },
  agua: {
    titulo: 'El agua',
    pasos: [
      'Siga la quebrada desde el nacimiento hasta la huerta.',
      'Toque cada hito para ver donde proteger, usar o cuidar el agua.',
      'Lea el recorrido como una ruta de gravedad, no como un dibujo bonito.',
      'Si entra en la toma o en la huerta, vera como el agua se reparte con medida.',
    ],
  },
  animales: {
    titulo: 'Los animales',
    pasos: [
      'Recorra el corral como un sistema vivo, no como una vitrina de especies.',
      'Toque un grupo para ver el hato y sus relaciones con el abono.',
      'Siga el ciclo cerrado: animal, estiércol, compost, suelo, planta y vuelta al animal.',
      'Si una cria nace o un animal se vende, el corral lo muestra como parte de la historia.',
    ],
  },
  disenio: {
    titulo: 'Diseno de la finca',
    pasos: [
      'Suba por los estratos y lea la finca por alturas y capas.',
      'Toque un nivel para ver que crece mejor ahi y por que.',
      'Mire el monte, las vecinas y la restauracion como piezas del mismo arreglo.',
      'Use este mundo para pensar la finca antes de sembrar o reordenar.',
    ],
  },
  valle: {
    titulo: 'El valle',
    pasos: [
      'Este es el mapa grande de la finca. Desde aqui entra a cada mundo.',
      'Toque una loma, una quebrada o un punto del paisaje para abrir su ruta.',
      'Use el valle para ubicarse antes de perderse en las pantallas.',
      'Si ya conoce el camino, vuelva cuando quiera y entre directo por la puerta que le sirve.',
    ],
  },
  abono: {
    titulo: 'Estiercol y compost',
    pasos: [
      'Aqui ve como el residuo se vuelve alimento para el suelo.',
      'Toque la pila para seguir el paso a paso del compost.',
      'Entre al estiercol para entender gas, olor y manejo limpio.',
      'La idea es simple: sacar provecho sin ensuciar el lote ni el agua.',
    ],
  },
  cafe: {
    titulo: 'El cafe',
    pasos: [
      'Este mundo le muestra el cafetal bajo sombra, no un potrero de sol.',
      'Toque el grano, la sombra, la roya o el beneficio para revisar cada parte.',
      'Siga el paso del cafe desde cereza hasta pergamino y oro.',
      'La tarjeta le orienta; adentro sigue la leccion del cafetal.',
    ],
  },
  mercado: {
    titulo: 'Mercado y despensa',
    pasos: [
      'Recorra la plaza campesina como un camino del campo a la mesa.',
      'Toque un puesto para ver venta, procedencia y precio justo.',
      'Mire los canastos y la balanza como parte de la misma historia.',
      'Use este mundo para vender mejor, comprar con criterio y sacar cuentas.',
    ],
  },
  sanidad: {
    titulo: 'Sanidad de la mata',
    pasos: [
      'Este mundo le ayuda a reconocer plagas sin veneno y con criterio.',
      'Toque una trampa, un defensor o una mata para abrir la ruta correcta.',
      'Use el sintoma como entrada, no como sentencia.',
      'La leccion es vigilar, actuar y cuidar aliados, no disparar recetas al azar.',
    ],
  },
  clima: {
    titulo: 'El clima',
    pasos: [
      'Mire la bóveda del cielo como la capa que manda sobre la finca.',
      'Toque la hora, la temporada o el piso termico para entender el contexto.',
      'El cielo no solo cambia la luz: tambien ordena lluvia, niebla y siembra.',
      'Use esta pantalla para leer el tiempo de hoy y la tendencia de la montana.',
    ],
  },
  milpa: {
    titulo: 'La milpa',
    pasos: [
      'Aqui las tres hermanas trabajan juntas: maiz, frijol y calabaza.',
      'Toque arriba para ver la asociacion y abajo para mirar lo que pasa en la raiz.',
      'Siga los nodulos del frijol: ahi se ve como tambien alimenta al sistema.',
      'La milpa enseña policultivo, no monotonia.',
    ],
  },
  pisos: {
    titulo: 'Pisos termicos',
    pasos: [
      'Suba la ladera y vea como la altura cambia lo que se puede sembrar.',
      'Toque cada piso para leer su rango, su cultivo y su logica.',
      'El páramo arriba se cuida, no se arara.',
      'Este mundo le sirve para decidir antes de llevar la semilla al lote.',
    ],
  },
  semillero: {
    titulo: 'El semillero',
    pasos: [
      'Aqui la planta arranca su vida antes de salir al campo.',
      'Toque la bandeja, la bolsa o el tunel para ver germinar, repicar y endurecer.',
      'Siga el camino de la semilla propia y de la semilla comprada.',
      'La idea es sacar una matica fuerte, lista para aguantar el lote.',
    ],
  },
};

export const PASOS_MUNDO_IDS = Object.keys(PASOS_MUNDO);

export const tienePasosMundo = (id) => Boolean(PASOS_MUNDO[id]?.pasos?.length);
