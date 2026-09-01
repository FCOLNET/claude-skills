# Studio Planches Contacts

Outil autonome (un seul fichier HTML) de fabrication des planches contacts catalogue :
structure depuis un export Excel, appariement des photos, édition en place, exports
PDF / HTML / Excel / dossier prod HD.

## Fichiers

| Fichier | Rôle |
|---|---|
| `studio-planches-v41.html` | **version courante**, à utiliser |
| `studio-planches-v11.html` | version d'origine, conservée comme référence |
| `CHANGELOG.md` | ce qui a changé et pourquoi, version par version |
| `test/` | vérifications automatisées (Chromium headless) |
| `apercu-catalogue-web.png` | rendu du catalogue web généré, sur données d'exemple |

Les versions 12 à 19 ont été retirées de l'arborescence ; elles restent accessibles dans
l'historique git.

## Chaîne d'utilisation

1. **Base articles** — charger l'export complet (tous rayons), avec la colonne
   « Réf. fournisseur » si elle existe. Mémorisée entre les sessions ; la recharger
   pour actualiser les prix.
2. **Structure** — téléverser le fichier de définition des planches. Vérifier la
   correspondance des colonnes, dont « Chemin photo » si le fichier la contient.
3. **Photos** — si elles sont sur un partage réseau, utiliser
   « 📋 Copier les N photos en local » : le navigateur se fige à lister un dossier de
   plusieurs milliers de fichiers, il faut donc lui présenter un petit dossier local.
   Si le fichier de planches ne donne pas les chemins, indiquer une fois le dossier
   source dans le champ prévu — il est mémorisé. Puis « 📁 Dossier photos ».
4. **Contrôle des fonds** — « 🔍 Fonds photo » classe les visuels en détouré / uni /
   varié et indique la direction graphique atteignable. À faire avant d'arrêter la
   direction artistique.
5. **Table de travail** — « 🗂 Table de travail » : réorganiser la sélection par
   glisser-déposer, tester les voisinages page par page, écarter en réserve
   (récupérable). Trois états : placé, vivier (à poser), réserve (écarté).
   Pour composer de zéro : « ↥ Tout au vivier », puis « ➕ Page » et on dépose.
   « ➕ Article » ajoute une référence à une page donnée ; ✕ met en réserve, 🗑 supprime.
   Le nombre de produits par page est un **repère**, pas une limite : une page peut en
   compter 10 pour un repère de 9, le compteur passe en ambre. « ⇢ Caler la pagination »
   attribue à la planche le nombre de pages réellement composées.
   Libellé et prix se saisissent directement sur la vignette.
   C'est là que la sélection large devient la sélection finale — **et la pagination
   composée ici est celle qui sort** : fusion InDesign, Excel, dossier prod HD et
   catalogue web reprennent l'ordre et le découpage en pages tels qu'ils ont été calés.
6. **Calage éditorial** — renseigner le nombre de pages de chaque planche et le nombre de
   produits par page : la jauge dit si la sélection tient. Marquer les héros de chaque
   page d'un clic sur le niveau de la vignette.
7. **Livraison** — « ✅ Livrer », ou « ✅ Valider et livrer » depuis la table de travail :
   contrôle avant départ (vivier non placé, visuels et prix manquants, pagination), puis
   les livrables rangés par destinataire.
8. **Exports** — PDF pour validation, dossier prod HD pour l'imprimeur, Excel pour le
   récapitulatif, HTML pour diffusion. Le dossier prod HD range les photos par page —
   `PLANCHES_PHOTOS_PAR_PAGE/<Planche>/Page 02/03_b3.jpg`, le rang en préfixe — et
   l'Excel porte les colonnes *Page catalogue*, *Page dans planche*, *Rang dans page*.
