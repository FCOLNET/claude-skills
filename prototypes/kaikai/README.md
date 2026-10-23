# Kaïkaï — prototype

Appli consommateur de démonstration, à partir des prix publiés par l'observatoire prix.nc.
Non officielle. Deux onglets :

- **Ma liste de courses** : on ajoute des produits par recherche, ou en lisant la photo d'une liste
  manuscrite (lue par Claude, avec l'accord de l'utilisateur). L'appli donne le magasin le moins cher
  pour toute la liste, et la meilleure combinaison de deux magasins de la même commune.
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
