#!/usr/bin/env python3
"""Estime le chiffre d'affaires potentiel de magasins avec le modèle gravitaire de Huff.

Usage:
    python3 huff.py zones.csv magasins.csv temps.csv
        [--alpha 1.0] [--lambda 2.0] [--evasion 0.15] [--temps-max 30]
        [--projet NOM] [--ca-reels ca.csv]

Fichiers CSV (en-tête obligatoire) :

    zones.csv     zone, population, depense_par_hab [, idc]
                  depense_par_hab : dépense annuelle par habitant sur la famille de
                  produits étudiée, en euros ; idc : indice de disparité (base 100)
    magasins.csv  magasin, surface [, attractivite] [, reseau]
                  attractivite : multiplicateur facultatif (enseigne, offre), défaut 1
                  reseau : oui pour les magasins de notre enseigne (cannibalisation)
    temps.csv     zone, magasin, minutes
                  temps d'accès de la zone au magasin ; couple absent = inaccessible
    ca.csv        magasin, ca_reel   (facultatif, pour calibrer lambda)

Modèle :  P(zone i → magasin j) = A_j·S_j^alpha / T_ij^lambda, normalisé par zone.
          CA_j = Σ_i P_ij × population_i × dépense_i × idc_i/100 × (1 − évasion)

Avec --projet, le script compare la situation sans et avec le projet : CA du projet,
transfert pris à chaque magasin existant, sensibilité à lambda.

Les résultats sont des ordres de grandeur : ils valent ce que valent les données.

Stdlib uniquement.
"""

import argparse
import csv
import os
import sys

LAMBDAS_SENSIBILITE = [1.5, 2.0, 2.5]


def euros(valeur):
    return f"{valeur:,.0f}".replace(",", " ") + " €"


def decimal(valeur):
    return f"{valeur:g}".replace(".", ",")


def pourcent(valeur):
    return f"{valeur * 100:.1f}".replace(".", ",") + " %"


def nombre(brut):
    brut = (brut or "").strip().replace(",", ".").replace(" ", "").replace(" ", "")
    if not brut:
        return None
    try:
        return float(brut)
    except ValueError:
        return None


