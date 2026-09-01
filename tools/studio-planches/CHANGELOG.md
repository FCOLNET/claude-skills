# Studio Planches Contacts — journal des versions

## V37 — plusieurs projets, nommés, qu'on met de côté et qu'on reprend

Mettre un catalogue de côté pour en commencer un autre était possible, mais fragile :

- la reprise automatique n'avait **qu'un seul emplacement** — démarrer un second
  catalogue effaçait la mémoire du premier, sans un mot ;
- tous les fichiers s'appelaient `projet-planches-<date>.json`, si bien que deux projets
  enregistrés le même jour se télescopaient dans le dossier de téléchargements.

Chaque projet porte désormais un **nom**. Il tient son propre emplacement en mémoire, et
le bouton **📁 Projets** affiche celui en cours, liste les autres avec leur date et leurs
compteurs, et permet de basculer, renommer, créer ou retirer de la mémoire.

Le projet en cours est **mémorisé avant tout changement** : on ne quitte jamais un
catalogue sans qu'il soit rangé. Le nom entre dans le fichier `.json`, qui devient
`projet-Catalogue_Jouets-2026-08-31.json`.

La barre de reprise au démarrage nomme le projet retrouvé et, s'il y en a plusieurs,
propose d'ouvrir la liste. Un emplacement unique hérité d'une version antérieure est
migré en projet nommé, sans manipulation.

**Retirer un projet de la mémoire ne touche pas au fichier `.json`** que tu aurais
enregistré : il reste ouvrable par « 📂 Ouvrir projet ». Le message le rappelle.


## V36 — le fichier projet dit avec quelle version il a été écrit

Le fichier de sauvegarde portait `_version: 2` depuis l'origine, alors que le format n'a
cessé de grossir : composition des pages, vivier, réserve, niveaux, nombre de pages par
planche. Une version ancienne de l'outil relisait donc un projet récent en **ignorant
silencieusement** ce qu'elle ne connaissait pas — la composition disparaissait sans le
moindre message.

Le projet porte désormais une version de format tenue à jour et le nom de la version
d'outil qui l'a produit. À l'ouverture d'un projet plus récent, l'outil prévient, **nomme
ce qui risque d'être perdu** — vivier, réserve, composition des pages — et laisse le choix
de continuer ou d'annuler. Un projet plus ancien s'ouvre sans rien demander.

### Rappel d'usage

Le `.json` est un fichier de travail, pas un livrable : il se rouvre avec l'outil lui-même,
bouton **📂 Ouvrir projet**. Il contient tout — planches, pages composées, vivier, réserve,
niveaux, prix édités, photos et base articles — ce qui permet de reprendre sur une autre
machine sans le dossier photos.


## V35 — ajouter, saisir et supprimer depuis la table de travail

La table de travail ne savait que déplacer ce qui existait déjà. Trois manques comblés.

**➕ Article, sur chaque page.** Le code saisi est résolu contre la base articles — code
article, variantes de zéros, référence fournisseur — et la fiche en est reprise. Si
l'article figure déjà sur une planche, au vivier ou en réserve, l'outil le dit et demande
confirmation avant de le faire apparaître à deux endroits. Un champ laissé vide crée une
vignette à remplir de toutes pièces.

**Saisie sur la vignette.** Libellé et prix s'éditent directement dans la table de
travail — sans quoi un article ajouté hors base y serait inutilisable. Un champ éditable
dans un élément déplaçable ne prend pas le curseur : le glisser est suspendu le temps de
la saisie, puis rétabli.

**Deux gestes distincts pour retirer**, et c'est volontaire :

| | |
|---|---|
| **✕** | met en **réserve** — récupérable, la fiche et la photo sont conservées |
| **🗑** | **supprime définitivement**, sur confirmation — plus sur aucune planche, ni au vivier, ni en réserve ; fiche, photo et niveau purgés |

Le compteur de chaque page suit les ajouts et les retraits. Le nombre de produits par page
reste un **repère**, jamais une limite : une page peut en contenir moins, ou davantage —
le compteur passe alors au rouge.


## V34 — composer le catalogue page par page

