# Gabarits d'étiquettes et conformité

---

## 1. Gabarits disponibles

| Clé | Format étiquette | Grille A4 | Par planche | Usage |
|---|---|---|---|---|
| `73x38` | 73 × 38 mm | 2 × 7 | 14 | Rail de gondole standard — défaut |
| `60x40` | 60 × 40 mm | 3 × 7 | 21 | Petit format, rayons denses |
| `105x74` | 105 × 74 mm | 2 × 3 | 6 | Grand format, mentions longues |

Les marges sont calculées pour centrer la grille sur la page. Un filet gris de
0,25 mm entoure chaque étiquette : c'est le repère de découpe au massicot.

> **Mention réduflation** : sa longueur la rend illisible sur `73x38`.
> Le générateur émet une alerte et recommande `105x74`.

---

## 2. Colonnes du CSV

| Colonne | Obligatoire | Format | Note |
|---|---|---|---|
| `reference` | non | libre | affichée en petit, en haut |
| `designation` | **oui** | texte | tronquée à 2 lignes au-delà de ~40 caractères |
| `prix` | **oui** | `8.90` ou `8,90` | prix de vente TTC en euros |
| `quantite` | selon unité | numérique | contenance ; requise pour g/kg/ml/cl/l |
| `unite` | selon produit | `g` `kg` `ml` `cl` `l` `piece` | détermine le prix au kg ou au litre |
| `type` | non | `normale` `promo` `reduflation` `nouveaute` | défaut : `normale` |
| `prix_barre` | si promo | `12.90` | doit être **strictement supérieur** à `prix` |
| `date_debut` | si promo | libre | ex. `01/06/2026` |
| `date_fin` | si promo | libre | ex. `14/06/2026` |
| `ancienne_quantite` | si réduflation | numérique | doit être supérieure à `quantite` |
| `ancien_prix` | non | numérique | à défaut, prix supposé inchangé |

Les décimales acceptent la virgule comme le point. L'en-tête est obligatoire.

---

## 3. Les quatre types d'étiquette

### `normale`
Prix TTC + prix au kg/L si le produit est vendu au poids ou au volume.

### `promo`
Ajoute le prix barré, le pourcentage de remise calculé, les dates de validité et la
mention de prix de référence :

> « Prix de référence : prix le plus bas pratiqué au cours des 30 derniers jours dans ce
> point de vente. »

Le générateur **refuse** une promotion dont le prix barré est inférieur ou égal au prix
de vente : c'est une pratique commerciale trompeuse au sens de l'article L. 121-2 du
code de la consommation, pas une erreur de saisie à corriger silencieusement.

### `reduflation`
Produit la mention prescrite par l'arrêté du 16 avril 2024, applicable depuis le
1er juillet 2024 :

> « Pour ce produit, la quantité vendue est passée de X à Y et son prix au kg a
> augmenté de Z %. »

Le pourcentage est calculé sur le **prix à l'unité de mesure**, avant et après :

```
prix_unitaire_avant  = ancien_prix / ancienne_quantite
prix_unitaire_après  = prix / quantite
hausse %             = (après / avant − 1) × 100
```

Sans `ancien_prix`, le calcul suppose le prix inchangé — cas de figure le plus courant
et celui que la réglementation vise en premier.

**Durée d'affichage : 2 mois** à compter de la mise en vente du nouveau conditionnement.

### `nouveaute`
Ajoute un bandeau « NOUVEAU » en angle supérieur droit. Aucune obligation légale
attachée, c'est un marqueur commercial.

---

## 4. Ce que le générateur refuse

Une ligne refusée n'est pas imprimée. Le motif est affiché. Aucun contournement.

| Refus | Motif |
|---|---|
| Désignation absente | le produit n'est pas identifiable |
| Prix absent ou nul | l'affichage du prix est une obligation légale |
| Prix au kg/L incalculable sur un produit au poids ou au volume | mention obligatoire pour tout préemballé |
| `type=promo` sans prix barré ou sans dates | promotion non justifiable |
| Prix barré ≤ prix de vente | pratique commerciale trompeuse |
| `type=reduflation` sans ancienne quantité, ou quantité qui n'a pas diminué | mention non fondée |
| Type inconnu | erreur de saisie dans l'export |

---

## 5. Plancher de lisibilité

| Élément | Hauteur de capitale | `font-size` appliqué |
|---|---|---|
| Prix de vente | ≥ 5 mm | 11 mm |
| Prix au kg / L | ≥ 3 mm | 4,3 mm |
| Désignation | — | 3,6 mm |
| Mentions | — | 2,8 mm |

Ces valeurs sont fixées dans `templates/etiquettes.css`. Les réduire fait sortir
l'étiquette du cadre réglementaire de lisibilité.

---

## 6. Contrôle avant pose en rayon

- [ ] Le prix de l'étiquette correspond au prix en base caisse
- [ ] Les dates de promotion couvrent bien la période d'affichage
- [ ] Le prix de référence barré a été effectivement pratiqué dans les 30 jours
- [ ] Les mentions réduflation dont les 2 mois sont écoulés ont été retirées
- [ ] Aucune étiquette promo n'est restée en place après la date de fin

Le dernier point est le plus souvent pris en défaut lors d'un contrôle DGCCRF : une
promotion affichée au-delà de sa date de fin engage à vendre au prix affiché.
