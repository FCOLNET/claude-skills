#!/usr/bin/env python3
"""Analyse un export de clôtures de caisse : écarts, annulations, remboursements.

Usage:
    python3 ecarts_caisse.py clotures.csv [--tolerance 5] [--critique 50]
        [--taux-annulation 2] [--taux-remboursement 2] [--recurrence 3]

Colonnes CSV (l'en-tête est obligatoire) :

    date, caisse, operateur              obligatoires
    especes_theorique, especes_comptees  obligatoires (hors fond de caisse)
    cb_theorique, cb_telecollecte        facultatifs
    cheques_theorique, cheques_comptes   facultatifs
    ca_ttc, nb_tickets                   facultatifs, pour les taux
    nb_annulations, montant_annulations  facultatifs
    nb_remboursements, montant_remboursements  facultatifs

Le rapport indique OÙ regarder. Il ne conclut jamais sur une personne : un écart
n'est pas une faute, une récurrence n'est pas une preuve.

Stdlib uniquement.
"""

import argparse
import csv
import os
import sys
from collections import defaultdict

# (libellé, colonne théorique, colonne constatée)
MOYENS = [
    ("espèces", "especes_theorique", "especes_comptees"),
    ("carte", "cb_theorique", "cb_telecollecte"),
    ("chèques", "cheques_theorique", "cheques_comptes"),
]
OBLIGATOIRES = ["date", "caisse", "operateur", "especes_theorique", "especes_comptees"]

CAUSES_PROBABLES = {
    "carte": "télécollecte non faite, transaction rejouée ou TPE partagé — journal du TPE",
    "espèces+": "rendu insuffisant ou prélèvement non saisi — bordereaux de prélèvement",
    "espèces-": "erreur de rendu, prélèvement saisi deux fois ou fond mal compté — recompte à deux",
    "chèques": "chèque non saisi ou saisi deux fois — liste des chèques",
}


def euros(valeur, signe=False):
    texte = f"{abs(valeur):,.2f}".replace(",", " ").replace(".", ",") + " €"
    if signe:
        texte = ("+" if valeur > 0 else "-" if valeur < 0 else " ") + texte
    return texte


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


# --------------------------------------------------------------------------
# Analyse d'une clôture
# --------------------------------------------------------------------------

def analyser(ligne, seuils):
    """Retourne (écarts par moyen, signaux, erreurs de données)."""
    erreurs = [f"colonne {c} vide" for c in OBLIGATOIRES if not (ligne.get(c) or "").strip()]
    ecarts, signaux = {}, []
    if erreurs:
        return ecarts, signaux, erreurs

    for libelle, col_theo, col_cons in MOYENS:
        theorique, constate = nombre(ligne.get(col_theo)), nombre(ligne.get(col_cons))
        if theorique is None and constate is None:
            continue
        if theorique is None or constate is None:
            erreurs.append(f"{libelle} : théorique ou constaté manquant")
            continue
        ecart = round(constate - theorique, 2)
        ecarts[libelle] = ecart
        if abs(ecart) < 0.005:
            continue
        if libelle == "espèces":
            cause = CAUSES_PROBABLES["espèces+" if ecart > 0 else "espèces-"]
        else:
            cause = CAUSES_PROBABLES[libelle]
        if abs(ecart) >= seuils.critique:
            signaux.append(("CRITIQUE", f"écart {libelle} {euros(ecart, True)} — {cause}"))
        elif abs(ecart) > seuils.tolerance or libelle == "carte":
            # Un écart carte, même faible, a toujours une cause technique à trouver.
            signaux.append(("ALERTE", f"écart {libelle} {euros(ecart, True)} — {cause}"))

    ca = nombre(ligne.get("ca_ttc"))
    for cle, libelle, seuil in (
        ("montant_annulations", "annulations", seuils.taux_annulation),
        ("montant_remboursements", "remboursements", seuils.taux_remboursement),
    ):
        montant = nombre(ligne.get(cle))
        if montant and ca:
            taux = montant / ca
            if taux > seuil:
                signaux.append(("ALERTE", f"{libelle} {euros(montant)} soit {pourcent(taux)} "
                                          f"du CA (seuil {pourcent(seuil)}) — motifs et "
                                          f"validations manager"))
    return ecarts, signaux, erreurs


