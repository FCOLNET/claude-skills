#!/usr/bin/env python3
"""Génère des planches d'étiquettes prix imprimables à partir d'un export caisse.

Usage:
    python3 generate_labels.py produits.csv [sortie.html] [--gabarit 73x38]

Colonnes CSV (l'en-tête est obligatoire) :

    reference          libre, affichée en petit
    designation        obligatoire
    prix               obligatoire, prix de vente TTC en euros (ex: 8.90)
    quantite           contenance numérique (ex: 500)
    unite              g | kg | ml | cl | l | piece
    type               normale | promo | reduflation | nouveaute   (défaut normale)
    prix_barre         requis si type=promo
    date_debut         requis si type=promo, format libre (ex: 01/06/2026)
    date_fin           requis si type=promo
    ancienne_quantite  requis si type=reduflation
    ancien_prix        facultatif ; à défaut, prix supposé inchangé

Le script REFUSE toute ligne non conforme plutôt que d'imprimer une étiquette
illégale. Chaque refus est motivé.

Stdlib uniquement.
"""

import csv
import os
import re
import sys

# Gabarits : (largeur_mm, hauteur_mm, colonnes, lignes)
GABARITS = {
    "73x38":  (73, 38, 2, 7),    # rail de gondole standard — 14 par A4
    "60x40":  (60, 40, 3, 7),    # petit format — 21 par A4
    "105x74": (105, 74, 2, 3),   # grand format A7 — 6 par A4, marges confortables
}
GABARIT_DEFAUT = "73x38"
PAGE_L, PAGE_H = 210.0, 297.0    # A4 portrait

# Conversions vers l'unité de référence légale
VERS_KG = {"g": 0.001, "kg": 1.0}
VERS_L = {"ml": 0.001, "cl": 0.01, "l": 1.0}
SANS_PRIX_UNITAIRE = {"piece", "pièce", "pce", "unite", "unité", "u", ""}

DESIGNATION_MAX = 40


# --------------------------------------------------------------------------
# Formatage français
# --------------------------------------------------------------------------

def euros(valeur):
    return f"{valeur:,.2f}".replace(",", " ").replace(".", ",")


