# Request #296

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/296
- Title: [fix] authService: detectar content-type HTML en /oauth/token y dar error claro (D9)
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: fix Scope: authService Descripcion: src/services/authService.js linea 38 hace 'const data = await response.json()' directamente despues de verificar response.ok. Si FarmOS backend redirige a /install.php (DB perdida o no inicializada) y el client sigue el redirect, Nginx SPA fallback devuelve index.html con status 200 — response.ok es true pero response.json() falla con 'Unexpected token <, <!doctype' al usuario. Este patron es el mismo bug de queue/022 RAG, pero en el path de auth. Fix: antes del response.json(), validar response.headers.get('content-type') y si no contiene 'json', lanzar error claro tipo 'Backend FarmOS no disponible (modo instalacion detectado)'. Aplicar mismo guard en getAccessToken y cualquier otro fetch del servicio. Criterios: si /oauth/token responde HTML en vez de JSON, el usuario ve mensaje accionable Backend FarmOS no disponible en lugar del error opaco del parser. Restricciones: no cambiar el flow OAuth, mantener el contrato actual {success, error} del returned object. Prioridad: alta Contexto: bug actual 2026-05-13 reportado por operador. La causa raiz (DB postgres-farm vacia) se resuelve aparte; este issue es defensive para que cuando vuelva a pasar (rebuild, migrate fallido) el mensaje al usuario sea claro.

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
