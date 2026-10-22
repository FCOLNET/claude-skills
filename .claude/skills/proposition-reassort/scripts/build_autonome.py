"""Fabrique un fichier HTML autonome par magasin, pour les équipes sans claude.ai.

Usage :
    python3 build_autonome.py --data data.json --page ../templates/page.html \
        --photos photos_reassort.zip --xlsx xlsx.full.min.js --out <dossier>

Chaque fichier porte les propositions de son magasin, les vignettes des articles
concernés (planches réduites à 72 px, intégrées en data: URI) et le module Excel :
il s'ouvre d'un double-clic, sans connexion. Les choix restent dans le
navigateur du poste ; le magasin les renvoie par le fichier Excel de « Mes
choix ». Pas de vue Réseau ni de recherche avec Claude dans cette version.
"""
import argparse
import base64
import io
import json
import os
import re
import sys
import zipfile

from PIL import Image, ImageStat

CELL, COLS, PAR_PLANCHE = 72, 10, 100
NOMS = {"VILLE": "ville", "DUCOS": "ducos", "CPTION": "conception", "MOTORP": "motor-pool",
        "APOGOTI": "apogoti", "QLATIN": "quartier-latin"}


def json_script(ident, obj):
    txt = json.dumps(obj, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    return '<script id="%s" type="application/json">%s</script>\n' % (ident, txt)


def vignettes(zip_path):
    out = {}
    if not zip_path:
        return out
    z = zipfile.ZipFile(zip_path)
    for nom in z.namelist():
        m = re.fullmatch(r"(\d+)\.jpe?g", os.path.basename(nom), re.I)
        if not m:
            continue
        try:
            img = Image.open(io.BytesIO(z.read(nom)))
            img.load()
        except Exception:
            continue
        g = ImageStat.Stat(img.convert("L"))
        if min(img.size) < 16 or (g.stddev[0] < 3 and g.mean[0] > 240):
            continue
        img = img.convert("RGB")
        img.thumbnail((CELL, CELL))
        out[m.group(1)] = img
    return out


def planches(codes, imgs):
    carte, feuilles = {}, []
    codes = [c for c in codes if c in imgs]
    for p in range(0, len(codes), PAR_PLANCHE):
        lot = codes[p:p + PAR_PLANCHE]
        h = (len(lot) + COLS - 1) // COLS
        pl = Image.new("RGB", (COLS * CELL, h * CELL), "white")
        for k, c in enumerate(lot):
            im = imgs[c]
            pl.paste(im, ((k % COLS) * CELL + (CELL - im.width) // 2, (k // COLS) * CELL + (CELL - im.height) // 2))
            carte[c] = [len(feuilles), k]
        buf = io.BytesIO()
        pl.save(buf, "JPEG", quality=72, optimize=True, progressive=True)
        feuilles.append("data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode())
    return {"cell": CELL, "cols": COLS, "sheets": feuilles, "map": carte}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--page", required=True)
    ap.add_argument("--photos")
    ap.add_argument("--xlsx", help="xlsx.full.min.js (SheetJS) à intégrer ; sinon chargé depuis cdnjs")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    D = json.load(open(a.data, encoding="utf-8"))
    page = open(a.page, encoding="utf-8").read()
    titre = re.search(r"<title>(.*?)</title>", page).group(1)
    corps = re.sub(r"<title>.*?</title>\n?", "", page, count=1)
    corps = re.sub(r'<meta name="claude:viewport-fit-sides"[^>]*>\n?', "", corps, count=1)
    xlsx = ""
    if a.xlsx:
        xlsx = "<script>" + open(a.xlsx, encoding="utf-8").read().replace("</script", "<\\/script") + "</script>\n"
    imgs = vignettes(a.photos)
    os.makedirs(a.out, exist_ok=True)

    for s in D["magasins"]:
        L = D["lignes"][s]
        utiles = sorted({l["a"] for l in L} | {x for l in L for x in l.get("pour", [])} |
                        {l["orig"] for l in L if "orig" in l})
        ren = {i: k for k, i in enumerate(utiles)}
        lignes = []
        for l in L:
            l = dict(l, a=ren[l["a"]])
            if "orig" in l:
                l["orig"] = ren[l["orig"]]
            if "pour" in l:
                l["pour"] = [ren[x] for x in l["pour"]]
            lignes.append(l)
        d = dict(D, arts=[D["arts"][i] for i in utiles], lignes={m: (lignes if m == s else []) for m in D["magasins"]},
                 rayons={m: (D["rayons"][m] if m == s else []) for m in D["magasins"]}, vivier=[], seul=s)
        ph = planches([D["arts"][i][0] for i in utiles], imgs)
        nom = D["sites"][s]
        html = ('<!doctype html>\n<html lang="fr"><head><meta charset="utf-8">'
                '<meta name="viewport" content="width=device-width,initial-scale=1">'
                "<title>%s · %s</title>\n<style>body{margin:0}[hidden]{display:none!important}</style>\n"
                "%s%s%s</head><body>\n%s</body></html>\n") % (
            titre, nom.title(), json_script("donnees", d), json_script("vignettes", ph), xlsx, corps)
        chemin = os.path.join(a.out, "reassort-%s-%s.html" % (NOMS.get(nom, nom.lower()), D["meta"]["fin"]))
        with open(chemin, "w", encoding="utf-8") as fh:
            fh.write(html)
        print("%-15s %5d lignes  %5d articles  %4d photos  %.1f Mo  %s" % (
            nom, len(L), len(utiles), len(ph["map"]), os.path.getsize(chemin) / 1e6, os.path.basename(chemin)))


if __name__ == "__main__":
    sys.exit(main())
