# Diagnóstico Alpha - Post Reboot

## 1. Verificar Estado de Servicios (crítico)
```bash
# Ver servicios fallidos
sudo systemctl --failed

# Ver estado de red y SSH
sudo systemctl status network-online.target
sudo systemctl status sshd
sudo systemctl status tailscaled

# Ver logs de errores recientes
sudo journalctl -xb -p 3 --no-pager | head -50
```

## 2. Verificar Red e IP
```bash
# Confirmar IP sigue siendo 192.168.1.100
ip addr show | grep 192.168

# Ver si interfaz de red está up
ip link show

# Probar conectividad local
ping -c 3 192.168.1.1
```

## 3. Verificar ZFS (montaje correcto)
```bash
# Pools ZFS
sudo zpool status

# Mounts
zfs list

df -h | grep -E "(mnt|tank)"
```

## 4. Servicios de Contenedores (Podman)
```bash
# Ver contenedores
sudo podman ps -a

# Logs de contenedores fallidos
sudo podman logs wyoming-piper 2>&1 | tail -20
sudo podman logs navidrome 2>&1 | tail -20
sudo podman logs grafana 2>&1 | tail -20
```

## 5. Firewall / SSH Debug
```bash
# Reglas de firewall
sudo iptables -L -n | head -30

# Puerto SSH escuchando?
ss -tlnp | grep 22

# Intentar SSH local
ssh -v localhost
```

## 6. Rollback Si es Necesario
```bash
# Ver generaciones disponibles
sudo nix-env --list-generations --profile /nix/var/nix/profiles/system

# Rollback a generación anterior (reemplaza N con el número)
sudo nix-env --rollback --profile /nix/var/nix/profiles/system
sudo /nix/var/nix/profiles/system/bin/switch-to-configuration switch
```

## 7. Fix Temporal SSH (si es firewall)
```bash
# Desactivar temporalmente firewall
sudo systemctl stop firewall

# O abrir SSH manualmente
sudo iptables -I INPUT -p tcp --dport 22 -j ACCEPT
```
