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

## Catálogo de tools del sidecar

Tools disponibles en el sidecar MCP agro (ALLOWED_TOOLS):

### Conocimiento del grafo
- `get_species` — ficha completa de especie
- `get_companions` — especies asociadas favorables
- `get_pest_controllers` — controladores biológicos de plaga
- `get_biopreparados` — recetas de biopreparados
- `get_multihop_companions` — cadenas de N saltos (control ecológico)
- `get_subgrafo_relacional` — grafo AGE en la vecindad pest+crop

### Diseño agroecológico
- `get_diseno_restauracion` — sucesión ecológica con nativas
- `get_diseno_silvopastoril` — forrajeras + árboles según altura

### Validación
- `validate_visual_match` — ¿la foto matchea la especie?
- `validate_taxonomy` — nombre científico válido

### Normativa y fuentes externas
- `get_normativa_ica` — resoluciones ICA activas
- `get_clima_ideam` — estaciones y series climáticas
- `get_precio_sipsa` — precios mayoristas DANE
- `get_enso_status` — fase ENSO actual (NOAA/IDEAM)
- `get_alertas_clima_zona` — alertas meteorológicas por lat/lon

### Conocimiento del grafo (grounding)
- `get_saberes` — usos tradicionales documentados
- `get_toxicidad` — perfil de toxicidad por especie
- `get_variedades` — variedades/cultivares registrados
- `get_suelo` — requerimientos de suelo/nutrición
