"""git_activity collector — commits últimos 7d en repos vigilados.

Estrategia de 2 fuentes con fallback graceful:
  1. Local git log (si el repo está clonado en ORACLE_REPOS_BASE Y el
     user del service tiene permisos de lectura).
  2. GitHub API (si GITHUB_PAT está configurado en SOPS).

Si ninguna funciona, reporta no_data graceful (NO error).

Env vars:
  GITHUB_PAT          (opcional, mejora rate limit + acceso repos privados)
  ORACLE_REPOS_BASE   (default /var/lib/oracle-lab/repos — path mutable
                       legible por el user oracle-lab)
  ORACLE_REPOS        (lista comma-separada de repo names)
"""
from __future__ import annotations

import asyncio
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import httpx

REPOS_BASE = Path(os.environ.get("ORACLE_REPOS_BASE", "/var/lib/oracle-lab/repos"))
REPOS = os.environ.get(
    "ORACLE_REPOS",
    "Chagra,chagra-pro,Chagra-strategy,guatoc-nixos",
).split(",")
GITHUB_OWNER = os.environ.get("GITHUB_OWNER", "guatoc-ecohub")
GITHUB_PAT = os.environ.get("GITHUB_PAT", "")


async def _local_git_log(repo_path: Path, since_iso: str) -> dict[str, Any]:
    """Intenta git log local. Retorna dict con `accessible` flag.

    DR-031 Issue #2 cierre 3/3 (Claude stg + Gemini DR + DeepSeek):
      - usar --all para incluir commits en TODAS las branches del repo
      - incluir timestamp ISO (--date=iso-strict) para sort/filter cliente
      - separador `|` en lugar de `,` (DeepSeek pidió `,` pero subjects pueden
        contener comas, `|` es más seguro y ya está en uso)
    """
    if not repo_path.exists():
        return {"accessible": False, "reason": "path_not_found"}
    # Soporta tanto repos non-bare (.git/) como bare (HEAD + refs/)
    is_bare = (repo_path / "HEAD").exists() and not (repo_path / ".git").exists()
    if not is_bare and not (repo_path / ".git").exists():
        return {"accessible": False, "reason": "not_a_git_repo"}
    if not os.access(repo_path, os.R_OK):
        return {"accessible": False, "reason": "permission_denied"}
    try:
        proc = await asyncio.create_subprocess_exec(
            "git", "-C", str(repo_path), "log", "--all",
            f"--since={since_iso}", "--date=iso-strict",
            "--pretty=format:%h|%ad|%an|%s", "-50",
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=4.0)
        if proc.returncode != 0:
            return {"accessible": False, "reason": f"git_failed: {stderr.decode()[:60]}"}
        lines = [l for l in stdout.decode().splitlines() if l.strip()]
        return {
            "accessible": True,
            "is_bare": is_bare,
            "commits_7d": len(lines),
            "recent": [
                {
                    "sha": parts[0],
                    "date": parts[1],
                    "author": parts[2],
                    "subject": parts[3][:80],
                }
                for line in lines[:5]
                if (parts := line.split("|", 3)) and len(parts) == 4
            ],
        }
    except (asyncio.TimeoutError, FileNotFoundError) as exc:
        return {"accessible": False, "reason": str(exc)}


async def _github_api(client: httpx.AsyncClient, repo: str, since_iso: str) -> dict[str, Any]:
    """Fallback a GitHub API si está configurado el PAT."""
    if not GITHUB_PAT:
        return {"accessible": False, "reason": "github_pat_not_configured"}
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {GITHUB_PAT}",
    }
    try:
        r = await client.get(
            f"https://api.github.com/repos/{GITHUB_OWNER}/{repo}/commits",
            headers=headers,
            params={"since": since_iso, "per_page": 30},
        )
        if r.status_code == 200:
            commits = r.json()
            return {
                "accessible": True,
                "commits_7d": len(commits),
                "recent": [
                    {
                        "sha": c["sha"][:7],
                        "author": c["commit"]["author"]["name"],
                        "subject": c["commit"]["message"].splitlines()[0][:80],
                    }
                    for c in commits[:5]
                ],
            }
        return {"accessible": False, "reason": f"github_api_http_{r.status_code}"}
    except httpx.HTTPError as exc:
        return {"accessible": False, "reason": f"github_api_error: {exc}"}


async def fetch() -> dict[str, Any]:
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    out: dict[str, Any] = {"status": "ok", "data": {"repos": {}}}

    any_accessible = False
    inaccessible_reasons: list[str] = []

    async with httpx.AsyncClient(timeout=6.0) as client:
        for repo in REPOS:
            repo = repo.strip()
            if not repo:
                continue

            # Try local first
            local_path = REPOS_BASE / repo
            local_result = await _local_git_log(local_path, seven_days_ago)
            if local_result.get("accessible"):
                local_result["source"] = "local_git"
                out["data"]["repos"][repo] = local_result
                any_accessible = True
                continue

            # Fallback GitHub API
            api_result = await _github_api(client, repo, seven_days_ago)
            if api_result.get("accessible"):
                api_result["source"] = "github_api"
                out["data"]["repos"][repo] = api_result
                any_accessible = True
                continue

            # Ambas fallaron — reporta razón
            inaccessible_reasons.append(
                f"{repo}: local={local_result.get('reason')}, api={api_result.get('reason')}"
            )

    if not any_accessible:
        return {
            "status": "no_data",
            "data": {
                "reason": "Ningún repo accesible. Setup: ejecutar oracle_init_repos.sh para inicializar /var/lib/oracle-lab/repos/ con git clone de los 4 repos. Alternativa: agregar GITHUB_PAT a SOPS oracle-lab-env.",
                "fix_command": "sudo bash /var/lib/oracle-lab/code/scripts/oracle_init_repos.sh  # o desde guatoc-nixos: scripts/diag/oracle_init_repos.sh",
                "details": inaccessible_reasons,
                "expected_path": str(REPOS_BASE),
                "repos_configured": REPOS,
            },
        }

    out["data"]["total_commits_7d"] = sum(
        r.get("commits_7d", 0) for r in out["data"]["repos"].values()
    )
    out["data"]["accessible_count"] = sum(
        1 for r in out["data"]["repos"].values() if r.get("accessible")
    )
    out["data"]["total_repos"] = len([r for r in REPOS if r.strip()])
    return out
