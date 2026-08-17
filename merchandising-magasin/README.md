# Merchandising magasin

Skills de merchandising pour un réseau de points de vente physiques.

## Installation

```bash
claude plugin marketplace add FCOLNET/claude-skills
claude plugin install merchandising-magasin@retail-nc
```

## Skills

| Skill | Usage |
|---|---|
| `planogram-builder` | Conçoit et audite des planogrammes : répartition du linéaire, calcul des facings, structuration de catégorie, révision saisonnière. |
| `visual-merchandising` | Briefs vitrines, animations saisonnières, guides ILV/PLV, audit de conformité à la charte, calendrier promotionnel. |
| `plv-print-factory` | Produit des fichiers PLV/ILV prêts pour l'imprimeur en HTML/CSS calé au millimètre : fonds perdus, contrôle pré-vol, déclinaison sur le réseau. |
| `etiquette-prix-batch` | Génère des planches d'étiquettes de rayon depuis un export caisse CSV : prix au kg/litre, pourcentage de remise, mention réduflation. |

Les skills se déclenchent d'elles-mêmes sur le vocabulaire métier (« planogramme »,
« stop-rayon », « étiquettes prix », « brief vitrine »…) — inutile de les appeler
explicitement.

## Dépendances

`plv-print-factory` et `etiquette-prix-batch` embarquent des scripts Python. Ils
s'exécutent avec l'interpréteur Python de la machine, sans installation particulière.

## Conformité

Les règles d'affichage des prix (prix à l'unité de mesure, prix barré, réduflation)
suivent la réglementation française applicable en Nouvelle-Calédonie. Les skills refusent
de produire une étiquette non conforme plutôt que de produire un affichage sanctionnable.
