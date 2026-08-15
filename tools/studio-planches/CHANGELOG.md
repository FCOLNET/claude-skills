# Studio Planches Contacts — journal des versions

## V20 — une commande à coller, quand Windows refuse le .bat

Le `.bat` téléchargé est bloqué par le gestionnaire de pièces jointes :
« Vos paramètres de sécurité Internet ont empêché l'ouverture d'un ou de plusieurs
fichiers ». Tout fichier venu d'Internet porte cette marque, et la stratégie en place
interdit d'ouvrir les scripts ainsi marqués. Le contournement manuel existe — clic droit
→ Propriétés → Débloquer — mais il n'est pas toujours autorisé.

Méthode principale désormais : **📋 Copier les N photos en local**. Une fenêtre affiche
la commande, avec la marche à suivre (Windows + R → `cmd` → clic droit pour coller →
Entrée). Rien n'est téléchargé, donc rien n'est marqué ni bloqué.

La commande est assemblée en **une seule ligne** avec `&`. Une zone de texte HTML
normalise les fins de ligne : un CRLF y devient un LF, et coller plusieurs lignes dans
`cmd` devient hasardeux. Au-delà de la limite de longueur de Windows, on repasse à
plusieurs lignes, chacune complète et exécutable séparément.

La commande est présentée dans une zone de texte sélectionnable : si le navigateur refuse
l'accès au presse-papier, `Ctrl+C` reste possible. Le `.bat` demeure disponible en repli,
avec le rappel de la manipulation « Débloquer ».


## V19 — destination du script et conduite à tenir dans la fenêtre Windows

Deux corrections issues de l'usage réel.

**Destination du script de copie.** Elle passe de `%USERPROFILE%\Desktop\PHOTOS_PLANCHES`
à `%USERPROFILE%\PHOTOS_PLANCHES`. Quand OneDrive gère les dossiers du profil — le cas
ici, « OneDrive - SERCOPAC » —, `%USERPROFILE%\Desktop` n'existe plus : le Bureau réel se
trouve sous `OneDrive - <entreprise>\Bureau`. Robocopy aurait créé un dossier fantôme,
invisible sur le Bureau. La racine du profil est toujours locale et toujours présente.

**Conduite à tenir dans la fenêtre de sélection.** Sélectionner « Réseau » dans le volet
de gauche produit « Vous ne pouvez pas ouvrir ce dossier avec ce programme » : c'est un
emplacement virtuel de Windows, pas un dossier. L'encart indique désormais l'ordre des
opérations — script d'abord, sélection du dossier local ensuite — et précise que le
chemin UNC, si on y tient, se colle entier dans le champ « Dossier », jamais en naviguant
par « Réseau ».


## V18 — copier les seules photos utiles au lieu d'ouvrir le dossier entier

Le partage contient 9 011 photos, les planches en utilisent 72. Le navigateur se fige
pendant que Chrome énumère le partage pour construire la sélection — avant que la page
ne reçoive quoi que ce soit.

**Vérifié par élimination**, pour ne pas optimiser le mauvais endroit : une fois les
fichiers remis à la page, le tri de 9 011 noms coûte 11 ms et le traitement complet
4,3 s. Le coût n'est donc pas dans l'outil, et aucun réglage de la page n'y donne accès.

La seule issue est de ne plus présenter le dossier entier. Comme le fichier source donne
les chemins exacts, l'encart propose désormais **📥 Script de copie des N photos** : un
`.bat` qui copie exactement les photos des planches vers `Bureau\PHOTOS_PLANCHES`, puis
ouvre le dossier. Il reste à le sélectionner dans l'outil — 72 fichiers au lieu de 9 011.

Le script utilise `robocopy` avec une liste de noms de fichiers, ce qui évite une
commande par photo ; il est découpé pour rester loin de la limite de longueur d'une
ligne de commande Windows, cite les noms comportant des espaces, et ne contient aucune
commande de suppression ou de synchronisation — il lit le serveur, il n'y écrit rien.
Il est lisible dans le Bloc-notes avant exécution.


## V17 — exploitation de la colonne « chemin photo »

Le fichier de définition des planches contient une colonne du type
`\\10.10.101.52\SMRC_photo\105143.jpg`. Elle est désormais reconnue à l'étape de
correspondance des colonnes (« Chemin photo »).

### Ce que le navigateur refuse

Un chemin réseau ne permet pas de se passer de l'import. Mesuré dans Chromium, page
ouverte en `file://` :

