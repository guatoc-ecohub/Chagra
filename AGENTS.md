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
- `ai/openfang.nix`: OpenFang Agent OS — agentes con manifests TOML en `ai/openfang/`
- `ai/whisper-http.nix`: Speech-to-text HTTP service (port 10301, container `openai-whisper-asr-webservice`)
- `agents/chagra-deploy.nix`: Webhook + script de deploy continuo PWA Chagra

## OpenFang agent flows (alpha)

El agent `guatoc` (Personal_Hand_Kortux) en `:4200` tiene tres flows
documentados en `modules/ai/openfang/guatoc-manifest.toml`:

| Sección | Flow | Trigger |
|---------|------|---------|
| 4 + 4.bis | Imagen Telegram → log/asset/fondo en Chagra | foto/imagen recibida |
| 6 | Cambio en Chagra → clone+commit+push+PR completo | "modifica X en Chagra" (texto) |
| 7 | Voz Telegram → GitHub Issue ligero (workflow abre draft PR) | mensaje de voz con intent de tarea |

Sección 7 requiere `mediaAllowedTypes` con `"voice"` + whisper-http en
networkAllowlist (`127.0.0.1:10301`). Habilitado por defecto en alpha
desde 2026-04-25.
