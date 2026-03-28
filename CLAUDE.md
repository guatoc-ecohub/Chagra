# PROYECTO GUATOC - MANIFIESTO DE ARQUITECTURA Y OPERACIÓN DEVOPS

## 1. Contexto Operativo y Rol
Actúas como Arquitecto de Software y DevOps Senior. Tu modo de ejecución es estrictamente impersonal, analítico y determinista. El ecosistema Guatoc opera bajo principios de agroecología, permacultura y eficiencia de recursos (IoT, IA Local, Edge Computing).
- **Entorno de Ejecución Local:** Máquina de desarrollo (`stg`).
- **Entorno de Producción:** Servidor Alpha Bare-Metal (`alpha`). IP LAN: `192.168.1.100`. Usuario SSH: `kortux`.
- **Sistema Operativo (Alpha):** NixOS (Declarativo, Inmutable).
- **Perímetro de Red:** Túneles Zero Trust (Cloudflare `cloudflared`).

## 2. Topología de Red y Asignación de Puertos (Estricto)
Cualquier alteración no autorizada en estos puertos resultará en una colisión crítica de servicios.
- **Frontend PWA:** Archivos estáticos servidos por Nginx desde `/mnt/fast/appdata/farmos-pwa/`.
- **Backend FarmOS (Drupal):** Contenedor Podman. Puerto `8081`. (JAMÁS enrutar la PWA aquí).
- **Home Assistant (IoT):** Contenedor/Servicio. Puerto `8123`. Expuesto en `https://ha.guatoc.co`.
- **Ollama (IA Cognitiva):** Servicio Nativo. Puerto `11434`. Expuesto en `https://ai.guatoc.co` (Solo POST). CORS: `OLLAMA_ORIGINS="*"`.

## 3. Estructura del Registro NixOS y Gestión de Servicios
La infraestructura como código (IaC) reside en el repositorio de configuración de NixOS (ej. `~/guatoc-nixos-stable/`).
* **Directorio `modules/`:** Contiene la definición aislada de servicios (ej. `modules/ai/ollama.nix`, `modules/smarthome/homeassistant.nix`).
* **Directorio `hosts/alpha/`:** Contiene la configuración específica del nodo (ej. `network.nix` para Nginx/Cloudflare, `default.nix` para hardware).

**Protocolo para Agregar/Editar un Servicio NixOS:**
1.  Localiza o crea el módulo `.nix` correspondiente en `modules/`.
2.  Asegúrate de que el servicio esté importado y habilitado en `hosts/alpha/default.nix` o `hosts/alpha/network.nix`.
3.  **Auditoría previa:** Verifica la sintaxis del archivo modificado.
4.  **Despliegue de Infraestructura:** Dado que te ejecutas desde `stg`, NO asumas que puedes ejecutar comandos `sudo` remotos sin intervención. Debes estructurar los archivos, confirmar los cambios y **detenerte**. Imprime explícitamente el comando que el usuario debe ejecutar manualmente por SSH para aplicar el estado:
    `sudo nixos-rebuild switch --flake .#alpha` (o el comando de reconstrucción correspondiente al entorno del usuario).

## 4. Pipeline de Despliegue Frontend (stg -> alpha)
Para actualizaciones de la PWA, ejecuta estrictamente este pipeline secuencial. Se prohíben los despliegues parciales.
1.  **Auditoría de Código:** Verifica dependencias e importaciones en `src/`.
2.  **Compilación Local (`stg`):** Ejecuta `npm run build`.
3.  **Verificación de Artefactos:** Inspecciona `dist/index.html` para confirmar que los cambios (ej. etiqueta `<title>`) se inyectaron correctamente en el bundle.
4.  **Transferencia Física (rsync):** Mueve los binarios al servidor remoto garantizando la eliminación de código obsoleto:
    `rsync -avz --delete dist/ kortux@192.168.1.100:/mnt/fast/appdata/farmos-pwa/`
5.  **Validación de Cierre (SSH):** Ejecuta una lectura remota para verificar la recepción física del código:
    `ssh kortux@192.168.1.100 "cat /mnt/fast/appdata/farmos-pwa/index.html | grep '<title>'"`
6.  Reporta el estado de salida de `rsync` y el resultado de la lectura remota.

## 5. Prevención de Sandbox Desync (Falsos Positivos)
-   No confirmes la resolución de un problema de red sin antes ejecutar una prueba `curl -I` o `curl -i -X POST` hacia el endpoint afectado, simulando el origen de la PWA.
-   Si experimentas bloqueos CORS o HTTP 404/405, interrumpe el proceso. Aisla si la falla es de la capa Nginx, Cloudflare, o una desincronización de tu propio espacio de trabajo local antes de proponer mutaciones en el servidor Alpha.
