# Robo-report: img2threejs

Fecha: 2026-08-24  
Origen revisado: [img2threejs/img2threejs](https://github.com/img2threejs/img2threejs)  
Snapshot auditado: `d37b6de4920621b0091a351042b9bb89e9708b33`

## Hallazgo

El repositorio no era un cascarón vacío. Tiene código Python ejecutable en
`forge/`, integraciones opcionales con Three.js y un contrato de reconstrucción
procedural guiado por etapas. El núcleo útil insiste en tres límites correctos:

- una imagen única no revela una malla completa ni sus lados ocultos;
- la forma debe construirse como geometría explícita, con presupuesto y revisión;
- las texturas y la geometría tienen que degradar con honestidad cuando la
  evidencia visual no alcanza.

La ruta principal del clon está orientada a props, personajes y reconstrucción
de referencia. No es un pipeline directo para el catálogo botánico de Chagra,
y su integración TRELLIS/GLB requiere servicios y artefactos que no pertenecen
al PWA offline-first.

## Qué se integra

Se reimplementó el patrón mínimo que sí encaja: `relieveImagen.js` convierte
los píxeles RGBA de una imagen en un heightfield Three.js de bajo costo, con UV,
normal y parámetros de resolución, profundidad, contraste, inversión y alpha.
`ImagenRelieve3D.jsx` lo usa de forma opcional debajo del modelo didáctico de
`SpeciesAtlas`. La foto se mantiene como textura y aporta un relieve visual,
no una afirmación de anatomía ni un Asset nuevo.

La lectura ocurre en memoria desde un canvas del navegador. Si una foto remota
no permite CORS, la portada sigue funcionando y la escena conserva su modelo
procedural sin relief. No se persiste geometría, imagen derivada ni estado de
UI en IndexedDB, Assets o Logs.

## Qué se descarta

- TRELLIS, generación ML remota y GLB: rompen el presupuesto/offline del
  catálogo y no son necesarios para una lámina educativa.
- El generador de personajes/props y sus gates especializados: no modelan una
  especie desde datos grounded ni resuelven las partes ocultas de una foto.
- Copiar código, textos, modelos, imágenes o shaders del clon. El repo fuente
  declara Apache-2.0, pero la implementación de Chagra es propia y solo toma
  el patrón conceptual.

## Veredicto

**Sí amerita integración acotada, 7/10 como patrón técnico.** El heightfield
es útil como capa visual contextual del atlas, tiene costo bajo y puede
reutilizarse después en una parcela del valle si aparece una fuente de imagen
con CORS y semántica de terreno. No se debe vender como image-to-3D completo:
una foto no aporta profundidad métrica ni una reconstrucción fiable de una
planta.

Archivos integrados:

- `src/visual/mundo3d/kit/relieveImagen.js`
- `src/components/DirectorioEspecies/ImagenRelieve3D.jsx`
- `src/components/DirectorioEspecies/SpeciesAtlas.jsx`
- `src/components/DirectorioEspecies/SpeciesFicha.jsx`
- `src/visual/mundo3d/kit/__tests__/relieveImagen.test.js`
