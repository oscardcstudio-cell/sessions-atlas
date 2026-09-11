# Sourcing agents visuels — interface entreprise IA (2026-09-11)

Recherche medium, 25 appels plafond. Ne recouvre pas Paperclip, Pixel Agents, Claude Office, Claude-Code-Agent-Monitor, agent-flow, ai-town, ChatDev, CrewAI, MetaGPT, disler observability (déjà vus).

## 1. Visualiseurs réseau / 3D d'agents (couche visuelle)

| Repo | Étoiles / pushed_at | Licence | Stack | Entrée consommée | Ce qu'on voit | Design 1-5 | Effort branchement | Risque |
|---|---|---|---|---|---|---|---|---|
| [vasturiano/3d-force-graph](https://github.com/vasturiano/3d-force-graph) | 6390 · 2026-04-05 | MIT | Three.js/WebGL pur | JSON générique `{nodes:[], links:[]}` — aucune dépendance à un framework d'agents | Graphe 3D de nœuds colorés reliés par des lignes, rotatif/zoomable. Prop `linkDirectionalParticles` fait **littéralement circuler des petites sphères lumineuses le long des liens, dans le sens source→target** — testé en direct sur la démo `large-graph`, fond noir, nœuds colorés flottants, liens fins blancs (capture prise) | 4 | Adaptateur JSON simple | Faible. Lib mature, sans opinion produit, à habiller soi-même |
| [vasturiano/react-force-graph](https://github.com/vasturiano/react-force-graph) | 3295 · 2026-02-04 | MIT | Wrapper React de 3d-force-graph (2D/3D/VR/AR) | Même JSON générique | Même rendu, intégrable direct dans une app React | 4 | Adaptateur JSON simple | Faible |
| [vasturiano/three-forcegraph](https://github.com/vasturiano/three-forcegraph) | 303 · 2026-04-16 | MIT | Objet Three.js brut (pas de canvas dédié) | JSON générique | Brique bas niveau si on a déjà une scène Three.js custom | 3 (pas de style out-of-box) | Adaptateur JSON simple | Faible |
| [proactive-agent/langgraphics](https://github.com/proactive-agent/langgraphics) | 146 · 2026-09-11 | MIT | Python backend + React/D3 frontend, WebSocket | **Spécifique LangGraph** : `graph = watch(workflow.compile())` — pas un flux d'événements générique | Graphe d'exécution en direct, chemins empruntés surlignés, panneau d'inspection | 3 (dev tool, pas "salle de contrôle") | Réécriture (il faudrait rejouer les transcripts Claude Code comme un graphe LangGraph, contournement artificiel) | Moyen |
| [escapeboy/agent-fleet-o](https://github.com/escapeboy/agent-fleet-o) | 68 · 2026-09-09 | AGPL-3.0 | Laravel/PHP + Cytoscape.js + Reverb (WebSockets) | Événements internes à sa propre plateforme d'orchestration (agents/humains/crews qu'il gère lui-même) | "Live team graph" force-directed façon Cytoscape, DAG visuel, mission control | 3 (dashboard dev, pas motion 3D) | Réécriture (il faudrait migrer l'orchestration vers Laravel, pas juste nourrir un flux) | Élevé — AGPL impose la réciprocité du code si redistribué, jeune (68 étoiles) |
| Microsoft AutoGen Studio | — (packagé dans autogen) | MIT | React, canvas propriétaire | Format de conversation AutoGen (agents/messages internes au framework) | Canvas drag-and-drop, graphe de flux de messages avec coût/tokens, mais en diagramme de boîtes, pas en particules lumineuses | 2 (esthétique dev-tool classique) | Réécriture | Moyen — écarté du style demandé |
| AgentOps (dashboard SaaS) | — | Propriétaire (SaaS), pas OSS à auto-héberger simplement | Web dashboard | Traces OpenTelemetry-like propres à leur SDK | "Session waterfall" + graphe d'exécution, style observabilité classique (pas motion/3D) | 2 | Réécriture | Moyen — pas open-source self-hosted direct |

**Verdict angle 1** : `3d-force-graph` / `react-force-graph` sont les seuls qui matchent le critère "entrée = flux d'événements simple". Tout le reste attend un format propre à son propre framework (LangGraph, AutoGen, sa propre plateforme) — brancher les transcripts Claude Code dessus serait une réécriture, pas un adaptateur.

## 2. Plateformes d'équipes d'agents orientées sales / produit avec UI

| Repo | Étoiles / pushed_at | Licence | Moteur propre ou branchable | Visuel flux entre agents | Spécialisation sales/produit réelle |
|---|---|---|---|---|---|
| [langgenius/dify](https://github.com/langgenius/dify) | 155420 · 2026-09-11 | Licence source-available (pas OSI, custom) | Moteur propre (workflows, RAG, agents) | Oui — builder visuel en **boîtes/flowchart reliées par des lignes droites**, pas un réseau organique. Style éditeur de diagramme, pas motion design | Générique (RAG/agents), aucun template sales/produit dédié |
| [langflow-ai/langflow](https://github.com/langflow-ai/langflow) | 154580 · 2026-09-11 | MIT | Moteur propre, composants Python modifiables | Même famille visuelle que Dify : canvas nodal, flowchart, chat live de test | Générique, pas de vertical sales |
| [FlowiseAI/Flowise](https://github.com/FlowiseAI/Flowise) | 55457 · 2026-08-13 | Custom (source-available), **archivé** (`archived: true`) | Moteur propre bas-code | Flowchart nodal classique | Générique — **à écarter, projet archivé** |
| [simstudioai/sim](https://github.com/simstudioai/sim) | 29611 · 2026-09-11 | Apache-2.0 | Moteur propre + collab équipe + connaissance + déploiement intégrés | Canvas visuel + collaboration, mais même famille flowchart que Dify/Langflow (pas confirmé motion/3D) | Positionné "AI workspace" généraliste, pas sales-first |
| [kortix-ai/suna](https://github.com/kortix-ai/suna) | 20199 · 2026-09-11 | Apache-2.0 (marque "Kortix") | Moteur propre, agnostique au modèle (OpenAI/Anthropic/local) | **Vérifié en direct sur kortix.ai** : dashboard sombre mais **liste d'agents + sidebar + panneau de chat**, aucun graphe ni réseau — exactement le genre "dashboard dev générique" qu'Oscar refuse | Positionné "AI Management System" / "AI employee", proche du besoin (départements, agents nommés) mais UI = liste, pas réseau lumineux |
| [julep-ai/julep](https://github.com/julep-ai/julep) | 6588 · 2026-08-06 | Apache-2.0 | Moteur propre (flows durables, retry, resume) | Observabilité via UI Temporal (timeline d'exécution), pas de graphe réseau natif | Générique workflows, pas sales |
| [kyegomez/swarms](https://github.com/kyegomez/swarms) | 7162 · 2026-09-10 | Apache-2.0 | Framework Python (pas d'UI propre) | Aucune UI incluse — à construire | Framework générique, pas de produit fini |

**Verdict angle 2** : aucune de ces plateformes ne livre le style "salle de contrôle / réseau lumineux" nativement. Elles se rangent en deux familles : dashboards de liste sombres (Suna/Kortix, proche de l'idée "départements" mais UI plate), ou builders flowchart nodaux (Dify, Langflow, Sim) — utiles comme moteur d'orchestration si besoin, mais leur couche visuelle ne sert à rien pour le rendu demandé.

## 3. Références visuelles (direction artistique)

- [Démo officielle 3d-force-graph — large-graph](https://vasturiano.github.io/3d-force-graph/example/large-graph/) — ouverte et capturée en direct : fond noir total, nœuds sphériques colorés (vert/orange/violet/rouge) en amas 3D, connectés par des lignes fines blanches semi-transparentes, scène tournante à la souris. C'est la base technique ET la référence DA la plus proche du besoin d'Oscar.
- [Feature `linkDirectionalParticles`, doc 3d-force-graph](https://github.com/vasturiano/3d-force-graph) — la doc décrit noir sur blanc des petites sphères animées qui voyagent le long de chaque lien dans le sens source→target : c'est le mécanisme exact du "flux de points lumineux entre nœuds" demandé, pas une reformulation.
- [Kortix / Suna — kortix.ai](https://kortix.ai) — capturé en direct : fond noir, typographie soignée, mais structure en sidebar + liste d'agents + chat. Sert de contre-exemple : c'est le "dashboard dev générique" à éviter, malgré le thème sombre et le positionnement "AI Management System" séduisant sur le papier.
- [AI Agent Control Centre Dashboard, Adom Shafi (Dribbble)](https://dribbble.com/shots/27320546-AI-Agent-Control-Centre-Dashboard) — capturé en direct : thème **clair**, cards SaaS classiques, aucun graphe ni particule. Ne pas s'en inspirer malgré le titre prometteur.
- [Neural Network GUI Dashboard, Connor Sparks (Dribbble)](https://dribbble.com/shots/6600692-Neural-Network-GUI-Dashboard) — trouvé par recherche mais **non vérifié visuellement** (fetch image impossible, pas ouvert en navigateur faute de budget d'appels) : à confirmer avant usage.

## 4. Verdict honnête

Aucun repo ne couvre le besoin tel quel — zéro produit "entreprise d'agents en salle de contrôle" prêt à l'emploi. Deux couches distinctes à assembler :

1. **Couche visuelle** : cloner `3d-force-graph` (ou son wrapper `react-force-graph`, plus simple à intégrer dans une app React/Vite). Raison : licence MIT, entrée = JSON générique `{nodes, links}` donc zéro dépendance à un framework d'agents, et la feature `linkDirectionalParticles` fait déjà, nativement, le "flux de points lumineux" demandé — pas à réinventer. Effort réel = un adaptateur qui transforme les JSONL de transcripts Claude Code + événements de hooks en `{nodes: agents/départements, links: appels/messages}`, pas un projet de recherche.
2. **Couche données** : aucune des plateformes de l'angle 2 (Dify, Langflow, Sim, Suna, Julep) n'apporte de valeur ici — elles ont chacune leur propre moteur d'orchestration et leur propre format d'événements, incompatibles avec "lire les transcripts JSONL existants d'agents Claude Code". Les brancher serait une réécriture de l'architecture, pas un raccourci. L'agrégation des événements (JSONL + hooks) doit rester un script maison, alimentant le JSON attendu par 3d-force-graph.

Donc : pas de repo à adopter tel quel, mais une brique visuelle solide et légère à cloner (3d-force-graph), à nourrir avec un adaptateur simple plutôt qu'à chercher plus loin.

## 5. Incertitudes

- Le rendu **final stylé** (départements comme zones, halo/bloom, palette dark premium) n'existe dans aucune démo trouvée — 3d-force-graph a un exemple "Bloom Post-Processing Effect" repéré mais non ouvert (budget épuisé), à vérifier avant de conclure sur le niveau de finition atteignable sans travail DA.
- Format exact des hooks/événements émis par les ~50 agents markdown d'Oscar non audité dans cette recherche (hors scope demandé) — l'effort "adaptateur JSON simple" suppose que les JSONL + hooks portent déjà un minimum de structure (timestamp, agent source, agent cible) ; à vérifier avant de chiffrer le travail.
- Dribbble/Behance mal indexés pour ce style précis (résultats génériques "control room"/"neural network" surtout des maquettes SaaS classiques) — la recherche visuelle a été plus fertile sur des démos techniques réelles (3d-force-graph) que sur des références de design pur. Un second passage ciblé Awwwards/Codrops avec plus de budget pourrait remonter de meilleures refs éditoriales.
- Sim (simstudioai/sim) et Julep n'ont pas été vérifiés visuellement en direct (screenshot) faute de budget — classés par déduction depuis leur doc/description, à confirmer avant de les écarter définitivement.
