#!/usr/bin/env python3
"""Collecte et analyse des prix publiés par l'observatoire prix.nc (Nouvelle-Calédonie).

Usage:
    python3 prix_nc.py collecter [--dossier donnees/prix-nc] [--sans-bqp]
    python3 prix_nc.py indice    INSTANTANE [filtres] [--min-produits 100]
    python3 prix_nc.py ecarts    INSTANTANE [filtres] [--top 30]
    python3 prix_nc.py panier    INSTANTANE panier.csv [filtres]
    python3 prix_nc.py evolution AVANT APRES [filtres] [--seuil 5]

INSTANTANE est un dossier produit par `collecter` (ex. donnees/prix-nc/2026-10-17).

Filtres communs aux analyses :
    --commune Nouméa       commune exacte (insensible à la casse)
    --magasin carrefour    sous-chaîne du nom de magasin
    --type "grande surface" sous-chaîne du type de commerce
    --secteur epicerie     sous-chaîne du secteur ou sous-secteur de consommation
    --sans-promo           exclut les prix en promotion
    --garder-aberrants     garde les prix à plus de 3× ou moins de 1/3 de la médiane du produit
                           (écartés par défaut : erreurs de saisie ou d'unité dans les fichiers)
    --min-magasins 3       nombre minimal de magasins vendant un produit pour qu'il compte
    --csv sortie.csv       écrit le résultat complet en CSV

Source : API publique https://prix.nc/api/v1 (gouvernement de la Nouvelle-Calédonie,
sans authentification). Prix en francs CFP (XPF), dates à l'heure de Nouméa.
Bibliothèque standard uniquement.
"""

import argparse
import csv
import datetime as dt
import json
import math
import statistics
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

API = "https://prix.nc/api/v1"
TAILLE_PAGE = 1000          # plafond imposé par l'API
PARALLELES = 3              # appels simultanés : service public, rester sobre
PAUSE = 0.2                 # secondes avant chaque appel, par courtoisie
NOUMEA = dt.timezone(dt.timedelta(hours=11), "Pacific/Noumea")  # pas d'heure d'été
FACTEUR_ABERRANT = 3        # au-delà de 3× (ou en deçà de 1/3) du prix médian : erreur probable
DELIMITEUR = ";"            # ouverture directe dans Excel en français
ENCODAGE = "utf-8-sig"


# --------------------------------------------------------------------------
# Accès à l'API
# --------------------------------------------------------------------------

def appeler(chemin, brut=False):
    """GET avec 4 nouvelles tentatives (2, 4, 8, 16 s) sur erreur réseau ou 5xx."""
    url = chemin if chemin.startswith("http") else API + chemin
    for tentative in range(5):
        try:
            requete = urllib.request.Request(url, headers={"Accept": "application/json"})
            with urllib.request.urlopen(requete, timeout=120) as reponse:
                contenu = reponse.read()
            return contenu if brut else json.loads(contenu)
        except urllib.error.HTTPError as erreur:
            if erreur.code < 500 or tentative == 4:
                raise
        except (urllib.error.URLError, ConnectionError, TimeoutError):
            if tentative == 4:
                raise
        time.sleep(2 ** (tentative + 1))


def parcourir(ressource):
    """Toutes les lignes d'une ressource paginée, triées par id pour une pagination stable."""
    def page(numero):
        time.sleep(PAUSE)
        return appeler(f"/{ressource}?size={TAILLE_PAGE}&page={numero}&sort=id,asc")

    premiere = page(0)
    total = premiere["page"]["totalPages"]
    pages, faites = [premiere], 1
    with ThreadPoolExecutor(max_workers=PARALLELES) as executeur:
        for donnees in executeur.map(page, range(1, total)):
            pages.append(donnees)
            faites += 1
            print(f"\r  {ressource} : page {faites}/{total}", end="", file=sys.stderr, flush=True)
    print(f"\r  {ressource} : {total} page(s)" + " " * 10, file=sys.stderr)

    lignes, vus = [], set()
    for donnees in pages:
        for ligne in donnees.get("_embedded", {}).get(ressource, []):
            if ligne["id"] not in vus:
                vus.add(ligne["id"])
                lignes.append(ligne)
    return lignes


