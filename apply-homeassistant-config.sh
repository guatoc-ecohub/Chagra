#!/bin/bash
# Script para aplicar la configuración completa de Home Assistant
# Ejecutar en el servidor Alpha

echo "=== Aplicando configuración de Home Assistant ==="
cd ~/guatoc-nixos-stable

# Añadir archivos a git
echo "Añadiendo archivos a git..."
git add modules/homeassistant-config.nix
git add modules/picoclaw-openrgb-api.nix
git add flake.nix hosts/alpha/default.nix

# Hacer rebuild
echo "Haciendo rebuild de NixOS..."
sudo nixos-rebuild switch --flake .#alpha

if [ $? -eq 0 ]; then
    echo "=== Rebuild exitoso ==="
    
    # Verificar servicios
    echo "Verificando servicios..."
    sudo systemctl status homeassistant-setup --no-pager || true
    sudo systemctl status podman-homeassistant --no-pager || true
    sudo systemctl status picoclaw-openrgb-api --no-pager || true
    
    # Verificar configuración de HA
    echo "Verificando configuración de Home Assistant..."
    ls -la /mnt/fast/appdata/homeassistant/
    
    echo ""
    echo "=== Configuración aplicada ==="
    echo "Home Assistant estará disponible en: http://192.168.1.100:8123"
    echo "API OpenRGB está en: http://127.0.0.1:18791"
    echo ""
    echo "Para configurar OpenRGB en HA:"
    echo "1. Ve a Configuración > Dispositivos y servicios"
    echo "2. Agregar integración > OpenRGB"
    echo "3. Host: localhost, Puerto: 6742"
    echo ""
    echo "Para Zigbee (cuando conectes el dongle):"
    echo "1. Conecta el dongle USB Zigbee"
    echo "2. Habilita services.zigbee2mqtt.enable = true en hosts/alpha/default.nix"
    echo "3. Rebuild y accede a Zigbee2MQTT en http://192.168.1.100:8080"
else
    echo "=== ERROR en rebuild ==="
    echo "Revisa los errores arriba"
fi


Vamos a proceder con la migración, pero bajo una regla estricta de 'Despliegue Canario'. NO migres todos los dominios a la vez.

Ejecuta estrictamente este plan de acción ahora:

Fase 1 (Cimientos): Crea la estructura de carpetas base y genera el archivo lib/registry.nix poblándolo ÚNICAMENTE con los puertos y UIDs que ya estamos usando en la configuración actual.

Fase 2 (Prueba Piloto): Refactoriza exclusivamente el dominio media (Lidarr, Radarr, Sonarr, qBittorrent, etc.).

Regla de Oro de Estado: Al mover las definiciones de los oci-containers, el nombre resultante del servicio systemd (podman-<nombre>) DEBE ser idéntico al actual. Si cambia, systemd destruirá el contenedor actual y perderemos el estado. Asegúrate de mantener los dependsOn o dependencias de montaje de ZFS (/mnt/data/media) que configuramos previamente.

Fase 3 (Limpieza del Host): Modifica hosts/alpha/default.nix para eliminar las definiciones en crudo de la pila media y reemplázalas por los nuevos toggles (ej. guatoc.media.lidarr.enable = true;).

Entregable:
Entrégame los archivos generados para esta prueba piloto (el registry, un módulo de media de ejemplo y el host actualizado) para que y realiza un nixos-rebuild switch. Si la pila de medios sobrevive al refactor, tendras luz verde para los dominios de domótica, IA y el resto."

