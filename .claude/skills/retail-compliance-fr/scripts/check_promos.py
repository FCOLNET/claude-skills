#!/usr/bin/env python3
"""Contrôle la conformité d'un plan promotionnel avant sa mise en place en magasin.

Usage:
    python3 check_promos.py plan.csv [--soldes AAAA-MM-JJ:AAAA-MM-JJ ...]
                                     [--date-controle AAAA-MM-JJ]

Colonnes CSV (l'en-tête est obligatoire) :

    reference, designation   identification
    categorie                alimentaire | animaux | dph | autre
    mecanique                remise | lot | soldes
    prix_reference           prix barré annoncé, TTC
    prix_min_30j             prix le plus bas pratiqué sur les 30 jours précédents
    prix_promo               requis si remise ou soldes
    achetes, offerts         requis si lot (ex: 2 et 1 pour « 2 achetés + 1 offert »)
    prix_achat_net           prix d'achat effectif unitaire TTC (recommandé)
    date_debut, date_fin     JJ/MM/AAAA ou AAAA-MM-JJ

Le script REFUSE toute opération non conforme. Les seuils sont ceux de
references/textes-et-seuils.md : les modifier ici et là-bas dans le même commit.

Stdlib uniquement.
"""

import argparse
import csv
import os
import sys
from datetime import date, datetime

# Dispositifs temporaires : (valeur, échéance). Au-delà de l'échéance, le script
# continue d'appliquer la valeur (choix prudent) mais émet une alerte.
DISPOSITIFS = {
    "plafond_alimentaire": (0.34, date(2028, 4, 15)),   # loi n° 2025-337
    "plafond_dph":         (0.40, date(2028, 4, 15)),   # loi n° 2025-337
    "srp10":               (1.10, date(2028, 4, 15)),   # loi n° 2025-337
}

PLAFOND_PAR_CATEGORIE = {
    "alimentaire": "plafond_alimentaire",
    "animaux": "plafond_alimentaire",
    "dph": "plafond_dph",
    "autre": None,
}
CATEGORIES_SRP10 = {"alimentaire", "animaux"}
MECANIQUES = {"remise", "lot", "soldes"}

TOLERANCE = 0.005   # un demi-centime : absorbe les arrondis de saisie


# --------------------------------------------------------------------------
# Lecture des valeurs
# --------------------------------------------------------------------------

def euros(valeur):
    return f"{valeur:,.2f}".replace(",", " ").replace(".", ",")


def pourcent(valeur):
    return f"{valeur * 100:.1f}".replace(".", ",") + " %"


def nombre(brut):
    """Convertit '8,90' ou '8.90' en float. None si vide ou illisible."""
    brut = (brut or "").strip().replace(",", ".").replace(" ", "").replace(" ", "")
    if not brut:
        return None
    try:
        return float(brut)
    except ValueError:
        return None


def entier(brut):
    valeur = nombre(brut)
    if valeur is None or valeur != int(valeur):
        return None
    return int(valeur)


