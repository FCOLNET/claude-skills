# Kaïkaï — prototype

Appli consommateur de démonstration : le coût de recettes calédoniennes au meilleur prix,
magasin par magasin, à partir des prix publiés par l'observatoire prix.nc. Non officielle.

Version en ligne : https://claude.ai/artifact/4rxympDnSY29hFxoCuxe9s (privée, à partager
depuis le menu « Partager » de la page).

## Fichiers

| Fichier | Rôle |
|---|---|
| `kaikai.html` | Page prête à ouvrir, données du 17/10/2026 incluses |
| `template.html` | Page sans données (le marqueur `__DATA__` reçoit le JSON) |
| `construire.py` | Chiffre les recettes à partir d'un instantané et produit `kaikai.html` |

## Mettre à jour les prix

```bash
# 1. Nouvel instantané (≈ 15 min)
python3 .claude/skills/prix-nc/scripts/prix_nc.py collecter --dossier donnees/prix-nc

# 2. Reconstruire la page
python3 prototypes/kaikai/construire.py donnees/prix-nc/AAAA-MM-JJ
```

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
