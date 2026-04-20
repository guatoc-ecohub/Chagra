# Configuración Nginx para streaming de Ollama (v0.6.0)

A partir de v0.6.0, el cliente consume las respuestas de Ollama con
`stream: true` vía `ReadableStream`, lo cual requiere que el proxy Nginx
**no buferee** las respuestas del upstream `/api/ollama/`. Si el buffering
queda activo (default), los tokens llegan en un único lote al cliente y el
efecto typewriter se pierde — aunque las requests siguen funcionando
correctamente, solo que sin el beneficio visual de la generación en vivo.

Este archivo es referencia para el operador que administra el Nodo Alpha.
La configuración real de Nginx **no vive en este repositorio** (es infra
privada); solo documentamos el bloque mínimo requerido.

## Bloque a aplicar

Editar la entrada de Nginx que proxea a Ollama (típicamente
`/etc/nginx/sites-enabled/farmos-pwa` o equivalente):

```nginx
location /api/ollama/ {
    proxy_pass              http://127.0.0.1:11434/;
    proxy_http_version      1.1;

    # --- Streaming NDJSON ---
    proxy_buffering         off;
    proxy_cache             off;
    proxy_request_buffering off;
    chunked_transfer_encoding on;
    # Evita que el proxy colapse la conexión persistente.
    proxy_set_header        Connection        '';

    # Timeouts generosos: qwen3 en CPU puede tardar hasta 60s.
    proxy_read_timeout      120s;
    proxy_send_timeout      120s;

    # Headers estándar (propagar si ya los tenías configurados).
    proxy_set_header        Host              $host;
    proxy_set_header        X-Real-IP         $remote_addr;
    proxy_set_header        X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header        X-Forwarded-Proto $scheme;
}
```

## Verificación

Tras `nginx -t && systemctl reload nginx`, desde el cliente:

```bash
curl -N -X POST https://<nodo>/api/ollama/api/generate \
  -H 'Content-Type: application/json' \
  -d '{"model":"gemma3:4b","prompt":"Hola","stream":true}'
```

Debe emitir una línea JSON por token progresivamente (y no un bloque único al
final). Si ves un único lote grande al final, alguno de los flags de
buffering sigue activo.

## Rollback

Si por alguna razón el streaming causa problemas en producción, basta con
revertir este bloque al anterior — el cliente sigue funcionando correcto
con buffering activado (solo pierde la progresión visual).
