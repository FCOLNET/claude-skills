---
name: proposition-reassort
description: Calcule et publie, magasin par magasin, des propositions de réassort à partir du seul stock présent sur l'île (entrepôt, réception, stock qui dort dans un autre magasin) — ruptures, références déjà vendues ici, absents chez moi, nouveautés, substitutions, stock à céder — avec une estimation de CA et de marge, puis une page où chaque magasin accepte ou refuse avec motif. Phrases déclenchantes : "proposition de réassort", "réassort automatique", "propositions d'appro", "ce qui manque dans mes magasins", "rupture magasin", "stock qui dort", "transferts entre magasins", "nouveautés en entrepôt", "produit de substitution", "mettre à jour les propositions", "nouveaux exports".
---

# Proposition de réassort

Outil d'aide au choix, séparé du pilotage : on propose tout à chaque magasin, quelle que soit sa taille, et le magasin décide en connaissant la raison, la source et le gain estimé. Les décisions sont partagées : la centrale les voit dans la vue Réseau.

## Entrées (exports de gestion, CSV)

| Fichier | Rôle | Obligatoire |
|---|---|---|
| `art_superviseur.CSV` | base article : libellé, sous-famille, PR, PV TTC, PCB/sous-colis, stock des 8 sites (`site0..site7` = 0 ENTREPOT, 1 VILLE, 2 DUCOS, 3 CPTION, 5 MOTORP, 6 APOGOTI, 7 QLATIN, 8 GALLIENI), capacité rayon, commandé / flottant / réception, dates de dernière réception et de dernière livraison | oui |
| `ANALYSE_STOCK_VENTE_SUR_12_MOIS_*.CSV` | ventes mensuelles par magasin × article (`qte1` = mois le plus ancien, `qte12` = mois en cours ; colonnes `qte12, qte11, qte10` dans le désordre) | oui |
| `suivi_tout_12_glissants.csv` | ventes N-1 (détection des nouveautés), taux de TGC et de marge par article | oui |
| `suivi_tout_DDEXF.csv` | complète les taux de TGC sur l'exercice en cours | non |
| `suivi_tout_DDM.csv` | contrôle du mois en cours | non |

Les exports « suivi » et « analyse » écrivent les décimales avec une virgule dans un CSV séparé par des virgules : `scripts/exports.py` les relit avec le schéma de chaque colonne. Les lignes illisibles (libellé cassé, < 0,1 %) sont comptées et affichées.

## Lancer

```bash
python3 scripts/build_data.py \
  --base art_superviseur.CSV --analyse ANALYSE_STOCK_VENTE_SUR_12_MOIS.CSV \
  --glissant suivi_tout_12_glissants.csv --exercice suivi_tout_DDEXF.csv --mois suivi_tout_DDM.csv \
  --out <scratchpad>/reassort/data.json
cp templates/page.html <scratchpad>/reassort/index.html
```

Puis publier `index.html` avec l'outil Artifact, `files: {"data.json": ...}` et `capabilities: {db: {}, user: {scopes: ["profile"]}, downloads: true}`. Pour une mise à jour, republier sur la même URL : les décisions restent (elles sont dans la base de l'artefact, clé = magasin + code article). Ne jamais committer les exports ni `data.json` : ce sont des données d'entreprise.

## Exports Excel

La page génère des `.xlsx` (SheetJS 0.18.5 chargé depuis cdnjs au premier clic, fichier remis par la capacité `downloads`) :
- la liste affichée, avec ses filtres ;
- le magasin complet : un onglet par liste, plus les rayons absents ;
- « Mes choix » : demandes (bon de demande), cessions, détail ;
- le réseau : synthèse par magasin, toutes les décisions, motifs de refus, stock disputé.

## Les signaux

- **RUP** rupture récente : vendu ces 3 derniers mois, stock magasin ≤ 0, l'île en a.
- **DEJ** déjà vendu ici : vendu dans les 12 mois, plus depuis 3 mois, stock ≤ 0 ; repère Noël si ≥ 60 % des ventes en nov.–déc.
- **ABS** absent chez moi : ni vente ni stock ici, vendu ailleurs ces 6 derniers mois.
- **NOU** nouveauté qui démarre : comme ABS, sur une référence sans vente N-1 ni avant les 6 derniers mois.
- **NVD** nouveauté jamais sortie : en réserve, reçue depuis moins de 180 jours, aucun magasin ne l'a ni ne l'a vendue ; proposée à tous au sous-colis.
- **SUB** substitution : rupture partout de la référence vendue ici ; jusqu'à 3 produits en réserve de la même sous-famille, prix entre 75 % et 133 %, classés par libellé proche, prix et fournisseur.
- **CED** à céder : stock qui dort (aucune vente en 12 mois, pas de livraison depuis 90 jours) ou surstock (> 180 jours de couverture, on garde 60 jours) quand un autre magasin en a besoin.

Une référence n'apparaît qu'une fois par magasin, sous le signal le plus sûr. Les rayons absents (département, famille, sous-famille vendus par au moins 3 autres magasins, rien ici, du stock en réserve) s'affichent en tête.

## Estimations

- Vente mensuelle : ventes ÷ mois de présence (jusqu'à la dernière vente si le stock est à 0, minimum 2 mois).
- ABS / NOU / NVD : médiane des autres magasins ramenée au poids du magasin (CA 12 mois ÷ moyenne) × 0,5.
- SUB : vente de la référence remplacée × 0,5 (taux de report).
- Quantité : 30 jours de vente estimée ; au sous-colis depuis l'entrepôt, à l'unité pour un transfert ; jamais plus que le disponible.
- Marge sur 3 mois : min(quantité, 3 mois de vente) × (PV ÷ (1 + TGC) − PR).

Tous les paramètres sont en tête de `scripts/build_data.py` et rappelés dans la page (« Comment les propositions sont calculées »).

## Pistes suivantes

- Mesurer à 4 et 8 semaines la vente réelle des lignes acceptées contre l'estimation (les décisions gardent `vm`, `q`, `mg` et la date des données) et recaler les coefficients 0,5.
- Ajouter l'export des commandes internes magasin → entrepôt pour écarter les ruptures déjà commandées.