Cas de départ opposé au précédent : la sélection arrive en **un seul bloc**, sans que le
nombre de pages soit encore décidé. Il faut alors fabriquer les pages au fur et à mesure
et y déposer les produits un par un.

L'outil supposait l'inverse. Une page n'était qu'une **tranche de 9 découpée dans une
liste ordonnée** : elle ne pouvait être ni vide, ni incomplète, et déposer un produit à un
endroit précis n'avait pas de sens.

**Les pages tiennent désormais leur propre contenu.** Une page peut être vide, à moitié
remplie, ou en dépassement — le compteur `4/9` de son en-tête le dit. La liste à plat est
reconstruite après chaque changement, si bien que tout l'aval — exports, capacité,
catalogue web — continue de fonctionner sans rien savoir de cette mécanique.

**Trois états, distincts.** *Placé* : dans une page. *Vivier* : retenu mais pas encore
posé. *Réserve* : écarté. Le vivier est une nouvelle zone verte, la réserve reste la zone
dorée. Le compteur du haut suit les trois.

**Trois boutons pour composer** : `➕ Page` ajoute une page vide à une planche,
`↥ Tout au vivier` vide une planche pour la reprendre de zéro, `➕ Planche` crée un
nouveau groupe. On part donc d'une sélection en vrac et on bâtit.

Un rappel apparaît dans la vue planches tant qu'il reste des produits au vivier : ils
ne figurent sur aucune planche, il ne faut pas les croire perdus.

### Régression trouvée par les tests précédents

Supprimer une vignette dans la **vue planches** laissait le contenu des pages périmé : la
table de travail ressortait des produits supprimés et ignorait les nouveaux. La lecture
des pages est désormais **auto-réparatrice** — ce qui n'existe plus disparaît, ce qui est
nouveau rejoint la dernière page — sans détruire la composition manuelle.

Même mécanisme pour la bascule entre les deux vues : réordonner dans le plan d'ensemble
redistribue les produits en **conservant la taille de chaque page**, au lieu de rendre la
pagination à un découpage automatique.


## V33 — table de travail : la sélection devient mobile

Les planches ne sont pas un état final mais un **vivier** : une sélection large qu'on
affine. Nouveau bouton **🗂 Table de travail**, un espace où la sélection se manipule.

**Écarter n'est pas supprimer.** Un produit sorti part en **réserve**, avec le nom de sa
planche d'origine. Rien n'est perdu, on peut le remettre d'un glisser — un arbitrage doit
pouvoir se rejouer. La réserve est conservée dans la sauvegarde de projet.

**Deux vues, au choix.** *Pages réelles* découpe chaque planche en grilles de 9
emplacements — on voit exactement quels produits seront voisins à l'impression, et les
pages au-delà de la pagination attribuée sont signalées en rouge. *Plan d'ensemble*
affiche tout le groupe d'un bloc, pour un premier dégrossissage.

**Taille réglable** par curseur, de 90 à 260 px : compact pour répartir, grand pour juger
si deux visuels se tiennent côte à côte.

Le glisser fonctionne dans une page, entre pages, entre planches, et depuis ou vers la
réserve. Le niveau héros reste visible pour composer la page.

### Bug d'ordre corrigé

La mise en réserve relisait le modèle depuis l'affichage **avant** de retirer la vignette :
le produit restait dans la planche tout en entrant en réserve. Il aurait été compté deux
fois et serait réapparu au rendu suivant. L'ordre est désormais retirer, relire, ranger.

### Deux échecs de banc de test, pas de l'outil

Le glisser entre planches semblait ne rien faire : la planche de destination se trouvait
sous la ligne de flottaison et le lâcher se faisait hors de la fenêtre. Même cause que
lors du diagnostic du glisser vers Word. Le banc utilise maintenant une fenêtre assez
haute et une sélection compacte pour que source et cible soient visibles ensemble.


## V32 — retirer les formats « adresse »

La V31 avait fait tomber le cadre gris : avec l'image incorporée dans le format HTML,
Word ne posait plus de cadre vide. Mais il insérait alors le **lien**
`blob:null/ff89486c-…` — il retenait `text/uri-list`, une adresse tout aussi inutilisable
hors du navigateur.

