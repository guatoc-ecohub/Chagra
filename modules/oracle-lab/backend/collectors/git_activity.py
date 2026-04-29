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
    """Intenta git log local. Retorna dict con `accessible` flag."""
    if not repo_path.exists():
        return {"accessible": False, "reason": "path_not_found"}
    if not (repo_path / ".git").exists():
        return {"accessible": False, "reason": "not_a_git_repo"}
    if not os.access(repo_path, os.R_OK):
        return {"accessible": False, "reason": "permission_denied"}
    try:
        proc = await asyncio.create_subprocess_exec(
            "git", "-C", str(repo_path), "log", f"--since={since_iso}",
            "--pretty=format:%h|%an|%s", "-50",
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=4.0)
        if proc.returncode != 0:
            return {"accessible": False, "reason": f"git_failed: {stderr.decode()[:60]}"}
        lines = [l for l in stdout.decode().splitlines() if l.strip()]
        return {
            "accessible": True,
            "commits_7d": len(lines),
            "recent": [
                {"sha": parts[0], "author": parts[1], "subject": parts[2][:80]}
                for line in lines[:5]
                if (parts := line.split("|", 2)) and len(parts) == 3
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
                "reason": "Ningún repo accesible (local + API). Para fix: "
                          "configurar ORACLE_REPOS_BASE legible por user oracle-lab "
                          "O agregar GITHUB_PAT a SOPS oracle-lab-env",
                "details": inaccessible_reasons,
            },
        }

    out["data"]["total_commits_7d"] = sum(
        r.get("commits_7d", 0) for r in out["data"]["repos"].values()
    )
    return out
