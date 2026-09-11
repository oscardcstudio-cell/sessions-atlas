# Cockpit OSS pour piloter Claude Code — recensement 2026-09-11

Recherche web niveau medium. Chaque ligne factuelle vient d'une page GitHub réellement ouverte (WebFetch), pas de mémoire.

## Tableau comparatif

| Projet | Repo | Stars | Activité | Licence | Stack | Windows | Lit l'infra existante | Impose | Kanban | Worktrees | Multi-projet | Remote/mobile | Design (1-5) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Kanban Code | langwatch/kanban-code | 319 | 838 commits | Apache 2.0 | SwiftUI (mac) / Tauri+React+Rust (Win) | Oui, natif Tauri | Oui — scanne `~/.claude/projects`, utilise les hooks Claude Code, lit les sessions pour fork/checkpoint | Rien côté Claude, coordination perso dans `~/.kanban-code/` (couche de liaison, pas de remplacement) | Oui, 6 colonnes (Backlog/In Progress/Waiting/In Review/Done/All) | Oui, création auto + cleanup | Oui | Non mentionné | 4 — SwiftUI liquid glass sur mac, cartes propres, capture d'écran nette |
| ccmanager | kbwo/ccmanager | 1,2k | 765 commits | MIT | TypeScript/Bun (TUI) | Oui, chemins `%APPDATA%` documentés | Oui — copie les données de session depuis `~/.claude/projects` (historique, contexte, état projet) | Rien, se veut minimal façon Claude Code | Non | Oui, création/merge/delete worktrees + `.worktreeinclude` | Oui, mode multi-projet avec découverte | Non | 2 — TUI dense, fonctionnel, zéro signature visuelle (c'est un terminal) |
| opcode (ex-Claudia) | getAsterisk/opcode | 22,4k | 201 commits (branche active récente) | AGPL-3.0 | React+TS+Vite / Rust+Tauri | Oui, Win 10/11 explicite | Oui — scanne `~/.claude/projects`, éditeur CLAUDE.md intégré, importe la config MCP de Claude Desktop | Ajoute une couche SQLite propre (rôle exact vs infra native pas clarifié dans le README) | Non | Pas de worktree natif ; "timeline checkpoints" / fork de session à la place | Implicite via scan de tous les projets | Non mentionné | 4 — Tailwind v4 + shadcn/ui, GUI desktop soignée d'après la démo |
| claudecodeui (CloudCLI) | siteboon/claudecodeui | 13,7k | 800 commits | AGPL-3.0-or-later | React+Vite+Tailwind, CodeMirror, xterm.js | Oui, app desktop native Windows | Oui — "auto-discovers every session from your `~/.claude` folder", sync bidirectionnelle (écrit aussi dans la config Claude) | La sync bidirectionnelle veut dire qu'il peut réécrire la config — à surveiller, pas un simple lecteur passif | Non | Non | Oui | Oui — web/mobile/tablette, offre cloud pour accès sans laisser la machine allumée | 3 — responsive, orienté usage tactile, look correct mais générique |
| Superset | superset-sh/superset | 14,1k | 4 253 commits | Elastic License 2.0 (source-available, pas OSI) | Electron, React, Tailwind, Bun, Drizzle, tRPC | **Non — "not yet available"** | Pas clarifié dans le README (agent-agnostic, pas de mention explicite de lecture `.claude/`) | Pas clarifié | Non (vue liste d'agents, pas kanban) | Oui, 100+ agents en parallèle chacun dans son worktree | Oui | Oui, connexion à une autre machine | 4 — dark UI, sidebar + onglets + terminal splitté, cohérent mais très "IDE agents 2026" générique |
| Emdash | generalaction/emdash | 5,7k | 10 090 commits | Apache 2.0 | Electron/Node/TS | Oui, installeur + portable .exe | Présence de `.claude/` et CLAUDE.md dans le repo mais lecture de l'infra utilisateur non confirmée par le README | Pas clarifié | Non mentionné | Oui, worktree + branche par agent | Oui, y compris machines distantes via SSH | Pas mentionné | 3 — dashboard diff/PR/CI unifié, correct sans être marquant |
| Backlog.md | MrLesk/Backlog.md | 6,7k | 1 371 commits | MIT | Bun/TS/Node | Oui, cross-platform confirmé | Non — crée son propre format Markdown de tâches (`backlog/`), génère juste un fichier d'instructions pour les agents | Oui, format de tâches propriétaire à la racine du repo | Oui, `backlog board` + web UI drag-and-drop | Non | Un seul projet par instance | Web UI oui (browser), pas mobile dédié | 3 — cartes propres, mais scope mono-projet |
| Crystal → Nimbalyst | stravu/crystal (mort) → nimbalyst/nimbalyst | Crystal 3,1k (archivé) / Nimbalyst 1,7k | Nimbalyst 5 992 commits | MIT | Electron/TS, Lexical, Monaco, Excalidraw | Oui, Win 10+ | Non — remplace par son propre stockage markdown + protocole de sync propriétaire (`packages/collab-protocol`) | Oui, runtime de sync et format de fichiers maison | Oui | Oui, sessions parallèles par worktree | Oui, liens de fichiers cross-session | Oui, app compagnon iOS native (Android annoncé, pas livré) | 4 — édition visuelle WYSIWYG (markdown, mockups, Mermaid, Excalidraw), ambitieux |
| Vibe Kanban | BloopAI/vibe-kanban | 28,1k | 2 070 commits | Apache 2.0 | Rust + Node/pnpm | Non précisé | Non — abstraction agent propre, ne lit pas l'infra Claude native | Oui, son propre format de tâches/workspace | Oui | Oui | Oui | SSH documenté | **Projet en sunset annoncé sur le repo — à écarter malgré le score** |
| Claude Squad | smtg-ai/claude-squad | 8,5k | 222 commits | AGPL-3.0 | Go + tmux | Non confirmé (install Homebrew/bash, mac/Linux d'abord) | Non — config propre dans `~/.claude-squad/config.json`, traite Claude Code comme un agent interchangeable parmi d'autres | Oui, config et isolation maison | Non | Oui, un worktree par session | Oui | Non | 2 — TUI, aucune ambition visuelle |

## Top 3 pour le cas d'Oscar

Critères : lit l'infra existante sans la remplacer, n'impose ni pack d'agents ni runtime, Windows natif, design qui ne fait pas peur.

### 1. Kanban Code (langwatch/kanban-code)
Seul candidat qui coche TOUT : kanban + worktrees + multi-projet + lecture native de `~/.claude/projects` et des hooks, sans imposer de format (sa propre couche vit à part dans `~/.kanban-code/`). App Windows native (Tauri), pas un wrapper web. Design soigné d'après les captures.
**Risque** : 319 stars, jeune, équipe petite — pas encore éprouvé à grande échelle, pas de garantie de maintenance long terme.

### 2. ccmanager (kbwo/ccmanager)
Le plus robuste sur le principe "lit sans imposer" : copie littéralement les sessions `~/.claude/projects`, gère les worktrees et le multi-projet, tourne sous Windows, licence MIT, plus mature (765 commits, usage réel documenté).
**Limite** : TUI pur, pas de kanban ni de vue "agents", zéro polish visuel — pas ce qu'Oscar veut regarder, mais solide comme brique de fond si le visuel vient d'ailleurs.

### 3. opcode (ex-Claudia, getAsterisk/opcode)
Le plus mature et le plus visible (22,4k stars) qui lit vraiment l'infra : scan de tous les projets `~/.claude`, éditeur CLAUDE.md intégré, import de la config MCP. GUI desktop shadcn/ui propre, Windows supporté.
**Limite** : pas de kanban ni de worktrees natifs (juste du fork/checkpoint de session) — ne couvre pas tout le besoin d'Oscar (tâches, parallélisation), et licence AGPL-3.0 (copyleft fort, sans incidence en usage perso mais à noter).

## Éliminés (une ligne chacun)

- **Vibe Kanban** — le plus étoilé (28,1k) mais sunset annoncé sur le repo, ne pas construire dessus.
- **Crystal** — mort, remplacé par Nimbalyst.
- **Nimbalyst** — impose son propre format et son propre protocole de sync, à l'opposé du besoin "lit l'existant sans remplacer".
- **claudecodeui / CloudCLI** — lit bien l'infra mais réécrit aussi la config (sync bidirectionnelle), pas de kanban ni de worktrees.
- **Superset** — design et fonctions les plus proches du besoin mais **pas de Windows** ("not yet available"), licence Elastic (source-available, pas open source au sens OSI).
- **Emdash** — Windows OK, worktrees OK, mais aucune confirmation que le README lit vraiment l'infra Claude utilisateur ; pas de kanban.
- **Backlog.md** — impose son propre format Markdown de tâches à la racine du repo, mono-projet.
- **Claude Squad** — traite Claude Code comme agent interchangeable, config propre séparée, pas de Windows confirmé, zéro design.
- **Agent Deck / CC Switch** — plusieurs projets homonymes concurrents sur GitHub, pas assez de signal fort pour trancher dans ce budget de recherche ; à revisiter si le trio du dessus ne convient pas.

## Incertitudes

- Aucune page GitHub n'affiche de date de dernier commit lisible directement (seulement un compteur de commits) — la fraîcheur réelle ("dernier commit il y a X jours") n'a pas pu être vérifiée précisément pour aucun candidat dans ce budget de recherche.
- Superset et Emdash : le README ne précise pas explicitement s'ils lisent `~/.claude/agents` ou les skills — seulement les projets/worktrees. À vérifier en clonant si l'un des deux devient sérieux.
- opcode : la doc ne dit pas si sa couche SQLite duplique ou remplace les données natives `.claude` — à tester avant d'y mettre des données réelles.
- Agent Deck existe en au moins 3 forks/projets homonymes (asheshgoplani, a-streetcoder, claude-world) — pas creusé faute de budget, aucun n'a été retenu faute de signal clair.
- "Design 1-5" est une lecture de README/captures, pas un test à l'usage — à confirmer par un essai réel avant tout choix définitif.

## Vérification API GitHub (2026-09-11, `gh api repos/...`, champ pushed_at)

| Repo | Dernier push | Verdict |
|---|---|---|
| langwatch/kanban-code | 2026-09-08 | actif |
| kbwo/ccmanager | 2026-09-09 | actif |
| getAsterisk/opcode (redirige vers winfunc/opcode) | 2025-10-16 | **mort depuis 11 mois, retiré du top 3** |
| siteboon/claudecodeui | 2026-09-10 | actif |
| BloopAI/vibe-kanban | 2026-04-24 | sunset confirmé par l'inactivité |
| superset-sh/superset | 2026-09-11 | actif, mais pas de Windows |
| generalaction/emdash | 2026-09-11 | actif |

Top 3 corrigé : 1. Kanban Code · 2. claudecodeui (web/mobile, actif, lit `~/.claude`, mais sync bidirectionnelle et pas de kanban) · 3. ccmanager (TUI, brique de fond). Emdash reste à ouvrir si Kanban Code déçoit.
Manque commun aux trois : aucun n'affiche les agents de `~/.claude/agents` ni les skills ; seul l'atlas maison le faisait.
