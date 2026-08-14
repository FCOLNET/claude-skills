#!/usr/bin/env python3
"""Contrôle pré-vol d'un fichier PLV HTML avant export PDF.

Usage:  python3 preflight.py affiche.html

Vérifie : résolution effective des images, déclaration @page, aplats couleur
imprimables, dépendances réseau, plancher de lisibilité des mentions.
Sortie : rapport lisible + code retour 1 si au moins une ERREUR.

Stdlib uniquement, aucune dépendance à installer.
"""

import os
import re
import struct
import sys
from html.parser import HTMLParser

MM_PER_INCH = 25.4

# Couleurs RVB sans équivalent en quadrichromie. Distance euclidienne < SEUIL.
COULEURS_HORS_GAMUT = {
    (0, 255, 0): ("vert vif", "#43B02A"),
    (0, 0, 255): ("bleu électrique", "#0057B8"),
    (255, 0, 255): ("magenta fluo", "#D6006E"),
    (0, 255, 255): ("cyan écran", "#0092C8"),
}
SEUIL_COULEUR = 40

# Plancher de lisibilité des mentions légales, en millimètres.
FONT_SIZE_MINI_MM = 4.0


# --------------------------------------------------------------------------
# Lecture des dimensions intrinsèques (sans Pillow)
# --------------------------------------------------------------------------

def dimensions_png(f):
    f.seek(16)
    w, h = struct.unpack(">II", f.read(8))
    return w, h


def dimensions_jpeg(f):
    f.seek(2)
    while True:
        octet = f.read(1)
        if not octet:
            return None
        if octet != b"\xff":
            continue
        marqueur = f.read(1)
        while marqueur == b"\xff":          # octets de bourrage
            marqueur = f.read(1)
        if not marqueur:
            return None
        code = marqueur[0]
        # SOF0..SOF15, hors DHT (C4), DAC (CC) et RSTn (C8)
        if 0xC0 <= code <= 0xCF and code not in (0xC4, 0xC8, 0xCC):
            f.read(3)                       # longueur (2) + précision (1)
            h, w = struct.unpack(">HH", f.read(4))
            return w, h
        longueur = struct.unpack(">H", f.read(2))[0]
        f.seek(longueur - 2, os.SEEK_CUR)


def dimensions_gif(f):
    f.seek(6)
    w, h = struct.unpack("<HH", f.read(4))
    return w, h


def dimensions_image(chemin):
    """Retourne (largeur_px, hauteur_px), 'vecteur', ou None si illisible."""
    if chemin.lower().endswith(".svg"):
        return "vecteur"
    try:
        with open(chemin, "rb") as f:
            entete = f.read(12)
            f.seek(0)
            if entete.startswith(b"\x89PNG\r\n\x1a\n"):
                return dimensions_png(f)
            if entete.startswith(b"\xff\xd8"):
                return dimensions_jpeg(f)
            if entete[:6] in (b"GIF87a", b"GIF89a"):
                return dimensions_gif(f)
            if entete[:4] == b"RIFF" and entete[8:12] == b"WEBP":
                return "webp"
    except (OSError, struct.error):
        return None
    return None


# --------------------------------------------------------------------------
# Analyse du HTML
# --------------------------------------------------------------------------

class AnalyseurPLV(HTMLParser):
    def __init__(self):
        super().__init__()
        self.images = []          # (src, largeur_mm_declaree|None)
        self.feuilles = []        # href des CSS liées
        self.styles_inline = []   # contenu des blocs <style>
        self._dans_style = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "img":
            self.images.append((a.get("src", ""), self._largeur_mm(a)))
        elif tag == "link" and a.get("rel", "").lower() == "stylesheet":
            if a.get("href"):
                self.feuilles.append(a["href"])
        elif tag == "style":
            self._dans_style = True

    def handle_endtag(self, tag):
        if tag == "style":
            self._dans_style = False

    def handle_data(self, data):
        if self._dans_style:
            self.styles_inline.append(data)

    @staticmethod
    def _largeur_mm(attrs):
        """Largeur d'impression en mm, depuis data-print-width ou style inline."""
        for source in (attrs.get("data-print-width"), attrs.get("style", "")):
            if not source:
                continue
            m = re.search(r"(?:^|width\s*:\s*)([\d.]+)\s*mm", source)
            if m:
                return float(m.group(1))
        return None