Ces formats sont désormais retirés du glisser (`clearData` sur `text/uri-list`,
`text/plain` et `text/x-moz-url`). Il ne reste que deux choses : le HTML porteur de
l'image incorporée, et le fichier. Word n'a plus d'adresse à préférer.

Vérifié sur un vrai glisser à la souris : les formats transmis se réduisent exactement à
`["text/html", "Files"]`, le HTML contenant l'image en `data:`.

**Confirmé en production** : le glisser-déposer d'une photo vers Word fonctionne.

### Ce que ces six versions ont appris

Le diagnostic a coûté quatre tentatives infructueuses, toutes fondées sur des hypothèses
testées avec des événements **simulés**. Un événement simulé ne contient que ce que le
code lui met ; il ne dit rien de ce que le navigateur fabrique lors d'un vrai glisser.
La cause n'est apparue qu'en déclenchant un glisser à la souris et en inspectant le
contenu réel — et le champ s'est alors réduit en deux coups : cadre vide (HTML pointant
un blob interne), puis lien (adresse préférée au HTML), puis image.

Le contrôle `verif-v30`, qui vérifiait qu'aucun format n'était imposé au navigateur, est
supprimé : cette assertion décrivait une approche abandonnée et ne passait plus que par
l'effet de bord d'un test simulé.


## V31 — la cause du cadre gris, enfin mesurée

Les trois tentatives précédentes reposaient sur des hypothèses, testées avec des
événements **simulés** — lesquels ne disent rien de ce que le navigateur fabrique lors
d'un vrai glisser. En déclenchant un glisser à la souris et en inspectant ce qui part, la
cause apparaît :

```
text/uri-list : blob:null/edfb50c9-…
text/html     : <img src="blob:null/edfb50c9-…">
Files         : un JPEG valide de 17 751 octets,
                nommé « edfb50c9-… », SANS EXTENSION
```

Word retient le format HTML, crée un cadre image, puis tente de charger `blob:null/…` —
une adresse qui n'existe que dans le navigateur. D'où le rectangle gris. Le fichier joint
est bien valide, mais sans extension Word ne l'identifie pas davantage.

**Correction** : le format HTML est remplacé par une version où l'image est
**incorporée** (`data:`), résoluble par n'importe quelle application — c'est exactement ce
qui rend le copier-coller fonctionnel. Les autres formats, dont le fichier, sont
conservés.

L'incorporation demande une lecture asynchrone, impossible pendant `dragstart` qui est
synchrone. L'image est donc préparée **au survol** de la vignette, bien avant que le
glisser ne commence, avec un second déclenchement à l'appui du bouton si le survol a été
trop bref. Le cache est borné à 24 images pour ne pas gonfler la mémoire.

Vérifié sur un **vrai glisser à la souris** : image incorporée, plus aucune adresse
interne au navigateur, fichier joint conservé, libellé échappé, cache borné.

### Deux erreurs de méthode corrigées au passage

Mes premières mesures ne déclenchaient aucun `dragstart` : la vignette se trouvait sous la
ligne de flottaison et le pointeur cliquait dans le vide — `mousedown` ciblait `HTML`.
Le banc de test amène désormais l'élément dans la fenêtre avant de le saisir.

Et un test témoin, sur une page vierge, a montré la différence décisive : glisser une
**image** produit `["text/uri-list","text/html","Files"]`, glisser un **bloc** ne produit
rien. C'est ce témoin qui aurait dû ouvrir le diagnostic.


## V30 — le glisser d'une photo est rendu au navigateur

Trois tentatives ont échoué à faire accepter une promesse de fichier par Word, qui
insérait un cadre gris vide. Explication cohérente avec les trois essais : sous Windows,
une application retient le format le plus « riche » qu'on lui propose. Word préférait donc
la promesse de fichier au bitmap, sans parvenir à la résoudre — la page étant ouverte en
`file://`, contexte où le navigateur ne livre pas ce fichier.

