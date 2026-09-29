# Ticket — AiXel Visual Melody Pro Tools V1

**Produit :** AiXel Visual Melody (`visualmelody.netlify.app`)  
**Repo :** `axelfisch/AiXel-Visual-Melody`  
**Owner :** Axel Fisch  
**Statut :** Finalisé — ordre verrouillé (2026-09-28)  
**Issue :** https://github.com/axelfisch/AiXel-Visual-Melody/issues/26  
**Dépendances :** AiXel Director V1 (mergé), registry moteurs, Export MP4, backlog Creator Pro (entitlements / watermark)

---

## Objectif

Étendre Create / Preview / Export avec quatre outils premium, tous pilotés par **AiXel Creator** (faders Director + choix de couleurs), avec sortie **1080p** et option **sans watermark** côté Creator Pro.

### Outils inclus

| Code | Nom | Description |
| --- | --- | --- |
| A | Dance Avatars | 5 avatars stylés qui dansent au beat |
| B | Image Pulse | Image / cover uploadée animée au rythme |
| C | Lyric Canvas | Paroles cinématiques synchronisées |
| D | Particle Sphere | Sphère de particules colorées, export 1080 HD |

---

## Principes non négociables

1. Préserver le workflow **Home → Analyze → Create → Preview → Export** et Settings partout.
2. Un contrôle Creator doit mapper un **paramètre renderer réel** (contrat Director V1) — pas de faders décoratifs.
3. Preview et Export consomment le **même** `project.engine.parameters` / config outil.
4. Free reste honnête : 720p, end card / watermark AiXel, subset d’outils.
5. Ne pas merger Creator Pro billing avant readiness ; le toggle watermark / 1080p se **gate** sur entitlement (même si entitlement est encore stub / owner override en dev).

---

## Ordre d’implémentation VERROUILLÉ

| Sprint | Epic | Livrable | Pourquoi |
| --- | --- | --- | --- |
| 1 | Epic 0 | AiXel Creator commun + Color Energy / Light mappés | Fondation pour tous les outils |
| 2 | Epic 1 | Particle Sphere registry + Preview/Export 720 | Lab PR #18 déjà prêt |
| 3 | Epic 5 | Gate 1080p + Sans watermark (stub OK) | Positionnement Pro sans Stripe live |
| 4 | Epic 2 | Image Pulse | Wow rapide, assets simples |
| 5 | Epic 3 | Dance Avatars (5 styles) | Plus lourd (rigs) |
| 6 | Epic 4 | Lyric Canvas | Timestamps manuels V1 |

PRs Creator Pro billing (#19→#25) : merger dans l’ordre avant achat réel. Ne **pas** bloquer A–D derrière Stripe.

## Prochaine action code

Branch `feat/pro-tools-creator-sphere` — Epic 0 puis Epic 1.

---

## Extension — Mixage deux couches (2026-09-29)

Demande Axel : pouvoir sélectionner deux moteurs (ex. 1. Jazz Geometry + 2. Avatars danse) et aussi mixer deux moteurs classiques.

- **Create → Mixage de couches** : interrupteur *Mixer deux moteurs*, *Couche 1 (fond)*, *Couche 2 (premier plan)* (*Aucune* = moteur unique, défaut inchangé), *Inverser les couches*.
- N’importe quel moteur (6 classiques + 4 outils Pro) sur l’une ou l’autre couche ; le même moteur sur les deux couches est refusé.
- Couche 2 : *Opacité* 0–100 %, *Mode de fusion* Normal / Écran / Lumière / Addition / Superposition, *Assombrir le fond* 0–60 %.
- Défauts auto : outil Pro au-dessus → Normal 85 % (+ fond assombri 15–30 %) ; Image Pulse au-dessus → Écran 70 % ; classique au-dessus → Écran 50 %.
- Rendu : un seul moteur composite (`src/engines/layer-mix/`) consommé par Create, Preview et Export (`resolveProjectRender`) → WYSIWYG ; même frame audio (temps / énergie / onset / BPM) pour les deux couches ; watermark dessiné une fois par-dessus le composite ; gates 720p/1080p inchangés.
- Outils Pro en mode transparent quand ils sont en couche 2 (`RenderSurface.transparent`).
- Faders Director + couleurs Creator partagés par les deux couches ; le titre appartient à la couche 1.
- Persisté dans `project.mix` (rétrocompatible : absent = moteur unique).
