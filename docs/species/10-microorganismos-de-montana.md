---
ulid: 01HZ-MM-MICROORGANISMOS-MONTANA
nombre_cientifico: consorcio microbiano (no especie única)
nombres_comunes:
  - es: MM
  - es: Microorganismos de Montaña
  - es: BLOC
    region: protocolo CAR-Cundinamarca
  - es: bocashi líquido
    region: variante mesoamericana
familia: consorcio (Lactobacillus + Saccharomyces + Bacillus + Trichoderma nativo + actinomicetos + otros)
piso_termico_optimo: universal (capturar in situ del piso de uso)
pisos_termicos_tolerados: [calido, templado, frio, paramo]
altitud_m: { min: 0, max: 4000 }
categorias: [microorganismo, abono_verde]
estado_introduccion: nativa (capturados localmente del bosque cercano a la finca)
ultima_revision: 2026-04-26
revisor: borrador-pendiente-validacion-agroecologo
nivel_confianza_global: alto
publicable_libro: false
fuentes_principales:
  - tipo: libro
    cita: Restrepo Rivera J. (2007). *Manual práctico ABC de la agricultura orgánica*. SIMAS.
    nivel_confianza: alto
  - tipo: extension
    cita: Manual JICA-ICA *Microorganismos eficientes y de montaña en agricultura tropical*.
    nivel_confianza: alto
  - tipo: paper
    cita: Higa T. (1991). *Effective Microorganisms — A new dimension in agriculture and environment*. INFRC, Atami.
    nivel_confianza: medio (publicación gris pero foundational)
---

# Microorganismos de Montaña (MM) — consorcio nativo

## 1. Descripción agroecológica
**No es una especie sino un consorcio microbiano** capturado de bosque nativo cercano a la finca y multiplicado por el campesino en sustratos a base de carbohidratos (melaza/panela) + medio sólido (semolina/arroz). Diferencia clave vs EM (Effective Microorganisms patentado por Higa): los MM se capturan localmente, son específicos del bioma de la finca, no requieren licencia ni patente. Filosofía: "el bosque cercano sabe lo que tu finca necesita".

Composición típica (variable según bosque y altitud): bacterias ácido-lácticas (*Lactobacillus* spp.), levaduras (*Saccharomyces*), bacilos (*Bacillus subtilis*, *B. coagulans*), actinomicetos (*Streptomyces*), Trichoderma nativos, hongos descomponedores variados.

## 2. Requerimientos del medio
- Captura: hojarasca + suelo orgánico de bosque maduro (altura/piso correspondiente al destino de uso).
- Sustrato sólido: semolina/arroz triturado/salvado + melaza diluida sin cloro.
- Fermentación: anaeróbica controlada 30 días, T° ambiente (15–28°C óptima).
- Activación líquida: 5 kg sólido + 100 L agua sin cloro + 4 L melaza + trampa gases, 4–8 días.

## 3. Asociaciones agroecológicas
**Sinérgico con**:
- Compost / lombricompost: MM acelera maduración + suprime patógenos.
- Biofertilizantes minerales orgánicos (harinas roca, biochar): vehículo activador.
- *Beauveria bassiana* / Trichoderma comerciales: complementan defensa.

**Antagónico**:
- Fungicidas químicos sintéticos: aniquilan consorcio.
- Cloro residual del agua: mata cultivo (filtrar 24h o usar agua lluvia).
- Hongos comestibles destinados a producción comercial (cuidado en sustratos compartidos).

## 4. Usos múltiples
- **Activador biológico de suelo**: dilución 1:100 a 1:500, aplicación quincenal-mensual al pie planta.
- **Acelerador compostaje**: 1 L MM líquido por m³ pila.
- **Inóculo sustratos germinación**: dilución 1:1000, riego inicial.
- **Foliar bioestimulante**: dilución 1:100 con coadyuvante atenuador UV.
- **Tratamiento bocashi**: incorporar al volteo.
- **Recuperación suelos degradados**: post-incendio, post-deslizamiento.

## 5. Patógenos suprimidos (documentados)
- *Phytophthora* spp.
- *Fusarium oxysporum*
- *Rhizoctonia solani*
- *Sclerotinia*
- Olores anaerobios (vía bacterias ácido-lácticas)

## 6. Protocolo de multiplicación (Restrepo)