def echapper(texte):
    return (str(texte).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


def nombre(brut):
    """Convertit '8,90' ou '8.90' en float. None si vide ou illisible."""
    brut = (brut or "").strip().replace(",", ".").replace(" ", "").replace(" ", "")
    if not brut:
        return None
    try:
        return float(brut)
    except ValueError:
        return None


# --------------------------------------------------------------------------
# Calculs réglementaires
# --------------------------------------------------------------------------

def prix_unitaire(prix, quantite, unite):
    """Retourne (valeur, libellé_unité) ou (None, None) si non applicable."""
    unite = (unite or "").strip().lower()
    if unite in SANS_PRIX_UNITAIRE:
        return None, None
    if not quantite or quantite <= 0:
        return None, None
    if unite in VERS_KG:
        return prix / (quantite * VERS_KG[unite]), "kg"
    if unite in VERS_L:
        return prix / (quantite * VERS_L[unite]), "L"
    return None, None


def mention_reduflation(ligne, prix, quantite, unite):
    """Mention prescrite par l'arrêté du 16 avril 2024, en vigueur au 01/07/2024."""
    ancienne_q = nombre(ligne.get("ancienne_quantite"))
    ancien_p = nombre(ligne.get("ancien_prix"))
    if ancien_p is None:
        ancien_p = prix                      # prix supposé inchangé

    pu_avant, libelle = prix_unitaire(ancien_p, ancienne_q, unite)
    pu_apres, _ = prix_unitaire(prix, quantite, unite)
    if pu_avant is None or pu_apres is None or pu_avant <= 0:
        return None

    hausse = (pu_apres / pu_avant - 1) * 100
    u = (unite or "").strip().lower()
    return (f"Pour ce produit, la quantité vendue est passée de {ancienne_q:g} {u} "
            f"à {quantite:g} {u} et son prix au {libelle} a augmenté de "
            f"{f'{hausse:.1f}'.replace('.', ',')} %.")


# --------------------------------------------------------------------------
# Validation
# --------------------------------------------------------------------------

def valider(ligne, gabarit):
    """Retourne (donnees, erreurs, alertes). donnees vaut None si erreurs."""
    erreurs, alertes = [], []

    designation = (ligne.get("designation") or "").strip()
    if not designation:
        erreurs.append("désignation absente")
    elif len(designation) > DESIGNATION_MAX:
        alertes.append(f"désignation de {len(designation)} caractères, tronquée à l'affichage")

    prix = nombre(ligne.get("prix"))
    if prix is None or prix <= 0:
        erreurs.append("prix absent ou invalide")

    type_et = (ligne.get("type") or "normale").strip().lower()
    if type_et not in ("normale", "promo", "reduflation", "nouveaute"):
        erreurs.append(f"type inconnu : {type_et}")

    quantite = nombre(ligne.get("quantite"))
    unite = (ligne.get("unite") or "").strip().lower()

    if erreurs:
        return None, erreurs, alertes

    # Prix au kg/L — obligation légale pour tout préemballé au poids ou au volume
    pu, libelle_pu = prix_unitaire(prix, quantite, unite)
    if unite not in SANS_PRIX_UNITAIRE and pu is None:
        erreurs.append(
            f"prix au kg/L incalculable (quantité={ligne.get('quantite')!r}, "
            f"unité={unite!r}) — mention légalement obligatoire"
        )

    prix_barre = remise = date_debut = date_fin = None
    if type_et == "promo":
        prix_barre = nombre(ligne.get("prix_barre"))
        date_debut = (ligne.get("date_debut") or "").strip()
        date_fin = (ligne.get("date_fin") or "").strip()
        if prix_barre is None:
            erreurs.append("type=promo sans prix_barre")
        elif prix_barre <= prix:
            erreurs.append(f"prix_barre ({euros(prix_barre)} €) "
                           f"≤ prix ({euros(prix)} €) — promotion non justifiée")
        else:
            remise = round((prix_barre - prix) / prix_barre * 100)
        if not date_debut or not date_fin:
            erreurs.append("type=promo sans date_debut et date_fin")

    mention = None
    if type_et == "reduflation":
        ancienne_q = nombre(ligne.get("ancienne_quantite"))
        if ancienne_q is None:
            erreurs.append("type=reduflation sans ancienne_quantite")
        elif quantite is None or ancienne_q <= quantite:
            erreurs.append("ancienne_quantite doit être supérieure à quantite")
        else:
            mention = mention_reduflation(ligne, prix, quantite, unite)
            if mention is None:
                erreurs.append("mention réduflation incalculable — vérifier unité et quantités")
            elif gabarit == "73x38":
                alertes.append("mention réduflation sur gabarit 73x38 — passer en 105x74")

    if erreurs:
        return None, erreurs, alertes

    return {
        "reference": (ligne.get("reference") or "").strip(),
        "designation": designation,
        "prix": prix,
        "prix_unitaire": pu,
        "libelle_pu": libelle_pu,
        "type": type_et,
        "prix_barre": prix_barre,
        "remise": remise,
        "date_debut": date_debut,
        "date_fin": date_fin,
        "mention": mention,
    }, [], alertes


# --------------------------------------------------------------------------
# Rendu
# --------------------------------------------------------------------------

def rendre_etiquette(d):
    entier, cents = f"{d['prix']:.2f}".split(".")
    parts = [f'<div class="etiquette {d["type"]}">']

    if d["reference"]:
        parts.append(f'<div class="ref">{echapper(d["reference"])}</div>')
    parts.append(f'<div class="designation">{echapper(d["designation"])}</div>')

    parts.append('<div class="bloc-prix">')
    if d["prix_barre"] is not None:
        parts.append(f'<span class="prix-barre">{euros(d["prix_barre"])} €</span>')
    parts.append(
        f'<span class="prix">{entier}'
        f'<span class="cents">,{cents}</span><span class="devise">€</span></span>'
    )
    if d["remise"]:
        parts.append(f'<span class="remise">−{d["remise"]} %</span>')
    parts.append("</div>")

    if d["prix_unitaire"] is not None:
        parts.append(
            f'<div class="prix-unitaire">soit {euros(d["prix_unitaire"])} € / '
            f'{d["libelle_pu"]}</div>'
        )

    if d["type"] == "promo":
        parts.append(
            f'<div class="mention">Du {echapper(d["date_debut"])} au '
            f'{echapper(d["date_fin"])}. Prix de référence : prix le plus bas pratiqué '
            f'au cours des 30 derniers jours dans ce point de vente.</div>'
        )
    elif d["mention"]:
        parts.append(f'<div class="mention">{echapper(d["mention"])}</div>')

    parts.append("</div>")
    return "".join(parts)


def rendre_document(etiquettes, gabarit, css):
    largeur, hauteur, colonnes, lignes = GABARITS[gabarit]
    par_page = colonnes * lignes
    marge_h = (PAGE_L - colonnes * largeur) / 2
    marge_v = (PAGE_H - lignes * hauteur) / 2

    pages = []
    for debut in range(0, len(etiquettes), par_page):
        contenu = "".join(etiquettes[debut:debut + par_page])
        pages.append(f'<div class="planche">{contenu}</div>')

    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Étiquettes prix — {gabarit} — {len(etiquettes)} unité(s)</title>
<style>
@page {{ size: {PAGE_L:g}mm {PAGE_H:g}mm; margin: 0; }}
:root {{
  --et-l: {largeur:g}mm;
  --et-h: {hauteur:g}mm;
  --colonnes: {colonnes};
  --marge-h: {marge_h:.2f}mm;
  --marge-v: {marge_v:.2f}mm;
  --page-l: {PAGE_L:g}mm;
  --page-h: {PAGE_H:g}mm;
}}
{css}
</style>
</head>
<body>
{chr(10).join(pages)}
</body>
</html>
"""


# --------------------------------------------------------------------------

def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    gabarit = GABARIT_DEFAUT
    if "--gabarit" in sys.argv:
        i = sys.argv.index("--gabarit")
        if i + 1 < len(sys.argv):
            gabarit = sys.argv[i + 1]

    if not args:
        print("Usage : python3 generate_labels.py <produits.csv> [sortie.html] "
              f"[--gabarit {'|'.join(GABARITS)}]")
        return 2
    if gabarit not in GABARITS:
        print(f"Gabarit inconnu : {gabarit}. Disponibles : {', '.join(GABARITS)}")
        return 2

    chemin_csv = args[0]
    sortie = args[1] if len(args) > 1 else "etiquettes.html"
    if not os.path.exists(chemin_csv):
        print(f"Fichier introuvable : {chemin_csv}")
        return 2

    chemin_css = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                              "..", "templates", "etiquettes.css")
    if not os.path.exists(chemin_css):
        print(f"Feuille de style introuvable : {chemin_css}")
        return 2
    with open(chemin_css, encoding="utf-8") as f:
        css = f.read()

    with open(chemin_csv, encoding="utf-8-sig", newline="") as f:
        lignes = list(csv.DictReader(f))

    etiquettes, refus, avertissements = [], [], []
    for index, ligne in enumerate(lignes, start=2):
        cle = (ligne.get("reference") or ligne.get("designation") or f"ligne {index}").strip()
        donnees, erreurs, alertes = valider(ligne, gabarit)
        for a in alertes:
            avertissements.append(f"{cle} — {a}")
        if erreurs:
            refus.append((cle, erreurs))
        else:
            etiquettes.append(rendre_etiquette(donnees))

    largeur, hauteur, colonnes, nb_lignes = GABARITS[gabarit]
    par_page = colonnes * nb_lignes

    print("=" * 72)
    print(f"ÉTIQUETTES PRIX — gabarit {gabarit} ({largeur:g} × {hauteur:g} mm, "
          f"{par_page} par A4)")
    print("=" * 72)

    if refus:
        print(f"\nREFUSÉES — {len(refus)} ligne(s) non conforme(s)")
        print("-" * 72)
        for cle, erreurs in refus:
            print(f"  ✗ {cle}")
            for e in erreurs:
                print(f"      {e}")

    if avertissements:
        print(f"\nALERTES — {len(avertissements)}")
        print("-" * 72)
        for a in avertissements:
            print(f"  ! {a}")

    if not etiquettes:
        print("\nAucune étiquette conforme — rien à produire.")
        return 1

    with open(sortie, "w", encoding="utf-8") as f:
        f.write(rendre_document(etiquettes, gabarit, css))

    pages = (len(etiquettes) + par_page - 1) // par_page
    print(f"\n{len(etiquettes)} étiquette(s) sur {pages} planche(s) → {sortie}")
    print("\nExport PDF :")
    print(f"  chromium --headless=new --no-sandbox --no-pdf-header-footer "
          f"--print-to-pdf={os.path.splitext(sortie)[0]}.pdf {sortie}")
    print("=" * 72)

    return 1 if refus else 0


if __name__ == "__main__":
    sys.exit(main())
