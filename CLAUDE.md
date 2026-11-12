> Hiérarchie : hérite de C:\dev\claude\CLAUDE.md et C:\dev\claude\oscardcstudio\CLAUDE.md

# Sessions Atlas

Outil de visualisation cross-conversations pour Claude Code (scan de `~/.claude/projects/` vers `atlas.html`). Lancer : `start.bat` ; inventaire des fichiers : [llms.txt](llms.txt) ; commandes : [README.md](README.md).

## Règles
- `generate-atlas.mjs` et `server.mjs` : zéro dépendance, built-ins Node uniquement. Ne pas ajouter de package à la racine.
- `webui/` est un fork de sugyan/claude-code-webui : ses dépendances vivent dans `webui/backend` et `webui/frontend`, jamais à la racine.
- `atlas.html` et `atlas-index.json` sont générés et non versionnés.
- Chemin hardcodé `META_ROOT = 'C:/dev/claude'` dans `generate-atlas.mjs` et `server.mjs` : l'adapter dans les deux si la racine change.

## Détection
- Session bloquante : le dernier message du JSONL est de type `assistant` (Claude attend Oscar). Seuls les vrais messages texte comptent (filtrer CRLF et injections de hooks).
- Agent actif : un `tool_use` de type `Agent` sans `tool_result` correspondant. Reset sur les sessions `stale` (> 12 h).

## Tâches = Beads
Les tâches restantes vivent dans Beads (`bd ready`, `bd list`), pas dans un fichier de notes. Une tâche finie : `bd close <id>`.