9. **Catalogue web** — « 🛍 Catalogue web » produit le catalogue marchand, au choix en
   fichier unique (visuels incorporés, rien à décompresser) ou en dossier
   `index.html` + `images/` pour une mise en ligne. Imprimable en PDF (Ctrl+P).
   Une archive doit être décompressée avant d'ouvrir la page, sinon les visuels
   manquent — le catalogue le signale lui-même.
10. **Maquette** — deux voies vers InDesign :
   - bouton « ⧉ Copier » sur la vignette, puis Ctrl+V dans Word, InDesign ou PowerPoint —
     méthode fiable, vérifiée de bout en bout ; le glisser-déposer d'une photo est laissé
     au comportement natif du navigateur et transmet la copie d'affichage ;
   - « 🧩 Fusion InDesign » produit un dossier autonome — fichier de fusion, photos et
     mode d'emploi — à transmettre à la personne qui fait la maquette. Les chemins y
     sont relatifs : elle décompresse où elle veut, sans accès au serveur. Les colonnes
     `PageCatalogue`, `PageDansPlanche` et `PositionDansPage` lui donnent la pagination
     composée dans la table de travail.

## Vérifications

```bash
cd test
npm i playwright-core
node verif-v41.mjs ../studio-planches-v41.html node_modules/jszip/dist/jszip.min.js
```

Chaque fichier `verif-*.mjs` couvre les correctifs de la version correspondante et
s'exécute sur la version courante — ils servent de tests de non-régression cumulés.
Adapter `executablePath` au chemin local de Chromium, ou passer la variable
d'environnement `CHROME`. Certaines vérifications prennent un second argument : le
chemin d'un `jszip.min.js` local, les CDN n'étant pas joignables hors ligne.

## Plusieurs projets

Bouton **📁 Projets** : chaque catalogue porte un nom et son propre emplacement en
mémoire. On bascule de l'un à l'autre, on renomme, on crée, on retire de la mémoire.
Le projet en cours est mémorisé avant tout changement.

Mettre un projet de côté et en commencer un autre :

1. **📁 Projets → ➕ Nouveau projet**, on lui donne un nom. L'ancien est rangé tout seul.
2. On travaille sur le nouveau.
3. **📁 Projets → Ouvrir** sur l'ancien pour y revenir.

Pour une mise de côté longue, ou un changement de machine, doubler par un
**💾 Sauvegarder** : la mémoire du navigateur peut être vidée, pas un fichier.

## Sauvegarde et reprise

- **💾 Sauvegarder** produit un `projet-planches-<date>.json` : fichier de travail, à
  rouvrir avec **📂 Ouvrir projet** dans l'outil lui-même. Aucun autre logiciel ne
  l'exploite.
- Il contient planches, pages composées, vivier, réserve, niveaux, prix édités, photos et
  base articles — la reprise sur une autre machine ne demande pas le dossier photos.
- Le rouvrir avec une version **antérieure** à celle qui l'a écrit fait perdre ce que
  cette version ignore ; depuis la V36 l'outil prévient et nomme ce qui est en jeu.
- Une barre de reprise apparaît au démarrage : c'est la sauvegarde automatique en
  IndexedDB, indépendante du `.json`.

## Contraintes connues

- **Chemins réseau.** Un navigateur affiche une image `\\serveur\...` mais ne peut pas
  lire ses octets (`fetch` : TypeError) ni la traiter dans un canvas (SecurityError).
  Or le canvas conditionne le PDF, l'export HTML, le dossier prod HD et la sauvegarde.
  Les photos doivent donc être importées, pas seulement référencées.
- **Quatre CDN** (`xlsx`, `jszip`, `jspdf`, Google Fonts). Hors ligne ou derrière un
  filtrage réseau, la page s'ouvre mais l'import Excel échoue sans message. À embarquer
  dans le fichier si l'outil doit tourner en magasin.
- **`parseRemise` devine** : un nombre ≤ 100 sans devise est lu comme un pourcentage.
  Une remise saisie « 50 F » s'imprime « -50 % ».
