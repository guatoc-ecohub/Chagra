# Fleet NOC view

Small, standard-library dashboard for the local fleet view. It binds to the
Tailscale address by default and publishes only aggregate metrics.

## Run now

```bash
python3 ops/fleet-viz/server.py
```

Open `http://100.117.193.102:8891/` from a device connected to the tailnet.

Environment overrides are available for `FLEET_VIZ_BIND`, `FLEET_VIZ_PORT`,
`ZOE_BIN`, `FLEET_LEDGER_BIN`, and `CLAUDE_PROJECTS`.

## Keep it alive after reboot

`fleet-viz.service.example` is intentionally not installed or enabled by this
change. An operator may copy it to the user systemd units, review the bind
address, then enable it. No nginx, public DNS, or NixOS configuration is
required for the direct Tailscale URL.
