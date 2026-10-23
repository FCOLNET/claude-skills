# Méthode et sources — zones de chalandise

---

## 1. Délimiter l'aire d'attraction

### Ordres de grandeur par format

À ajuster au contexte (urbain dense, périurbain, rural) — ce sont des points de départ,
pas des normes.

| Format | Zone primaire | Zone secondaire | Zone tertiaire | Mode d'accès dominant |
|---|---|---|---|---|
| Proximité urbaine | 5 min à pied | 10 min à pied | — | piéton |
| Supermarché | 5 à 10 min | 10 à 15 min | 15 à 20 min | voiture |
| Hypermarché | 10 min | 10 à 20 min | 20 à 30 min | voiture |
| Spécialisé de centre-ville | 10 min | 20 min | 30 min | mixte, transports |
| Spécialisé en retail park | 15 min | 15 à 30 min | 30 à 45 min | voiture |

Part du CA généralement réalisée en zone primaire : la moitié ou plus pour un magasin
alimentaire. Le vérifier sur les magasins existants du réseau (adresses des porteurs de
carte de fidélité) plutôt que de reprendre ce chiffre.

### Unité de découpage

| Unité | Avantage | Limite |
|---|---|---|
| Commune | données faciles | trop grosse en ville |
| IRIS (≈ 2 000 habitants) | bon compromis en zone urbaine | n'existe que dans les communes de plus de 5 000 habitants environ |
| Carreau de 200 m (Filosofi) | finesse maximale, revenus disponibles | secret statistique sur les carreaux peu peuplés |

### Temps d'accès

Calculer des **isochrones** (lignes d'égal temps de trajet) sur le réseau routier réel :
services en ligne d'itinéraire et d'isochrones de l'IGN, OpenRouteService, OSRM. Préciser
l'heure de calcul : un temps à 18 h n'est pas un temps à 10 h.

---

## 2. Sources de données

| Donnée | Source | Accès |
|---|---|---|
| Population par commune, IRIS | INSEE — recensement de la population | gratuit, insee.fr |
| Revenus par carreau de 200 m | INSEE — Filosofi, données carroyées | gratuit, insee.fr |
| Structure des dépenses des ménages par poste | INSEE — enquête Budget de famille ; comptes nationaux | gratuit, insee.fr |
| Équipements commerciaux géolocalisés | INSEE — Base permanente des équipements (BPE) | gratuit |
| Établissements actifs | INSEE — répertoire SIRENE | gratuit, api et data.gouv.fr |
| Surfaces de vente des concurrents | décisions CDAC publiées ; bases professionnelles payantes ; relevé terrain | variable |
| CA des concurrents | comptes annuels publiés au greffe (société d'exploitation du magasin) | gratuit ou faible coût |
| Indices de disparité de consommation (IDC) | études de CCI, cabinets spécialisés | souvent payant |
| Provenance réelle des clients | fichier fidélité du réseau, enquête en sortie de caisse | interne |

Toujours noter l'**année** de la donnée dans le livrable : une population de 2019 dans un
quartier en construction est fausse de plusieurs milliers d'habitants.

---

## 3. Dépense commercialisable

```
dépense zone = population × dépense annuelle par habitant (famille) × IDC / 100
marché captable = Σ dépenses zones × (1 − évasion)
```

- **Dépense par habitant** : par famille de produits (alimentaire, équipement de la
  maison, bricolage…), jamais la consommation totale des ménages.
- **Évasion** : part de la dépense qui part ailleurs — e-commerce, achats sur le lieu
  de travail, magasins hors modèle. Fortement dépendante de la famille de produits ;
  tester au moins deux valeurs.

---

## 4. Le modèle de Huff

```
                A_j · S_j^α / T_ij^λ
P(i → j) = ─────────────────────────────
            Σ_k  A_k · S_k^α / T_ik^λ
```

| Paramètre | Sens | Valeur de départ |
|---|---|---|
| `S_j` | surface de vente du magasin j | m² |
| `T_ij` | temps d'accès de la zone i au magasin j | minutes (plancher 1) |
| `α` | sensibilité à la taille de l'offre | 1 |
| `λ` | frein de la distance : plus il est fort, plus le client va au plus près | 2 ; plus fort pour l'alimentaire de proximité, plus faible pour le spécialisé |
| `A_j` | attractivité propre (enseigne, prix, parking) | 1, à n'ajuster que sur preuve |

**Calibrer λ** sur des CA réels (≥ 3 magasins) avant toute décision. Un λ qui part en
bord de plage signale presque toujours une erreur de données, pas un comportement réel.

**Ne pas abuser de `A_j`** : chaque attractivité ajustée « à la main » est un degré de
liberté qui permet de faire dire au modèle ce qu'on veut entendre.

### Limites à rappeler dans la note

- Le modèle ignore les flux de passage (trajet domicile-travail, gare) : un site sur un
  axe de flux fait mieux que le modèle.
- Il suppose des magasins substituables : deux formats très différents se concurrencent
  moins que ne le dit le modèle.
- Il donne un **potentiel à maturité**, pas le CA de la première année.

---

## 5. Pièges fréquents

| Piège | Effet | Parade |
|---|---|---|
| Oublier un concurrent hors de la zone | CA du projet surestimé | inventorier sur l'aire tertiaire entière |
| Distance à vol d'oiseau | zones mal classées | temps de trajet réel |
| Évasion à 0 % | CA surestimé | toujours poser une hypothèse d'évasion |
| Pas de cannibalisation | gain réseau surestimé | colonne `reseau=oui` |
| Données de population anciennes | biais dans les quartiers neufs | permis de construire, programmes livrés |
| Un seul CA réel pour calibrer | λ arbitraire | au moins 3 magasins |

---

## 6. Cadre d'autorisation

| Règle | Texte | Contenu | Statut |
|---|---|---|---|
| Autorisation d'exploitation commerciale | Code de commerce L. 752-1 | Création ou extension au-delà de **1 000 m²** de surface de vente : passage en CDAC | stable |
| Lutte contre l'artificialisation | Loi n° 2021-1104 « Climat et résilience » ; code de commerce L. 752-6 | Projet artificialisant les sols refusé sauf dérogations limitées | **à vérifier** au cas par cas |

Dernière vérification : 23/10/2026.
