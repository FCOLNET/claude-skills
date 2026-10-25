# Kaïkaï — prototype

Appli consommateur de démonstration, à partir des prix publiés par l'observatoire prix.nc.
Non officielle. Quatre onglets :

- **Ma liste de courses** : on ajoute des produits par recherche, ou en lisant la photo d'une liste
  manuscrite (lue par Claude, avec l'accord de l'utilisateur). L'appli donne le magasin le moins cher
  pour toute la liste, et la meilleure combinaison de deux magasins de la même commune. Les cartes
  de fidélité cochées par l'utilisateur sont prises en compte, et le coût du trajet depuis son
  quartier (carburant, temps, CO2) quand il l'indique (voir plus bas).
- **Promos** : toutes les promotions de la zone, classées (bon coup, vraie promo, promo faible,
  trompeuse), pour faire des réserves ou éviter les fausses bonnes affaires.
- **Menu de la semaine** : Claude compose les repas de 7 jours dans un budget, avec les produits les
  moins chers de la commune, puis remplit la liste de courses.
- **Recettes** : le coût de 5 recettes calédoniennes au meilleur prix.

Version en ligne : https://claude.ai/artifact/4rxympDnSY29hFxoCuxe9s (privée, à partager
depuis le menu « Partager » de la page).

## Fichiers

| Fichier | Rôle |
|---|---|
| `kaikai.html` | Page à publier, avec les recettes et tous les prix de la liste intégrés (4,5 Mo) |
| `kaikai-autonome.html` | Même page en document complet, à télécharger et ouvrir hors ligne |
| `liste-data.json` | Tous les prix (24 700 produits, 238 magasins), intégrés dans la page par `construire.py` |
| `template.html` | Page sans données (le marqueur `__DATA__` reçoit le JSON des recettes) |
| `construire.py` | Chiffre les recettes à partir d'un instantané et produit `kaikai.html` |
| `construire_liste.py` | Produit `liste-data.json` à partir d'un instantané |
| `positions/` | Positions ajoutées aux magasins sans coordonnées prix.nc, centres des communes, quartiers de départ |

## Mettre à jour les prix

```bash
# 1. Nouvel instantané (≈ 15 min)
python3 .claude/skills/prix-nc/scripts/prix_nc.py collecter --dossier donnees/prix-nc

# 2. Reconstruire les données de la liste, puis la page (dans cet ordre)
python3 prototypes/kaikai/construire_liste.py donnees/prix-nc/AAAA-MM-JJ
python3 prototypes/kaikai/construire.py donnees/prix-nc/AAAA-MM-JJ
```

Publier `kaikai.html` avec la capacité `sample` avec images (`{"sample": {"images": true}}`)
pour la lecture de photo et la lecture de liste par Claude. Hors de claude.ai (version
autonome), Claude n'est pas disponible : la recherche, la saisie de texte (lue ligne à ligne),
les calculs et les recettes fonctionnent ; la lecture de photo est masquée.

## Règles de la liste de courses

- « Le moins cher équivalent » (par défaut) : dans chaque magasin, le produit le moins cher de la même
  variété prix.nc, de la même unité et d'un format à ±30 % du produit choisi.
- « Exactement ce produit » : seulement ce code-barre.
- Un magasin n'est classé que s'il a toute la liste. Le duo de magasins n'associe que deux magasins de la
  même commune, et n'est proposé que s'il fait gagner au moins 5 % et 200 F.
- La photo est envoyée à Claude, qui renvoie les articles lus ; chacun est rapproché du catalogue par la
  recherche locale et l'utilisateur valide avant l'ajout.

## Promos

Les 9 771 relevés en promotion de l'instantané (champ `promos` de `liste-data.json`, avec l'âge du
relevé), filtrés sur la zone choisie (même réglage que la liste : commune ou rayon autour du départ).

| Étiquette | Règle |
|---|---|
| Bon coup −X % | au moins 30 % sous le prix habituel ET prix le plus bas relevé en Nouvelle-Calédonie pour ce produit |
| Vraie promo −X % | au moins 5 % sous le prix habituel |
| Promo faible | moins de 5 % sous le prix habituel |
| Promo trompeuse | prix égal ou supérieur au prix habituel |
| Promo | moins de 3 magasins hors promotion : pas de comparaison possible |

