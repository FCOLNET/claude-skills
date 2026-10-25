"""Construit liste-data.json : tous les prix prix.nc, en format compact, pour l'onglet « Ma liste ».

Usage:
    python3 construire_liste.py donnees/prix-nc/AAAA-MM-JJ [liste-data.json]

Format (tableaux parallèles, pour tenir en quelques Mo) :
    magasins  : [[nom, commune, lat, lon, précision], ...]   précision : 0 magasin, 1 quartier, 2 centre de la commune
                (lat/lon null si inconnus ; voir positions/)
    varietes  : [nom, ...]
    produits  : [[nom, index variété, unité, taille, ean, marque propre, conservation, nutriscore, nova], ...]   taille = prix / prix unitaire
                marque propre : 0 aucune, 1 Casino, 2 Auchan, 3 U, 4 Carrefour (pour les cartes de fidélité)
                conservation : 0 frais, 1 congélateur, 2 se garde longtemps (pour les réserves en promo)
                nutriscore : 0 inconnu, 1 à 5 pour A à E ; nova : 0 inconnu, 1 à 4 (Open Food Facts, nutriscore.csv)
    prix      : [[m1*2+promo1, prix1, m2*2+promo2, prix2, ...], ...]   un tableau par produit
    departs   : [[commune, nom, lat, lon], ...]   points de départ proposés (quartiers, centres des communes)
    promos    : [[produit, magasin, prix, jours], ...]   relevés en promotion ; jours = âge du relevé à la date de l'instantané
    formats   : [[grand, magasin, petit, n], ...]   piège du grand format : dans ce magasin, n petits formats
                (même variété, marque et unité, même quantité à ±10 %) coûtent moins cher que le grand
"""
import csv, json, re, statistics as st, sys
from datetime import date
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

def conservation(secteur, sous_secteur):
    if secteur == "surgelés":
        return 1
    if sous_secteur == "saucisson entier : sec, chorizo":
        return 2
    if secteur in ("crémerie", "boucherie, volaille, poissonnerie", "charcuterie", "traiteur") or sous_secteur in (
            "fruit et légume frais", "pain, viennoiserie, pâtisserie", "pain, viennoiserie, pâtisserie fraîche"):
        return 0
    return 2

# Nutri-Score et NOVA (Open Food Facts, extraits par nutriscore.py)
NS = {}
if (Path(__file__).with_name("nutriscore.csv")).exists():
    for r in csv.DictReader(open(Path(__file__).with_name("nutriscore.csv"), encoding="utf-8"), delimiter=";"):
        NS[r["ean"]] = ("abcde".index(r["nutriscore"]) + 1 if r["nutriscore"] else 0, int(r["nova"] or 0))

ref = lire("produits.csv")
variete = {p["id_produit"]: (p["variete"] or p["sous_secteur"] or p["secteur"] or "").strip() for p in ref}
famille = {p["id_produit"]: marque_propre(p["marque"]) for p in ref}
marque = {p["id_produit"]: (p["marque"] or "").strip().lower() for p in ref}
conserv = {p["id_produit"]: conservation(p["secteur"], p["sous_secteur"]) for p in ref}
date_inst = date.fromisoformat(Path(SNAP).name)
par_produit = defaultdict(list)
for r in lire("releves.csv"):
    try:
        prix = int(r["prix"])
    except ValueError:
        continue
    if prix > 0:
        par_produit[r["id_produit"]].append(r)

magasins, idx_mag, varietes, idx_var = [], {}, [], {}
produits, prix_tab, ecartes, pids, promos = [], [], 0, [], []
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
        if r["promotion"] == "oui":
            jours = (date_inst - date.fromisoformat(r["date_releve"][:10])).days if r["date_releve"] else None
            promos.append([len(produits), idx_mag[m], int(r["prix"]), jours])
    produits.append([rs[0]["produit"].strip(), idx_var[v], rs[0]["unite"], round(st.median(tailles), 3) if tailles else 0, rs[0]["ean"],
                     famille.get(pid, 0), conserv.get(pid, 2), *NS.get(rs[0]["ean"], (0, 0))])
    prix_tab.append(ligne)
    pids.append(pid)

# Piège du grand format : même nom une fois retirés les chiffres et les unités de contenance
CONTENANCE = re.compile(r"\b(\d+([.,]\d+)?|x|kg|g|mg|l|cl|ml|dl|cs|c|u|unités?|pièces?|rouleaux)\b")
def nom_sans_taille(n):
    return " ".join(CONTENANCE.sub(" ", re.sub(r"(\d)(x|kg|g|l|cl|ml)\b", r"\1 \2", n.lower())).split())

rayons = defaultdict(list)   # (magasin, nom sans taille, unité) -> [(produit, taille, prix)]
for j, (p, ligne) in enumerate(zip(produits, prix_tab)):
    if not marque.get(pids[j]) or p[3] <= 0:
        continue
    cle = nom_sans_taille(p[0])
    for k in range(0, len(ligne), 2):
        rayons[(ligne[k] >> 1, cle, p[2])].append((j, p[3], ligne[k + 1]))
formats = []
for (m, *_), l in rayons.items():
    for j, tj, pj in l:
        meilleur = None
        for k, tk, pk in l:
            if tk >= tj:
                continue
            n = round(tj / tk)
            if n < 2 or abs(n * tk - tj) / tj > 0.1:
                continue
            gain = pj - n * pk
            moins_cher_a_l_unite = pk / tk <= 0.97 * pj / tj   # pas seulement parce qu'il y a moins de produit
            if gain >= 20 and gain >= 0.03 * pj and moins_cher_a_l_unite and (not meilleur or gain > meilleur[0]):
                meilleur = (gain, k, n)
        if meilleur:
            formats.append([j, m, meilleur[1], meilleur[2]])

departs = [[q["commune"], q["quartier"], float(q["lat"]), float(q["lon"])] for q in lire_pos("quartiers.csv")]
departs += [[c, c + " (centre)", lat, lon] for c, (lat, lon) in centres.items() if c not in {d[0] for d in departs}]
donnees = dict(instantane=Path(SNAP).name, releves_de=manifeste["releve_le_plus_ancien"], releves_a=manifeste["releve_le_plus_recent"],
               magasins=magasins, varietes=varietes, produits=produits, prix=prix_tab, departs=departs, formats=formats, promos=promos)
Path(OUT).write_text(json.dumps(donnees, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"{OUT} : {len(produits)} produits, {len(magasins)} magasins ({sum(m[4] == 0 for m in magasins)} situés précisément, "
      f"{sum(m[4] == 1 for m in magasins)} au quartier, {sum(m[4] == 2 for m in magasins)} à la commune, {sum(m[2] is None for m in magasins)} sans position), "
      f"{sum(len(p) // 2 for p in prix_tab)} prix, {len(formats)} grands formats pièges, {len(promos)} promos, {sum(1 for p in produits if p[7])} Nutri-Scores, {ecartes} prix aberrants écartés, {Path(OUT).stat().st_size / 1e6:.1f} Mo", file=sys.stderr)
