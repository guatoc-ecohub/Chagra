---
ulid: 01HZ-AGUACATE-HASS
nombre_cientifico: Persea americana Mill. cv. 'Hass'
nombres_comunes:
  - es: aguacate Hass
    region: Colombia
  - es: palta Hass
    region: andina
familia: Lauraceae
piso_termico_optimo: templado
pisos_termicos_tolerados: [templado]
altitud_m: { min: 1700, max: 2400 }
categorias: [frutal]
estado_introduccion: introducida
ultima_revision: 2026-04-26
revisor: borrador-pendiente-validacion-agroecologo
nivel_confianza_global: medio
publicable_libro: false
fuentes_principales:
  - tipo: libro
    cita: Bernal H., Díaz C. (2005). *Materiales locales y mejorados del cultivo del aguacate en Colombia*. CORPOICA.
    nivel_confianza: alto
  - tipo: extension
    cita: Agrosavia. Manual técnico aguacate Hass para zona andina colombiana.
    url: https://www.agrosavia.co/
    nivel_confianza: alto
  - tipo: base_datos
    cita: GBIF Backbone Taxonomy
    url: https://www.gbif.org/species/2853020
    nivel_confianza: alto
---

# Aguacate Hass — *Persea americana* cv. Hass

## 1. Descripción agroecológica

Cultivar comercial dominante en exportación colombiana. Árbol perenne, copa redondeada, 8–15 m de altura en libre crecimiento. En sistemas bien manejados se mantiene a 4–5 m con poda formativa. Fruto característico: cáscara rugosa que oscurece a casi negro al madurar, pulpa cremosa, semilla relativamente pequeña, contenido graso 18–22%. Ciclo bienal natural si no se balancea carga.

## 2. Requerimientos agroclimáticos

| Variable | Rango óptimo | Tolera | Notas |
|---|---|---|---|
| Temperatura (°C) | 18–24 | 12–28 | <12°C reduce cuaje; heladas dañan flor |
| Precipitación (mm/año) | 1.000–1.600 | 800–2.000 | Necesita período seco para inducir floración |
| Suelo (textura) | Franco-arenoso a franco | mediana | Drenaje obligatorio — anegamiento mata raíz |
| pH del suelo | 5.5–6.5 | 5.0–7.0 | Sensible a aluminio en suelos ácidos andinos |
| Sombra (%) | 0–10 (productivo) | hasta 30 (joven) | Adulto requiere plena luz |

## 3. Asociaciones agroecológicas

### 3.1 Positivas
- **Polinizadores**: abejas (*Apis mellifera*), abejas sin aguijón (*Tetragonisca angustula*), moscas. Mejorar con setos florales de aromáticas + leguminosas en hileras.
- **Coberturas**: maní forrajero (*Arachis pintoi*), kudzú tropical, vetiver para taludes — fija N + protege suelo.
- **Sombrío hijuelo**: guamo (*Inga* spp.) durante primeros 2 años de establecimiento.

### 3.2 Negativas / alelopatías
- Eucalipto (*Eucalyptus globulus*): reduce infiltración + alelopatía. Distancia mínima 30 m.
- Plantas con alta demanda hídrica que compitan en zona radicular superficial.

## 4. Usos múltiples

- **Alimentario**: pulpa fresca, aceite, derivados (guacamole, aceite cosmético).
- **Madera**: poda — leña liviana.
- **Cobertura suelo**: hojarasca abundante, materia orgánica al descomponerse.

## 5. Plagas y enfermedades comunes

| Plaga / enfermedad | Síntoma | Manejo agroecológico |
|---|---|---|
| *Phytophthora cinnamomi* (pudrición radicular) | Marchitez progresiva, raíz necrótica | Drenaje + Trichoderma + suelos vivos |
| Trips (*Frankliniella* spp.) | Bronceado en flor y fruto joven | Extractos de ajo-ají + barrera aromática |
| Áfidos / cochinillas | Melaza + fumagina | Aceite agrícola horticultural + control biológico (catarinas) |