def sans_commentaires(texte):
    """Retire commentaires CSS et HTML : du code désactivé ne doit pas être contrôlé."""
    texte = re.sub(r"/\*.*?\*/", " ", texte, flags=re.DOTALL)
    return re.sub(r"<!--.*?-->", " ", texte, flags=re.DOTALL)


def hex_vers_rvb(h):
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def distance_rvb(a, b):
    return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5


# --------------------------------------------------------------------------
# Contrôles
# --------------------------------------------------------------------------

def controler(chemin_html, dpi_cible):
    erreurs, alertes, ok = [], [], []
    base = os.path.dirname(os.path.abspath(chemin_html))

    with open(chemin_html, encoding="utf-8") as f:
        html = f.read()

    analyseur = AnalyseurPLV()
    analyseur.feed(html)

    # CSS complet = blocs <style> + feuilles liées locales
    css = sans_commentaires("\n".join(analyseur.styles_inline))
    for href in analyseur.feuilles:
        if href.startswith(("http://", "https://", "//")):
            alertes.append(f"CSS distant : {href} — rendu non reproductible hors ligne")
            continue
        chemin_css = os.path.join(base, href)
        if os.path.exists(chemin_css):
            with open(chemin_css, encoding="utf-8") as f:
                css += "\n" + sans_commentaires(f.read())
        else:
            erreurs.append(f"CSS introuvable : {href}")
    html_net = sans_commentaires(html)
    total = css + "\n" + html_net

    # 1 — Déclaration @page
    bloc_page = re.search(r"@page[^{]*\{([^}]*)\}", total)
    m = re.search(r"size\s*:\s*([^;}]+)", bloc_page.group(1)) if bloc_page else None
    if m:
        ok.append(f"@page déclaré — size: {m.group(1).strip()}")
        # (?<!-) écarte la variable CSS --bleed du socle
        if re.search(r"(?<!-)\bbleed\s*:", bloc_page.group(1)):
            ok.append("Propriété bleed présente (WeasyPrint / Prince)")
        # on cherche l'USAGE de la classe dans le HTML, pas sa définition en CSS
        elif not re.search(r'class\s*=\s*["\'][^"\']*\bcrop-marks\b', html_net):
            alertes.append(
                "Ni bleed ni .crop-marks — sous Chromium aucun repère de coupe ne "
                "sera tracé. Déclarer la page en format fond perdu inclus."
            )
    else:
        erreurs.append("Aucune règle @page avec size — le format d'impression est indéfini")

    # 2 — Impression des aplats
    if "print-color-adjust" in total:
        ok.append("print-color-adjust déclaré — les aplats seront imprimés")
    else:
        erreurs.append(
            "print-color-adjust: exact absent — les fonds colorés seront supprimés "
            "à l'impression par le navigateur"
        )

    # 3 — Résolution effective des images
    if not analyseur.images:
        alertes.append("Aucune image dans le document")
    for src, largeur_mm in analyseur.images:
        if src.startswith(("http://", "https://", "//")):
            alertes.append(f"Image distante : {src} — à rapatrier en local")
            continue
        if src.startswith("data:"):
            ok.append("Image encodée en data URI (autonome)")
            continue

        chemin = os.path.join(base, src)
        if not os.path.exists(chemin):
            erreurs.append(f"Image introuvable : {src}")
            continue

        dims = dimensions_image(chemin)
        if dims == "vecteur":
            ok.append(f"{src} — SVG vectoriel, résolution illimitée")
            continue
        if dims == "webp":
            alertes.append(f"{src} — WebP mal supporté par les RIP, convertir en TIFF/JPEG")
            continue
        if dims is None:
            alertes.append(f"{src} — format non reconnu, contrôle de résolution impossible")
            continue

        if largeur_mm is None:
            alertes.append(
                f"{src} — largeur d'impression non déclarée. Ajouter "
                f'data-print-width="XXmm" pour permettre le contrôle de résolution'
            )
            continue

        dpi_effectif = dims[0] * MM_PER_INCH / largeur_mm
        if dpi_effectif < dpi_cible:
            requis = int(largeur_mm * dpi_cible / MM_PER_INCH) + 1
            erreurs.append(
                f"{src} — {dpi_effectif:.0f} dpi à {largeur_mm:g} mm "
                f"(cible {dpi_cible}). Image de {dims[0]} px, il en faut {requis}."
            )
        else:
            ok.append(f"{src} — {dpi_effectif:.0f} dpi à {largeur_mm:g} mm")

    # 4 — Couleurs hors gamut quadri
    vues = set()
    for h in re.findall(r"#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b", total):
        rvb = hex_vers_rvb(h)
        for ref, (nom, substitut) in COULEURS_HORS_GAMUT.items():
            if distance_rvb(rvb, ref) < SEUIL_COULEUR and h.upper() not in vues:
                vues.add(h.upper())
                alertes.append(
                    f"{h} proche du {nom} — se dégrade en quadrichromie. "
                    f"Substitut conseillé : {substitut}"
                )

    # 5 — Plancher de lisibilité, variables CSS résolues
    #     La dernière déclaration d'une variable l'emporte (ordre de cascade simplifié).
    variables = {}
    for nom, valeur in re.findall(r"(--[\w-]+)\s*:\s*([\d.]+)\s*mm", total):
        variables[nom] = float(valeur)

    signales = set()
    for brut in re.findall(r"font-size\s*:\s*([^;}]+)", total):
        brut = brut.strip()
        m_var = re.fullmatch(r"var\(\s*(--[\w-]+)\s*\)", brut)
        if m_var:
            nom = m_var.group(1)
            taille, origine = variables.get(nom), f"var({nom})"
        else:
            m_mm = re.fullmatch(r"([\d.]+)\s*mm", brut)
            taille, origine = (float(m_mm.group(1)), brut) if m_mm else (None, brut)

        if taille is not None and taille < FONT_SIZE_MINI_MM and origine not in signales:
            signales.add(origine)
            erreurs.append(
                f"font-size: {origine} = {taille:g}mm — sous le plancher de lisibilité "
                f"de {FONT_SIZE_MINI_MM:g} mm pour une mention consommateur"
            )

    # 6 — Polices distantes
    if re.search(r"@import\s+url\(['\"]?https?://|fonts\.googleapis|fonts\.gstatic", total):
        alertes.append("Police chargée depuis un CDN — embarquer un fichier local")

    return erreurs, alertes, ok


