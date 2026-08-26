# Scripts de Auditoría

Este directorio contiene scripts para verificar y auditar datos en el grafo AGE.

## verificar-fichas-bestiario.mjs

Verifica las fichas científicas del Bestiario Vivo contra el grafo AGE.

### Propósito

La regla dura del operador establece que todo hecho duro (especie, norma, DOI, número, 
categoría de riesgo) debe salir del grafo AGE con su Source citado, NUNCA de lo que el 
modelo cree recordar.

Este script verifica que las 7 especies del Bestiario Vivo tengan sus datos científicos
respaldados por nodos o Sources en el grafo AGE.

### Uso

```bash
# Configurar variables de entorno
export PGHOST=localhost
export PGDATABASE=chagra_kg
export PGUSER=farmos
export PGPASSWORD=your_password

# Ejecutar verificación completa
node scripts/audit/verificar-fichas-bestiario.mjs

# Ejecutar en formato JSON
node scripts/audit/verificar-fichas-bestiario.mjs --format json

# Modo dry-run: ver consultas sin ejecutar
node scripts/audit/verificar-fichas-bestiario.mjs --dry-run
```

### Salida

El script genera un reporte en `docs/verificacion-fichas-bestiario.md` con:

- **RESPALDADO**: El grafo contiene un nodo o Source que sostiene la afirmación
- **CONTRADICHO**: El grafo contiene información diferente a la afirmación
- **SIN RESPALDO**: El grafo no contiene información sobre esta afirmación

Las afirmaciones críticas (categoría UICN) se marcan como CRÍTICO ya que un error
en categoría de riesgo en material educativo es grave.

### Especies verificadas

1. Oso andino (Tremarctos ornatus) - UICN: Vulnerable (VU)
2. Jaguar (Panthera onca) - UICN: Casi amenazado (NT)
3. Abeja angelita (Tetragonisca angustula) - Sin categoría UICN
4. Zarigüeya (Didelphis marsupialis) - Sin categoría UICN
5. Guacamaya (Ara sp.) - Sin categoría UICN
6. Chivito de páramo (Oxypogon guerinii) - Sin categoría UICN
7. Luciérnaga (Lampyridae) - Sin categoría UICN
