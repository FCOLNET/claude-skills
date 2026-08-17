# Catalogue des formats PLV / ILV — cotes réelles

Toutes les cotes sont en **millimètres, format rogné** (hors fond perdu).
La colonne « @page » donne le bloc à injecter en tête du HTML.

---

## 1. Supports rayon

| Support | Format rogné | Fond perdu | Recul lecture | DPI mini | @page |
|---|---|---|---|---|---|
| Étiquette rayon standard | 73 × 38 | 2 mm | 0,4 m | 300 | voir skill `etiquette-prix-batch` |
| Étiquette rayon grande | 105 × 74 | 2 mm | 0,5 m | 300 | `size: 105mm 74mm` |
| Stop-rayon petit | 100 × 70 | 3 mm | 1,5 m | 250 | `size: 100mm 70mm` |
| Stop-rayon large | 210 × 70 | 3 mm | 2 m | 200 | `size: 210mm 70mm` |
| Wobbler rond | Ø 80 | 3 mm | 1,5 m | 250 | `size: 80mm 80mm` |
| Wobbler rond grand | Ø 100 | 3 mm | 2 m | 250 | `size: 100mm 100mm` |
| Réglette de gondole | 1000 × 40 | 3 mm | 2 m | 200 | `size: 1000mm 40mm` |
| Réglette longue | 1330 × 40 | 3 mm | 2 m | 200 | `size: 1330mm 40mm` |
| Bandeau de rayon | 1000 × 150 | 3 mm | 4 m | 150 | `size: 1000mm 150mm` |

> **Wobbler** : prévoir une languette de fixation non imprimée de 30 mm hors format,
> ou un perçage Ø 4 mm centré à 10 mm du bord haut. Le préciser au façonnier.

---

## 2. Têtes de gondole et joues

| Support | Format rogné | Fond perdu | Recul lecture | DPI mini | @page |
|---|---|---|---|---|---|
| Affiche TDG A1 | 594 × 841 | 3 mm | 5 m | 150 | `size: 594mm 841mm` |
| Affiche TDG A0 | 841 × 1189 | 3 mm | 8 m | 120 | `size: 841mm 1189mm` |
| Fronton TDG | 1200 × 300 | 3 mm | 6 m | 150 | `size: 1200mm 300mm` |
| Joue de gondole | 400 × 1800 | 5 mm | 6 m | 120 | `size: 400mm 1800mm` |
| Joue de gondole large | 600 × 1800 | 5 mm | 6 m | 120 | `size: 600mm 1800mm` |

---

## 3. Vitrine et façade

| Support | Format rogné | Fond perdu | Recul lecture | DPI mini | @page |
|---|---|---|---|---|---|
| Affiche vitrine A2 | 420 × 594 | 3 mm | 3 m | 200 | `size: 420mm 594mm` |
| Affiche vitrine A1 | 594 × 841 | 3 mm | 5 m | 150 | `size: 594mm 841mm` |
| Affiche 70 × 100 | 700 × 1000 | 3 mm | 6 m | 150 | `size: 700mm 1000mm` |
| Format abribus | 1200 × 1760 | 5 mm | 10 m | 100 | `size: 1200mm 1760mm` |
| Kakémono suspendu | 600 × 1600 | 5 mm | 8 m | 120 | `size: 600mm 1600mm` |
| Kakémono grand | 800 × 2000 | 5 mm | 10 m | 100 | `size: 800mm 2000mm` |
| Bâche façade | sur mesure | 30 mm* | 15 m + | 72 | `size: <L>mm <H>mm` |

> **\*Bâche** : le « fond perdu » de 30 mm est en réalité un **ourlet de retour**.
> Œillets tous les 500 mm sur le pourtour, à 20 mm du bord fini.
> Aucun élément vital à moins de 60 mm du bord (ourlet + tension).

---

## 4. Sol, mobile et caisse

| Support | Format rogné | Fond perdu | Recul lecture | DPI mini | @page |
|---|---|---|---|---|---|
| Sticker sol rond | Ø 300 | 3 mm | 2 m | 200 | `size: 300mm 300mm` |
| Sticker sol grand | Ø 500 | 3 mm | 3 m | 150 | `size: 500mm 500mm` |
| Chevalet stop-trottoir A1 | 594 × 841 | 3 mm | 5 m | 150 | `size: 594mm 841mm` |
| Roll-up | 850 × 2000 | 0 mm** | 8 m | 120 | `size: 850mm 2000mm` |
| Roll-up large | 1000 × 2000 | 0 mm** | 8 m | 120 | `size: 1000mm 2000mm` |
| Totem | 600 × 1800 | 5 mm | 8 m | 120 | `size: 600mm 1800mm` |
| Chevalet de table A5 | 148 × 210 | 3 mm | 0,8 m | 300 | `size: 148mm 210mm` |
| Fronton de caisse | 700 × 200 | 3 mm | 3 m | 200 | `size: 700mm 200mm` |

> **\*\*Roll-up** : pas de fond perdu latéral (le visuel est coupé net dans le rail),
> mais prévoir **+ 150 mm en pied** qui s'enroulent dans la cassette et ne se voient jamais.
> Ne rien mettre de vital dans les 200 mm du bas.

---

## 5. Formats normalisés (rappel)

| Format | mm | Format | mm |
|---|---|---|---|
| A0 | 841 × 1189 | A4 | 210 × 297 |
| A1 | 594 × 841 | A5 | 148 × 210 |
| A2 | 420 × 594 | A6 | 105 × 148 |
| A3 | 297 × 420 | A7 | 74 × 105 |

---

## 6. Calcul de la taille de texte selon le recul

La règle porte sur la **hauteur de capitale**, pas sur la taille de police.
Pour une linéale courante : `hauteur de capitale ≈ 0,70 × font-size`.

| Objectif | Hauteur capitale (mm) | font-size (mm) |
|---|---|---|
| Lisibilité limite | distance (m) × 2,5 | distance × 3,6 |
| **Confort de lecture** | **distance (m) × 4** | **distance × 5,7** |
| Impact fort (accroche) | distance (m) × 6 | distance × 8,6 |

**Exemples appliqués**

| Support | Recul | Accroche | Prix | Mentions |
|---|---|---|---|---|
| Stop-rayon | 1,5 m | 13 mm | 10 mm | 3 mm |
| Affiche A1 vitrine | 5 m | 43 mm | 35 mm | 4 mm |
| Kakémono | 8 m | 69 mm | 55 mm | 5 mm |
| Bâche façade | 15 m | 129 mm | 100 mm | non lisible, à supprimer |

> Les mentions légales ne descendent **jamais sous 4 mm de font-size** quel que soit
> le support : c'est le plancher de lisibilité admis pour l'information consommateur.

---

## 7. Résolution d'image requise

Formule : `pixels nécessaires = largeur_mm × dpi ÷ 25,4`

| Largeur du bloc image | 300 dpi | 200 dpi | 150 dpi | 100 dpi |
|---|---|---|---|---|
| 50 mm | 591 px | 394 px | 295 px | 197 px |
| 100 mm | 1181 px | 787 px | 591 px | 394 px |
| 200 mm | 2362 px | 1575 px | 1181 px | 787 px |
| 400 mm | 4724 px | 3150 px | 2362 px | 1575 px |
| 800 mm | 9449 px | 6299 px | 4724 px | 3150 px |

`scripts/preflight.py` applique ce contrôle automatiquement sur chaque `<img>`.