def date_noumea(horodatage_ms):
    if horodatage_ms is None:
        return ""
    return dt.datetime.fromtimestamp(horodatage_ms / 1000, NOUMEA).strftime("%Y-%m-%d")


# --------------------------------------------------------------------------
# Lecture / écriture CSV
# --------------------------------------------------------------------------

def ecrire_csv(chemin, colonnes, lignes):
    with open(chemin, "w", newline="", encoding=ENCODAGE) as f:
        ecrivain = csv.DictWriter(f, fieldnames=colonnes, delimiter=DELIMITEUR,
                                  extrasaction="ignore")
        ecrivain.writeheader()
        ecrivain.writerows(lignes)


def lire_csv(chemin):
    with open(chemin, newline="", encoding=ENCODAGE) as f:
        echantillon = f.readline()
        f.seek(0)
        delimiteur = ";" if echantillon.count(";") >= echantillon.count(",") else ","
        return list(csv.DictReader(f, delimiter=delimiteur))


# --------------------------------------------------------------------------
# collecter
# --------------------------------------------------------------------------

COLONNES_MAGASINS = ["id_magasin", "magasin", "commune", "province", "zone_geo",
                     "type_commerce", "latitude", "longitude"]
COLONNES_PRODUITS = ["id_produit", "ean", "produit", "marque", "variete", "secteur",
                     "sous_secteur", "alimentaire", "origine"]
COLONNES_RELEVES = ["date_releve", "id_magasin", "magasin", "commune", "type_commerce",
                    "id_produit", "ean", "produit", "marque", "secteur", "sous_secteur",
                    "origine", "prix", "prix_par_unite", "unite", "promotion"]


def collecter(args):
    debut = time.time()
    jour = dt.datetime.now(NOUMEA).strftime("%Y-%m-%d")
    dossier = Path(args.dossier) / jour
    if dossier.exists():
        print(f"⚠ {dossier} existe déjà : l'instantané du jour est remplacé.", file=sys.stderr)
    dossier.mkdir(parents=True, exist_ok=True)

    print("Collecte prix.nc …", file=sys.stderr)
    magasins = {m["id"]: {
        "id_magasin": m["id"], "magasin": (m.get("label") or "").strip(),
        "commune": m.get("commune") or "", "province": m.get("province") or "",
        "zone_geo": m.get("zoneGeo") or "", "type_commerce": m.get("typeCommerce") or "",
        "latitude": m.get("latitude") or "", "longitude": m.get("longitude") or "",
    } for m in parcourir("magasins")}

    produits = {p["id"]: {
        "id_produit": p["id"], "ean": p.get("gencod") or "", "produit": (p.get("nom") or "").strip(),
        "marque": p.get("marque") or "", "variete": p.get("variete") or "",
        "secteur": p.get("secteurConso") or "", "sous_secteur": p.get("sousSecteurConso") or "",
        "alimentaire": "oui" if p.get("alimentaire") else "non", "origine": p.get("origine") or "",
    } for p in parcourir("produits")}

    releves, orphelins, hors_referentiel = [], 0, set()
    for r in parcourir("relevesprix"):
        produit = produits.get(r["idProduit"], {})
        magasin = magasins.get(r["idMagasin"], {})
        if not produit or not magasin:
            orphelins += 1
        if not magasin:
            hors_referentiel.add((r.get("magasin") or "").strip())
        releves.append({
            "date_releve": date_noumea(r.get("dateReleve")),
            "id_magasin": r["idMagasin"], "magasin": (r.get("magasin") or "").strip(),
            "commune": magasin.get("commune", ""), "type_commerce": magasin.get("type_commerce", ""),
            "id_produit": r["idProduit"], "ean": produit.get("ean", ""),
            "produit": (r.get("nom") or "").strip(), "marque": produit.get("marque", ""),
            "secteur": produit.get("secteur", ""), "sous_secteur": produit.get("sous_secteur", ""),
            "origine": r.get("origine") or "", "prix": r.get("prix"),
            "prix_par_unite": r.get("prixParUnite") if r.get("prixParUnite") is not None else "",
            "unite": r.get("uniteLabelCourt") or "",
            "promotion": "oui" if r.get("promotion") else "non",
        })

    ecrire_csv(dossier / "magasins.csv", COLONNES_MAGASINS, magasins.values())
    ecrire_csv(dossier / "produits.csv", COLONNES_PRODUITS, produits.values())
    ecrire_csv(dossier / "releves.csv", COLONNES_RELEVES, releves)

    fichiers_bqp = []
    if not args.sans_bqp:
        fichiers_bqp = appeler("/bqp/files")
        (dossier / "bqp").mkdir(exist_ok=True)
        for f in fichiers_bqp:
            nom = Path(f["nomFichier"]).name   # le nom vient de l'API : pas de chemin
            contenu = appeler("/bqp/file?filename=" + urllib.parse.quote(nom), brut=True)
            (dossier / "bqp" / nom).write_bytes(contenu)
        ecrire_csv(dossier / "bqp.csv", ["date_fichier", "point_de_vente", "fichier", "type"],
                   [{"date_fichier": date_noumea(f.get("dateFichier")),
                     "point_de_vente": f.get("nomPointVente", ""),
                     "fichier": f.get("nomFichier", ""), "type": f.get("typeFichier", "")}
                    for f in fichiers_bqp])

    dates = sorted(r["date_releve"] for r in releves if r["date_releve"])
    manifeste = {
        "source": API, "collecte_le": dt.datetime.now(NOUMEA).isoformat(timespec="seconds"),
        "duree_s": round(time.time() - debut), "magasins": len(magasins),
        "produits": len(produits), "releves": len(releves), "releves_orphelins": orphelins,
        "magasins_hors_referentiel": sorted(hors_referentiel),
        "releve_le_plus_ancien": dates[0] if dates else None,
        "releve_le_plus_recent": dates[-1] if dates else None,
        "fichiers_bqp": len(fichiers_bqp),
    }
    (dossier / "manifeste.json").write_text(json.dumps(manifeste, ensure_ascii=False, indent=2),
                                            encoding="utf-8")
    print(f"\nInstantané : {dossier}")
    for cle, valeur in manifeste.items():
        print(f"  {cle:24} {valeur}")