Prix habituel = médiane des prix hors promotion du produit (au moins 3 magasins). Au 17/10/2026, à
Nouméa : 3 544 promos, dont 535 bons coups, 404 trompeuses et 116 faibles.

- Conservation (6e champ des produits, d'après le secteur prix.nc) : « se garde » (épicerie,
  boissons, entretien, hygiène…), « congélateur » (surgelés), « frais ». Pour les bons coups et vraies
  promos qui se gardent, un compteur « Réserve » calcule l'économie sur le prix habituel.
- Pour une promo faible ou trompeuse : le même produit moins cher sans promo ailleurs dans la zone,
  et l'équivalent moins cher dans le même magasin (bouton « Ajouter l'équivalent »).
- Filtres : type, conservation, recherche ; tri par remise, économie ou date. Relevé de plus de
  7 jours signalé (une promo a une durée limitée).

## Menu de la semaine

- L'utilisateur indique le nombre de personnes, le budget, les repas (dîners ; déjeuners et dîners ;
  les trois repas), son régime, ce qu'il a déjà au placard et ses envies.
- La page construit un catalogue d'une soixantaine de produits de base (liste `BASES` dans
  `template.html`) : pour chacun, la référence la moins chère à l'unité dans les magasins retenus
  (commune ou rayon autour du point de départ), sans les formats de plus de 3 fois le prix du plus
  petit. Claude reçoit ce catalogue avec ses prix et répond en un seul appel (JSON : repas, courses
  par identifiant du catalogue et quantité, conseils).
- Le coût réel est recalculé avec le même moteur que la liste (magasin le moins cher, équivalents,
  fidélité, trajet) et comparé au budget ; « Refaire un menu moins cher » renvoie l'écart à Claude.
- « Mettre ces courses dans ma liste » / « Ajouter à ma liste » ; le dernier menu reste dans le
  navigateur. Sans Claude (version autonome), l'onglet l'indique et reste désactivé.

## Pièges du rayon

Dans le détail d'un magasin (et en résumé dans le verdict), chaque ligne de la liste est vérifiée :

- **Promo trompeuse** : prix en promotion égal ou supérieur au prix habituel du produit (médiane
  de ses prix hors promotion dans au moins 3 magasins). Au 17/10/2026 : 816 promotions sur 8 182
  comparables. « Promo faible » sous −5 %, sinon « vraie promo −X % ».
