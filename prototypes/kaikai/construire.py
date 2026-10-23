"""Construit la page du prototype Kaïkaï à partir d'un instantané prix-nc.

Usage:
    python3 construire.py donnees/prix-nc/AAAA-MM-JJ [kaikai.html]

Lit l'instantané produit par `.claude/skills/prix-nc/scripts/prix_nc.py collecter`,
chiffre les recettes définies dans RECETTES et injecte les données dans template.html,
ainsi que liste-data.json (à produire d'abord avec construire_liste.py) pour l'onglet « Ma liste ».
"""
import csv, json, statistics, sys
from collections import defaultdict
from pathlib import Path

SNAP = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else str(Path(__file__).with_name("kaikai.html"))
TEMPLATE = Path(__file__).with_name("template.html")

HUILE = ["huile de tournesol", "huile mélangée", "huile de colza", "huile pour friture"]
OIGNON = ["oignon jaune", "légume surgelé : oignon"]
POULET = ["poulet : haut de cuisse surgelé", "poulet : cuisse, pilon surgelé"]
RECETTES = [
    {"id": "curry", "nom": "Poulet curry coco", "sous_titre": "et son riz jasmin", "ingredients": [
        ("Cuisses de poulet surgelées", 1.0, "kg", POULET),
        ("Lait de coco", 0.4, "l", ["lait de coco"]),
        ("Curry en poudre", 0.02, "kg", ["épice : curry"]),
        ("Oignon", 0.2, "kg", OIGNON),
        ("Riz jasmin", 0.4, "kg", ["riz jasmin ou thaï"]),
        ("Huile", 0.03, "l", HUILE)]},
    {"id": "chopsuey", "nom": "Chop suey au poulet", "sous_titre": "vermicelles sautés", "ingredients": [
        ("Vermicelles chinois", 0.2, "kg", ["vermicelle chinois"]),
        ("Hauts de cuisse de poulet", 0.5, "kg", POULET),
        ("Légumes surgelés", 0.5, "kg", ["légume surgelé : pour wok", "légume surgelé : mélange autres",
                                         "légume surgelé : printanière"]),
        ("Sauce soja", 0.05, "l", ["sauce soja, soyu"]),
        ("Huile", 0.03, "l", HUILE)]},
    {"id": "corned", "nom": "Corned beef oignons", "sous_titre": "riz blanc, le classique", "ingredients": [
        ("Corned beef", 0.66, "kg", ["corned beef"]),
        ("Oignon", 0.3, "kg", OIGNON),
        ("Concentré de tomate", 0.07, "kg", ["concentré, coulis, purée de tomate"]),
        ("Riz rond", 0.4, "kg", ["riz blanc rond", "riz jasmin ou thaï"]),
        ("Huile", 0.02, "l", HUILE)]},
    {"id": "bolo", "nom": "Spaghetti bolognaise", "sous_titre": "au bœuf haché", "ingredients": [
        ("Spaghetti", 0.5, "kg", ["spaghetti"]),
        ("Bœuf haché", 0.5, "kg", ["bœuf haché surgelé : steak", "bœuf : viande hachée"]),
        ("Sauce tomate", 0.5, "kg", ["sauce tomate"]),
        ("Oignon", 0.15, "kg", OIGNON),
        ("Emmental", 0.1, "kg", ["fromage : emmental"])]},
    {"id": "crepes", "nom": "Crêpes", "sous_titre": "une douzaine, pour le goûter", "ingredients": [
        ("Farine", 0.25, "kg", ["farine classique sans levure"]),
        ("Œufs", 4, "u", ["oeuf frais", "oeuf extra-frais"]),
        ("Lait", 0.5, "l", ["lait de vache demi-écrémé", "lait de vache entier"]),
        ("Sucre en poudre", 0.05, "kg", ["sucre blanc en poudre"]),
        ("Beurre doux", 0.05, "kg", ["beurre doux"])]},
]

def lire(nom):
    with open(f"{SNAP}/{nom}", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f, delimiter=";"))

variete = {p["id_produit"]: p["variete"] for p in lire("produits.csv")}
releves = lire("releves.csv")
manifeste = json.load(open(f"{SNAP}/manifeste.json", encoding="utf-8"))

