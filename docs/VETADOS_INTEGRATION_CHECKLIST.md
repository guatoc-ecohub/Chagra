# Checklist de integracion manual — archivos vetados

## Estado: SIN CONFLICTOS

Los 3 archivos vetados NO tienen cambios en `integrate/opencode-69-116`.
No se requiere resolucion manual para el merge.

## Procedimiento (si en el futuro hay conflictos)

1. `git checkout main && git pull`
2. `git merge integrate/opencode-69-116`
3. Si hay conflicto en archivo vetado:
   - **NO resolver inline** — mantener version de main
   - Documentar el cambio del otro lado en un issue
   - El operador resuelve el archivo vetado manualmente
4. Verificar: `npx vitest run tests/unit/smoke-final-142.test.js`
5. Push

## Archivos monitoreados

| Archivo | Cambios en integrate | Accion |
|---------|---------------------|--------|
| `DashboardLive.jsx` | 0 | Nada |
| `ProfileScreen.jsx` | 0 | Nada |
| `AgentScreen.jsx` | 0 | Nada |