# --------------------------------------------------------------------------
# Chargement et filtres
# --------------------------------------------------------------------------

def charger(instantane, args):
    chemin = Path(instantane) / "releves.csv"
    if not chemin.exists():
        sys.exit(f"Instantané introuvable : {chemin} — lancer d'abord `collecter`.")
    lignes = []
    for r in lire_csv(chemin):
        if args.commune and r["commune"].lower() != args.commune.lower():
            continue
        if args.magasin and args.magasin.lower() not in r["magasin"].lower():
            continue
        if args.type and args.type.lower() not in r["type_commerce"].lower():
            continue
        if args.secteur and args.secteur.lower() not in (r["secteur"] + " " + r["sous_secteur"]).lower():
            continue
        if args.sans_promo and r["promotion"] == "oui":
            continue
        try:
            r["prix"] = int(r["prix"])
        except (TypeError, ValueError):
            continue
        if r["prix"] <= 0:
            continue
        lignes.append(r)
    return lignes if args.garder_aberrants else ecarter_aberrants(lignes)


def ecarter_aberrants(lignes):
    """Retire les prix hors de [médiane / 3, médiane × 3] pour leur produit.

    Les fichiers transmis contiennent des erreurs de saisie ou d'unité (lot facturé
    comme l'unité, prix en centimes…) qui écrasent les écarts et les indices.
    """
    par_produit = defaultdict(list)
    for r in lignes:
        par_produit[r["id_produit"]].append(r["prix"])
    medianes = {p: statistics.median(v) for p, v in par_produit.items() if len(v) >= 3}
    gardees = [r for r in lignes if r["id_produit"] not in medianes
               or 1 / FACTEUR_ABERRANT <= r["prix"] / medianes[r["id_produit"]] <= FACTEUR_ABERRANT]
    if len(gardees) < len(lignes):
        print(f"({len(lignes) - len(gardees)} prix aberrants écartés : plus de {FACTEUR_ABERRANT}× "
              f"ou moins de 1/{FACTEUR_ABERRANT} du prix médian du produit ; "
              f"--garder-aberrants pour les inclure)", file=sys.stderr)
    return gardees


def xpf(valeur):
    return f"{round(valeur):,}".replace(",", " ") + " F"


def pct(valeur):
    return f"{valeur:+.1f} %"