# relevés par variété, avec taille de conditionnement déduite de prix / prix unitaire
par_variete = defaultdict(list)
for r in releves:
    v = variete.get(r["id_produit"])
    if not v or not r["prix_par_unite"]:
        continue
    prix, ppu = int(r["prix"]), int(r["prix_par_unite"])
    if prix <= 0 or ppu <= 0:
        continue
    par_variete[v].append({**r, "prix": prix, "ppu": ppu, "taille": prix / ppu})

magasins, index_mag = [], {}
def idx_magasin(r):
    if r["id_magasin"] not in index_mag:
        index_mag[r["id_magasin"]] = len(magasins)
        magasins.append([r["magasin"].strip(), r["commune"] or "Commune non renseignée"])
    return index_mag[r["id_magasin"]]

ecartes = 0
sortie_recettes = []
for rec in RECETTES:
    offres = defaultdict(lambda: [[] for _ in rec["ingredients"]])
    for i, (nom, q, unite, varietes) in enumerate(rec["ingredients"]):
        cands = [r for v in varietes for r in par_variete.get(v, [])]
        med = statistics.median(r["ppu"] for r in cands)
        for r in cands:
            if not (med / 3 <= r["ppu"] <= med * 3):   # prix unitaire aberrant
                ecartes += 1
                continue
            offres[idx_magasin(r)][i].append(r)
    magasins_rec = {}
    for m, lst in offres.items():
        if sum(1 for c in lst if c) < len(lst) - 1:     # au plus un ingrédient manquant
            continue
        cellule = []
        for cands in lst:
            # garder, par taille de conditionnement, l'offre la moins chère ; au plus 6
            par_taille = {}
            for r in cands:
                t = round(r["taille"], 3)
                if t not in par_taille or r["prix"] < par_taille[t]["prix"]:
                    par_taille[t] = r
            garde = sorted(par_taille.values(), key=lambda r: r["ppu"])[:6]
            cellule.append([[r["produit"], r["prix"], round(r["taille"], 3), r["date_releve"],
                             1 if r["promotion"] == "oui" else 0] for r in garde])
        magasins_rec[m] = cellule
    sortie_recettes.append({
        "id": rec["id"], "nom": rec["nom"], "sous_titre": rec["sous_titre"],
        "ingredients": [{"nom": n, "q": q, "unite": u} for n, q, u, _ in rec["ingredients"]],
        "offres": magasins_rec})

donnees = {"instantane": SNAP.rstrip("/").split("/")[-1],
           "releves_de": manifeste["releve_le_plus_ancien"], "releves_a": manifeste["releve_le_plus_recent"],
           "magasins": magasins, "recettes": sortie_recettes}
json_donnees = json.dumps(donnees, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")
# prix de la liste de courses, intégrés pour que la page fonctionne aussi une fois téléchargée
LISTE = Path(__file__).with_name("liste-data.json")
json_liste = LISTE.read_text(encoding="utf-8").replace("<", "\\u003c") if LISTE.exists() else ""
page = TEMPLATE.read_text(encoding="utf-8").replace("__DATA__", json_donnees)
page = page.replace('id="liste-donnees">__LISTE__<', 'id="liste-donnees">' + json_liste + "<")
Path(OUT).write_text(page, encoding="utf-8")
# version autonome à télécharger : document complet, ouvrable hors ligne depuis le téléphone ou l'ordinateur
AUTONOME = Path(OUT).with_name(Path(OUT).stem + "-autonome.html")
AUTONOME.write_text('<!doctype html><html lang="fr"><head><meta charset="utf-8">'
                    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
                    '<style>html{color-scheme:light}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}'
                    '[hidden]{display:none!important}</style></head><body>' + page + "</body></html>", encoding="utf-8")
print(f"Page écrite : {OUT}", file=sys.stderr)
print("prix unitaires aberrants écartés:", ecartes, file=sys.stderr)
for r in sortie_recettes:
    complets = sum(1 for c in r["offres"].values() if all(c))
    print(f"{r['nom']:24} magasins complets={complets:3}  partiels={len(r['offres']) - complets}", file=sys.stderr)
