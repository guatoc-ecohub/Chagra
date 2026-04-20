{
  # ---------------------------------------------------------------------------
  # disko — manifiesto declarativo de discos del Nodo Alpha
  # ---------------------------------------------------------------------------
  # Referencia estricta por IDs estables (/dev/disk/by-id/) — los nombres
  # /dev/sdX los asigna el kernel segun orden de enumeracion SATA y cambian
  # cuando se conectan/desconectan discos. Usar IDs by-id previene que un
  # eventual `disko-install` formatee el disco equivocado.
  #
  # Cambio 2026-04-20: expansion del pool `tank` a mirror 2×12 TB.
  #   - hdd1 = ata-TOSHIBA_..._2080A1GWFDUG  (disco original, ya en tank)
  #   - hdd2 = ata-TOSHIBA_..._2080A2AHFDUG  (disco nuevo, integrado via `zpool attach`)
  # ---------------------------------------------------------------------------
  disko.devices = {
    disk = {
      # 1. NVMe: Sistema Base (ESP + swap encriptada + ext4 /nix)
      nvme = {
        type = "disk";
        device = "/dev/disk/by-id/nvme-PM981_NVMe_Samsung_512GB_______S3ZHNF0K236768";
        content = {
          type = "gpt";
          partitions = {
            ESP = {
              size = "1G";
              type = "EF00";
              content = {
                type = "filesystem";
                format = "vfat";
                mountpoint = "/boot";
              };
            };
            swap = {
              size = "32G";
              content = {
                type = "swap";
                randomEncryption = true;
              };
            };
            root = {
              size = "100%";
              content = {
                type = "filesystem";
                format = "ext4";
                mountpoint = "/";
              };
            };
          };
        };
      };

      # 2. SSD: tank-fast (Samsung 860 EVO 1TB) — single-disk, sin redundancia.
      #    TODO: si se agrega un segundo SSD 1TB, convertir a mirror aqui tambien.
      ssd = {
        type = "disk";
        device = "/dev/disk/by-id/ata-Samsung_SSD_860_EVO_1TB_S3Z6NB0K224082F";
        content = {
          type = "gpt";
          partitions = {
            zfs = {
              size = "100%";
              content = {
                type = "zfs";
                pool = "tank-fast";
              };
            };
          };
        };
      };

      # 3. HDD primario: tank (TOSHIBA MG07ACA12TE 12TB, serial 2080A1GWFDUG)
      hdd1 = {
        type = "disk";
        device = "/dev/disk/by-id/ata-TOSHIBA_MG07ACA12TE_2080A1GWFDUG";
        content = {
          type = "gpt";
          partitions = {
            zfs = {
              size = "100%";
              content = {
                type = "zfs";
                pool = "tank";
              };
            };
          };
        };
      };

      # 4. HDD espejo: tank mirror (TOSHIBA MG07ACA12TE 12TB, serial 2080A2AHFDUG)
      #    Integrado en runtime via `zpool attach tank hdd1-part1 hdd2` (resilver
      #    automatico). Este bloque solo refleja el estado declarativo para un
      #    eventual `disko-install` from-scratch.
      hdd2 = {
        type = "disk";
        device = "/dev/disk/by-id/ata-TOSHIBA_MG07ACA12TE_2080A2AHFDUG";
        content = {
          type = "gpt";
          partitions = {
            zfs = {
              size = "100%";
              content = {
                type = "zfs";
                pool = "tank";
              };
            };
          };
        };
      };
    };

    zpool = {
      # POOL HDD (tank) — mirror 2×12 TB
      tank = {
        type = "zpool";
        mode = "mirror";
        rootFsOptions = {
          compression = "lz4";
          encryption = "aes-256-gcm";
          keyformat = "passphrase";
          keylocation = "file:///etc/zfs/zpool.key";
        };
        mountpoint = "/mnt/data";
      };

      # POOL SSD (tank-fast) — single-disk (sin mirror por ahora)
      "tank-fast" = {
        type = "zpool";
        rootFsOptions = {
          compression = "lz4";
          encryption = "aes-256-gcm";
          keyformat = "passphrase";
          keylocation = "file:///etc/zfs/zpool.key";
        };
        mountpoint = "/mnt/fast";
      };
    };
  };
}