Correction **par soustraction** : l'outil ne propose plus rien du tout au glisser d'une
photo. Le comportement natif reprend la main, celui qui fonctionne partout — glisser une
image depuis une page web vers Word est un cas ordinaire du navigateur.

Contrepartie assumée : c'est la copie d'affichage (1 200 px) qui part, non l'original.
Pour de la pleine résolution il y a « 🗂 Dossier prod HD », « 🧩 Fusion InDesign » et le
bouton de copie.

Le bouton de copie, seule voie vérifiée de bout en bout, passe du symbole `⧉` seul à
**⧉ Copier**, et l'aide de la page le désigne comme la méthode à employer. Une vignette
sans photo continue de déposer son texte.

### Rangement des vérifications

Les contrôles V22 et V29 portaient sur la promesse de fichier, mécanisme abandonné : ils
sont supprimés plutôt que maintenus sur du code mort. Les contrôles V30 vérifient
l'inverse — qu'aucun format n'est imposé au navigateur — et que la copie presse-papier
reste intacte.


## V29 — le glisser vers Word insérait un cadre vide

Word recevait une promesse de fichier qu'il ne savait pas résoudre, et insérait un cadre
gris à la place de la photo. Le copier-coller par le bouton ⧉, lui, fonctionnait.

Cause : depuis la V22, la source du glisser était le **conteneur** de la photo, pas la
photo. Or, quand un simple bloc est à l'origine d'un glisser, le navigateur ne joint
aucune représentation d'image native — seulement la promesse de fichier ajoutée par
l'outil. C'est précisément ce qui distingue ce cas du glisser d'une image depuis un site
web vers Word, qui fonctionne : là, le navigateur joint ses propres formats image.

La source est désormais l'**image** elle-même. Le navigateur joint donc ses formats
natifs — ceux que Word sait coller — et l'outil y **ajoute** la promesse de fichier
nommée et en pleine résolution, pour InDesign et l'Explorateur. Le conteneur ne reste
source que pour une vignette sans photo, où seul le texte a un intérêt.

**Non vérifiable ici** : la réception native, faute d'applications Windows dans
l'environnement de test. Ce qui est vérifié, c'est que la source est bien l'image, que la
promesse porte le fichier pleine résolution, qu'aucun format texte ne vient concurrencer,
et que le gestionnaire du conteneur ne double pas celui de l'image. Le bouton ⧉ reste la
voie garantie.


## V28 — un catalogue web qui ne perd plus ses visuels

La version en dossier (`index.html` + `images/`) est correcte pour une mise en ligne,
mais elle a un piège : sous Windows, double-cliquer sur une archive ouvre un aperçu, et
ouvrir `index.html` depuis cet aperçu n'extrait **que ce fichier**. La page cherche alors
`images/…` à côté d'elle et ne trouve rien — catalogue sans aucun visuel, sans la moindre
explication.

**Fichier unique.** Nouvelle option, proposée en premier : un seul HTML, visuels
incorporés dedans (800 px). Double-clic pour l'ouvrir, rien à décompresser, rien à perdre
en route, envoyable par mail. La version en dossier reste là pour l'hébergement, avec
l'avertissement de décompresser d'abord.

**Le catalogue se diagnostique lui-même.** Si des visuels ne se chargent pas, un bandeau
rouge apparaît en bas de la page et explique quoi faire. Deux filets : une écoute des
erreurs de chargement en phase de capture, et un balayage au chargement complet qui
rattrape les images en chargement différé.

Le premier essai a d'ailleurs montré que ce bandeau ne s'affichait pas : le script était
en fin de page, si bien que **les images du haut avaient déjà échoué avant qu'il ne
s'installe**. Déplacé dans l'en-tête, avant toute image, plus le balayage de rattrapage.

**Garde-fou en amont.** Générer le catalogue sans aucune photo chargée est désormais
refusé avec l'explication, au lieu de produire un catalogue de cadres vides.


## V27 — contrôle des fonds photo et générateur de catalogue web

### 🔍 Contrôle des fonds

Le rendu « type Checkers » repose entièrement sur des visuels détourés ou sur fond blanc :
c'est ce qui autorise la densité, les chevauchements et les pastilles posées sur l'image.
Mélanger détouré et fonds variés ruine la page — c'est le point qui décide de la direction
graphique, avant toute maquette.