## 6. Reproducción y propagación

- Patrón: semilla criolla resistente o portainjerto antillano-mexicano. Germinación 30–45 días con tratamiento térmico (50°C, 30 min).
- Injerto: de hendidura o yema, 6–9 meses post-germinación. Únicamente material certificado ICA.
- Distancia siembra: 7×7 m (200 árb/ha) para sistemas tradicionales; 5×5 m con poda intensiva.
- Ventana siembra: inicio de lluvias para establecer raíz antes de período seco.

## 7. Suggestion engine integration

Inventario disparador:
- Si `inventario tiene melaza + microorganismos nativos` + `aguacate en establecimiento` → sugerir aplicación foliar MM diluido al 1% mensual primer año (efecto promotor crecimiento + supresor patógenos).
- Si `observación de plaga = Phytophthora` → activar protocolo Trichoderma + drenaje + ajuste pH al 6.0.

## 8. Reconocimiento visual

- Cáscara: rugosa tipo "pebble", verde oscuro madura a negro.
- Forma: ovada, pera-pera.
- Hojas: lanceoladas, anís al estrujar (común a la especie).
- Confundible con: otros cultivares Persea (Lorena, Choquette) — distinguir por cáscara lisa o tamaño mayor.
- Disponibilidad Pl@ntNet: alta cobertura (cultivo comercial global).

## 9. Proveedores verificados

| Tipo | Proveedor | Verificación |
|---|---|---|
| Plántula injertada | Agrosavia C.I. La Selva (Antioquia) | Registro ICA disponible (verificar lista oficial) |
| Plántula injertada | Vivero Macanas — Jardín Antioquia | ICA 101434 |
| Plántula injertada | Vivero Tierra Negra — El Retiro | ICA 14939, 110493 |

Ver `deepresearch/knowledge/suppliers-colombia-2026-seed.md` para la lista completa.

## 10. Notas legales y compliance

- Material vegetal con registro ICA obligatorio para movilización interregional.
- Variedad Hass: no patentada (dominio público), pero plantas certificadas requieren cumplimiento ICA.
- Exportación a UE/USA requiere protocolo fitosanitario (Phytophthora-free).

## 11. Limitaciones del conocimiento documentado

- **Datos de rendimiento por piso térmico específico colombiano** son aproximados; varían fuertemente por microclima.
- **Manejo orgánico de Phytophthora** en suelos andinos altos (>2200 m) tiene literatura limitada — más estudios necesarios.
- **Comportamiento bajo escenarios de cambio climático** (aumento +1°C en piso templado) no está bien caracterizado.
- **Asociación con microorganismos nativos andinos** requiere experimentación en finca laboratorio.

**Validación pendiente**: agroecólogo certificado debe revisar dosis específicas de bioinsumos + protocolo de control orgánico de Phytophthora + asociaciones polinizador-floración local antes de promover esta ficha a `publicable_libro: true`.

## 12. Régimen del dominio

Operación de aguacate Hass en mundo de **cola pesada**:

- ✅ Un evento de Phytophthora puede dominar pérdida anual (>40% árboles afectados → pérdida total parcela).
- ✅ Mercado de exportación tiene cola pesada en precios (años de prima alta vs. años de glut).
- ✅ Inversión inicial alta + retorno a 4-5 años = riesgo concentrado.

**Estrategia coherente**: policultivo + sombrío hijuelo + cobertura permanente + monitoreo activo Phytophthora + diversificación de mercados.

## Referencias canónicas

- Bernal H., Díaz C. (2005). CORPOICA. Materiales locales y mejorados.
- Agrosavia (s.f.). Manual técnico aguacate Hass.
- Whiley A.W., Schaffer B., Wolstenholme B.N. (2002). *The Avocado: Botany, Production and Uses*. CABI.
- ICA. Lista oficial de viveros registrados.
