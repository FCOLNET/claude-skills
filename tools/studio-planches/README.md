# Studio Planches Contacts

Outil autonome (un seul fichier HTML) de fabrication des planches contacts catalogue :
structure depuis un export Excel, appariement des photos, édition en place, exports
PDF / HTML / Excel / dossier prod HD.

## Fichiers

| Fichier | Rôle |
|---|---|
| `studio-planches-v23.html` | **version courante**, à utiliser |
| `studio-planches-v11.html` | version d'origine, conservée comme référence |
| `CHANGELOG.md` | ce qui a changé et pourquoi, version par version |
| `test/` | vérifications automatisées (Chromium headless) |

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
4. **Exports** — PDF pour validation, dossier prod HD pour l'imprimeur, Excel pour le
   récapitulatif, HTML pour diffusion.
5. **Maquette** — deux voies vers InDesign :
   - glisser une vignette hors de la fenêtre dépose la photo pleine résolution dans
     InDesign, Illustrator, Photoshop ou Word (Chromium uniquement) ;
   - « 🧩 Fusion InDesign » produit le fichier source d'une Fusion de données, pour
     laisser InDesign composer toutes les pages (Fenêtre → Utilitaires → Fusion de
     données).

## Vérifications

```bash
cd test
npm i playwright-core
node verif-v23.mjs ../studio-planches-v23.html
```

Chaque fichier `verif-*.mjs` couvre les correctifs de la version correspondante et
s'exécute sur la version courante — ils servent de tests de non-régression cumulés.
Adapter `executablePath` au chemin local de Chromium, ou passer la variable
d'environnement `CHROME`.

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