Le bouton **🔍 Fonds photo** échantillonne la **bordure** de chaque visuel : un packshot
sur blanc a un pourtour clair et régulier, une photo d'ambiance non. Deux indicateurs
suffisent — luminance moyenne du pourtour et écart-type — pour classer en *fond blanc*,
*fond uni* ou *fond varié*. Les vignettes concernées reçoivent une pastille, et le bilan
donne les proportions avec la direction graphique atteignable :

- 85 % de détourés ou plus → direction du benchmark possible ;
- entre 60 et 85 % → direction mixte, cadres photo pour homogénéiser, détouré réservé aux héros ;
- en dessous → cadres systématiques, ou chantier de détourage sur les héros au minimum.

### 🛍 Catalogue web

Nouveau bouton qui produit le **catalogue marchand** — plus une planche contact, mais le
catalogue tel qu'un client le voit. Il reprend la grammaire du benchmark : couleur
d'univers par planche, sommaire collant, hiérarchie à trois niveaux (le héros occupe
deux colonnes sur deux rangs, la grille dense comble les trous), bloc prix normalisé,
économie affichée **en valeur** plutôt qu'en pourcentage, bandeau de positionnement.

Le bloc prix est repensé pour le XPF : le système de Checkers repose sur un gros nombre
suivi de centimes minuscules, ce qui n'existe pas en franc pacifique. On joue donc sur le
contraste entre les chiffres et la devise, en gardant le prix barré à côté du prix promo.

Livré en dossier — `index.html` + `images/` + mode d'emploi — à mettre en ligne tel quel
ou à ouvrir localement. Le CSS d'impression fait démarrer chaque planche sur une nouvelle
page : `Ctrl+P` donne la version PDF, ce qui couvre la seconde sortie demandée.

### Bug trouvé en regardant le rendu

Le libellé des produits héros s'affichait **en blanc sur blanc**. Collision de noms de
classes : `hero` désignait à la fois le bandeau de titre du catalogue (texte blanc sur
fond sombre) et le niveau de mise en avant des produits ; la carte héros héritait donc
`color:#fff`. Seuls les éléments à couleur explicite — prix promo, pastille économie —
restaient visibles, ce qui rendait le défaut discret : un héros **non promotionnel**
aurait eu son prix invisible aussi.

Corrigé en renommant le bandeau `.entete`, en préfixant les niveaux `n-hero` / `n-petit`,
et en posant la couleur de texte explicitement sur la carte plutôt que de la laisser
s'hériter. Deux contrôles verrouillent désormais ces deux points.


## V26 — capacité des planches et niveau de mise en avant

Deux fonctions au service d'une même question : la sélection tient-elle dans le catalogue,
et qui décide de la hiérarchie de la page.

### Jauge de capacité

Chaque planche porte son **nombre de pages de catalogue**, et un réglage global donne le
**nombre de produits par page** (9 par défaut). L'en-tête de planche affiche en continu
`37 / 36 (+1)` — vert si la planche tombe juste, orange s'il reste des emplacements,
rouge en dépassement.

Un encart de synthèse totalise l'ensemble, et signale deux choses qu'on découvre
habituellement trop tard :

- les planches auxquelles **aucune page n'est attribuée** ;
- le fait qu'un catalogue en piqûre à cheval s'imprime par **cahiers de 4 pages** — 38
  pages attribuées deviennent 40 à l'impression, soit 18 emplacements de plus à répartir.

L'arbitrage de la sélection se fait ainsi sur la planche, en amont, et non au montage.

### Niveau de mise en avant

Chaque vignette porte un niveau — **standard**, **★ héros**, **▪ petit** — que l'on fait
défiler d'un clic. Le héros s'affiche sur deux colonnes et cerclé d'or : la composition de
la page se lit d'un coup d'œil.

Le niveau appartient à la **planche**, non au produit : un même article peut être héros
sur une page et discret sur une autre.

