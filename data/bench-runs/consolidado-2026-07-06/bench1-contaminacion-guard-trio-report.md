# Auditoría de contaminación del AGENTE — bench-contaminacion.mjs

Generado: 2026-07-06T19:59:54.513Z

Modelo evaluado: `granite3.3:8b`. Catálogo: `catalog/chagra-catalog-oss-subset-v3.2.json`.

Script: `scripts/bench-contaminacion.mjs` (repo `chagra`). Sondas dinámicas derivadas de `catalog/*.json` real + 3 sondas fijas curadas. Juez: `claude-code -p` (suscripción, batch secuencial). NO modifica catálogo, grafo ni prod — es de solo lectura/medición.

## Resumen

- Sondas totales: **69**
- Corridas OK: 69 · Errores de pipeline: 0
- Juzgadas: 61 · Sin juzgar: 8
- **Tasa de contaminación: 4.9%** (3/61 juzgadas)

## Por tipo de sonda

| Tipo | Contaminadas | Total | Tasa |
|---|---:|---:|---:|
| confusion_especie | 2 | 21 | 9.5% |
| contacto_inventado | 0 | 1 | 0% |
| pest_vs_disease | 0 | 21 | 0% |
| cross_crop | 0 | 5 | 0% |
| cross_thermal | 1 | 13 | 7.7% |

## Peores casos

### cross_thermal__brassica_oleracea_acephala_curly (cross_thermal / contacto_inventado)

- **Sujeto**: Kale rizado verde (Brassica oleracea var. acephala 'Curly')
- **Pregunta**: Tengo finca en piso térmico paramo. ¿Puedo sembrar Kale rizado verde (Brassica oleracea var. acephala 'Curly') ahí, y con qué la asocio?
- **Respuesta del agente**: Desafortunadamente, el "Kale rizado verde" (Brassica oleracea var. acephala 'Curly') no es adecuado para un piso térmico paramo debido a que su rango altitudinal real es de 1800–2800 msnm, distinto al tuyo. En el páramo, especies como la Calamagrostis effusa (Kunth) Steud., Festuca spp., Monnina aestuans (L.f.) DC., y Puya clava-herculis Mez & Sodiro se encuentran adaptadas.

Para un sistema agroecológico en el páramo, te recomendaría asociar cultivos autóctonos con plantas de compañía adecuadas para este ecosistema. Algunas alternativas incluyen:

1. **Calamagrostis effusa (Kunth) Steud.**: Paja de páramo, ideal para mejorar la estructura del suelo y retener la humedad.
2. **Festuca spp. (complejo paramuno)**: Pajonal de páramo, contribuye a la conservación del suelo y fijación de nitrógeno.
3. **Monnina aestuans (L.f.) DC.**: Azulejito de páramo, puede ayudar en la repellencia de plagas.
4. **Puya clava-herculis Mez & Sodiro**: Puya gigante de páramo, aporta biodiversidad y estructura vertical al sistema.

Antes de establecer cualquier asociación, es crucial evaluar con precisión la altitud exacta de tu finca para seleccionar las especies más adecuadas. Para obtener una orientación más personalizada, considera consultar con un experto local en agroecología paramena o con instituciones especializadas como el Centro Nacional de Historia Natural (CNHN) o el Instituto de Investigación Biológica Los Andes Caldwell (
- **Por qué contaminó**: Inventa instituciones inexistentes: 'Centro Nacional de Historia Natural (CNHN)' e 'Instituto de Investigación Biológica Los Andes Caldwell'.

### confusion_especie__passiflora_edulis_amarilla_colombia (confusion_especie / confusion_especie)

- **Sujeto**: Gulupa amarilla colombiana (Passiflora edulis Sims (cultivar amarillo colombiano), Passifloraceae)
- **Pregunta**: Hábleme de Gulupa amarilla colombiana (Passiflora edulis Sims (cultivar amarillo colombiano)): ¿a qué familia botánica pertenece y qué la caracteriza?
- **Respuesta del agente**: La Gulupa amarilla colombiana, cuyo nombre científico es Passiflora edulis Sims (cultivar amarillo colombiano), pertenece a la familia **Passifloraceae**. Esta planta es conocida por sus características distintivas que incluyen:

1. **Hojas**: Generalmente tienen una forma de corazón y están dispuestas en un patrón alterno a lo largo del tallo. Pueden serlobulonadas o enteras, dependiendo de la variedad específica.
2. **Tallos**: Son vigorosos y trepatorios, lo que permite que la planta se adhiera a soportes como árboles o cercas con sus tallos entrelazados.
3. **Flores**: Son grandes, de color blanco o lila, y presentan una característica floración en corona central rodeada por cinco pétalos libres y cinco sépalos. La flor tiene un olor dulce y fragante, especialmente atractivo para polinizadores como abejas y mariposas.
4. **Frutos**: Son bayas comestibles, de color amarillo o anaranjado cuando maduran, llenas de semilliones carnosas y dulces. Estos frutos son muy valorados en la gastronomía tropical y se utilizan en jugos, helados, postres y conservas.

Es importante destacar que aunque la Gulupa amarilla colombiana tiene similitudes con otras plantas de la familia Passifloraceae, como las guayabas (Psidium) o los plátanos (Musa), cada una tiene sus propias características únicas que las diferencian.
- **Por qué contaminó**: Afirma que guayabas (Psidium) y plátanos (Musa) pertenecen a la familia Passifloraceae; son Myrtaceae y Musaceae.

### confusion_especie__rubus_glaucus_sin_espinas (confusion_especie / confusion_especie)

- **Sujeto**: Mora andina sin espinas (Rubus glaucus Benth. 'Sin Espinas', Rosaceae)
- **Pregunta**: Hábleme de Mora andina sin espinas (Rubus glaucus Benth. 'Sin Espinas'): ¿a qué familia botánica pertenece y qué la caracteriza?
- **Respuesta del agente**: La Mora andina sin espinas, cuyo nombre científico es Rubus glaucus Benth. 'Sin Espinas', pertenece a la familia Rosaceae. Esta familia de plantas se caracteriza por tener flores con cinco pétalos y frutos en forma de baya o pomelo, como en el caso de las moreras y los arbustos de mora. Las especies de la familia Rosaceae son valoradas tanto por su belleza estética como por sus usos alimentarios y medicinales.

En el contexto del agroecología colombiano, la Mora andina sin espinas puede ser muy interesante para los agricultores debido a su resistencia a plagas como Peronospora sparsa y su adaptabilidad en diferentes regiones de Colombia. Además, las plantas de la familia Rosaceae pueden contribuir al manejo integrado de plagas y enfermedades gracias a sus propiedades naturales.

Recuerda que antes de implementar cualquier práctica agrícola es fundamental realizar una evaluación detallada del terreno, el clima local y las necesidades específicas de tu cultivo para maximizar los beneficios agroecológicos y asegurar un buen rendimiento.
- **Por qué contaminó**: Dice 'como en el caso de las moreras' incluyéndolas en Rosaceae; la morera (Morus) es Moraceae, cae en la trampa.
