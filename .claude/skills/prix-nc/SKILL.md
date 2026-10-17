---
name: prix-nc
description: Collecte chaque semaine les prix publiés par l'observatoire prix.nc du gouvernement de la Nouvelle-Calédonie (relevés des magasins, produits, fichiers Bouclier Qualité Prix) et les analyse — indice de prix par magasin, écarts de prix entre enseignes, comparaison de panier, évolution d'une semaine à l'autre.
when_to_use: >
  Phrases déclenchantes : "prix.nc", "observatoire des prix", "prix Nouvelle-Calédonie",
  "prix NC", "relevés de prix", "comparer les prix des enseignes", "veille prix",
  "qui est le moins cher", "indice de prix", "panier", "comparer un panier",
  "écart de prix", "évolution des prix", "hausse de prix", "Bouclier Qualité Prix", "BQP",
  "DAE", "prix transmis", "350 m²", "Carrefour / Leader Price / Casino / Auchan / Géant NC",
  "vie chère".
argument-hint: "[collecter | indice | ecarts | panier | evolution] [options]"
allowed-tools: Bash(python3 *) Read Write Edit Glob
---

# prix-nc — veille des prix en Nouvelle-Calédonie

Tu exploites l'API publique de prix.nc, où le gouvernement publie les prix que les
magasins de 350 m² et plus lui transmettent chaque semaine, plus les relevés terrain
de la DAE. Tu produis des comparaisons **sourcées et datées**. Un chiffre sans date
d'instantané ni périmètre n'est pas livré.

## Ressources

| Fichier | Contenu |
|---|---|
| [references/api-prix-nc.md](references/api-prix-nc.md) | Cadre réglementaire, routes, champs, pièges (pagination, fuseau, absence d'historique) |
| `scripts/prix_nc.py` | Collecte et analyses, bibliothèque standard Python uniquement |
| `examples/panier-exemple.csv` | Modèle de panier (EAN + quantité) |

---

## Workflow

### 1. Collecter un instantané

```bash
python3 scripts/prix_nc.py collecter --dossier donnees/prix-nc
```

Crée `donnees/prix-nc/AAAA-MM-JJ/` (date de Nouméa) :

| Fichier | Contenu |
|---|---|
| `releves.csv` | Un prix par produit × magasin, enrichi de l'EAN, de la marque, du secteur, de la commune et du type de commerce |
| `magasins.csv`, `produits.csv` | Référentiels |
| `bqp.csv`, `bqp/` | Liste et copie des fichiers Bouclier Qualité Prix |
| `manifeste.json` | Date de collecte, volumes, plage de dates des relevés |

CSV en `;` et UTF-8 avec BOM : ils s'ouvrent directement dans Excel. Une collecte
complète prend **8 à 10 minutes** (le serveur est lent) : la lancer en arrière-plan.
Si un instantané existe déjà pour le jour, il est remplacé.

**L'API ne garde pas d'historique.** Elle ne renvoie que le dernier prix connu. Sans
archivage hebdomadaire de notre côté, aucune évolution n'est mesurable. Proposer de
planifier la collecte (tâche planifiée, cron) dès la première utilisation.

`donnees/` est exclu de git : environ 40 Mo par instantané.

### 2. Analyser

Toutes les analyses acceptent les mêmes filtres : `--commune`, `--magasin`, `--type`,
`--secteur`, `--sans-promo`, `--min-magasins`, `--top`, `--csv`.

| Question | Commande |
|---|---|
| Quel magasin est le moins cher ? | `indice INSTANTANE --type "grande surface"` |
| Sur quels produits les écarts sont-ils les plus forts ? | `ecarts INSTANTANE --secteur epicerie --min-magasins 5` |
| Combien coûte ce panier dans chaque magasin ? | `panier INSTANTANE panier.csv --commune Nouméa` |
| Qu'est-ce qui a bougé depuis la semaine dernière ? | `evolution INSTANTANE_AVANT INSTANTANE_APRES --seuil 10` |

**Indice** : pour chaque produit vendu dans au moins `--min-magasins` magasins, le
prix médian vaut 100. L'indice d'un magasin est la moyenne géométrique de ses ratios
prix / médiane. 95 veut dire « 5 % moins cher que le prix médian sur les produits qu'il
vend ». Les magasins avec moins de `--min-produits` produits comparables sont écartés.

**Panier** : CSV avec une colonne `ean` (ou `id_produit`) et `quantite`. Seuls les
magasins qui ont **tout** le panier sont classés ; les autres sont listés à part, car
leur total partiel n'est pas comparable.

**Évolution** : compare les couples produit × magasin présents dans les deux
instantanés. La variation moyenne est géométrique, donc insensible au poids d'un
produit cher.

### 3. Restituer

Chaque livrable indique :
- la **date de l'instantané** et la plage de dates des relevés (dans `manifeste.json`) ;
- le **périmètre** : filtres, nombre de magasins et de produits comparés ;
- la **source** : « prix.nc, observatoire des prix du gouvernement de la Nouvelle-Calédonie ».

Pour un tableau ou un graphique, partir de l'export `--csv`.

---

## Règles fermes

- **Ne jamais inventer ni interpoler un prix.** Un produit absent d'un magasin est
  absent ; il n'est pas remplacé par la médiane.
- **Ne pas comparer grandes et petites surfaces sans le signaler.** Sous 350 m², les
  prix viennent des relevés terrain trimestriels : peu de produits, dates anciennes.
  Filtrer avec `--type` ou le dire explicitement.
- **Un indice n'est valable que sur un assortiment commun suffisant.** Indiquer le
  nombre de produits comparés ; ne pas conclure sous la centaine.
- **Les promotions faussent les comparaisons de fond.** Pour un positionnement prix,
  utiliser `--sans-promo` ; pour une photo du ticket de caisse réel, les garder.
- **Signaler les relevés anciens.** Un prix relevé il y a deux mois n'est pas un prix
  d'aujourd'hui : vérifier `date_releve` avant d'affirmer quoi que ce soit sur un magasin.
- **Rester en lecture et rester sobre** : 3 appels simultanés au maximum, une collecte
  complète par jour au plus. C'est un service public.
- **Pas de conclusion juridique** sur le respect de l'obligation de transmission par
  une enseigne : l'absence d'un magasin dans l'API peut avoir d'autres causes. Orienter
  vers la DAE.

---

## Commandes

- `/prix-nc collecter` — nouvel instantané
- `/prix-nc indice` — classement des grandes surfaces sur le dernier instantané
- `/prix-nc ecarts [secteur]` — produits aux plus forts écarts
- `/prix-nc panier fichier.csv [commune]` — comparaison de panier
- `/prix-nc evolution` — compare les deux derniers instantanés
- `/prix-nc bqp` — liste et résume les derniers fichiers Bouclier Qualité Prix
