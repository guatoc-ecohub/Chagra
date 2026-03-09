# AGENTS.md - Guatoc NixOS Configuration

## Project Overview
NixOS flake-based infrastructure configuration for multiple hosts:
- **alpha**: Server (nixos-24.11, stable)
- **stg**: Laptop (nixos-unstable, for AMD drivers & Cursor)
- **beta**: Raspberry Pi (aarch64-linux)

## Build Commands

```bash
# Enter nix shell with flake
cd guatoc-nixos
nix develop

# Build a specific host
nix build .#nixosConfigurations.alpha.config.system.build.toplevel
nix build .#nixosConfigurations.stg.config.system.build.toplevel
nix build .#nixosConfigurations.beta.config.system.build.toplevel

# Build and switch (requires sudo)
sudo nixos-rebuild switch --flake .#alpha
sudo nixos-rebuild switch --flake .#stg
sudo nixos-rebuild switch --flake .#beta

# Update flake inputs
nix flake update
```

## Code Conventions
- Use Nixpkgs lib (`nixpkgs.lib`)
- Follow NixOS module syntax with `options`, `config`, `imports`
- Keep host-specific configs in `hosts/<name>/`
- Shared modules in `modules/`
- Secrets managed via sops-nix (not committed)

## Key Modules
- `common-security.nix`: Firewall, fail2ban, SSH hardening
- `virtualization.nix`: Libvirt/QEMU configuration
- `server-services.nix`: Docker, Podman, network services
- `dev-environment.nix`: Development tools and shell
- `desktop-gaming.nix`: Gaming & graphics drivers (STG laptop)