Les colonnes `Niveau` et `PagesPlanche` partent dans l'export de fusion InDesign et dans
l'export Excel. Le graphiste applique un gabarit par niveau au lieu d'arbitrer lui-même la
hiérarchie — c'est-à-dire de faire le merchandising à la place du commerce.

Nombre de pages, niveaux et densité sont conservés dans la sauvegarde de projet.


## V25 — un dossier de fusion autonome, à transmettre tel quel

L'export V23 écrivait des **chemins absolus** vers le partage
(`\\10.10.101.52\SMRC_photo\105143.jpg`). Transmis à quelqu'un qui n'a pas accès à ce
serveur — ou dont les lettres de lecteur diffèrent —, le fichier de fusion ne liait
aucune image. Il ne servait qu'à son auteur.

Le bouton **🧩 Fusion InDesign** ouvre désormais un choix :

| | Contenu | Pour qui |
|---|---|---|
| **Dossier complet, pleine résolution** | fichier de fusion + photos d'origine + mode d'emploi | la personne qui fait la maquette, jusqu'à l'impression |
| **Dossier complet, allégé 2000 px** | idem, photos ramenées à 2 000 px | calage de maquette, envoi par mail |
| **Fichier seul** | sans les photos, chemins absolus | quand la personne accède déjà au dossier photos |

Le dossier livré :

```
FUSION-INDESIGN-2026-08-31/
   fusion-indesign.txt     @Photo = Images\105143.jpg
   LISEZ-MOI.txt           marche à suivre InDesign, description des colonnes
   Images/                 105143.jpg, 105144.png…
```

Les chemins sont **relatifs au fichier de fusion**, qu'InDesign résout depuis son
emplacement : le dossier se décompresse n'importe où et fonctionne. Les images sont
renommées d'après le code article — ce qui les fait correspondre à la colonne `Code` — en
conservant leur extension réelle : une photo `.png` ne devient pas `.jpg`.

Le poids estimé est affiché avant de générer, avec un avertissement au-delà de 400 Mo :
le navigateur assemble l'archive en mémoire et peut ne pas y arriver, d'où la version
allégée.

Vérifié en décompressant l'archive produite : structure, chemins relatifs, absence de tout
chemin serveur résiduel, encodages, et image pleine résolution identique octet pour octet
à la source.


## V24 — le glisser vers Word déposait du texte au lieu de la photo

La V23 joignait au fichier deux formats concurrents : `text/plain` (code · désignation ·
prix) et `text/html`. Word, comme la plupart des traitements de texte, privilégie le
texte dès qu'on lui en propose : il insérait la ligne de texte au lieu de la photo, ou
rien du tout, le HTML pointant vers une URL interne au navigateur qu'une application
native ne sait pas résoudre.

Un glisser depuis la photo ne propose désormais **que le fichier**. Le texte reste
disponible autrement : sélectionner la désignation sur la carte et la glisser. Une
vignette sans photo continue de déposer son texte, seule chose utile dans ce cas.

Le mécanisme lui-même n'était pas en cause : les téléchargements de l'outil — script de
copie, Excel, PDF — empruntent le même type d'URL interne et fonctionnent.

### Seconde voie : copier la photo dans le presse-papier

Pour ne pas dépendre d'un mécanisme que rien ne garantit dans toutes les applications,
un bouton **⧉** apparaît au survol de chaque vignette : il met l'image dans le
presse-papier, et `Ctrl+V` la colle dans Word, InDesign ou PowerPoint.

Le presse-papier de Chrome n'accepte que le PNG en écriture — format sans perte, la
définition est donc conservée — avec un plafond à 3 000 px, au-delà duquel un PNG dépasse
plusieurs dizaines de mégaoctets sans gain visible. Fond blanc appliqué, sans quoi une
image transparente vire au noir dans Word.

Vérifié de bout en bout : une source de 4 000 px est écrite dans le presse-papier en
3 000 × 3 000, puis relue depuis le presse-papier.


## V23 — export « Fusion de données » pour InDesign

Glisser 483 produits un par un n'est pas une méthode. InDesign sait composer les pages
seul à partir d'un fichier source : on place les champs une fois sur un gabarit, et
« Créer un document fusionné » génère tout.