| Opération | Résultat |
|---|---|
| Afficher la photo (`<img src>`) | ✅ fonctionne |
| Lire ses octets (`fetch`) | ❌ `TypeError` |
| La dessiner dans un canvas | ❌ `SecurityError` (canvas *tainted*) |

Le canvas est le passage obligé du PDF, de l'export HTML, du dossier prod HD et de la
sauvegarde de projet. Une planche construite sur les seuls chemins afficherait donc des
vignettes à l'écran et produirait des exports vides.

### Ce que la colonne apporte

- **Appariement exact.** Le nom de fichier annoncé prime sur toutes les heuristiques de
  nommage. Une photo `ref-xyz-99.jpg` rattachée à l'article `105145` est reconnue, ce
  qu'aucune déduction sur le code ou la référence fournisseur ne permettait.
- **Le dossier à sélectionner.** Un encart liste les dossiers attendus, le nombre de
  références de chacun, combien sont servies, et un bouton copie le chemin — les fenêtres
  de sélection Windows acceptent un chemin UNC collé.
- **Recherche ciblée immédiate.** Là où l'API le permet, une seule demande par référence,
  sans phase de reconnaissance de convention.
- **Vignette parlante.** Une référence sans photo affiche le nom du fichier attendu au
  lieu de « clique pour choisir ».
- **Liste des manquants exploitable.** Code, libellé et chemin attendu, collables dans
  Excel.

Le chemin est préservé par `syncProductsFromDOM` et par la sauvegarde de projet : sans
cette précaution il disparaissait à la première sauvegarde, la carte ne l'affichant pas.


## V16 — l'outil s'adapte au navigateur

La recherche ciblée repose sur `showDirectoryPicker` (File System Access API), absente du
navigateur utilisé en production : le bouton affichait une impasse. Il n'apparaît
désormais que là où l'API existe, et « 📁 Dossier photos » redevient la méthode
principale partout ailleurs, sans message la présentant comme un pis-aller.

### Ce qui fige réellement le navigateur

Les deux fenêtres de sélection n'ont pas le même coût, et c'est ce qui avait été confondu :

| Fenêtre | Contenu affiché | Sur un partage réseau |
|---|---|---|
| 🖼 Quelques images (Ctrl+A) | miniatures de chaque photo | **fige le navigateur** — le rendu des miniatures lit les images |
| 📁 Dossier photos | dossiers uniquement, aucune miniature | sûr — seuls les noms sont transmis |

L'appariement ne lit que les noms de fichiers ; seules les photos des références présentes
dans les planches sont réellement ouvertes.

Mesuré sur 9 011 fichiers présentés pour 72 références (données locales, hors latence
réseau) : **4,3 s**, dont l'essentiel est la préparation des 72 photos retenues.
Le tri et l'appariement des 8 939 fichiers non concernés sont négligeables.

L'infobulle et le texte d'aide signalent maintenant le piège du Ctrl+A.


## V15 — lever la confusion entre les deux méthodes d'import

Le bouton « 📁 Dossier (tout) » restait trop proche de « 🎯 Photos (dossier réseau) » :
cliqué par erreur, il déclenche la demande de Chrome « Importer 9 011 fichiers sur ce
site ? », c'est-à-dire la lecture intégrale du partage pour 72 photos utiles.

- étiquettes explicites : **🎯 Chercher les photos** / **📁 Tout charger (lent)** /
  **🖼 Quelques images** ;
- l'ancienne méthode demande confirmation, rappelle le nombre de références réellement
  sans photo et renvoie vers la recherche ciblée.


## V14 — reconnaissance du nommage : code article ou réf. fournisseur

La V13 ne savait aller chercher un fichier que par son code article. Trois défauts
l'empêchaient de faire de même avec un dossier nommé par référence fournisseur.

### 1. La référence brute n'était pas conservée

À l'import de la base articles, seule la forme normalisée était gardée
(`normFourn` : majuscules, séparateurs supprimés). `ABC-789` devenait la clé `ABC789`.
Cette forme sert à *reconnaître* un nom déjà lu, mais elle ne permet pas de *demander*
un fichier au système : sur le partage, le fichier s'appelle `ABC-789.jpg`.
La référence telle qu'écrite est désormais conservée (`REF_FOURN_RAW`), persistée et
embarquée dans les fichiers projet. Elle sert aussi à l'export Excel, plus lisible.

