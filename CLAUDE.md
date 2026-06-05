# Sessions Atlas

Outil de visualisation cross-conversations pour Claude Code.

## Qu'est-ce que c'est

Scan `~/.claude/projects/` → génère `atlas.html` (interface dark style Claude Code) avec :
- Kanban sessions par statut (active / idle / stale)
- **Conversations bloquantes** (⏸ — dernier msg de l'assistant, attend réponse)
- **Agents actifs** (⚙ — sub-agents spawned sans tool_result retourné)
- Section Chantiers (roadmap trackée dans `chantiers.json`)
- Registre des outils existants (skills, agents, packages, hooks)

## Usage

```bash
start.bat                         # Windows : lance Atlas + WebUI (tout en un)
node generate-atlas.mjs           # regen atlas seul (14 jours)
node generate-atlas.mjs --days 30 # fenêtre custom
```

- **Atlas** → `http://localhost:5199` (dashboard kanban cross-projets)
- **WebUI** → `http://localhost:3000` (interface chat Claude.ai style)

## Fichiers

- `generate-atlas.mjs` — script Node (zéro dépendance, built-ins only)
- `server.mjs` — serveur HTTP Atlas (port 5199, regen async)
- `chantiers.json` — roadmap des chantiers (éditable manuellement)
- `start.bat` — lance les 3 processus (Atlas + WebUI backend + WebUI frontend)
- `webui/` — interface chat style Claude.ai (fork sugyan/claude-code-webui redesigné)
  - `webui/frontend/` — React + Tailwind (port 3000)
  - `webui/backend/` — Node/Deno + Hono (port 8080)
  - `webui/shared/` — types partagés
- `atlas.html` + `atlas-index.json` — **générés, non versionnés**

## Config

Chemin hardcodé dans `generate-atlas.mjs` :
```js
const META_ROOT = 'C:/dev/claude'; // adapter si besoin
const PROJECTS = path.join(HOME, '.claude', 'projects');
```

## Détection bloquante

Une session est "bloquante" si le dernier message dans le JSONL est de type `assistant` (Claude a répondu et attend Oscar). Filtrage CRLF/hook injections : seuls les vrais messages texte comptent.

## Détection agents actifs

Un agent est "actif" si un `tool_use` de type `Agent` n'a pas de `tool_result` correspondant dans le transcript. Reset sur sessions `stale` (> 12h).