Nouveau bouton **🧩 Fusion InDesign** : une ligne par produit, avec planche, position,
code, référence fournisseur, désignation, prix, prix initial, prix promo, remise,
présence de la photo, et le chemin de l'image dans une colonne `@Photo` — le préfixe `@`
étant ce qui désigne un champ image pour InDesign.

Le chemin de l'image suit trois règles, dans l'ordre : le chemin donné par le fichier
source s'il existe ; sinon le dossier indiqué plus le **nom réel du fichier importé**
(une photo `105143.png` ne devient pas `105143.jpg`) ; sinon le dossier plus le code.
InDesign sait lier une image par chemin réseau, le dossier peut donc rester le partage.

Deux choix de format, contre deux pièges classiques :

- **séparateur tabulation** plutôt que virgule ou point-virgule — les désignations
  contiennent des virgules (`POUSSEUR BÉBÉ, 2 en 1`), et le point-virgule dépend des
  réglages régionaux ;
- **encodage UTF-16 LE avec BOM**, l'« Unicode » qu'InDesign détecte de façon fiable.
  En UTF-8, les accents des désignations ressortent en caractères parasites.

Marche à suivre dans InDesign : Fenêtre → Utilitaires → Fusion de données → Sélectionner
la source de données → placer les champs sur le gabarit → Créer un document fusionné.


## V22 — glisser une vignette vers InDesign, Illustrator ou Word

Les vignettes deviennent glissables hors du navigateur. Le fichier déposé est la
**photo d'origine pleine résolution**, pas la copie de travail : c'est une maquette qui
la reçoit, pas un aperçu. Vérifié — 34 Ko partent là où la copie de travail en pèse 1.

Le mécanisme est le type de presse-papier `DownloadURL` de Chromium, au format
`<mime>:<nom de fichier>:<url>` : pendant le dépôt, le navigateur écrit le fichier sur le
disque et remet un vrai chemin à l'application réceptrice. C'est ce qu'utilisent Google
Drive ou Photopea pour sortir un fichier d'une page web. Sur un navigateur qui l'ignore,
le glisser retombe sans erreur sur le comportement habituel.

Le fichier est nommé pour être reconnaissable en maquette — code + désignation, par
exemple `105143_AXE_GEL_DOUCHE_250ML_AFRICA.jpg`. Deux formats accompagnent le fichier :
`text/plain` (code · désignation · prix) pour un dépôt dans un bloc de texte, et
`text/html` pour les traitements de texte. Une vignette sans photo ne dépose que le texte.

**Non vérifié** : la réception effective dans InDesign, faute d'application native dans
l'environnement de test. Ce qui est vérifié, c'est que la page émet bien le fichier
attendu, en pleine résolution et correctement nommé.


## V21 — la copie des photos ne dépend plus d'une colonne facultative

Défaut de conception de la V20 : la seule méthode d'import qui fonctionne sur un partage
réseau — la commande de copie — était construite à partir de la colonne « Chemin photo ».
Un catalogue dont le fichier source ne porte pas cette colonne n'y avait pas droit et
renvoyait vers la fenêtre de sélection, celle qui fait planter le navigateur. Constaté
sur un catalogue de 483 références et un dossier de 17 044 fichiers.

L'encart s'affiche désormais dès qu'il manque des photos, colonne chemin ou non, et
propose un champ **« Dossier des photos sur le serveur »**, saisi une fois puis mémorisé
entre les sessions. Les photos y sont réclamées par leur code article avec un joker
d'extension (`086894.*`), ce qui évite d'avoir à deviner `.jpg`, `.png` ou `.jpeg`.
Quand le fichier source donne les chemins, ils restent prioritaires : le nom exact prime
sur le joker.

**Découpage des commandes.** 483 références tiennent en une commande de 5 553 caractères.
Au-delà de la limite de longueur d'une ligne Windows, la commande est découpée et chaque
morceau est présenté séparément, numéroté, avec son propre bouton de copie et un
avertissement de les coller un par un — vérifié sur 2 000 références : 5 commandes,
chacune exécutable seule.


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