def lire_date(brut):
    brut = (brut or "").strip()
    for fmt in ("%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(brut, fmt).date()
        except ValueError:
            continue
    return None


def lire_periode(brut):
    """'2027-01-13:2027-02-09' → (date, date)."""
    morceaux = brut.split(":")
    if len(morceaux) != 2:
        return None
    debut, fin = lire_date(morceaux[0]), lire_date(morceaux[1])
    if not debut or not fin or debut > fin:
        return None
    return debut, fin


# --------------------------------------------------------------------------
# Contrôle d'une ligne
# --------------------------------------------------------------------------

def controler(ligne, periodes_soldes):
    """Retourne (synthèse, refus, alertes)."""
    refus, alertes = [], []

    designation = (ligne.get("designation") or "").strip()
    categorie = (ligne.get("categorie") or "").strip().lower()
    mecanique = (ligne.get("mecanique") or "").strip().lower()
    prix_ref = nombre(ligne.get("prix_reference"))
    prix_min = nombre(ligne.get("prix_min_30j"))
    prix_achat = nombre(ligne.get("prix_achat_net"))
    debut = lire_date(ligne.get("date_debut"))
    fin = lire_date(ligne.get("date_fin"))

    if not designation:
        refus.append("désignation absente")
    if categorie not in PLAFOND_PAR_CATEGORIE:
        refus.append(f"catégorie inconnue « {categorie} » "
                     f"(attendu : {' | '.join(PLAFOND_PAR_CATEGORIE)})")
    if mecanique not in MECANIQUES:
        refus.append(f"mécanique inconnue « {mecanique} » "
                     f"(attendu : {' | '.join(sorted(MECANIQUES))})")
    if not prix_ref or prix_ref <= 0:
        refus.append("prix de référence absent ou nul")
    if not prix_min or prix_min <= 0:
        refus.append("prix le plus bas des 30 jours absent : le prix de référence "
                     "ne peut pas être justifié")
    if not debut or not fin:
        refus.append("dates de début et de fin absentes ou illisibles")
    elif debut > fin:
        refus.append("date de début postérieure à la date de fin")
    if refus:
        return None, refus, alertes

    # Prix de référence (C. conso L. 112-1-1)
    if prix_ref > prix_min + TOLERANCE:
        refus.append(f"prix de référence {euros(prix_ref)} € supérieur au prix le plus "
                     f"bas des 30 jours ({euros(prix_min)} €) : réduction trompeuse — "
                     f"calculer la remise sur {euros(prix_min)} €")
    elif prix_ref < prix_min - TOLERANCE:
        alertes.append(f"prix de référence {euros(prix_ref)} € inférieur au prix le plus "
                       f"bas des 30 jours ({euros(prix_min)} €) : données incohérentes")

    # Avantage consenti et prix unitaire effectivement payé
    if mecanique == "lot":
        achetes, offerts = entier(ligne.get("achetes")), entier(ligne.get("offerts"))
        if not achetes or not offerts or achetes < 1 or offerts < 1:
            refus.append("lot sans quantités achetées et offertes entières")
            return None, refus, alertes
        avantage = offerts / (achetes + offerts)
        prix_effectif = prix_ref * achetes / (achetes + offerts)
        libelle = f"{achetes} acheté(s) + {offerts} offert(s)"
    else:
        prix_promo = nombre(ligne.get("prix_promo"))
        if not prix_promo or prix_promo <= 0:
            refus.append("prix promotionnel absent")
            return None, refus, alertes
        if prix_promo >= prix_ref - TOLERANCE:
            refus.append(f"prix promotionnel {euros(prix_promo)} € non inférieur au prix "
                         f"de référence {euros(prix_ref)} € : ce n'est pas une promotion")
            return None, refus, alertes
        avantage = 1 - prix_promo / prix_ref
        prix_effectif = prix_promo
        libelle = f"{euros(prix_ref)} → {euros(prix_promo)} €"

    # Plafonds EGalim en valeur
    cle_plafond = PLAFOND_PAR_CATEGORIE[categorie]
    if cle_plafond:
        plafond, echeance = DISPOSITIFS[cle_plafond]
        if round(avantage, 4) > plafond:
            refus.append(f"avantage {pourcent(avantage)} au-delà du plafond de "
                         f"{pourcent(plafond)} ({categorie})")
        if fin > echeance:
            alertes.append(f"l'opération finit après l'échéance du plafond promotionnel "
                           f"({echeance:%d/%m/%Y}) : vérifier sa prolongation")

    # Soldes : dates légales, et exception à l'interdiction de revente à perte
    if mecanique == "soldes":
        if not periodes_soldes:
            refus.append("soldes sans période officielle fournie (--soldes)")
        elif not any(p_debut <= debut and fin <= p_fin for p_debut, p_fin in periodes_soldes):
            refus.append(f"soldes du {debut:%d/%m/%Y} au {fin:%d/%m/%Y} hors des périodes "
                         f"légales fournies")
        alertes.append("soldes : exception à l'interdiction de revente à perte "
                       "(C. commerce L. 442-5 II) — produits en stock et payés depuis "
                       "au moins un mois")
    # Revente à perte (C. commerce L. 442-5) et SRP+10
    elif prix_achat is None:
        alertes.append("prix d'achat net absent : revente à perte non vérifiée")
    elif prix_effectif < prix_achat - TOLERANCE:
        refus.append(f"revente à perte : prix payé {euros(prix_effectif)} € < prix "
                     f"d'achat effectif {euros(prix_achat)} €")
    elif categorie in CATEGORIES_SRP10:
        coefficient, echeance = DISPOSITIFS["srp10"]
        seuil = prix_achat * coefficient
        if debut <= echeance and prix_effectif < seuil - TOLERANCE:
            refus.append(f"sous le SRP+10 : prix payé {euros(prix_effectif)} € < "
                         f"{euros(seuil)} € (prix d'achat × {str(coefficient).replace('.', ',')})")
        if fin > echeance:
            alertes.append(f"l'opération finit après l'échéance du SRP+10 "
                           f"({echeance:%d/%m/%Y}) : vérifier sa prolongation")

    synthese = {
        "designation": designation,
        "categorie": categorie,
        "mecanique": mecanique,
        "libelle": libelle,
        "avantage": avantage,
        "periode": f"{debut:%d/%m} → {fin:%d/%m/%Y}",
    }
    return synthese, refus, alertes


# --------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Contrôle d'un plan promotionnel.")
    parser.add_argument("csv", help="plan promotionnel CSV")
    parser.add_argument("--soldes", action="append", default=[],
                        metavar="AAAA-MM-JJ:AAAA-MM-JJ",
                        help="période officielle de soldes (répétable)")
    parser.add_argument("--date-controle", metavar="AAAA-MM-JJ",
                        help="date de référence pour les échéances (défaut : aujourd'hui)")
    args = parser.parse_args()

    if not os.path.exists(args.csv):
        print(f"Fichier introuvable : {args.csv}")
        return 2

    periodes = []
    for brut in args.soldes:
        periode = lire_periode(brut)
        if not periode:
            print(f"Période de soldes illisible : {brut} (attendu AAAA-MM-JJ:AAAA-MM-JJ)")
            return 2
        periodes.append(periode)

    date_controle = date.today()
    if args.date_controle:
        date_controle = lire_date(args.date_controle)
        if not date_controle:
            print(f"Date de contrôle illisible : {args.date_controle}")
            return 2

    with open(args.csv, encoding="utf-8-sig", newline="") as f:
        lignes = list(csv.DictReader(f))

    valides, refusees, avertissements = [], [], []
    for index, ligne in enumerate(lignes, start=2):
        cle = (ligne.get("reference") or ligne.get("designation") or f"ligne {index}").strip()
        synthese, refus, alertes = controler(ligne, periodes)
        for a in alertes:
            avertissements.append(f"{cle} — {a}")
        if refus:
            refusees.append((cle, refus))
        else:
            valides.append((cle, synthese))

    print("=" * 78)
    print(f"CONTRÔLE DU PLAN PROMOTIONNEL — {len(lignes)} opération(s) — "
          f"date de contrôle {date_controle:%d/%m/%Y}")
    print("=" * 78)

    expires = [(cle, ech) for cle, (_, ech) in DISPOSITIFS.items() if date_controle > ech]
    if expires:
        print("\n!! DISPOSITIFS ÉCHUS À LA DATE DE CONTRÔLE — vérifier leur prolongation")
        for cle, ech in expires:
            print(f"   {cle} : échéance {ech:%d/%m/%Y}")

    if refusees:
        print(f"\nREFUSÉES — {len(refusees)} opération(s) non conforme(s)")
        print("-" * 78)
        for cle, refus in refusees:
            print(f"  ✗ {cle}")
            for r in refus:
                print(f"      {r}")

    if avertissements:
        print(f"\nALERTES — {len(avertissements)}")
        print("-" * 78)
        for a in avertissements:
            print(f"  ! {a}")

    if valides:
        print(f"\nVALIDÉES — {len(valides)}")
        print("-" * 78)
        for cle, s in valides:
            print(f"  ✓ {cle:<12} {s['designation'][:28]:<28} {s['mecanique']:<7} "
                  f"{s['libelle']:<24} {pourcent(s['avantage']):>7}  {s['periode']}")

    print("\nHors périmètre du script : plafond de 25 % en volume (suivi annuel par "
          "fournisseur),\nexactitude de l'historique de prix fourni, affichage en rayon.")
    print("=" * 78)
    return 1 if refusees else 0


if __name__ == "__main__":
    sys.exit(main())