def afficher(titre, colonnes, lignes, limite=None):
    print(f"\n{titre}")
    if not lignes:
        print("  (aucun résultat)")
        return
    montrees = lignes[:limite] if limite else lignes
    largeurs = [max(len(c), *(len(str(l[i])) for l in montrees)) for i, c in enumerate(colonnes)]
    largeurs = [min(w, 48) for w in largeurs]
    print("  " + "  ".join(c.ljust(w) for c, w in zip(colonnes, largeurs)))
    for ligne in montrees:
        print("  " + "  ".join(str(v)[:w].ljust(w) for v, w in zip(ligne, largeurs)))
    if limite and len(lignes) > limite:
        print(f"  … {len(lignes) - limite} lignes de plus (voir --csv)")


# --------------------------------------------------------------------------
# indice : niveau de prix de chaque magasin
# --------------------------------------------------------------------------

def indice(args):
    releves = charger(args.instantane, args)
    par_produit = defaultdict(list)
    for r in releves:
        par_produit[r["id_produit"]].append(r)
    medianes = {p: statistics.median(x["prix"] for x in lst)
                for p, lst in par_produit.items() if len(lst) >= args.min_magasins}

    par_magasin = defaultdict(list)
    for r in releves:
        if r["id_produit"] in medianes:
            par_magasin[(r["id_magasin"], r["magasin"], r["commune"], r["type_commerce"])].append(
                math.log(r["prix"] / medianes[r["id_produit"]]))

    resultats = sorted(
        ((cle, 100 * math.exp(statistics.fmean(ecarts)), len(ecarts))
         for cle, ecarts in par_magasin.items() if len(ecarts) >= args.min_produits),
        key=lambda x: x[1])
    ecartes = sum(1 for e in par_magasin.values() if len(e) < args.min_produits)

    print(f"Indice de prix — base 100 = prix médian de chaque produit "
          f"({len(medianes)} produits vendus dans ≥ {args.min_magasins} magasins)")
    afficher("Du moins cher au plus cher :",
             ["rang", "magasin", "commune", "type", "indice", "produits"],
             [(i + 1, c[1], c[2], c[3] or "—", f"{v:.1f}", n)
              for i, (c, v, n) in enumerate(resultats)], args.top)
    if ecartes:
        print(f"\n{ecartes} magasin(s) écarté(s) : moins de {args.min_produits} produits comparables.")
    if args.csv:
        ecrire_csv(args.csv, ["rang", "magasin", "commune", "type_commerce", "indice", "produits"],
                   [{"rang": i + 1, "magasin": c[1], "commune": c[2], "type_commerce": c[3],
                     "indice": f"{v:.1f}", "produits": n} for i, (c, v, n) in enumerate(resultats)])
        print(f"CSV : {args.csv}")


# --------------------------------------------------------------------------
# ecarts : dispersion du prix d'un même produit entre magasins
# --------------------------------------------------------------------------

def ecarts(args):
    releves = charger(args.instantane, args)
    par_produit = defaultdict(list)
    for r in releves:
        par_produit[r["id_produit"]].append(r)

    resultats = []
    for lst in par_produit.values():
        if len(lst) < args.min_magasins:
            continue
        bas = min(lst, key=lambda x: x["prix"])
        haut = max(lst, key=lambda x: x["prix"])
        resultats.append({
            "produit": bas["produit"], "ean": bas["ean"], "secteur": bas["secteur"],
            "magasins": len(lst), "mediane": statistics.median(x["prix"] for x in lst),
            "prix_min": bas["prix"], "magasin_min": bas["magasin"],
            "prix_max": haut["prix"], "magasin_max": haut["magasin"],
            "ecart_pct": 100 * (haut["prix"] / bas["prix"] - 1),
        })
    resultats.sort(key=lambda x: -x["ecart_pct"])

    afficher(f"Écarts de prix entre magasins — {len(resultats)} produits "
             f"vendus dans ≥ {args.min_magasins} magasins, plus gros écarts d'abord :",
             ["produit", "mag.", "min", "où", "max", "où", "écart"],
             [(r["produit"], r["magasins"], xpf(r["prix_min"]), r["magasin_min"],
               xpf(r["prix_max"]), r["magasin_max"], f"{r['ecart_pct']:.0f} %")
              for r in resultats], args.top)
    if args.csv:
        for r in resultats:
            r["ecart_pct"] = f"{r['ecart_pct']:.1f}"
        ecrire_csv(args.csv, list(resultats[0].keys()) if resultats else ["produit"], resultats)
        print(f"CSV : {args.csv}")


