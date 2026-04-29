"""git_activity collector — commits últimos 7d en repos vigilados.

Si GITHUB_PAT está configurado, consulta la API de GitHub para los repos
listados. Fallback: lectura local de git log si los repos están clonados
en ORACLE_REPOS_BASE.

Env vars:
  GITHUB_PAT          (opcional, mejora rate limit)
  ORACLE_REPOS_BASE   (default /home/kortux/Workspace)
  ORACLE_REPOS        (lista comma-separada — default los 4 conocidos)
"""
from __future__ import annotations

import asyncio
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import httpx

REPOS_BASE = Path(os.environ.get("ORACLE_REPOS_BASE", "/home/kortux/Workspace"))
REPOS = os.environ.get(
    "ORACLE_REPOS",
    "Chagra,chagra-pro,Chagra-strategy,guatoc-nixos",
).split(",")
GITHUB_OWNER = os.environ.get("GITHUB_OWNER", "guatoc-ecohub")
GITHUB_PAT = os.environ.get("GITHUB_PAT", "")


async def _local_git_log(repo_path: Path, since_iso: str) -> dict[str, Any]:
    if not (repo_path / ".git").exists():
        return {"status": "no_data", "reason": "not a git repo"}
    try:
        proc = await asyncio.create_subprocess_exec(
            "git", "-C", str(repo_path), "log", f"--since={since_iso}",
            "--pretty=format:%h|%an|%s", "-50",
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=4.0)
        lines = [l for l in stdout.decode().splitlines() if l.strip()]
        return {
            "commits_7d": len(lines),
            "recent": [
                {"sha": parts[0], "author": parts[1], "subject": parts[2][:80]}
                for line in lines[:5]
                if (parts := line.split("|", 2)) and len(parts) == 3
            ],
        }
    except (asyncio.TimeoutError, FileNotFoundError) as exc:
        return {"status": "error", "error": str(exc)}


async def _github_api(client: httpx.AsyncClient, repo: str, since_iso: str) -> dict[str, Any]:
    headers = {"Accept": "application/vnd.github+json"}
    if GITHUB_PAT:
        headers["Authorization"] = f"Bearer {GITHUB_PAT}"
    try:
        r = await client.get(
            f"https://api.github.com/repos/{GITHUB_OWNER}/{repo}/commits",
            headers=headers,
            params={"since": since_iso, "per_page": 30},
        )
        if r.status_code == 200:
            commits = r.json()
            return {
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
        return {"status": "error", "error": f"GitHub API HTTP {r.status_code}"}
    except httpx.HTTPError as exc:
        return {"status": "error", "error": str(exc)}


async def fetch() -> dict[str, Any]:
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    out: dict[str, Any] = {"status": "ok", "data": {"repos": {}}}

    async with httpx.AsyncClient(timeout=6.0) as client:
        for repo in REPOS:
            repo = repo.strip()
            if not repo:
                continue
            local_path = REPOS_BASE / repo
            # Prioridad: local si existe, else GitHub API
            if local_path.exists():
                result = await _local_git_log(local_path, seven_days_ago)
                result["source"] = "local_git"
            else:
                result = await _github_api(client, repo, seven_days_ago)
                result["source"] = "github_api"
            out["data"]["repos"][repo] = result

    out["data"]["total_commits_7d"] = sum(
        r.get("commits_7d", 0) for r in out["data"]["repos"].values()
    )
    return out
