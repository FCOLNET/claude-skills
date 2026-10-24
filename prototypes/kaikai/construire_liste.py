"""Construit liste-data.json : tous les prix prix.nc, en format compact, pour l'onglet « Ma liste ».

Usage:
    python3 construire_liste.py donnees/prix-nc/AAAA-MM-JJ [liste-data.json]

Format (tableaux parallèles, pour tenir en quelques Mo) :
    magasins  : [[nom, commune], ...]
    varietes  : [nom, ...]
    produits  : [[nom, index variété, unité, taille, ean, marque propre], ...]   taille = prix / prix unitaire
                marque propre : 0 aucune, 1 Casino, 2 Auchan, 3 U, 4 Carrefour (pour les cartes de fidélité)
    prix      : [[m1*2+promo1, prix1, m2*2+promo2, prix2, ...], ...]   un tableau par produit
"""
import csv, json, statistics as st, sys
from collections import defaultdict
from pathlib import Path

SNAP = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else str(Path(__file__).with_name("liste-data.json"))
lire = lambda n: list(csv.DictReader(open(f"{SNAP}/{n}", encoding="utf-8-sig", newline=""), delimiter=";"))
manifeste = json.load(open(f"{SNAP}/manifeste.json", encoding="utf-8"))

def marque_propre(m):
    m = (m or "").strip()
    if m in ("Casino", "Les Doodingues de Casino"):
        return 1
    if m.startswith("Auchan"):
        return 2
    if m == "U" or m.startswith("U "):
        return 3
    if m.startswith("Carrefour") or m in ("Simpl", "Reflets de France"):
        return 4
    return 0

ref = lire("produits.csv")
variete = {p["id_produit"]: (p["variete"] or p["sous_secteur"] or p["secteur"] or "").strip() for p in ref}
famille = {p["id_produit"]: marque_propre(p["marque"]) for p in ref}
par_produit = defaultdict(list)
for r in lire("releves.csv"):
    try:
        prix = int(r["prix"])
    except ValueError:
        continue
    if prix > 0:
        par_produit[r["id_produit"]].append(r)

magasins, idx_mag, varietes, idx_var = [], {}, [], {}
produits, prix_tab, ecartes = [], [], 0
for pid, rs in sorted(par_produit.items(), key=lambda x: x[1][0]["produit"]):
    med = st.median(int(r["prix"]) for r in rs)
    if len(rs) >= 3:   # prix aberrants : plus de 3x ou moins de 1/3 de la médiane
        garde = [r for r in rs if med / 3 <= int(r["prix"]) <= med * 3]
        ecartes += len(rs) - len(garde); rs = garde
    tailles = [int(r["prix"]) / int(r["prix_par_unite"]) for r in rs if r["prix_par_unite"] not in ("", "0")]
    v = variete.get(pid, "")
    if v not in idx_var:
        idx_var[v] = len(varietes); varietes.append(v)
    ligne = []
    for r in sorted(rs, key=lambda r: int(r["prix"])):
        m = r["id_magasin"]
        if m not in idx_mag:
            idx_mag[m] = len(magasins); magasins.append([r["magasin"].strip(), r["commune"]])
        ligne += [idx_mag[m] * 2 + (r["promotion"] == "oui"), int(r["prix"])]
    produits.append([rs[0]["produit"].strip(), idx_var[v], rs[0]["unite"], round(st.median(tailles), 3) if tailles else 0, rs[0]["ean"],
                     famille.get(pid, 0)])
    prix_tab.append(ligne)

donnees = dict(instantane=Path(SNAP).name, releves_de=manifeste["releve_le_plus_ancien"], releves_a=manifeste["releve_le_plus_recent"],
               magasins=magasins, varietes=varietes, produits=produits, prix=prix_tab)
Path(OUT).write_text(json.dumps(donnees, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"{OUT} : {len(produits)} produits, {len(magasins)} magasins, {sum(len(p) // 2 for p in prix_tab)} prix, "
      f"{ecartes} prix aberrants écartés, {Path(OUT).stat().st_size / 1e6:.1f} Mo", file=sys.stderr)