# --------------------------------------------------------------------------
# panier : coût d'une liste de courses dans chaque magasin
# --------------------------------------------------------------------------

def panier(args):
    lignes_panier = lire_csv(args.panier)
    if not lignes_panier or not ({"ean", "id_produit"} & set(lignes_panier[0])):
        sys.exit("Le panier doit avoir une colonne `ean` ou `id_produit` (et `quantite`, facultative).")
    voulus = {}
    for l in lignes_panier:
        cle = (l.get("ean") or "").strip() or (l.get("id_produit") or "").strip()
        if cle:
            q = (l.get("quantite") or "1").strip().replace(",", ".")
            voulus[cle] = voulus.get(cle, 0) + float(q or 1)

    releves = charger(args.instantane, args)
    par_magasin = defaultdict(dict)
    libelles = {}
    for r in releves:
        for cle in (r["ean"], r["id_produit"]):
            if cle in voulus:
                par_magasin[(r["magasin"], r["commune"])][cle] = r["prix"]
                libelles[cle] = r["produit"]

    introuvables = [c for c in voulus if c not in libelles]
    complets, partiels = [], []
    for (magasin, commune), prix in par_magasin.items():
        total = sum(prix[c] * voulus[c] for c in prix)
        (complets if len(prix) == len(voulus) else partiels).append(
            (magasin, commune, len(prix), total, [libelles.get(c, c) for c in voulus if c not in prix]))
    complets.sort(key=lambda x: x[3])
    partiels.sort(key=lambda x: (-x[2], x[3]))

    print(f"Panier de {len(voulus)} produits — {len(complets)} magasin(s) les ont tous.")
    if introuvables:
        print(f"⚠ Introuvables dans l'instantané (avec ces filtres) : {', '.join(introuvables)}")
    reference = complets[0][3] if complets else None
    afficher("Magasins proposant tout le panier, du moins cher au plus cher :",
             ["rang", "magasin", "commune", "total", "vs moins cher"],
             [(i + 1, m, c, xpf(t), pct(100 * (t / reference - 1)))
              for i, (m, c, n, t, _) in enumerate(complets)], args.top)
    afficher("Magasins avec une partie du panier (totaux non comparables entre eux) :",
             ["magasin", "commune", "trouvés", "total partiel", "manquants"],
             [(m, c, f"{n}/{len(voulus)}", xpf(t), ", ".join(manq))
              for m, c, n, t, manq in partiels], args.top)
    if args.csv:
        ecrire_csv(args.csv, ["magasin", "commune", "produits_trouves", "produits_panier",
                              "total_xpf", "complet", "manquants"],
                   [{"magasin": m, "commune": c, "produits_trouves": n,
                     "produits_panier": len(voulus), "total_xpf": round(t),
                     "complet": "oui" if not manq else "non", "manquants": " | ".join(manq)}
                    for m, c, n, t, manq in complets + partiels])
        print(f"CSV : {args.csv}")


# --------------------------------------------------------------------------
# evolution : variations entre deux instantanés
# --------------------------------------------------------------------------

