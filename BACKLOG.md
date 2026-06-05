# BACKLOG — sessions-atlas

Interface de visualisation cross-conversations Claude Code.

---

## 1. Séparation projets / conversations

**Etat** : à concevoir.

Vue principale qui organise les conversations par projet (pas une liste plate chronologique). Chaque projet = un groupe avec ses conversations actives/récentes. Permet de naviguer entre projets sans perdre le fil.

---

## 2. Agents actifs visibles + suggestion d'agents

**Etat** : à concevoir.

- Afficher quel agent/skill tourne sur quelle conversation en temps réel (ou dernière activité connue)
- Logique de suggestion : selon le sujet de la conversation ou le projet, proposer l'agent le plus adapté (ex. "cette conv touche au pricing → `meta-offre-pricing` disponible")

---

## 3. Conversations bloquantes — détection

**Etat** : à concevoir.
**Contexte** : une conversation peut être bloquante pour la suite d'une autre (ex. décision de design en attente qui bloque un build). 

Marquer une conversation comme "bloquante pour X" et afficher ce lien dans l'interface. Quand on ouvre une conv, voir si elle dépend d'une autre non résolue. Idéalement : un badge ⏸ ou un lien vers la conv bloquante.

---

## 4. Refactor automatique santé projet

**Etat** : à concevoir.
**Contexte** : Oscar veut savoir où on en est pour le refactor automatique des fichiers de projet (CLAUDE.md surchargé, llms.txt absent, backlogs obsolètes).

Vue d'audit dans l'interface : pour chaque projet connu, afficher un score de santé (CLAUDE.md ok / llms.txt présent / BACKLOG à jour / dette doc). Lien vers les corrections automatiques déjà appliquées ou en attente (`~/.claude/pending-debt-review.json`).

---

## Changelog

- **2026-06-05** : Backlog créé — 4 items issus des notes de session Oscar.
