{
  disko.devices = {
    disk = {
      # 1. NVMe: Sistema Base
      nvme = {
        type = "disk";
        device = "/dev/nvme0n1";
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

      # 2. SSD: tank-fast
      ssd = {
        type = "disk";
        device = "/dev/sdb";
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

      # 3. HDD: tank
      hdd1 = {
        type = "disk";
        device = "/dev/sda";
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
      # POOL HDD (tank)
      tank = {
        type = "zpool";
        rootFsOptions = {
          compression = "lz4";
          encryption = "aes-256-gcm";
          keyformat = "passphrase";
          keylocation = "file:///etc/zfs/zpool.key";
        };
        mountpoint = "/mnt/data";
      };

      # POOL SSD (tank-fast)
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
