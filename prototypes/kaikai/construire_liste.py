"""Construit liste-data.json : tous les prix prix.nc, en format compact, pour l'onglet « Ma liste ».

Usage:
    python3 construire_liste.py donnees/prix-nc/AAAA-MM-JJ [liste-data.json]

Format (tableaux parallèles, pour tenir en quelques Mo) :
    magasins  : [[nom, commune, lat, lon, précision], ...]   précision : 0 magasin, 1 quartier, 2 centre de la commune
                (lat/lon null si inconnus ; voir positions/)
    varietes  : [nom, ...]
    produits  : [[nom, index variété, unité, taille, ean, marque propre], ...]   taille = prix / prix unitaire
                marque propre : 0 aucune, 1 Casino, 2 Auchan, 3 U, 4 Carrefour (pour les cartes de fidélité)
    prix      : [[m1*2+promo1, prix1, m2*2+promo2, prix2, ...], ...]   un tableau par produit
    departs   : [[commune, nom, lat, lon], ...]   points de départ proposés (quartiers, centres des communes)
"""
import csv, json, re, statistics as st, sys
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

# Positions : prix.nc d'abord, puis nos compléments (positions/magasins.csv), sinon le centre de la commune.
POS = Path(__file__).with_name("positions")
lire_pos = lambda n: list(csv.DictReader(open(POS / n, encoding="utf-8", newline=""), delimiter=";"))
pos_prixnc = {m["id_magasin"]: (float(m["latitude"]), float(m["longitude"])) for m in lire("magasins.csv") if m["latitude"] and m["longitude"]}
complements = [(r["magasin"], r["commune"], float(r["lat"]), float(r["lon"]), 0 if r["precision"] == "magasin" else 1) for r in lire_pos("magasins.csv")]
centres = {r["commune"]: (float(r["lat"]), float(r["lon"])) for r in lire_pos("communes.csv")}

def position(id_magasin, nom, commune):
    if id_magasin in pos_prixnc:
        return [*pos_prixnc[id_magasin], 0]
    for motif, com, lat, lon, prec in complements:
        if (re.search(motif[1:], nom, re.I) if motif.startswith("~") else motif == nom) and com == commune:
            return [lat, lon, prec]
    if commune in centres:
        return [*centres[commune], 2]
    return [None, None, None]

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
            idx_mag[m] = len(magasins)
            nom = r["magasin"].strip()
            magasins.append([nom, r["commune"], *[round(x, 5) if isinstance(x, float) else x for x in position(m, nom, r["commune"])]])
        ligne += [idx_mag[m] * 2 + (r["promotion"] == "oui"), int(r["prix"])]
    produits.append([rs[0]["produit"].strip(), idx_var[v], rs[0]["unite"], round(st.median(tailles), 3) if tailles else 0, rs[0]["ean"],
                     famille.get(pid, 0)])
    prix_tab.append(ligne)

departs = [[q["commune"], q["quartier"], float(q["lat"]), float(q["lon"])] for q in lire_pos("quartiers.csv")]
departs += [[c, c + " (centre)", lat, lon] for c, (lat, lon) in centres.items() if c not in {d[0] for d in departs}]
donnees = dict(instantane=Path(SNAP).name, releves_de=manifeste["releve_le_plus_ancien"], releves_a=manifeste["releve_le_plus_recent"],
               magasins=magasins, varietes=varietes, produits=produits, prix=prix_tab, departs=departs)
Path(OUT).write_text(json.dumps(donnees, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"{OUT} : {len(produits)} produits, {len(magasins)} magasins ({sum(m[4] == 0 for m in magasins)} situés précisément, "
      f"{sum(m[4] == 1 for m in magasins)} au quartier, {sum(m[4] == 2 for m in magasins)} à la commune, {sum(m[2] is None for m in magasins)} sans position), "
      f"{sum(len(p) // 2 for p in prix_tab)} prix, {ecartes} prix aberrants écartés, {Path(OUT).stat().st_size / 1e6:.1f} Mo", file=sys.stderr)
