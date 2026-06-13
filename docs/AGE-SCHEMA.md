# Esquema AGE completo de Chagra

## Núcleo agroecológico (existente)

```
(:Species)-[:ES_HOSPEDERA_DE]->(:Pest)
(:Pest)-[:CONTROLADA_POR]->(:Biopreparado)
(:Species)-[:TIENE_COMPANERA]->(:Species)
```

## Suelo (DR-SUELOS-1)

```
(:Suelo {tipo, textura, ph_rango})
(:IndicadorSuelo {nombre, que_mide, confiabilidad})
(:Enmienda {nombre, problema_que_corrige, dosis, precaucion})
(:IndicadorSuelo)-[:DIAGNOSTICA]->(:ProblemaSuelo)-[:LIMITA]->(:Species)
(:Enmienda)-[:CORRIGE]->(:ProblemaSuelo)
```

## Agua (DR-AGUA-1)

```
(:FuenteAgua {tipo, calidad})
(:SistemaCaptacion {tipo, ce, costo})
(:SistemaCaptacion)-[:ALIMENTA]->(:FuenteAgua)
(:Species)-[:REQUIERE_AGUA]->(:FuenteAgua)
```

## Animal (DR-ANIMAL-1)

```
(:Animal {especie, raza, funcion_productiva, piso_termico})
(:Species)-[:ES_FORRAJE_DE {max_inclusion_pct, guarda}]->(:Animal)
```

## Restauración (DR-RESTAURACION-1)

```
(:Species)-[:CUMPLE_ROL {rol:pionera|intermedia|climax}]->(:RolSucesion)
(:ArregloRestauracion)-[:PROVEE]->(:ServicioEcosistemico)
```

## IoT (DR-IOT-1)

```
(:Sensor)-[:MIDE_EN]->(:Zona)
(:Lectura)-[:GENERADA_POR]->(:Sensor)
(:Lectura)-[:DISPARA]->(:Alerta)
(:Camara)-[:CAPTURO]->(:DiagnosticoImagen)
(:DiagnosticoImagen)-[:SOBRE]->(:Species)
```

## Social (DR-SOCIAL-1)

```
(:Caso)-[:SOBRE]->(:Species|:Pest)
(:Experto)-[:VALIDA]->(:Caso)
(:Caso)-[:SE_VUELVE]->(:ConocimientoComunitario)
```

## PSA (DR-RESTAURACION-1 + Decretos)
```
(:MarcoNormativo {ley, que_exige, que_habilita})
(:ModalidadPSA {id, nombre, que_cubre, monto_ha_ano})
(:MarcoNormativo)-[:HABILITA]->(:ModalidadPSA)
```

## Carbono (DR-RESTAURACION-1)
```
(:AlertaCarbono {tipo, riesgo, recomendacion})
(:AlertaCarbono)-[:DETECTA]->(:Caso)
```

## Clima (DR-AGUA-1, IDEAM)
```
(:PisoTermico {id, msnm, temp_media, nubosidad})
(:EnsoFase {fase, efecto, lluvia})
(:EnsoFase)-[:MODULA]->(:PisoTermico)
```

## Data files AGE-ready

| Schema | Archivo | Ingesta |
|---|---|---|
| IoT | iot-age-schema.json | 5 nodos + 5 edges |
| Social | social-age-schema.json | 4 nodos + 3 edges |
| Clima | clima-age-schema.json | 3 nodos + 2 edges |
| PSA | psa-age-schema.json | 3 nodos + 2 edges |
| Restauración | restauracion-age-schema.json | 3 nodos + 3 edges |

Todos los archivos `*-age-schema.json` en `src/data/` tienen formato listo para ingesta al grafo AGE.
