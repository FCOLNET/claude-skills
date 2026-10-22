"""Assemble les vignettes articles en planches pour la page de réassort.

Usage :
    python3 build_photos.py --zip photos_reassort.zip --out <scratchpad>/reassort/photos

Neuf mille fichiers d'un kilo-octet chacun feraient autant de requêtes et
dépasseraient le nombre de fichiers qu'une page publiée peut porter. On les
range donc par cent dans des planches JPEG (10 x 10 cases de 120 px) ; la page
n'affiche que le morceau utile de la planche, et ne charge une planche que
lorsqu'une ligne visible en a besoin. Les planches suivent l'ordre des codes :
une sous-famille créée d'un bloc tombe souvent sur la même planche.

Sortie : <out>/p000.jpg, p001.jpg, ... et <out>/index.json
    {"cell": 120, "cols": 10, "n": <planches>, "map": {"082694": [planche, case], ...}}
"""
import argparse
import io
import json
import os
import re
import sys
import zipfile

from PIL import Image, ImageStat

CELL, COLS, PAR_PLANCHE = 120, 10, 100


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--zip", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    os.makedirs(a.out, exist_ok=True)
    z = zipfile.ZipFile(a.zip)
    vignettes, illisibles, vides = [], 0, 0
    for nom in sorted(z.namelist()):
        base = os.path.basename(nom)
        m = re.fullmatch(r"(\d+)\.jpe?g", base, re.I)
        if not m:
            continue
        try:
            img = Image.open(io.BytesIO(z.read(nom)))
            img.load()
        except Exception:
            illisibles += 1
            continue
        # Le partage photo garde des images d'un pixel, ou toutes blanches, à la
        # place des photos manquantes : une case vide vaut mieux qu'un carré blanc.
        gris = ImageStat.Stat(img.convert("L"))
        if min(img.size) < 16 or (gris.stddev[0] < 3 and gris.mean[0] > 240):
            vides += 1
            continue
        vignettes.append((m.group(1), img))

    carte, n = {}, 0
    for p in range(0, len(vignettes), PAR_PLANCHE):
        lot = vignettes[p:p + PAR_PLANCHE]
        lignes = (len(lot) + COLS - 1) // COLS
        planche = Image.new("RGB", (COLS * CELL, lignes * CELL), "white")
        for k, (code, img) in enumerate(lot):
            img = img.convert("RGB")
            img.thumbnail((CELL, CELL))
            x = (k % COLS) * CELL + (CELL - img.width) // 2
            y = (k // COLS) * CELL + (CELL - img.height) // 2
            planche.paste(img, (x, y))
            carte[code] = [n, k]
        planche.save(os.path.join(a.out, "p%03d.jpg" % n), "JPEG", quality=78, optimize=True, progressive=True)
        n += 1

    with open(os.path.join(a.out, "index.json"), "w", encoding="utf-8") as fh:
        json.dump({"cell": CELL, "cols": COLS, "n": n, "map": carte}, fh, separators=(",", ":"))
    taille = sum(os.path.getsize(os.path.join(a.out, f)) for f in os.listdir(a.out))
    print("Vignettes :", len(carte), "| vides écartées :", vides, "| illisibles :", illisibles, "| planches :", n,
          "| poids total : %.1f Mo" % (taille / 1e6))


if __name__ == "__main__":
    sys.exit(main())