def lire_csv(chemin):
    with open(chemin, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


# --------------------------------------------------------------------------
# Chargement et validation
# --------------------------------------------------------------------------

def charger(args):
    erreurs, alertes = [], []

    zones = {}
    for i, l in enumerate(lire_csv(args.zones), start=2):
        nom = (l.get("zone") or "").strip()
        pop, dep = nombre(l.get("population")), nombre(l.get("depense_par_hab"))
        idc = nombre(l.get("idc"))
        if not nom or pop is None or dep is None:
            erreurs.append(f"zones.csv ligne {i} : zone, population et depense_par_hab requis")
            continue
        if idc is None:
            idc = 100.0
        zones[nom] = pop * dep * idc / 100

    magasins = {}
    for i, l in enumerate(lire_csv(args.magasins), start=2):
        nom = (l.get("magasin") or "").strip()
        surface = nombre(l.get("surface"))
        attractivite = nombre(l.get("attractivite"))
        if not nom or not surface or surface <= 0:
            erreurs.append(f"magasins.csv ligne {i} : magasin et surface > 0 requis")
            continue
        reseau = (l.get("reseau") or "").strip().lower() in ("oui", "o", "1", "true")
        magasins[nom] = (surface, attractivite if attractivite else 1.0, reseau)

    temps = {}
    for i, l in enumerate(lire_csv(args.temps), start=2):
        z, m = (l.get("zone") or "").strip(), (l.get("magasin") or "").strip()
        minutes = nombre(l.get("minutes"))
        if z not in zones or m not in magasins:
            alertes.append(f"temps.csv ligne {i} : zone ou magasin inconnu ({z} / {m}), ignoré")
            continue
        if minutes is None or minutes <= 0:
            erreurs.append(f"temps.csv ligne {i} : minutes > 0 requises")
            continue
        temps[(z, m)] = max(minutes, 1.0)   # plancher : évite l'explosion à T → 0

    if args.projet and args.projet not in magasins:
        erreurs.append(f"projet « {args.projet} » absent de magasins.csv")

    for z in zones:
        if not any((z, m) in temps for m in magasins):
            alertes.append(f"zone {z} : aucun temps d'accès renseigné, sa dépense est ignorée")

    return zones, magasins, temps, erreurs, alertes


# --------------------------------------------------------------------------
# Modèle de Huff
# --------------------------------------------------------------------------

def huff(zones, magasins, temps, alpha, lam, evasion, temps_max, exclus=()):
    """Retourne ({magasin: CA}, {(zone, magasin): probabilité})."""
    actifs = [m for m in magasins if m not in exclus]
    ca = {m: 0.0 for m in actifs}
    probas = {}
    for z, depense in zones.items():
        utilites = {}
        for m in actifs:
            t = temps.get((z, m))
            if t is None or (temps_max and t > temps_max):
                continue
            surface, attractivite, _ = magasins[m]
            utilites[m] = attractivite * surface ** alpha / t ** lam
        total = sum(utilites.values())
        if not total:
            continue
        for m, u in utilites.items():
            p = u / total
            probas[(z, m)] = p
            ca[m] += p * depense * (1 - evasion)
    return ca, probas


def calibrer(zones, magasins, temps, args, ca_reels):
    """Cherche le lambda qui minimise l'erreur relative moyenne sur les CA connus."""
    meilleur = None
    for pas in range(5, 41):                        # lambda de 0,5 à 4,0
        lam = pas / 10
        ca, _ = huff(zones, magasins, temps, args.alpha, lam, args.evasion, args.temps_max,
                     exclus=[args.projet] if args.projet else [])
        ecarts = [abs(ca[m] - reel) / reel for m, reel in ca_reels.items() if m in ca and reel]
        if not ecarts:
            return None
        erreur = sum(ecarts) / len(ecarts)
        if meilleur is None or erreur < meilleur[1]:
            meilleur = (lam, erreur)
    return meilleur


# --------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Modèle de Huff : CA potentiel par magasin.")
    parser.add_argument("zones")
    parser.add_argument("magasins")
    parser.add_argument("temps")
    parser.add_argument("--alpha", type=float, default=1.0,
                        help="sensibilité à la surface (défaut 1.0)")
    parser.add_argument("--lambda", dest="lam", type=float, default=2.0,
                        help="frein de la distance (défaut 2.0)")
    parser.add_argument("--evasion", type=float, default=0.0,
                        help="part de la dépense captée hors des magasins modélisés, "
                             "e-commerce compris, entre 0 et 1 (défaut 0)")
    parser.add_argument("--temps-max", type=float, default=None,
                        help="au-delà de ce temps, un magasin n'attire plus la zone")
    parser.add_argument("--projet", help="nom du magasin en projet dans magasins.csv")
    parser.add_argument("--ca-reels", help="CSV magasin,ca_reel pour calibrer lambda")
    args = parser.parse_args()

    for chemin in (args.zones, args.magasins, args.temps, args.ca_reels):
        if chemin and not os.path.exists(chemin):
            print(f"Fichier introuvable : {chemin}")
            return 2
    if not 0 <= args.evasion < 1:
        print("--evasion doit être compris entre 0 et 1.")
        return 2

    zones, magasins, temps, erreurs, alertes = charger(args)
    if erreurs:
        print("DONNÉES INVALIDES")
        for e in erreurs:
            print(f"  ✗ {e}")
        return 2

    marche = sum(zones.values()) * (1 - args.evasion)
    print("=" * 78)
    print(f"MODÈLE DE HUFF — {len(zones)} zone(s), {len(magasins)} magasin(s) — "
          f"alpha {decimal(args.alpha)} · lambda {decimal(args.lam)} · évasion {pourcent(args.evasion)}")
    print(f"Marché captable par les magasins modélisés : {euros(marche)}")
    print("=" * 78)

    if alertes:
        print(f"\nALERTES — {len(alertes)}")
        for a in alertes:
            print(f"  ! {a}")
    if args.evasion == 0:
        print("\n  ! évasion à 0 % : la dépense en ligne et hors zone est ignorée, "
              "le CA est surestimé.")

    if args.ca_reels:
        ca_reels = {(l.get("magasin") or "").strip(): nombre(l.get("ca_reel"))
                    for l in lire_csv(args.ca_reels)}
        resultat = calibrer(zones, magasins, temps, args, ca_reels)
        nb = sum(1 for m, reel in ca_reels.items() if m in magasins and reel)
        print("\nCALIBRAGE SUR LES CA RÉELS")
        print("-" * 78)
        if resultat:
            lam, erreur = resultat
            print(f"  lambda retenu : {decimal(lam)} (écart moyen aux CA réels : "
                  f"{pourcent(erreur)}, sur {nb} magasin(s))")
            if nb < 3:
                print("  ! moins de 3 CA réels : calibrage indicatif, un seul point suffit "
                      "à « caler » n'importe quel lambda.")
            if lam in (0.5, 4.0):
                print("  ! lambda en bord de plage (0,5 – 4) : le modèle compense sans doute "
                      "une erreur de données (zones, surfaces, concurrent oublié).")
            if erreur > 0.25:
                print("  ! écart > 25 % : le modèle explique mal les CA observés — "
                      "revoir zones, concurrents ou attractivités avant de conclure.")
            args.lam = lam
        else:
            print("  ! aucun CA réel exploitable, lambda inchangé.")

    exclus = [args.projet] if args.projet else []
    ca_sans, _ = huff(zones, magasins, temps, args.alpha, args.lam, args.evasion,
                      args.temps_max, exclus=exclus)
    ca_avec, probas = huff(zones, magasins, temps, args.alpha, args.lam, args.evasion,
                           args.temps_max)

    print(f"\nCA POTENTIEL PAR MAGASIN (lambda {decimal(args.lam)})")
    print("-" * 78)
    entete = f"  {'magasin':<22}{'surface':>9}{'CA potentiel':>16}{'part':>9}"
    if args.projet:
        entete += f"{'sans projet':>15}{'transfert':>11}"
    print(entete)
    for m in sorted(ca_avec, key=ca_avec.get, reverse=True):
        surface = magasins[m][0]
        ligne = (f"  {m[:22]:<22}{surface:>9,.0f}".replace(",", " ")
                 + f"{euros(ca_avec[m]):>16}{pourcent(ca_avec[m] / marche if marche else 0):>9}")
        if args.projet:
            if m == args.projet:
                ligne += f"{'—':>15}{'—':>11}"
            else:
                perte = ca_sans[m] - ca_avec[m]
                ligne += (f"{euros(ca_sans[m]):>15}"
                          f"{pourcent(perte / ca_sans[m] if ca_sans[m] else 0):>11}")
        print(ligne)

    if args.projet:
        print(f"\nPROJET « {args.projet} » — PARTS DE MARCHÉ PAR ZONE")
        print("-" * 78)
        for z in zones:
            p = probas.get((z, args.projet))
            t = temps.get((z, args.projet))
            if p is not None:
                print(f"  {z:<24}{decimal(t):>6} min{pourcent(p):>10}"
                      f"{euros(p * zones[z] * (1 - args.evasion)):>16}")

        cannibalisation = sum(ca_sans[m] - ca_avec[m] for m in ca_sans
                              if m != args.projet and magasins[m][2])
        if cannibalisation:
            print("\nBILAN POUR LE RÉSEAU")
            print("-" * 78)
            print(f"  CA du projet                       {euros(ca_avec[args.projet]):>16}")
            print(f"  CA pris à nos propres magasins     {'-' + euros(cannibalisation):>16}")
            print(f"  Gain net pour le réseau            "
                  f"{euros(ca_avec[args.projet] - cannibalisation):>16}")

        print("\nSENSIBILITÉ DU CA DU PROJET À LAMBDA")
        print("-" * 78)
        for lam in sorted(set(LAMBDAS_SENSIBILITE + [args.lam])):
            ca, _ = huff(zones, magasins, temps, args.alpha, lam, args.evasion, args.temps_max)
            print(f"  lambda {decimal(lam):<5}{euros(ca[args.projet]):>16}")

    print("\nOrdres de grandeur : à confronter au terrain (comptages, enquête de "
          "provenance clients).")
    print("=" * 78)
    return 0


if __name__ == "__main__":
    sys.exit(main())
