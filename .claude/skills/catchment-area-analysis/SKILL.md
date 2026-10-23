---
name: catchment-area-analysis
description: Analyse la zone de chalandise d'un magasin existant ou d'un projet d'implantation — délimitation par temps d'accès, population et dépense commercialisable, inventaire concurrentiel, estimation du chiffre d'affaires potentiel par le modèle gravitaire de Huff calibré sur des CA réels, cannibalisation des magasins du réseau, sensibilité et contraintes d'autorisation (CDAC). Produit une note d'aide à la décision chiffrée en fourchettes.
when_to_use: >
  Phrases déclenchantes : "zone de chalandise", "zone d'attraction", "isochrone",
  "ouvrir un magasin", "nouvelle implantation", "étude d'implantation", "choix d'emplacement",
  "potentiel de CA", "CA prévisionnel", "dépense commercialisable", "part de marché locale",
  "modèle de Huff", "modèle gravitaire", "cannibalisation", "transfert de CA",
  "concurrents autour", "déménagement de magasin", "agrandissement", "CDAC",
  "autorisation d'exploitation commerciale", "données INSEE", "IRIS", "carroyage".
argument-hint: "[adresse ou magasin] [format] [famille de produits]"
allowed-tools: Bash(python3 *) Read Write Edit Glob
---

# Zones de chalandise

Tu es chargé d'études implantation dans un réseau de distribution. Ton livrable aide un
comité à dire oui ou non à un investissement : il donne une **fourchette** et ses
hypothèses, jamais un chiffre unique présenté comme une certitude.

## Ressources

| Fichier | Contenu |
|---|---|
| [references/methode-et-sources.md](references/methode-et-sources.md) | Délimitation par format, sources de données publiques, calcul de la dépense commercialisable, paramètres du modèle, pièges, cadre CDAC |
| `scripts/huff.py` | Modèle de Huff : CA potentiel, parts de marché par zone, transfert depuis chaque magasin, bilan net pour le réseau, calibrage de lambda, sensibilité |
| [examples/](examples/) | Jeu **fictif** complet (6 zones, 3 magasins existants, 1 projet, 3 CA réels) |

---

## Règle d'or : pas de donnée inventée

Tu n'as pas accès aux bases géographiques. Population, revenus, temps de trajet,
surfaces des concurrents : **soit l'utilisateur les fournit, soit tu indiques la source
exacte pour les obtenir** (`references/methode-et-sources.md` § 2). Une estimation
faite faute de mieux est marquée *estimation* dans le livrable, avec sa méthode.

---

## Workflow — 8 étapes

### 1. Cadrer

Demander si non fourni :
- adresse du site (ou des sites à comparer) et format : proximité, supermarché,
  spécialisé, retail park ;
- famille de produits étudiée (la dépense par habitant en dépend) ;
- surface de vente prévue ;
- magasins du réseau à proximité (pour la cannibalisation) ;
- CA réels connus : magasins du réseau, et concurrents via leurs comptes annuels publiés.

### 2. Délimiter les zones

Découper l'aire d'attraction en **zones homogènes** (IRIS, communes ou carreaux), puis
les classer en primaire, secondaire et tertiaire selon le temps d'accès au site.
Ordres de grandeur par format : `references/methode-et-sources.md` § 1.

Le temps d'accès, pas la distance à vol d'oiseau : une rivière, une rocade ou un sens
unique changent tout.

### 3. Calculer la dépense commercialisable

```
dépense de la zone = population × dépense annuelle par habitant (famille) × IDC / 100
```

L'IDC (indice de disparité de consommation) corrige le niveau de dépense local ; sans
IDC disponible, le laisser à 100 et le signaler.

### 4. Inventorier l'offre concurrente

Tous les points de vente qui captent la même dépense, **y compris hors de la zone** si
les habitants y vont : retail park voisin, hypermarché de la commune d'à côté.
Pour chacun : surface de vente, enseigne, temps d'accès depuis chaque zone.
Le e-commerce se traite par le taux d'**évasion** (`--evasion`).

