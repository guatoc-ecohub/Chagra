export const demoTerritorioGeojson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'zona-alta',
      properties: { zonaId: 'zona-alta', nombre: 'Zona Alta' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-75.004, 4.998],
          [-74.998, 4.998],
          [-74.998, 5.002],
          [-75.004, 5.002],
          [-75.004, 4.998],
        ]],
      },
    },
    {
      type: 'Feature',
      id: 'zona-media',
      properties: { zonaId: 'zona-media', nombre: 'Zona Media' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-75.004, 4.994],
          [-74.998, 4.994],
          [-74.998, 4.998],
          [-75.004, 4.998],
          [-75.004, 4.994],
        ]],
      },
    },
    {
      type: 'Feature',
      id: 'zona-baja',
      properties: { zonaId: 'zona-baja', nombre: 'Zona Baja' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-75.01, 4.99],
          [-75.005, 4.99],
          [-75.005, 4.994],
          [-75.01, 4.994],
          [-75.01, 4.99],
        ]],
      },
    },
  ],
};

export const demoReferencias = [
  { id: 'ref-a', nombre: 'Punto Norte', lat: 5.001, lng: -75.0005 },
  { id: 'ref-b', nombre: 'Punto Centro', lat: 4.9965, lng: -75.0015 },
  { id: 'ref-c', nombre: 'Punto Sur', lat: 4.9915, lng: -75.0065 },
];

export const demoPunto = {
  lat: 4.9967,
  lng: -75.0018,
};

export const demoPuntoFuera = {
  lat: 5.01,
  lng: -75.02,
};
