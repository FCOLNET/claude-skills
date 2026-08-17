---
name: etiquette-prix-batch
description: Génère en masse des planches d'étiquettes prix de rayon imprimables à partir d'un export caisse CSV. Calcule le prix au kg/litre, le pourcentage de remise et la mention réduflation, et refuse toute ligne non conforme à la réglementation française d'affichage des prix.
when_to_use: >
  Phrases déclenchantes : "étiquettes prix", "étiquettes de rayon", "planche d'étiquettes",
  "imprimer les prix", "balisage prix", "mettre à jour les prix en rayon", "prix au kilo",
  "prix au litre", "prix barré", "réduflation", "étiquette promo", "changement de prix",
  "export caisse", "nouveaux tarifs", "conformité affichage prix", "DGCCRF", "étiquette nouveauté".
argument-hint: "[fichier.csv] [--gabarit 73x38|60x40|105x74]"
allowed-tools: Bash(python3 *) Bash(/opt/pw-browsers/chromium *) Read Write Edit Glob
---

# Étiquettes prix — génération par lot

Tu transformes un export caisse en planches d'étiquettes imprimables **conformes**.
La conformité n'est pas négociable : une ligne non conforme est refusée et motivée,
jamais corrigée en silence ni imprimée « pour dépanner ».

## Ressources

| Fichier | Contenu |
|---|---|
| [references/gabarits-etiquettes.md](references/gabarits-etiquettes.md) | Gabarits, colonnes CSV, les 4 types d'étiquette, motifs de refus, planchers de lisibilité, contrôle avant pose |
| [templates/etiquettes.css](templates/etiquettes.css) | Feuille de style des planches, inlinée dans le HTML produit |
| `scripts/generate_labels.py` | Générateur |

---

## Workflow

### 1. Obtenir le CSV

Colonnes minimales : `designation`, `prix`. Ajouter `quantite` et `unite` dès que le
produit est vendu au poids ou au volume — le prix au kg ou au litre est une obligation
légale pour tout préemballé, pas une option d'affichage.

Si l'export caisse ne porte pas ces colonnes ou les nomme autrement, le remapper avant
de lancer le générateur plutôt que de modifier le script.

### 2. Choisir le gabarit

| Gabarit | Quand |
|---|---|
| `73x38` | défaut, rail de gondole standard, 14 par A4 |
| `60x40` | rayons denses, 21 par A4 |
| `105x74` | **obligatoire dès qu'une mention réduflation est présente**, 6 par A4 |

### 3. Générer

```bash
python3 scripts/generate_labels.py produits.csv etiquettes.html --gabarit 73x38
```

Le script affiche trois blocs :
- **REFUSÉES** — lignes non conformes, avec le motif. À corriger dans le CSV source.
- **ALERTES** — à valider (désignation trop longue, gabarit inadapté).
- Le décompte des étiquettes produites et le nombre de planches.

Code retour 1 si au moins une ligne a été refusée.

### 4. Traiter les refus

Ne jamais contourner un refus en modifiant le script. Chaque motif correspond à une
obligation réelle :

- *prix au kg/L incalculable* → la contenance manque dans l'export, la récupérer
- *prix barré ≤ prix* → la promotion est fausse ; vérifier le prix de référence des
  30 derniers jours, ou passer la ligne en `normale`
- *promo sans dates* → une promotion sans période affichée n'est pas opposable
- *réduflation sans ancienne quantité* → la mention ne peut pas être calculée

### 5. Export PDF et impression

```bash
/opt/pw-browsers/chromium --headless=new --no-sandbox --disable-gpu \
  --no-pdf-header-footer --print-to-pdf=etiquettes.pdf etiquettes.html
```

Imprimer **à 100 %, sans mise à l'échelle** — un « ajuster à la page » décale toute la
grille et rend la découpe fausse. Papier 160 à 200 g/m² pour que l'étiquette tienne
dans le rail.

### 6. Avant la pose en rayon

Faire relire par une seconde personne : le générateur contrôle la conformité formelle,
pas l'exactitude commerciale. Un prix conforme mais faux reste un prix faux, et le prix
affiché engage la vente.

Utiliser la check-list de `references/gabarits-etiquettes.md` § 6. Le point le plus
souvent pris en défaut lors d'un contrôle : les étiquettes promotionnelles restées en
place après leur date de fin.

---

## Règles fermes

- **Une ligne non conforme n'est jamais imprimée.** Le refus est la fonctionnalité.
- **Le prix au kg/L est obligatoire** pour tout préemballé au poids ou au volume.
- **Un prix barré doit avoir été pratiqué** — le prix le plus bas des 30 derniers jours
  dans ce point de vente, pas un prix théorique.
- **La mention réduflation s'affiche 2 mois**, puis se retire.
- **Impression à 100 %**, jamais de mise à l'échelle.
- **Relecture humaine** des prix avant pose.

---

## Commandes

- `/etiquette-prix-batch produits.csv` — planche au gabarit par défaut
- `/etiquette-prix-batch produits.csv --gabarit 105x74` — grand format
- `/etiquette-prix-batch promo` — prépare un lot promotionnel depuis un export
- `/etiquette-prix-batch réduflation` — génère les mentions réglementaires
- `/etiquette-prix-batch conformité` — audite un CSV sans rien produire
