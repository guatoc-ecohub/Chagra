# hosts/beta/unlocker.nix
{ pkgs, ... }: {

  # Necesitamos sshpass o solo ssh con llaves configuradas
  environment.systemPackages = [ pkgs.netcat ];

  systemd.services.alpha-unlocker = {
    description = "Desbloqueador Automático de Alpha ZFS";
    after = [ "network.target" ];
    wantedBy = [ "multi-user.target" ];
    
    # Se reinicia cada minuto para estar siempre vigilando
    serviceConfig = {
      Restart = "always";
      RestartSec = "60s";
    };

    path = [ pkgs.openssh pkgs.netcat ];

    script = ''
      ALPHA_IP="192.168.1.100" # La IP fija de Alpha
      ALPHA_PORT="2222"
      KEY_FILE="/root/alpha_zfs_key.txt" # La contraseña real de ZFS guardada en la Pi

      # 1. Verificar si el puerto SSH de initrd (2222) está abierto
      if nc -z -w 5 $ALPHA_IP $ALPHA_PORT; then
        echo "Alpha detectado en modo bloqueo. Enviando llave..."
        
        # 2. Enviar la llave por SSH.
        # El comando remoto 'zfs load-key -a' lee del standard input (la tubería)
        cat $KEY_FILE | ssh -p $ALPHA_PORT -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no root@$ALPHA_IP "zfs load-key -a; zfs mount -a; systemctl switch-root /mnt-root /mnt-root/nix/store/.../init"
        
        # Nota: El comando exacto para continuar el boot en NixOS a veces es simplemente matar zfs
        # cat $KEY_FILE | ssh ... root@$ALPHA_IP "zfs load-key -a && killall zfs"
        
        echo "Llave enviada."
      else
        echo "Alpha no está pidiendo llave (o está apagado/ya encendido)."
      fi
    '';
  };
}