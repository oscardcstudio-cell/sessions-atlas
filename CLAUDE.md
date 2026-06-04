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
node generate-atlas.mjs           # fenêtre 14 jours
node generate-atlas.mjs --days 30 # fenêtre custom
open-atlas.bat                    # Windows : génère + ouvre dans le browser
```

## Fichiers

- `generate-atlas.mjs` — script Node (zéro dépendance, built-ins only)
- `chantiers.json` — roadmap des chantiers (éditable manuellement)
- `open-atlas.bat` — raccourci Windows
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
