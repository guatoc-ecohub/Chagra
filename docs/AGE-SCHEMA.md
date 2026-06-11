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
