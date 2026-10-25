"""Extrait le Nutri-Score et le groupe NOVA des produits de liste-data.json depuis Open Food Facts.

Usage:
    python3 nutriscore.py [liste-data.json] [nutriscore.csv]

Lit en flux l'export complet d'Open Food Facts (CSV compressé, environ 1,5 Go, rien n'est
stocké) et garde les produits dont le code-barres figure dans liste-data.json.
Écrit nutriscore.csv : ean;nutriscore (a à e);nova (1 à 4). Données ODbL, Open Food Facts.
Domaines à autoriser : static.openfoodfacts.org et openfoodfacts-ds.s3.eu-west-3.amazonaws.com.
"""
import csv, gzip, io, json, sys, urllib.request
from pathlib import Path

ICI = Path(__file__).parent
DONNEES = sys.argv[1] if len(sys.argv) > 1 else ICI / "liste-data.json"
SORTIE = sys.argv[2] if len(sys.argv) > 2 else ICI / "nutriscore.csv"
EXPORT = "https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz"

def cle(ean):
    """Code-barres sans les zéros de tête : 0012345678905 et 12345678905 se rejoignent."""
    return ean.strip().lstrip("0")

nos = {}
for p in json.load(open(DONNEES, encoding="utf-8"))["produits"]:
    if p[4].isdigit():
        nos[cle(p[4])] = p[4]

csv.field_size_limit(1 << 30)
req = urllib.request.Request(EXPORT, headers={"User-Agent": "Kaikai-prototype/0.1 (prix.nc)"})
trouves, lus = {}, 0
with urllib.request.urlopen(req) as rep:
    flux = io.TextIOWrapper(gzip.GzipFile(fileobj=rep), encoding="utf-8", errors="replace", newline="")
    lecteur = csv.reader(flux, delimiter="\t", quoting=csv.QUOTE_NONE)
    entete = next(lecteur)
    i_code, i_ns, i_nova = entete.index("code"), entete.index("nutriscore_grade"), entete.index("nova_group")
    for ligne in lecteur:
        lus += 1
        if lus % 500_000 == 0:
            print(f"{lus:,} produits lus, {len(trouves)} trouvés", file=sys.stderr, flush=True)
        if len(ligne) <= max(i_code, i_ns, i_nova):
            continue
        ean = nos.get(cle(ligne[i_code]))
        if not ean:
            continue
        ns = ligne[i_ns].strip().lower()
        nova = ligne[i_nova].strip()
        ns = ns if ns in ("a", "b", "c", "d", "e") else ""
        nova = nova[0] if nova[:1] in ("1", "2", "3", "4") else ""
        if ns or nova:
            trouves[ean] = (ns, nova)

with open(SORTIE, "w", encoding="utf-8", newline="") as f:
    w = csv.writer(f, delimiter=";")
    w.writerow(["ean", "nutriscore", "nova"])
    for ean in sorted(trouves):
        w.writerow([ean, *trouves[ean]])
print(f"{SORTIE} : {len(trouves)} produits sur {len(nos)} ({lus:,} produits Open Food Facts lus), "
      f"{sum(1 for v in trouves.values() if v[0])} avec Nutri-Score", file=sys.stderr)