def evolution(args):
    avant = {(r["id_produit"], r["id_magasin"]): r for r in charger(args.avant, args)}
    apres = {(r["id_produit"], r["id_magasin"]): r for r in charger(args.apres, args)}
    communs = avant.keys() & apres.keys()

    variations = []
    for cle in communs:
        a, b = avant[cle], apres[cle]
        if a["prix"] != b["prix"]:
            variations.append({
                "produit": b["produit"], "ean": b["ean"], "magasin": b["magasin"],
                "commune": b["commune"], "prix_avant": a["prix"], "prix_apres": b["prix"],
                "variation_pct": 100 * (b["prix"] / a["prix"] - 1),
                "promo_avant": a["promotion"], "promo_apres": b["promotion"],
                "releve_avant": a["date_releve"], "releve_apres": b["date_releve"],
            })
    hausses = sorted((v for v in variations if v["variation_pct"] > 0), key=lambda v: -v["variation_pct"])
    baisses = sorted((v for v in variations if v["variation_pct"] < 0), key=lambda v: v["variation_pct"])
    moyenne = 100 * (math.exp(statistics.fmean(
        math.log(apres[c]["prix"] / avant[c]["prix"]) for c in communs)) - 1) if communs else 0

    print(f"Évolution {Path(args.avant).name} → {Path(args.apres).name}")
    print(f"  paires produit × magasin comparées : {len(communs)}")
    print(f"  prix modifiés : {len(variations)} ({len(hausses)} hausses, {len(baisses)} baisses)")
    print(f"  variation moyenne (géométrique) : {pct(moyenne)}")
    print(f"  disparus : {len(avant.keys() - apres.keys())}   nouveaux : {len(apres.keys() - avant.keys())}")

    colonnes = ["produit", "magasin", "avant", "après", "variation", "promo"]
    def lignes(lst):
        return [(v["produit"], v["magasin"], xpf(v["prix_avant"]), xpf(v["prix_apres"]),
                 pct(v["variation_pct"]), f"{v['promo_avant']}→{v['promo_apres']}")
                for v in lst if abs(v["variation_pct"]) >= args.seuil]
    afficher(f"Hausses ≥ {args.seuil} % :", colonnes, lignes(hausses), args.top)
    afficher(f"Baisses ≥ {args.seuil} % :", colonnes, lignes(baisses), args.top)

    par_magasin = defaultdict(list)
    for c in communs:
        par_magasin[avant[c]["magasin"]].append(math.log(apres[c]["prix"] / avant[c]["prix"]))
    afficher("Variation moyenne par magasin (≥ 50 produits comparés), plus forte hausse d'abord :",
             ["magasin", "variation", "produits"],
             [(m, pct(100 * (math.exp(statistics.fmean(v)) - 1)), len(v))
              for m, v in sorted(par_magasin.items(), key=lambda x: -statistics.fmean(x[1]))
              if len(v) >= 50], args.top)

    if args.csv:
        for v in variations:
            v["variation_pct"] = f"{v['variation_pct']:.1f}"
        ecrire_csv(args.csv, list(variations[0].keys()) if variations else ["produit"], variations)
        print(f"CSV : {args.csv}")


# --------------------------------------------------------------------------
# Ligne de commande
# --------------------------------------------------------------------------

def main():
    parseur = argparse.ArgumentParser(description="Collecte et analyse des prix prix.nc")
    sous = parseur.add_subparsers(dest="commande", required=True)

    p = sous.add_parser("collecter", help="télécharge un instantané complet")
    p.add_argument("--dossier", default="donnees/prix-nc")
    p.add_argument("--sans-bqp", action="store_true", help="ne télécharge pas les fichiers BQP")
    p.set_defaults(fonction=collecter)

    def filtres(p):
        p.add_argument("--commune")
        p.add_argument("--magasin")
        p.add_argument("--type")
        p.add_argument("--secteur")
        p.add_argument("--sans-promo", action="store_true")
        p.add_argument("--garder-aberrants", action="store_true",
                       help="garde les prix à plus de 3× ou moins de 1/3 de la médiane du produit")
        p.add_argument("--min-magasins", type=int, default=3)
        p.add_argument("--top", type=int, default=30, help="lignes affichées (0 = toutes)")
        p.add_argument("--csv")

    p = sous.add_parser("indice", help="niveau de prix de chaque magasin, base 100")
    p.add_argument("instantane")
    p.add_argument("--min-produits", type=int, default=100)
    filtres(p)
    p.set_defaults(fonction=indice)

    p = sous.add_parser("ecarts", help="produits dont le prix varie le plus entre magasins")
    p.add_argument("instantane")
    filtres(p)
    p.set_defaults(fonction=ecarts)

    p = sous.add_parser("panier", help="coût d'une liste de produits dans chaque magasin")
    p.add_argument("instantane")
    p.add_argument("panier", help="CSV avec colonne ean ou id_produit, et quantite")
    filtres(p)
    p.set_defaults(fonction=panier)

    p = sous.add_parser("evolution", help="variations de prix entre deux instantanés")
    p.add_argument("avant")
    p.add_argument("apres")
    p.add_argument("--seuil", type=float, default=5, help="variation minimale affichée, en %")
    filtres(p)
    p.set_defaults(fonction=evolution)

    args = parseur.parse_args()
    if getattr(args, "top", None) == 0:
        args.top = None
    args.fonction(args)


if __name__ == "__main__":
    main()
