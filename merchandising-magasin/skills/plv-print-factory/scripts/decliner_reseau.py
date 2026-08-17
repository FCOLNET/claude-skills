#!/usr/bin/env python3
"""Décline un support PLV sur l'ensemble des points de vente d'un réseau.

Usage:  python3 decliner_reseau.py modele.html magasins.csv [dossier_sortie]

Le modèle contient des variables {{colonne}} qui sont remplacées par la valeur
de la colonne correspondante du CSV, une sortie par ligne.

magasins.csv — la colonne `code` sert à nommer les fichiers produits :

    code,ville,adresse,horaires,tel
    LYO01,Lyon Part-Dieu,17 rue de la Villette,9h-20h,04 78 00 00 00
    MRS03,Marseille Prado,8 avenue du Prado,9h-19h30,04 91 00 00 00

Toute variable du modèle absente du CSV est signalée et le fichier n'est pas
produit : mieux vaut un manque détecté qu'une affiche imprimée avec {{tel}}.

Stdlib uniquement.
"""

import csv
import os
import re
import sys

MOTIF_VARIABLE = re.compile(r"\{\{\s*([\w-]+)\s*\}\}")


def decliner(chemin_modele, chemin_csv, dossier_sortie):
    with open(chemin_modele, encoding="utf-8") as f:
        modele = f.read()

    attendues = set(MOTIF_VARIABLE.findall(modele))
    if not attendues:
        print("Aucune variable {{...}} dans le modèle — rien à décliner.")
        return 2

    with open(chemin_csv, encoding="utf-8-sig", newline="") as f:
        lignes = list(csv.DictReader(f))

    if not lignes:
        print("CSV vide.")
        return 2

    colonnes = set(lignes[0].keys())
    manquantes = attendues - colonnes
    if manquantes:
        print(f"Colonnes absentes du CSV : {', '.join(sorted(manquantes))}")
        print(f"Variables du modèle      : {', '.join(sorted(attendues))}")
        print(f"Colonnes disponibles     : {', '.join(sorted(colonnes))}")
        return 1

    os.makedirs(dossier_sortie, exist_ok=True)
    base = os.path.splitext(os.path.basename(chemin_modele))[0]
    produits, refuses = [], []

    for index, ligne in enumerate(lignes, start=2):   # 2 = 1re ligne de données
        code = (ligne.get("code") or f"ligne{index}").strip()

        vides = [v for v in attendues if not (ligne.get(v) or "").strip()]
        if vides:
            refuses.append((code, f"valeur vide : {', '.join(sorted(vides))}"))
            continue

        rendu = MOTIF_VARIABLE.sub(lambda m: ligne[m.group(1)].strip(), modele)
        nom = f"{base}-{re.sub(r'[^A-Za-z0-9_-]', '_', code)}.html"
        chemin = os.path.join(dossier_sortie, nom)
        with open(chemin, "w", encoding="utf-8") as f:
            f.write(rendu)
        produits.append(nom)

    print(f"Variables déclinées : {', '.join(sorted(attendues))}")
    print(f"{len(produits)} fichier(s) produit(s) dans {dossier_sortie}/")
    for nom in produits:
        print(f"  ✓ {nom}")
    if refuses:
        print(f"\n{len(refuses)} point(s) de vente écarté(s) :")
        for code, raison in refuses:
            print(f"  ✗ {code} — {raison}")

    print(
        "\nÉtape suivante : passer chaque fichier au pré-vol avant envoi imprimeur.\n"
        f"  for f in {dossier_sortie}/*.html; do python3 preflight.py \"$f\" 150; done"
    )
    return 1 if refuses else 0


def main():
    if len(sys.argv) < 3:
        print("Usage : python3 decliner_reseau.py <modele.html> <magasins.csv> [sortie]")
        return 2
    sortie = sys.argv[3] if len(sys.argv) > 3 else "reseau"
    for chemin in (sys.argv[1], sys.argv[2]):
        if not os.path.exists(chemin):
            print(f"Fichier introuvable : {chemin}")
            return 2
    return decliner(sys.argv[1], sys.argv[2], sortie)


if __name__ == "__main__":
    sys.exit(main())
