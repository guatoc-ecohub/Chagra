#!/bin/bash
# setup-alpha-dirs.sh
# Crear directorios necesarios para los contenedores de Alpha
# Ejecutar como root después de que ZFS esté montado

set -e

echo "=== Creando directorios para contenedores ==="

# Asegurar que ZFS está montado
echo "Verificando pools ZFS..."
zfs list || {
    echo "ERROR: ZFS no está montado. Ejecuta primero:"
    echo "  zfs mount -a"
    exit 1
}

# Crear directorios en tank-fast (SSD)
echo "Creando directorios en /mnt/fast..."
mkdir -p /mnt/fast/apps/frigate
mkdir -p /mnt/fast/soulseek

# Crear directorios en tank (HDD)
echo "Creando directorios en /mnt/data..."
mkdir -p /mnt/data/frigate
mkdir -p /mnt/data/immich
mkdir -p /mnt/data/media/music

# Permisos para Podman (usuario 1000:1000 o root)
echo "Configurando permisos..."
chown -R root:root /mnt/fast/apps
chown -R root:root /mnt/fast/soulseek
chown -R root:root /mnt/data/frigate
chown -R root:root /mnt/data/immich
chown -R root:root /mnt/data/media

chmod -R 755 /mnt/fast/apps
chmod -R 755 /mnt/fast/soulseek
chmod -R 755 /mnt/data/frigate
chmod -R 755 /mnt/data/immich
chmod -R 755 /mnt/data/media

# Crear red de Podman para los contenedores
echo "Creando red Podman..."
podman network create web-network 2>/dev/null || echo "Red ya existe"

echo ""
echo "=== Directorios creados ==="
ls -la /mnt/fast/
ls -la /mnt/data/

echo ""
echo "=== Listo para desplegar ==="
echo "Ahora ejecuta: sudo nixos-rebuild switch --flake .#alpha"
