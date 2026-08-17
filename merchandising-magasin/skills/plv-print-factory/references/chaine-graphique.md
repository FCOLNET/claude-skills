# Chaîne graphique — du HTML au bon à tirer

---

## 1. Le fond perdu

Les massicots ont une tolérance de ±1 à 2 mm. Sans débord, un liseré blanc apparaît sur
la tranche. Le fond perdu est l'extension du visuel **au-delà du trait de coupe**.

| Type de production | Fond perdu |
|---|---|
| Papier, carte, adhésif | 3 mm |
| Panneaux rigides (forex, akilux, dibond) | 5 mm |
| Bâche avec ourlet et œillets | 30 mm (retour d'ourlet) |
| Roll-up | 0 mm latéral, +150 mm en pied |

**Trois zones à ne jamais confondre :**

```
┌─────────────────────────────────┐  ← bord du fichier (rogné + fond perdu)
│  ░░░░░░░ FOND PERDU ░░░░░░░░░░  │     le fond déborde ici, rien de vital
│  ┌───────────────────────────┐  │  ← TRAIT DE COUPE (format fini)
│  │                           │  │
│  │   ┌───────────────────┐   │  │  ← ZONE DE SÉCURITÉ (5 mm en retrait)
│  │   │  texte, prix,     │   │  │     tout le contenu lisible vit ici
│  │   │  logo, mentions   │   │  │
│  │   └───────────────────┘   │  │
│  └───────────────────────────┘  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
└─────────────────────────────────┘
```

Dans `base-print.css` : la classe `.fond` gère le débord, la classe `.zone-sure`
gère le retrait. Ne jamais poser de texte en dehors de `.zone-sure`.

---

## 2. Colorimétrie — la limite honnête du HTML/CSS

**CSS ne sait pas exprimer du CMJN.** `device-cmyk()` existe dans la spécification
CSS Color 5 mais aucun moteur d'impression ne l'implémente sérieusement. Tout ce qu'on
produit est en RVB. Deux stratégies, à choisir explicitement :

### Stratégie A — laisser l'imprimeur convertir (recommandé)
Livrer le PDF en RVB en précisant le profil cible dans le bon de commande :
> « PDF RVB (sRGB). Conversion CMJN à votre charge, profil **Fogra39 / ISO Coated v2**.
> Noir du texte à convertir en **100 % K seul**. »

La plupart des imprimeurs modernes préfèrent ça : leur RIP a de meilleurs profils que
n'importe quelle conversion faite en amont.

### Stratégie B — convertir soi-même avec Ghostscript
```bash
gs -dSAFER -dBATCH -dNOPAUSE \
   -sDEVICE=pdfwrite \
   -sColorConversionStrategy=CMYK \
   -dProcessColorModel=/DeviceCMYK \
   -dPDFSETTINGS=/prepress \
   -sOutputFile=affiche-cmjn.pdf affiche.pdf
```
**Contrôle obligatoire après conversion** : ouvrir le PDF et vérifier dans l'aperçu des
séparations que le texte noir n'est présent que sur la plaque **K**. Un noir composite
(C+M+J+K) sur du petit texte produit un tremblé de repérage à l'impression.

### Couleurs qui se dégradent en conversion

| RVB écran | Problème en CMJN | Substitut stable |
|---|---|---|
| `#00FF00` vert vif | vire kaki, perte totale d'éclat | `#43B02A` |
| `#0000FF` bleu électrique | vire violet sombre | `#0057B8` |
| `#FF00FF` magenta fluo | inatteignable | `#D6006E` |
| `#FF6600` orange saturé | se ternit | `#E8590C` |
| `#FF0000` rouge pur | acceptable mais mat | `#D6122B` |

La palette de `base-print.css` est déjà calée sur des valeurs qui tiennent la conversion.

### Noir riche vs noir 100 % K

| Usage | Valeur |
|---|---|
| Texte, filets fins, petits éléments | **100 % K seul** |
| Grands aplats noirs (fond d'affiche) | Noir riche C60 M40 J40 K100 |

Impossible à distinguer en CSS. Si le support a un grand aplat noir, le signaler à
l'imprimeur : « aplat de fond en noir riche, texte en K seul ».

---

## 3. Résolution

`pixels requis = largeur_mm × dpi ÷ 25,4`

Le DPI cible dépend du **recul de lecture**, pas du format :

| Recul | DPI cible | Supports concernés |
|---|---|---|
| < 0,5 m | 300 | étiquettes, prospectus, chevalet de table |
| 1 – 2 m | 200 – 250 | stop-rayon, affiche A2, fronton de caisse |
| 2 – 5 m | 150 | affiche A1, bandeau de rayon, chevalet |
| 5 – 10 m | 100 – 120 | kakémono, roll-up, joue de gondole |
| > 10 m | 72 | bâche façade, enseigne |

Surdimensionner n'améliore rien et alourdit le fichier. Sous-dimensionner produit une
image pixellisée irrattrapable. `scripts/preflight.py` calcule le DPI effectif réel de
chaque image et signale les écarts.

---

## 4. Moteurs de rendu — lequel choisir

| Moteur | `bleed` / `marks` | Flexbox / Grid | Coût | Verdict |
|---|---|---|---|---|
| **Chromium headless** | ✗ ignorés | excellent | libre | Défaut. Déclarer la page en format fond perdu inclus + `.crop-marks`. |
| **WeasyPrint** | ✓ natifs | correct | libre | Le meilleur choix quand il faut de vrais repères de coupe. |
| **Prince XML** | ✓ natifs | excellent | payant | Référence du secteur, si le budget existe. |
| **Paged.js** | ✓ simulés | excellent | libre | Utile pour l'aperçu navigateur interactif. |

**Chromium** (préinstallé dans cet environnement) :
```bash
/opt/pw-browsers/chromium --headless=new --no-sandbox --disable-gpu \
  --no-pdf-header-footer \
  --print-to-pdf=affiche.pdf \
  affiche.html
```

**WeasyPrint** (si de vrais repères de coupe sont exigés) :
```bash
weasyprint affiche.html affiche.pdf
```
avec dans le HTML : `@page { size: 594mm 841mm; bleed: 3mm; marks: crop cross; }`

---

## 5. Polices

Les deux moteurs intègrent (embed) automatiquement les polices dans le PDF : la
« vectorisation » manuelle n'est plus nécessaire. Deux règles subsistent :

- **Jamais de police chargée depuis un CDN.** Le rendu doit être reproductible hors ligne.
  Utiliser une police système ou l'embarquer en `@font-face` avec un fichier local.
- **Vérifier la licence d'embarquement** de la police. Certaines licences gratuites
  interdisent l'usage commercial imprimé.

---

## 6. Supports physiques et grammages

| Support | Épaisseur / grammage | Usage | Durée |
|---|---|---|---|
| Papier affiche couché | 135 – 170 g/m² | affiche vitrine, TDG | intérieur, temporaire |
| Carte | 250 – 350 g/m² | chevalet de table, stop-rayon | intérieur, 1 saison |
| Akilux (PP alvéolaire) | 3,5 mm | panneau économique, chevalet | ext. court terme |
| Forex (PVC expansé) | 3 / 5 / 10 mm | joue de gondole, totem | intérieur durable |
| Dibond (alu composite) | 3 mm | façade, signalétique permanente | ext. longue durée |
| Bâche PVC | 450 – 680 g/m² | façade, échafaudage | ext. 1 – 3 ans |
| Adhésif monomère | — | vitrophanie temporaire | < 1 an |
| Adhésif polymère | — | vitrophanie durable | 3 – 5 ans |
| Adhésif sol | vernis antidérapant | sticker sol | 3 – 6 mois |

> **Adhésif sol** : le vernis antidérapant est une **obligation de sécurité**, pas une
> option. Exiger un support certifié R10 minimum et le mentionner sur le bon de commande.

---

## 7. Façonnage à préciser sur le bon de commande

- **Pelliculage** : brillant (impact, mais reflets en vitrine) ou mat (lisibilité, anti-reflet).
  En vitrine plein soleil, toujours mat.
- **Œillets** : diamètre 10 mm, tous les 500 mm, à 20 mm du bord fini.
- **Découpe à la forme** : fournir un tracé de coupe en ton direct nommé `CutContour`.
  Non réalisable en HTML/CSS — le demander au façonnier à partir des cotes.
- **Rainage** : obligatoire au-delà de 250 g/m² pour tout pli, sinon la fibre casse.
- **Perçage wobbler** : Ø 4 mm, centré, à 10 mm du bord haut.

---

## 8. Bon à tirer — les 8 contrôles avant envoi

1. Format rogné conforme à la commande
2. Fond perdu présent sur les 4 côtés, fond effectivement débordant
3. Aucun texte à moins de 5 mm du trait de coupe
4. DPI effectif ≥ cible pour chaque image (`preflight.py`)
5. Mentions légales ≥ 4 mm, lisibles
6. Prix, dates de validité et références vérifiés **par une seconde personne**
7. Polices embarquées, aucune référence réseau
8. Profil colorimétrique annoncé à l'imprimeur

Un BAT signé engage. Le point 6 n'est pas une formalité : une erreur de prix sur
un tirage réseau se paie en réimpression complète.
