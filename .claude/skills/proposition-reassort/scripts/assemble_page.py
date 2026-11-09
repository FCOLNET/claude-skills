"""Assemble la page publiée : le gabarit avec le moteur de calcul intégré.

Usage :
    python3 assemble_page.py --out <scratchpad>/reassort/index.html

Le moteur (scripts/moteur.js) est le même code que celui qui tourne sous Node
pour vérifier la parité avec build_data.py ; la page l'embarque pour refaire le
calcul quand on y dépose de nouveaux exports (vue « Données »).
"""
import argparse
from pathlib import Path

ICI = Path(__file__).resolve().parent


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    page = (ICI.parent / "templates" / "page.html").read_text(encoding="utf-8")
    moteur = (ICI / "moteur.js").read_text(encoding="utf-8")
    assert "<!--MOTEUR-->" in page and "</script" not in moteur
    Path(a.out).write_text(page.replace("<!--MOTEUR-->", "<script>\n" + moteur + "</script>", 1), encoding="utf-8")


if __name__ == "__main__":
    main()