### 2. Une réf. contenant `/` ne pouvait jamais correspondre

`normFourn` ne retirait que les espaces, points, tirets et soulignés. Une référence
`AXE-GD1/25` donnait la clé `AXEGD1/25` — or la barre oblique est interdite dans un nom
de fichier Windows, donc aucune photo ne pouvait porter ce nom. Toutes les références
contenant `/`, `#`, `+` ou une parenthèse étaient invisibles à l'appariement, y compris
dans l'ancien import de masse. La normalisation retire maintenant tout caractère non
alphanumérique. Les bases déjà en mémoire sont ré-indexées au chargement, sans
manipulation.

### 3. Aucune reconnaissance de la convention du dossier

L'import ciblé essaie désormais, sur les cinq premières références seulement, toutes les
formes de nom possibles : code article, variantes de zéros, référence fournisseur et ses
écritures usuelles (`AXE-GD1/25`, `AXE GD1 25`, `AXE_GD1_25`, `AXEGD125`). Le premier
fichier trouvé fixe la convention — forme **et** extension — et les références suivantes
ne l'essaient plus qu'elle. La convention détectée est affichée à l'écran.

Si aucune forme ne correspond, l'outil ne s'acharne pas référence par référence sur le
partage : il propose directement le parcours du dossier, qui reconnaît les noms
approchants.

Mesuré sur des dossiers factices, 5 références à servir :

| Dossier | Recherches | Fichiers parcourus |
|---|---|---|
| nommé par code article (5 000 fichiers) | 6 | 0 |
| nommé par réf. fournisseur (3 005 fichiers) | 31 | 0 |
| réf. fournisseur écrite avec d'autres séparateurs | 54 | 0 |

**À faire une fois** : recharger la base articles en renseignant la colonne
« Réf. fournisseur ». Les bases déjà mémorisées continuent de fonctionner pour le
parcours, mais la recherche ciblée par référence fournisseur a besoin de l'écriture
d'origine, qui n'était pas conservée avant la V14.

## V13 — « Ne répond pas » à l'import photo

Deux causes distinctes, dont une hors du code.

### 1. Le figeage pendant la sélection : Chrome, pas la page

Le message « Cette page tente d'ouvrir (Ne répond pas) » s'affiche sur la *boîte de
dialogue de sélection*, pendant qu'on coche les fichiers — avant que la page ne reçoive
quoi que ce soit. C'est le navigateur qui interroge chaque fichier du partage
`\\10.10.101.52\ftp_web$` pour construire la sélection. Aucune optimisation du JavaScript
ne peut y remédier : le blocage précède son exécution.

Le seul remède est de ne plus demander de grosse sélection. Nouveau bouton
**🎯 Photos (dossier réseau)** :

1. `showDirectoryPicker()` — on choisit le *dossier*, sans qu'aucun fichier soit énuméré.
2. Pour chaque référence sans photo, le système est interrogé nom par nom
   (`getFileHandle('105143.jpg')`), 8 recherches en parallèle.
3. Le premier succès révèle la convention de nommage du dossier (forme du code +
   extension) ; elle est réessayée en premier pour les références suivantes.
4. Les références introuvables par nom déclenchent, sur confirmation, un parcours
   récursif du dossier — asynchrone et interruptible, contrairement à la fenêtre de
   sélection.

Mesuré sur un dossier factice de 5 000 fichiers, 5 références à servir :
**5 recherches ciblées, 0 fichier énuméré**. L'ancienne méthode reste disponible
(« 📁 Dossier (tout) ») pour un dossier local.

Ajout d'un bouton **✖ Interrompre l'import**, actif sur les deux méthodes.

### 2. Le figeage après l'import : la sauvegarde automatique

Toutes les 3 secondes après une frappe, l'autosave ré-encodait chaque photo en base64
via un canvas. Mesuré sur 100 photos de 1 Mo :

| | Durée | Volume |
|---|---|---|
| V12 — base64 | **6 998 ms** | 113,5 Mo |
| V13 — Blob | **2 ms** | 97,8 Mo |

IndexedDB stocke nativement les `Blob` : la copie de travail y est rangée telle quelle,
sans canvas ni base64. Le plafond de 600 photos, qui abandonnait silencieusement les
images au-delà, n'a plus lieu d'être. Le fichier projet `.json` continue d'utiliser le
base64 — c'est du JSON, il ne peut pas contenir de binaire.

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