- **Grand format piège** : dans le même magasin, n petits formats du même produit (même nom hors
  contenance, même quantité à ±10 %, moins chers à l'unité) coûtent au moins 3 % et 20 F de moins
  que le grand. 734 cas au 17/10/2026, calculés par `construire_liste.py` (champ `formats`).
  Le bouton « Prendre n petits formats » remplace la ligne.

## Cartes de fidélité

Les règles sont dans le bloc `<script type="application/json" id="fidelite">` de `template.html` :
on les corrige là, sans toucher au code, puis on relance `construire.py`.

| Carte | Enseignes | Règle appliquée | Statut |
|---|---|---|---|
| Mon Club | Géant, Casino | 10 % des produits Casino en cagnotte, hors promotion | site monclub.nc |
| Cado | Korail, K-Gou | 100 F par tranche de 5 000 F, hors promotion | site cado.nc |
| CONSO+ | Carrefour Market, Express | 20 points par 2 000 F (+1 ou 2 pour le reste), 1 point = 1 F | à confirmer |
| Waaoh | Auchan | 5 % des produits Auchan en bon d'achat | à confirmer (2022) |
| Carte U | Hyper U, Super U | 5 % des produits U | à confirmer (2022) |

Types de règle : `marque` (taux sur une marque propre ; la marque est le 6e champ des produits dans
`liste-data.json`, calculée par `construire_liste.py`), `tranches` (gain par tranche de ticket),
`conso` (barème CONSO+). `horsPromo` exclut les produits en promotion. Leader Price et Discount
n'ont pas de programme connu.

Dans l'appli :
- « Mes cartes de fidélité » : l'utilisateur coche ses cartes (gardées dans son navigateur).
- Avec « Déduire mes cagnottes », les magasins sont classés sur le prix net (caisse moins cagnotte),
  et le « moins cher équivalent » préfère la marque propre quand la remise la rend moins chère.
  Le prix en caisse reste affiché.
- « Quelle carte vaut le coup pour cette liste ? » : pour chaque carte, le meilleur magasin de
  l'enseigne, son prix net et l'écart avec le moins cher sans carte, avec l'estimation sur un an.
- Le duo de magasins est calculé sur le prix en caisse seul.
- Non comptés : offres ciblées (Happy Remises…), opérations points × 2, cotisation Mon Club
  (1 000 F par an après la 1re année).

## Trajet

« Mon trajet » : l'utilisateur choisit son quartier (ou sa position, si le navigateur la donne) et
son moyen de déplacement. Les paramètres sont dans le bloc `<script type="application/json"
id="trajet-config">` de `template.html` : **prix du litre à mettre à jour chaque mois**
(prix maximums publiés par l'Observatoire de l'énergie, observatoire-energie.gouv.nc).

- Distance : vol d'oiseau × 1,3 (détour), aller et retour. Pas de calcul d'itinéraire.
- Temps : 30 km/h sur les 20 premiers km, 70 km/h au-delà.
- Carburant : litres × prix maximum du mois (octobre 2026 : essence 182,4 F, gazole 190,6 F).
  Consommation par défaut : 7 L (essence), 6 L (diesel), 4,5 L (hybride), modifiable.
- CO2 : 2,7 kg par litre d'essence, 3,1 par litre de gazole (ADEME, production et combustion).
- Voiture électrique : 17 kWh aux 100 km, 41,81 F le kWh (tarif domestique d'octobre 2026),
  0,31 kg de CO2 par kWh (estimation : 66 % de renouvelables dans la distribution publique selon
  Enercal, le reste au fioul et au charbon).
- « Mon bilan carbone » : CO2 et coût du trajet par course et par an (fréquence au choix),
  face au magasin le plus proche, au moins cher en caisse et aux autres moyens de déplacement.
  Seul le trajet est compté (ni la fabrication du véhicule, ni l'empreinte des produits).
- Temps passé : compté seulement si l'utilisateur lui donne une valeur en F de l'heure.
- À pied, à vélo ou en bus : trajet gratuit, magasins à moins de 8 km seulement.
- Classement au choix : tout compris (caisse − cagnotte + trajet), en caisse, le plus proche.
  « À moins de 15 km de mon point de départ » remplace la commune par défaut.
- Duo de magasins : avec un point de départ, n'importe quels deux magasins, tournée
  départ → A → B → départ comprise ; il disparaît souvent une fois le détour compté.

Positions des magasins (`construire_liste.py`) : coordonnées prix.nc (154 magasins, vérifiées
à moins de 100 m d'OpenStreetMap pour les enseignes) ; sinon `positions/magasins.csv`
(OpenStreetMap ou quartier, une ligne commençant par `~` est une expression régulière) ;
sinon le centre de la commune (`positions/communes.csv`). L'appli signale les positions
approximatives. À compléter en priorité : Hyper U Païta, Super U Koumac, K-Gou Pouembout,
Leader Price Poindimié, Carrefour Eco Kim Chi (au centre de leur commune aujourd'hui).

## Ajouter ou modifier une recette

Les recettes sont dans la liste `RECETTES` de `construire.py`. Chaque ingrédient donne :
un nom affiché, la quantité pour 4 personnes, l'unité (`kg`, `l` ou `u`) et la liste des
**variétés** prix.nc qui lui correspondent (champ `variete` de `produits.csv`, par exemple
`"oeuf frais"` ou `"riz jasmin ou thaï"`). Choisir des variétés vendues dans beaucoup de
magasins : les fruits, légumes, viandes et poissons frais sont peu présents dans les données.

## Règles de calcul

- Pour chaque ingrédient et chaque magasin, le produit retenu est celui qui coûte le moins
  en caisse pour la quantité demandée (pas le meilleur prix au kilo, qui peut être un
  carton de 10 kg).
- **Coût du plat** : la part du produit réellement utilisée. **Ticket de caisse** : les
  paquets entiers, sans les ingrédients marqués « J'en ai déjà ».
- Un magasin n'est classé que s'il a tous les ingrédients nécessaires (en mode ticket,
  ceux qui restent à acheter).
- Les prix unitaires à plus de 3 fois ou moins du tiers de la médiane de l'ingrédient
  sont écartés.
- Les relevés de plus de 30 jours sont signalés dans la page.
