# Studio Planches Contacts — journal des versions

## V12 — lot 1 : corrections

Sept défauts constatés en lecture de code, reproduits en navigateur puis corrigés.
Chaque point ci-dessous a été vérifié avant/après (Chromium, `tools/studio-planches/test/`).

### 1. « Dossier prod HD » livrait des vignettes 1200 px

Depuis la V11, l'import remplaçait le fichier d'origine par la copie de travail réduite
(`matchedFiles[code] = localBlobs[code]`). Les exports imprimeur — dossier prod HD et zip —
lisaient cette copie : l'imprimeur recevait du 1200 px / JPEG 85 %.

Règle posée en V12 :

| Stockage | Contenu | Usage |
|---|---|---|
| `matchedFiles[code]` | fichier d'origine, pleine résolution | dossier prod HD, zip |
| `localBlobs[code]` | copie allégée 1200 px | affichage, PDF, HTML, sauvegarde projet |

Un objet `File` n'est qu'une référence disque/réseau : le conserver ne coûte pas de mémoire,
contrairement aux images décodées. L'extension du fichier écrit suit désormais le type réel
du blob (un contenu JPEG nommé `.png` produisait un fichier illisible).
Un projet rouvert depuis un `.json` contient des images ré-encodées à ~1600 px : ce n'est pas
du HD, l'export le signale avant de partir.

### 2. Un article repris sur deux planches : la 2ᵉ vignette restait vide

`showCardPhoto`, `applyRefToCard`, `setCardImage` et la restauration de projet visaient
`document.querySelector` (singulier) : seule la première vignette du code était servie.
Remplacé par `cardsOf(code)` qui rend toutes les vignettes.

Conséquences traitées au passage : suppression d'une vignette, changement de code et pose
d'une photo ne purgent la fiche produit et la photo que si l'article ne figure plus sur
aucune planche. Chaque vignette connaît sa planche d'appartenance (`card._sec`) au lieu de
chercher la première correspondance dans `PAGES`.

### 3. Reconstruire depuis Excel ne remettait rien à zéro

`buildFromExcel` ne vidait ni `PRODUCTS`, ni `matchedFiles`, ni `localBlobs`, ni `manualSet` :
photos et prix du catalogue précédent ressortaient sur les codes identiques.
Ajout de `resetWorkspace()` (avec libération des URL blob, qui fuyaient à chaque
reconstruction) et d'une confirmation avant d'écraser un montage en cours.

### 4. Deux formats de prix sur une même planche

Le prix issu de l'Excel de structure était stocké brut (`2490`), celui issu de la base
articles passait par `fmtPrix` (`2 490 F`). Les deux sources passent maintenant par `fmtPrix`.

### 5. « Manquants » silencieux en `file://`

`navigator.clipboard` n'existe pas hors contexte sécurisé : exception levée avant l'`alert`,
bouton sans effet ni message. Chaîne de repli : presse-papier → `execCommand('copy')` →
fichier `references-sans-photo.txt` téléchargeable.

### 6. Un libellé contenant `<` ou `"` cassait la vignette

Les vignettes sont construites en `innerHTML` avec interpolation directe. Sur la V11,
`TV 55" LED <SMART> & CO` s'affichait `TV 55" LED  & CO` — le `<SMART>` était avalé comme
une balise, sans erreur visible. Idem pour les titres de planche. Ajout de `esc()` / `escA()`
sur toutes les interpolations (contenu et attributs).

### 7. Lâcher une photo à côté d'une vignette faisait perdre le travail

Le dépôt n'était géré que sur les vignettes ; ailleurs, le navigateur ouvrait l'image et
quittait la page. Le dépôt est maintenant capté sur toute la page et lance l'import de masse,
dossiers compris (parcours récursif via `webkitGetAsEntry`). Ajout d'un `beforeunload`
qui prévient tant qu'un montage n'est pas sauvegardé photos comprises.

---

## Suite prévue

- **Lot 2 — confort de montage** : réordonner et déplacer les vignettes entre planches,
  sommaire, recherche de référence, annuler/rétablir, ajout et suppression de planche.
- **Lot 3 — performance gros volumes** : autosave en `Blob` plutôt qu'en base64
  (aujourd'hui jusqu'à 600 photos ré-encodées toutes les 3 secondes), rendu virtualisé,
  reprise de projet instantanée.
- **Lot 4 — qualité des exports** : PDF paramétrable (colonnes, format de vignette,
  page de garde, pagination), exports HTML et Excel enrichis.

## Points signalés, non traités

- **Dépendance à quatre CDN** (`xlsx`, `jszip`, `jspdf`, Google Fonts). Hors ligne ou
  derrière un filtrage réseau, l'outil se charge mais l'import Excel échoue sans message.
  À embarquer dans le fichier si l'outil doit tourner en magasin.
- **`parseRemise` devine** : un nombre ≤ 100 sans devise est lu comme un pourcentage.
  Une remise saisie « 50 F » s'imprime « -50 % ». À rendre explicite.
