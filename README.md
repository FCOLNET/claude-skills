# retail-nc

Marketplace de plugins Claude pour le pilotage d'un réseau de distribution physique.

Les skills sont écrites pour le commerce de détail en Nouvelle-Calédonie : réglementation
française d'affichage des prix, contraintes d'approvisionnement maritime, cotes réelles du
mobilier magasin.

## Installation

```bash
claude plugin marketplace add FCOLNET/claude-skills
claude plugin install merchandising-magasin@retail-nc
```

Depuis une session Claude Code déjà ouverte, mêmes commandes précédées d'un slash :

```
/plugin marketplace add FCOLNET/claude-skills
/plugin install merchandising-magasin@retail-nc
```

Puis relancer la session pour que les skills soient chargées. Vérification :
`claude plugin list`.

## Plugins disponibles

| Plugin | Contenu |
|---|---|
| `merchandising-magasin` | 4 skills : implantation de rayon, merchandising visuel, PLV imprimeur, étiquettes prix |

## Mise à jour

```bash
claude plugin marketplace update retail-nc
```

## Développement

Pour tester une modification sans passer par GitHub, ajouter la marketplace depuis le
dossier local :

```bash
claude plugin marketplace add /chemin/absolu/vers/claude-skills
```

Un chemin relatif fonctionne s'il est explicitement préfixé (`./claude-skills`) ; un `.`
seul est refusé par la CLI.

### Ajouter un plugin

1. Créer un dossier à la racine, au nom du plugin.
2. Y placer `.claude-plugin/plugin.json` (`name`, `version`, `description`, `author`).
3. Ranger les skills dans `<plugin>/skills/<nom-de-la-skill>/SKILL.md`.
4. Déclarer l'entrée dans `.claude-plugin/marketplace.json` (`name`, `displayName`,
   `source`, `description`).

Le champ `name` du `plugin.json`, le nom du dossier et l'entrée `name` du manifeste de
marketplace doivent être identiques.
