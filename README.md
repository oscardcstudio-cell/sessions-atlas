# sessions-atlas

Visualiseur cross-conversations pour Claude Code : il lit `~/.claude/projects/` et génère un tableau de bord (`atlas.html`) des sessions par statut, avec les conversations qui attendent une réponse et les agents encore actifs. Windows uniquement (chemins et scripts `.bat`).

## Lancer

```bash
start.bat                          # Atlas + interface chat (webui), ouvre http://localhost:3000
node generate-atlas.mjs            # régénère atlas.html seul (14 jours)
node generate-atlas.mjs --days 30  # fenêtre personnalisée
node server.mjs                    # serveur Atlas seul, http://localhost:5199
```

Prérequis : Node.js. Les dépendances de `webui/backend` et `webui/frontend` s'installent au premier `start.bat` (`npm install`). `atlas.html` et `atlas-index.json` sont générés, pas versionnés.

Le chemin racine des projets scannés est écrit en dur dans `generate-atlas.mjs` et `server.mjs` (`META_ROOT`).
