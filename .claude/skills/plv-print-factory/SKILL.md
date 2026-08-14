---
name: plv-print-factory
description: Produit des fichiers PLV et ILV prêts pour l'imprimeur en HTML/CSS calé au millimètre — affiches, stop-rayons, kakémonos, bâches, joues de gondole. Gère les formats aux cotes réelles du mobilier magasin, les fonds perdus, la résolution, le contrôle pré-vol et la déclinaison sur un réseau de points de vente.
when_to_use: >
  Phrases déclenchantes : "créer une affiche", "faire une PLV", "fichier imprimeur",
  "stop-rayon", "kakémono", "roll-up", "bâche", "joue de gondole", "affiche A1",
  "fond perdu", "prêt à imprimer", "bon à tirer", "BAT", "pré-vol", "300 dpi",
  "CMJN", "décliner sur tous les magasins", "adapter au réseau", "gabarit impression",
  "quelle taille de texte", "quel format pour", "repères de coupe".
argument-hint: "[format] [support] — ex: A1 affiche-TDG"
allowed-tools: Bash(python3 *) Bash(/opt/pw-browsers/chromium *) Read Write Edit Glob
---

# PLV Print Factory

Tu produis des fichiers d'impression, pas des maquettes d'écran. Toute mise en page se
fait **en millimètres**. Un fichier n'est livrable qu'après passage au pré-vol.

## Ressources

| Fichier | Contenu |
|---|---|
| [references/formats-plv.md](references/formats-plv.md) | Cotes réelles de 30 supports, fond perdu, DPI et bloc `@page` par format ; calcul de la taille de texte selon le recul |
| [references/chaine-graphique.md](references/chaine-graphique.md) | Fonds perdus, colorimétrie RVB→CMJN, moteurs de rendu, supports physiques, façonnage, les 8 contrôles du BAT |
| [templates/base-print.css](templates/base-print.css) | Socle CSS : zones, fond perdu, repères de coupe, échelle typographique, anti-pièges |
| [templates/exemple-affiche-a1.html](templates/exemple-affiche-a1.html) | Modèle complet commenté, affiche TDG A1 |
| `scripts/preflight.py` | Contrôle pré-vol automatique |
| `scripts/decliner_reseau.py` | Déclinaison d'un support sur N points de vente |

---

## Workflow

### 1. Cadrer le support

Réunir avant toute production :

```
Format ............ nom du support ou cotes en mm
Recul de lecture .. distance en mètres (détermine la typo ET le DPI)
Support physique .. papier / forex / akilux / bâche / adhésif
Quantité .......... unitaire ou réseau (combien de magasins)
Contenu ........... accroche, produit, prix, mentions obligatoires
Charte ............ couleurs et police de l'enseigne, sinon palette par défaut
Échéance .......... date de pose en magasin, moins le délai imprimeur
```

Si le format est nommé sans cotes, le résoudre dans `references/formats-plv.md`.
Ne jamais inventer une dimension : un format faux, c'est un tirage perdu.

### 2. Écrire le HTML

- Partir de `templates/exemple-affiche-a1.html`, lier `templates/base-print.css`
- Injecter le bloc `@page` du format visé, pris dans `references/formats-plv.md`
- Cible **Chromium** (défaut) : déclarer la page **fond perdu inclus** et poser
  `class="support crop-marks"`
- Cible **WeasyPrint** : déclarer la page au format **rogné** avec `bleed` et `marks`,
  et retirer `crop-marks`
- Calculer la typo depuis le recul : `font-size mm ≈ distance m × 5,7` en lecture
  courante, `× 8,6` pour une accroche
- Tout le contenu lisible dans `.zone-sure`, le fond dans `.fond`
- Sur chaque `<img>`, renseigner `data-print-width="XXmm"` — sans quoi le pré-vol ne
  peut pas contrôler la résolution

### 3. Déclinaison réseau — si plusieurs points de vente

Placer les variables dans le HTML sous la forme `{{ville}}`, `{{horaires}}`, `{{tel}}`,
puis :

```bash
python3 scripts/decliner_reseau.py modele.html magasins.csv sortie-reseau
```

Le script refuse de produire un fichier dont une variable est vide, et le signale.
Un support parti à l'impression avec `{{tel}}` visible, c'est le tirage entier à refaire.

### 4. Pré-vol — obligatoire

```bash
python3 scripts/preflight.py affiche.html 150     # 150 = DPI cible du recul
```

Contrôle : résolution effective de chaque image, déclaration `@page`, présence de
`print-color-adjust`, repères de coupe, couleurs hors gamut quadri, plancher de
lisibilité à 4 mm, dépendances réseau.

**Ne jamais livrer un fichier en ERREUR.** Les alertes se valident explicitement
avec le demandeur.

### 5. Export PDF

```bash
/opt/pw-browsers/chromium --headless=new --no-sandbox --disable-gpu \
  --no-pdf-header-footer --print-to-pdf=affiche.pdf affiche.html
```

Pour de vrais repères de coupe, préférer WeasyPrint : `weasyprint affiche.html affiche.pdf`

### 6. Accompagner la livraison

Toujours joindre au fichier une fiche de production :

```
FICHE DE PRODUCTION
Support ............ Affiche tête de gondole
Format fini ........ 594 × 841 mm (A1)
Fond perdu ......... 3 mm sur les 4 côtés
Support physique ... papier couché 170 g/m², pelliculage mat
Colorimétrie ....... PDF RVB (sRGB) — conversion CMJN à votre charge,
                     profil Fogra39. Noir du texte en 100 % K seul.
Façonnage .......... aucun
Quantité ........... 42 exemplaires (1 par point de vente)
Date de livraison .. 26/05/2026
Pré-vol ............ 0 erreur, 0 alerte
```

Le pelliculage **mat** est impératif en vitrine plein soleil : le brillant réfléchit
et rend l'affiche illisible.

---

## Règles fermes

- **Millimètres uniquement.** Un `px` dans une mise en page est un bug.
- **Le DPI suit le recul, pas le format.** Une bâche à 15 m est nette à 72 dpi ;
  une étiquette à 40 cm exige 300 dpi.
- **Rien de vital hors `.zone-sure`.** La tolérance massicot est de ±2 mm.
- **Les mentions légales ne descendent jamais sous 4 mm.**
- **Un prix, une date de validité, une référence : relus par une seconde personne.**
  Le pré-vol contrôle la technique, pas l'exactitude commerciale.
- **Aucune dépendance réseau** — ni police CDN, ni image distante.

---

## Commandes

- `/plv-print-factory A1 affiche-TDG` — affiche tête de gondole A1
- `/plv-print-factory stop-rayon promo` — stop-rayon promotionnel
- `/plv-print-factory kakémono soldes` — kakémono suspendu
- `/plv-print-factory bâche 3000x1500` — bâche façade sur mesure
- `/plv-print-factory prévol` — contrôle un fichier existant
- `/plv-print-factory réseau` — décline un support sur tous les points de vente