### Fase sólida
1. Recolectar 40 kg hojarasca en descomposición de bosque nativo cercano (mismo piso térmico de la finca).
2. Mezclar con 40 kg semolina o salvado de arroz (fuente carbohidratos).
3. Diluir 1 galón (3.8 L) melaza en agua sin cloro hasta humedecer mezcla a 30–40% (prueba del puño: aglutina sin escurrir).
4. Compactar vigorosamente por capas en caneca 200L hermética (expulsar aire).
5. Sellar con bolsa interior + tapa hermética.
6. Reposo 30 días T° ambiente.

### Fase líquida (activación)
1. Extraer 5 kg MM sólido fermentado.
2. Bolsa permeable (tipo bolsa de té grande).
3. Sumergir en 100 L agua sin cloro + 4 L melaza diluida.
4. **Trampa de gases obligatoria** (botella con agua, manguera) — sin esta, la presión rompe el recipiente.
5. Reposo 4–8 días, T° 18–25°C.
6. Listo cuando aroma agridulce + pH 3.0–4.0 + turbidez característica.

### Pruebas de calidad
- Olor: agridulce láctico, NO putrefacto.
- pH: 3.0–4.0.
- Color: amarillento-marrón claro.
- Si: olor pútrido, color negro, pH >5 → **descartar, contaminado**.

## 7. Suggestion engine integration
- `Inventario = melaza + bosque cercano + recipiente hermético` + `piso térmico de finca` → activar protocolo MM completo (Caso 1 de ADR-022).
- `Inventario = MM líquido activado + cultivo en establecimiento` → sugerir aplicación foliar 1:100 al atardecer cada 15 días.
- **Caso bloqueante**: si el operador NO menciona trampa de gases en ejecución → ALERTA seguridad (presión puede fisurar recipiente).

## 8. Reconocimiento visual
Sustrato sólido fermentado: olor láctico característico (similar yogurt). Color marrón claro a amarillo. Filamentos blancos (micelio actinomicetos) visibles. NO debe oler a putrefacción ni tener moho negro.

Líquido: amarillento-marrón claro, ligeramente turbio, aroma agridulce pronunciado, ligera espuma natural.

## 9. Proveedores
**No se compran — se hacen.** Pero los componentes:
- Melaza: agroquímicos rurales, ingenios azucareros (a granel barato).
- Semolina/salvado: molinos de arroz locales.
- Inóculo Trichoderma para potenciar (opcional): Agrosavia Tricotec® WG (ICA 12164).
- Bosque nativo: requerimiento operacional, no comercial.

## 10. Compliance
**Producción finca para uso propio**: legítimo culturalmente, sin restricciones ICA.
**Comercialización**: requiere registro ICA bioinsumo (estandarización compleja por variabilidad consorcio). En la práctica, redes campesinas intercambian sin formalización.
**Etiqueta de seguridad**: necesario indicar fecha producción + lote + advertencia "no apto consumo humano".

## 11. Limitaciones
- **Variabilidad inherente**: cada lote ligeramente distinto — no es un producto industrial estandarizado. Esa es su FORTALEZA (adaptación local) y su DEBILIDAD (no escalable comercialmente como tal).
- **Caracterización microbiológica formal**: pocos lotes han sido secuenciados (16S rRNA). Investigación pendiente Colombia.
- **Sin estándares ICA específicos**: zona gris regulatoria — uso personal-finca legal, comercial requiere transformar producto a "biofertilizante registrado".
- **Riesgo contaminación**: si la captura es de bosque degradado o usa agua clorada, el consorcio es deficiente o tóxico. Validación experta en cada lote es ideal pero impráctica.
- **Toxicidad humana**: bajo riesgo en uso normal, pero bacterias en alta densidad pueden causar problemas si se ingieren — uso estrictamente agrícola.

## 12. Régimen del dominio
**Gaussiano** — bioinsumo robusto, downside acotado al costo de los insumos (~$100k COP por lote 200L). Pero **cola pesada en oportunidad**: una finca con MM activos incorporados durante años acumula resiliencia que es difícil de replicar rápidamente. **Estrategia**: rutinizar producción + diversificar bosques de captura (sucesión + páramo + bosque secundario) + intercambiar lotes con vecinos para aumentar diversidad.

## Referencias canónicas
- Restrepo Rivera J. (2007). *Manual ABC agricultura orgánica*. SIMAS, Nicaragua.
- Higa T. (1991). *EM technology*. INFRC, Atami.
- Manual ICA-JICA (varios). Microorganismos eficientes en agricultura tropical.
- Agrosavia (ficha técnica adyacente, no específica MM).
