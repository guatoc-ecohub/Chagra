# Offline-first E2E — Known Issues

## Issue: ECONNREFUSED en tests E2E sin mocks adecuados

**Fecha**: 2026-05-25  
**Workflow**: Playwright E2E  
**Run ID**: 26384011054  
**Branch**: `glm/171-playwright-mock-sidecar-v2` (never merged)

### Causa raíz

El test `anti-halluc-mock-sidecar.spec.js` falló con múltiples errores `ECONNREFUSED` porque intentaba conectarse a servicios backend que no estaban disponibles en el entorno de CI:

```
AggregateError [ECONNREFUSED]: 
- /api/mcp/agro/resolve-entities
- /oauth/token  
- /api/log/seeding, /api/log/harvest, /api/log/input
- /api/ollama/api/generate
```

**Test específico que falló**:
```javascript
// tests/anti-halluc-mock-sidecar.spec.js:140
const fab = page.locator('[data-testid="agent-fab"], button[aria-label*="agente" i]').first();
await expect(fab).toBeVisible({ timeout: 5000 }); // ❌ Timeout: element(s) not found
```

### Diagnóstico

El test no incluía los mocks necesarios para:
1. **OAuth2 authentication**: Endpoint `/oauth/token` debía ser mockeado
2. **Backend APIs**: Todos los endpoints `/api/**` debían ser mockeados o bloqueados
3. **MCP services**: `/api/mcp/agro/*` debían tener respuestas simuladas
4. **LLM services**: `/api/ollama/*` debían ser mockeados

### Patrón correcto (referencia)

El test `tests/offline.spec.js` implementa correctamente los mocks:

```javascript
test.beforeEach(async ({ context }) => {
  // ✅ Mock OAuth2 token
  await context.route('**/oauth/token', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'e2e-fake-access',
        refresh_token: 'e2e-fake-refresh',
        expires_in: 3600,
        token_type: 'Bearer',
      }),
    })
  );

  // ✅ Bloquear tráfico al backend real
  await context.route('**/api/**', (route) => route.abort('blockedbyclient'));
});
```

### Recomendaciones

#### Para nuevos tests E2E

1. **Siempre incluir mocks de OAuth2**:
   ```javascript
   await context.route('**/oauth/token', (route) => route.fulfill({...}));
   ```

2. **Decidir estrategia para `/api/**`**:
   - **Opción A**: Bloquear todo el tráfico al backend (tests offline-first)
     ```javascript
     await context.route('**/api/**', (route) => route.abort('blockedbyclient'));
     ```
   - **Opción B**: Mockear respuestas específicas
     ```javascript
     await context.route('**/api/mcp/agro/resolve-entities', (route) => 
       route.fulfill({ body: JSON.stringify({...mockData...}) })
     );
     ```

3. **Validar que el UI se renderiza sin dependencias externas**:
   ```javascript
   // Esperar a que el UI principal esté listo
   await expect(page.getByText('Cola de tareas')).toBeVisible({ timeout: 15_000 });
   ```

#### Para debugging de failures

1. **Revisar logs de GitHub Actions**:
   ```bash
   gh run view <run-id> --log-failed | grep -A 30 "ECONNREFUSED"
   ```

2. **Verificar que los tests no tienen dependencias ocultas**:
   - Imports dinámicos que pueden fallar offline
   - WebSockets o SSEs que requieren conexión
   - llamadas `fetch()` o `XMLHttpRequest` no mockeadas

3. **Usar timeouts generosos**:
   ```javascript
   await expect(element).toBeVisible({ timeout: 15_000 }); // CI es más lento
   ```

### Estado

✅ **Resuelto**: El test problematico `anti-halluc-mock-sidecar.spec.js` fue removido en el PR que nunca se hizo merge. Los tests actuales en `tests/offline.spec.js` implementan correctamente el patrón de mocks.

### Referencias

- Test correcto: `tests/offline.spec.js`
- Wiki Playwright network mocking: https://playwright.dev/docs/network
- ADR sobre offline-first: (referencia al ADR correspondiente si existe)

---

**Última revisión**: 2026-05-26  
**Responsable**: GLM-4.6 (TASK #171)