def main():
    if len(sys.argv) < 2:
        print("Usage : python3 preflight.py <fichier.html> [dpi_cible]")
        return 2

    chemin = sys.argv[1]
    dpi_cible = int(sys.argv[2]) if len(sys.argv) > 2 else 150

    if not os.path.exists(chemin):
        print(f"Fichier introuvable : {chemin}")
        return 2

    erreurs, alertes, ok = controler(chemin, dpi_cible)

    largeur = 72
    print("=" * largeur)
    print(f"PRÉ-VOL — {os.path.basename(chemin)}  (DPI cible : {dpi_cible})")
    print("=" * largeur)

    for titre, items, symbole in (
        ("ERREURS — bloquantes avant envoi imprimeur", erreurs, "✗"),
        ("ALERTES — à valider", alertes, "!"),
        ("CONFORMES", ok, "✓"),
    ):
        if items:
            print(f"\n{titre}")
            print("-" * largeur)
            for item in items:
                print(f"  {symbole} {item}")

    print("\n" + "=" * largeur)
    print(f"{len(erreurs)} erreur(s) · {len(alertes)} alerte(s) · {len(ok)} contrôle(s) OK")
    if erreurs:
        print("BON À TIRER REFUSÉ — corriger les erreurs ci-dessus.")
    elif alertes:
        print("BON À TIRER SOUS RÉSERVE — vérifier les alertes.")
    else:
        print("BON À TIRER RECEVABLE.")
    print("=" * largeur)

    return 1 if erreurs else 0


if __name__ == "__main__":
    sys.exit(main())
