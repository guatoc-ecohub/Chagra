# Adopta un Frailejón 🌿

Demo interactivo educativo sobre frailejones (Espeletia) del páramo de Guatoc.

## 🎯 Objetivo

Este demo permite a los usuarios adoptar virtualmente un frailejón y aprender sobre:
- El ritmo de crecimiento de los frailejones (1 cm/año)
- Su papel en el ecosistema del páramo
- Las condiciones ambientales que necesitan
- Su largo ciclo de vida (hasta 200 años)

## 🌿 Especies incluidas

1. **Espeletia grandiflora** (Frailejón Mayor)
   - Hasta 2 metros de altura
   - Hasta 200 años de vida
   - Familia: Asteraceae

2. **Espeletia argentea** (Frailejón Plateado)
   - Hasta 1.5 metros de altura
   - Hasta 150 años de vida
   - Hojas plateadas con pelos lanosos

## 🧬 Crecimiento

Los frailejones crecen aproximadamente **1 cm por año**, una adaptación a las condiciones extremas del páramo:
- Alta radiación UV
- Temperaturas variables
- Suelos ácidos (pH 4.5-5.5)
- Alta humedad (90% óptimo)

## 🗂️ Estructura de archivos

```
demos/adopta-frailejon/
├── index.html           # Página principal (HTML + CSS embebido)
├── frailejon.js         # Lógica del demo (JavaScript vanilla)
├── frailejon.test.js    # Tests vitest
└── README.md           # Este archivo
```

## 🧪 Tests

Para correr los tests:

```bash
npx vitest run frailejon.test.js
```

Los tests cubren:
- Cálculo de edad y altura (1 cm/año)
- Validación de datos de especies
- Generación de timeline
- Persistencia en localStorage
- Render de elementos HTML

## 🚀 Uso

1. Abrir `index.html` en un navegador
2. Seleccionar una especie de frailejón
3. Darle un nombre
4. Ver el timeline de crecimiento

## 💾 Persistencia

El demo usa `localStorage` para guardar:
- Especie seleccionada
- Nombre del frailejón
- Fecha de adopción

No requiere backend ni base de datos externa.

## 📚 Referencias

- Catálogo de especies de Chagra: `catalog/chagra-catalog-oss-subset-v3.2.json`
- Datos de restauración: `src/data/restauracion-especies.json`
- Crecimiento: 1 cm/año (dato científico validado por Humboldt Institute)

## 🎨 Paleta de colores

- Verde dominante: `#7ec8a3`, `#a8e6cf`, `#88d8b0`
- Amarillo acento: `#fef9c3`, `#fef08a`, `#f59e0b`
- NO usar: eucalipto, pino patula, retamo espinoso, acacia

## 🌱 Cita científica

> "Los frailejones (Espeletia spp.) crecen aproximadamente 1 cm por año. 
> Este ritmo lento es una adaptación a las condiciones extremas del páramo andino."
> 
> — Referencias: Díazgranados (2015), Rojas-Zamora et al. (2013), Humboldt Institute

## 📝 Licencia

CC-BY-NC-SA 4.0 (igual que el catálogo de Chagra)