# --------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Analyse des clôtures de caisse.")
    parser.add_argument("csv")
    parser.add_argument("--tolerance", type=float, default=5.0,
                        help="écart toléré par moyen de paiement, en euros (défaut 5)")
    parser.add_argument("--critique", type=float, default=50.0,
                        help="écart critique, en euros (défaut 50)")
    parser.add_argument("--taux-annulation", type=float, default=2.0,
                        help="part du CA annulée, en %% (défaut 2)")
    parser.add_argument("--taux-remboursement", type=float, default=2.0,
                        help="part du CA remboursée, en %% (défaut 2)")
    parser.add_argument("--recurrence", type=int, default=3,
                        help="écarts espèces négatifs hors tolérance déclenchant une "
                             "analyse de récurrence (défaut 3)")
    seuils = parser.parse_args()
    seuils.taux_annulation /= 100
    seuils.taux_remboursement /= 100

    if not os.path.exists(seuils.csv):
        print(f"Fichier introuvable : {seuils.csv}")
        return 2
    with open(seuils.csv, encoding="utf-8-sig", newline="") as f:
        lignes = list(csv.DictReader(f))
    if not lignes:
        print("Fichier vide.")
        return 2

    signaux_par_cloture, donnees_invalides = [], []
    par_operateur = defaultdict(lambda: {"clotures": 0, "cumul": 0.0, "negatifs": 0,
                                         "annulations": 0.0, "ca": 0.0})
    par_caisse = defaultdict(lambda: {"clotures": 0, "cumul": 0.0, "carte": 0})
    total_ecart = defaultdict(float)

    for index, ligne in enumerate(lignes, start=2):
        cle = (f"{(ligne.get('date') or '?').strip()} · caisse "
               f"{(ligne.get('caisse') or '?').strip()} · "
               f"{(ligne.get('operateur') or '?').strip()}")
        ecarts, signaux, erreurs = analyser(ligne, seuils)
        if erreurs:
            donnees_invalides.append((f"ligne {index} — {cle}", erreurs))
            continue
        if signaux:
            signaux_par_cloture.append((cle, signaux))

        operateur, caisse = ligne["operateur"].strip(), ligne["caisse"].strip()
        especes = ecarts.get("espèces", 0.0)
        op = par_operateur[operateur]
        op["clotures"] += 1
        op["cumul"] += sum(ecarts.values())
        if especes < -seuils.tolerance:
            op["negatifs"] += 1
        op["annulations"] += nombre(ligne.get("montant_annulations")) or 0.0
        op["ca"] += nombre(ligne.get("ca_ttc")) or 0.0
        ca = par_caisse[caisse]
        ca["clotures"] += 1
        ca["cumul"] += sum(ecarts.values())
        if abs(ecarts.get("carte", 0.0)) >= 0.005:
            ca["carte"] += 1
        for moyen, valeur in ecarts.items():
            total_ecart[moyen] += valeur

    critiques = sum(1 for _, s in signaux_par_cloture for g, _ in s if g == "CRITIQUE")

    print("=" * 78)
    print(f"ANALYSE DES CLÔTURES — {len(lignes)} clôture(s) — tolérance "
          f"{euros(seuils.tolerance)} · critique {euros(seuils.critique)}")
    print("=" * 78)

    if donnees_invalides:
        print(f"\nDONNÉES INCOMPLÈTES — {len(donnees_invalides)} ligne(s) non analysée(s)")
        print("-" * 78)
        for cle, erreurs in donnees_invalides:
            print(f"  ? {cle} : {' ; '.join(erreurs)}")

    if signaux_par_cloture:
        print(f"\nCLÔTURES À EXAMINER — {len(signaux_par_cloture)} "
              f"(dont {critiques} signal(aux) critique(s))")
        print("-" * 78)
        for cle, signaux in signaux_par_cloture:
            print(f"  {cle}")
            for gravite, texte in signaux:
                marque = "✗" if gravite == "CRITIQUE" else "!"
                print(f"      {marque} {gravite:<8} {texte}")
    else:
        print("\nAucune clôture hors tolérance.")

    print("\nPAR OPÉRATEUR")
    print("-" * 78)
    print(f"  {'opérateur':<14}{'clôtures':>9}{'écart cumulé':>16}"
          f"{'espèces < -tol.':>17}{'annulations':>14}")
    recurrences = []
    for operateur in sorted(par_operateur):
        op = par_operateur[operateur]
        taux = pourcent(op["annulations"] / op["ca"]) if op["ca"] else "—"
        print(f"  {operateur:<14}{op['clotures']:>9}{euros(op['cumul'], True):>16}"
              f"{op['negatifs']:>17}{taux:>14}")
        if op["negatifs"] >= seuils.recurrence:
            recurrences.append(operateur)

    print("\nPAR CAISSE")
    print("-" * 78)
    print(f"  {'caisse':<14}{'clôtures':>9}{'écart cumulé':>16}{'écarts carte':>15}")
    caisses_tpe = []
    for caisse in sorted(par_caisse):
        c = par_caisse[caisse]
        print(f"  {caisse:<14}{c['clotures']:>9}{euros(c['cumul'], True):>16}{c['carte']:>15}")
        if c["carte"] >= 2:
            caisses_tpe.append(caisse)

    print("\nTOTAL DES ÉCARTS SUR LA PÉRIODE")
    print("-" * 78)
    for moyen, valeur in total_ecart.items():
        print(f"  {moyen:<10}{euros(valeur, True):>14}")

    if recurrences or caisses_tpe:
        print("\nPISTES D'ANALYSE")
        print("-" * 78)
        for operateur in recurrences:
            print(f"  • {operateur} : {par_operateur[operateur]['negatifs']} écarts espèces "
                  f"négatifs hors tolérance. Avant toute conclusion : fonds de caisse de "
                  f"ces journées, prélèvements, caisses partagées, besoin de formation.")
        for caisse in caisses_tpe:
            print(f"  • caisse {caisse} : écarts carte répétés — piste technique (TPE, "
                  f"télécollecte) avant toute autre hypothèse.")

    print("\nRappel : un écart n'est pas une faute ; aucune retenue sur salaire "
          "(Code du travail L. 1331-2).")
    print("=" * 78)
    return 1 if critiques else 0


if __name__ == "__main__":
    sys.exit(main())