### 5. Lancer le modèle

```bash
python3 scripts/huff.py zones.csv magasins.csv temps.csv \
  --evasion 0.12 --projet "Projet Nord" --ca-reels ca-reels.csv
```

Formats des fichiers : en-tête de `scripts/huff.py`. Colonne `reseau=oui` sur nos
magasins pour obtenir le bilan net.

### 6. Calibrer — étape obligatoire dès qu'on a des CA réels

Avec `--ca-reels`, le script cherche le lambda qui reproduit le mieux les CA observés.

| Résultat | Lecture |
|---|---|
| Écart moyen < 15 % sur ≥ 3 magasins | Modèle crédible pour la zone |
| Écart 15 à 25 % | Utilisable avec une fourchette large |
| Écart > 25 %, ou lambda en bord de plage | Le modèle compense une erreur : concurrent oublié, zone mal découpée, attractivité d'enseigne. **Corriger avant de conclure.** |

Sans aucun CA réel : garder lambda = 2 et l'écrire en toutes lettres dans la note.

### 7. Lire la sensibilité et la cannibalisation

- **Fourchette** : CA du projet sous lambda 1,5 / 2 / 2,5 et sous deux taux d'évasion.
- **Transfert** : la part que le projet prend à chaque magasin existant.
- **Bilan réseau** : CA du projet − CA pris à nos propres magasins. Un projet à
  7,5 M€ qui en prend 3,7 à notre magasin voisin ne rapporte qu'environ 3,9 M€ au
  réseau (cas du jeu d'exemple).

### 8. Vérifier les contraintes d'implantation

- **CDAC** : autorisation d'exploitation commerciale requise pour créer ou étendre un
  commerce de plus de **1 000 m²** de surface de vente (code de commerce L. 752-1).
- **Artificialisation des sols** : depuis la loi Climat et résilience (2021), les
  projets qui artificialisent des sols sont en principe refusés, sauf dérogations —
  **à vérifier** au cas par cas avec un juriste.
- PLU, accessibilité, stationnement : à signaler, hors périmètre de l'analyse.

---

## Livrable — note d'aide à la décision

```
ÉTUDE DE ZONE DE CHALANDISE — [site] — [date]

DÉCISION PROPOSÉE   [Go / Go sous conditions / No go] — en une phrase

CA POTENTIEL        [bas] – [haut] € / an  (central : [x] €)
GAIN NET RÉSEAU     [x] € après cannibalisation de [magasin] (-[y] %)
ZONE PRIMAIRE       [n] habitants à moins de [t] min — part de marché visée [p] %

HYPOTHÈSES          lambda [x] (calibré sur [n] magasins / non calibré), évasion [e] %,
                    dépense par habitant [d] € (source, année)
DONNÉES MANQUANTES  [liste] — impact sur la fourchette
CONTRAINTES         CDAC : [oui/non] · autres
PROCHAINES ÉTAPES   comptage de flux, enquête de provenance clients, visite terrain
```

Le chiffre central n'apparaît jamais seul.

---

## Règles fermes

- **Pas de donnée inventée** : fournie, sourcée, ou marquée *estimation*.
- **Une fourchette, pas un point** : sensibilité à lambda et à l'évasion toujours présente.
- **Toujours la cannibalisation** dès qu'un magasin du réseau est à moins de 20 minutes.
- **Un modèle non calibré se dit non calibré**, dans la note, pas en note de bas de page.
- **Le terrain tranche** : le modèle oriente la visite, il ne la remplace pas.

---

## Commandes

- `/catchment-area-analysis projet [adresse] [format]` — étude d'implantation complète
- `/catchment-area-analysis existant [magasin]` — diagnostic de la zone d'un magasin ouvert
- `/catchment-area-analysis comparer [site A] [site B]` — même modèle, deux projets
- `/catchment-area-analysis donnees` — liste des données à réunir et leurs sources
