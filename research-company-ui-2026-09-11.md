# Interfaces visuelles pour les 50 agents Claude Code d'Oscar

Recherche web niveau medium, 2026-09-11. Chaque ligne vient d'une page ou d'un appel `gh api` réellement ouvert.

## Tableau comparatif

| Repo | Stars / dernier push | Licence / stack | Source des agents | Ce qu'on voit | Design | Effort branchement | Risque |
|---|---|---|---|---|---|---|---|
| [pixel-agents-hq/pixel-agents](https://github.com/pixel-agents-hq/pixel-agents) (ex pablodelucca) | 9246 / 2026-09-07 | MIT, TS (Fastify+React+Canvas) | Lit les hooks Claude Code en direct, fallback heuristique sur les transcripts JSONL de `~/.claude/projects/`. Aucune modif de Claude Code. | Bureau pixel art, 6 persos animés (marche, assis, tape, lit), bulles de dialogue sur permission, zones par dossier de workspace, éditeur de mobilier | 5/5, le plus abouti et vivant, capture dans le README du repo | Nul, lit l'existant tel quel | Jeune (9k stars très vite) mais push il y a 4 jours, activité réelle |
| [hoangsonww/Claude-Code-Agent-Monitor](https://github.com/hoangsonww/Claude-Code-Agent-Monitor) | 989 / 2026-09-08 | MIT, TS/Node/Electron/SQLite | Lecture seule des transcripts JSONL + rollouts Codex, hooks optionnels pour le direct | Kanban agents, graphe DAG d'orchestration, graphe de collaboration, heatmap tokens, appli Electron Windows native (NSIS) | 4/5, mature, sombre, i18n, mais plus dashboard analytics que bureau vivant | Nul à mapping simple | Scope très large (Prometheus, 97 outils MCP), peut peser pour un besoin simple |
| [paulrobello/claude-office](https://github.com/paulrobello/claude-office) | 512 / 2026-09-08 | MIT, Python FastAPI + Next.js/PixiJS | Installe ses propres hooks (`make hooks-install`), pas de lecture passive | Bureau pixel art, un boss + des employés (sous-agents), bulles de pensée, poubelle animée qui mange le contexte compacté, Command Center multi-terminaux | 4/5, mise en scène "patron/employés" proche de ce qu'Oscar imagine | Mapping simple (script d'install fourni) | Mainteneur solo, moins d'étoiles que pixel-agents |
| [disler/claude-code-hooks-multi-agent-observability](https://github.com/disler/claude-code-hooks-multi-agent-observability) | 1536 / 2026-02-08 | Licence non déclarée, Python | Hooks posés sur Claude Code, événements envoyés à un dashboard | Flux d'événements en liste/timeline, pas d'organigramme ni de personnages | 2/5, austère, outil dev pas mise en scène | Mapping simple | Activité ralentie (7 mois), pas de licence claire |
| [patoles/agent-flow](https://github.com/patoles/agent-flow) | 1636 / 2026-07-11 | Apache-2.0, TS/Next.js | Lit directement `~/.claude/projects/` et les rollouts Codex, sans modification | Graphe de noeuds interactif : appels d'outils, branchements, timeline, heatmap fichiers | 3.5/5, bon pour "qui fait quoi techniquement", pas de départements | Nul | Centré dev/debug, pas d'ambiance "entreprise" |
| [paperclipai/paperclip](https://github.com/paperclipai/paperclip) | 80466 / 2026-09-11 | MIT, Node/Postgres/React | Ne lit pas l'existant : agents branchés via adaptateur (Claude Code, Codex, HTTP), rôles/objectifs déclarés | Vrai organigramme (rôles, hiérarchie, reporting lines), dashboard budgets/coûts par agent, logs immuables | Non vérifié visuellement (pas de capture ouverte), à checker avant d'investir | Mapping simple (déclarer les 50 agents comme rôles + adaptateur CLI) | 80k stars en quelques mois est suspect pour un outil aussi récent, à vérifier avant de s'y fier |
| [tinyhumansai/opencompany](https://github.com/tinyhumansai/opencompany) | 115 / 2026-09-11 | GPL-3.0, Rust | Moteur propre "Medulla", agents déclarés en TOML, pas de lecture Claude Code | Console web, mais l'organigramme est un fichier TOML texte, pas un vrai graphisme | 2/5 | Réécriture complète | Windows seulement via WSL/Git Bash, pas natif |
| [a16z-infra/ai-town](https://github.com/a16z-infra/ai-town) | 10474 / 2026-08-26 | MIT, TS/Convex | Moteur de simulation propre (Convex), LLM générique, ne lit rien de Claude Code | Ville pixel art façon Stardew Valley, PNJ qui socialisent | 4/5 visuellement mais hors sujet | Réécriture complète | Les "agents" sont des PNJ simulés, pas les vrais agents d'Oscar |
| [OpenBMB/ChatDev](https://github.com/OpenBMB/ChatDev) | 34271 / 2026-07-24 | Apache-2.0, Python | Moteur multi-agent propre, rôles fixes (CEO/CTO/Programmer...) | Visualiseur de logs et de ChatChain, pas de bureau ni d'organigramme dynamique | 2/5 | Réécriture complète | Rôles figés, ne colle pas aux 50 agents markdown |

## Top 3 pour le cas d'Oscar

1. **pixel-agents-hq/pixel-agents** — lit l'existant sans y toucher, visuel le plus vivant et le plus proche du fantasme "bureau d'agents", zéro effort de branchement.
2. **hoangsonww/Claude-Code-Agent-Monitor** — complète avec un vrai graphe de collaboration et un kanban, app Windows native, lecture seule des transcripts.
3. **paperclipai/paperclip** — le seul avec un vrai organigramme/départements comme demandé, mais nécessite de déclarer les agents (mapping simple) et son ampleur (80k stars en quelques mois) reste à vérifier avant d'y passer du temps.

## Éliminés en une ligne

- **paulrobello/claude-office** : bon concept boss/employés mais moins d'adoption que pixel-agents, redondant.
- **disler/multi-agent-observability** : austère, pas de mise en scène, activité ralentie.
- **patoles/agent-flow** : bon pour le flux technique, pas pour l'ambiance "entreprise".
- **tinyhumansai/opencompany** : moteur propre, organigramme en texte brut, pas de vrai visuel.
- **a16z-infra/ai-town** : beau mais simule des PNJ, pas les agents réels d'Oscar.
- **OpenBMB/ChatDev** : rôles figés (CEO/CTO...), moteur propre, ne colle pas aux 50 agents.
- **Stargx/claude-code-dashboard** (12 stars) et **rolandal/pixel-agents-standalone** (52 stars, fork mineur) : trop petits, jouets de démo.
- **W17ant/Claude-Office** (149 stars) et **tombelieber/claude-view** (106 stars) : alternatives mineures, non creusées en détail faute de budget de recherche.

## Incertitudes

- Paperclip : pas de capture d'écran ouverte, le nombre d'étoiles (80k) n'a pas pu être recoupé avec une source tierce indépendante dans le temps imparti.
- Claude-Code-Agent-Monitor : app Electron Windows non testée en local, taille du build non vérifiée.
- tombelieber/claude-view et W17ant/Claude-Office : stats prises via `gh api` seulement, README non lu.
