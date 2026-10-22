"""Lecture des exports de gestion (base article, suivi tout, analyse stock/vente).

Les exports « suivi tout » et « analyse stock vente » écrivent leurs nombres
décimaux avec une virgule, sans guillemets, dans un fichier lui-même séparé
par des virgules : « 64,00 » y occupe deux champs. On les relit donc en
connaissant, pour chaque colonne, si elle est entière ou décimale et combien
de chiffres porte sa partie décimale. Un dépassement de capacité s'écrit
« ***** » sur un seul champ : il vaut None.
"""
import csv
import io

# Colonnes numériques, dans l'ordre du fichier : 0 = entier, n = décimal à n chiffres.
SUIVI_NUM = [
    ("ca_n1", 0), ("ca_n", 0), ("ca_var", 2), ("qte_n1", 2), ("qte_n", 2), ("qte_var", 2),
    ("pv_moy_n1", 0), ("pv_moy_n", 0), ("pv_moy_var", 2), ("nb_fact_n1", 0), ("nb_fact_n", 0),
    ("nb_fact_var", 2), ("caddie_n1", 0), ("caddie_n", 0), ("caddie_var", 2), ("marge_n1", 0),
    ("marge_n", 0), ("marge_var", 2), ("p_marge_n1", 2), ("p_marge_n", 2), ("stock_fin_n1", 2),
    ("stock_fin_n", 2), ("val_stock_fin_n1", 0), ("val_stock_fin_n", 0),
]
SUIVI_TXT = ["periode", "site", "dept", "famille", "sfamille", "fournis", "article"]

ANALYSE_NUM = [
    ("total", 0), ("quantite", 0), ("stock_s", 0), ("commande", 0),
    ("qte1", 0), ("qte2", 0), ("qte3", 0), ("qte4", 0), ("qte5", 0), ("qte6", 0), ("qte7", 0),
    ("qte8", 0), ("qte9", 0), ("qte12", 0), ("qte11", 0), ("qte10", 0),
    ("prixachat", 3), ("prixpond", 2), ("prixvente", 3), ("nbper", 0), ("quantite1", 0),
    ("total1", 0), ("nb_fact", 4), ("nb_fact1", 4), ("marge_pmp", 0), ("marge_pmp1", 0),
    ("stock_s1", 0), ("p_qte", 4), ("p_stock", 4), ("p_ca", 4), ("m_vente", 4), ("qtemoys", 2),
]
ANALYSE_TXT = ["article", "dept", "famille", "sfamille", "fournis", "site", "periode"]


def _lire_nombres(tokens, schema):
    out, i = {}, 0
    for nom, dec in schema:
        if i >= len(tokens):
            raise ValueError("ligne trop courte")
        t = tokens[i].strip()
        if t.startswith("*"):
            out[nom] = None
            i += 1
            continue
        if dec == 0:
            out[nom] = int(t)
            i += 1
        else:
            f = tokens[i + 1].strip() if i + 1 < len(tokens) else ""
            if len(f) != dec or not f.isdigit():
                raise ValueError("décimale inattendue pour " + nom)
            neg = t.startswith("-")
            v = abs(int(t)) + int(f) / 10 ** dec
            out[nom] = -v if neg else v
            i += 2
    if i != len(tokens):
        raise ValueError("ligne trop longue")
    return out


def lire_virgule_decimale(chemin, txt, num, encodage="latin1"):
    """Itère sur les lignes d'un export à virgule décimale ; compte les rejets."""
    lignes, rejets = [], 0
    with open(chemin, encoding=encodage, newline="") as fh:
        lecteur = csv.reader(fh)
        next(lecteur)
        for champs in lecteur:
            if not champs:
                continue
            # Un libellé qui contient lui-même un guillemet casse la citation :
            # la colonne suivante se retrouve collée derrière « ", ».
            if any('",' in c for c in champs[: len(txt)]):
                tete = []
                for c in champs[: len(txt)]:
                    tete.extend(x.strip('"') for x in c.split('",'))
                champs = tete + champs[len(txt):]
            try:
                d = dict(zip(txt, champs[: len(txt)]))
                d.update(_lire_nombres(champs[len(txt):], num))
                lignes.append(d)
            except (ValueError, IndexError):
                rejets += 1
    return lignes, rejets


def lire_suivi(chemin):
    return lire_virgule_decimale(chemin, SUIVI_TXT, SUIVI_NUM)


def lire_analyse(chemin):
    return lire_virgule_decimale(chemin, ANALYSE_TXT, ANALYSE_NUM)


def lire_base_article(chemin):
    with open(chemin, encoding="latin1", newline="") as fh:
        return list(csv.DictReader(fh))


def code(champ):
    """« 000005.VERRE A L'UNITE » ou « 1.VILLE » -> partie avant le premier point."""
    return champ.split(".", 1)[0].strip()


def libelle(champ):
    return champ.split(".", 1)[1].strip() if "." in champ else champ.strip()
