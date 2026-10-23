"""Calcule les propositions de réassort par magasin à partir des exports de gestion.

Usage :
    python3 build_data.py --base art_superviseur.CSV --analyse ANALYSE_STOCK_VENTE.CSV \
        --glissant suivi_tout_12_glissants.csv [--exercice suivi_tout_DDEXF.csv] \
        [--mois suivi_tout_DDM.csv] --out data.json

Le stock ne vient que de ce qui est physiquement sur l'île : réserves (entrepôt,
Gallieni), réception à deux jours, et stock qui dort dans un autre magasin. Ce
qui est en commande ou en mer n'est jamais proposé ; il est seulement signalé.

Les signaux, pour un magasin M et une référence R :
  RUP  rupture récente : M vendait R ces trois derniers mois, son stock est à 0.
  DEJ  déjà vendu ici : M a vendu R dans les douze mois, plus depuis trois mois,
       stock à 0 (souvent une référence de saison qui revient).
  ABS  absent chez moi : M n'a ni vente ni stock, d'autres magasins la vendent.
  NOU  nouveauté qui démarre : comme ABS, sur une référence apparue cette année.
  NVD  nouveauté dormante : en réserve, aucun magasin ne l'a ni ne l'a vendue.
  SUB  substitution : M vendait R, plus aucun stock nulle part ; on propose un
       produit proche en réserve (même sous-famille, prix voisin, libellé proche).
  CED  à céder : M a du stock qui dort alors que d'autres magasins en ont besoin.
Aucun filtre de taille : tout magasin reçoit toutes les propositions ; seule
l'estimation de vente tient compte de son poids dans le réseau.
"""
import argparse
import bisect
import calendar
import datetime as dt
import json
import math
import re
import statistics
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import exports as E  # noqa: E402

# --- paramètres (affichés dans la page, modifiables ici) ---
COUV_JOURS = 30          # couverture visée par une proposition
HORIZON_MOIS = 3         # horizon de l'estimation de CA et de marge
RECENT_MOIS = 3          # « vendait les semaines précédentes »
PRUDENCE_ABS = 0.5       # une référence jamais vendue ici se vendra moins qu'ailleurs
REPORT_SUB = 0.5         # part des clients qui acceptent le produit de remplacement
DORT_LIV_JOURS = 90      # stock sans vente, pas livré depuis : il dort
SURSTOCK_JOURS = 180     # au-delà, l'excédent est cessible
GARDE_JOURS = 60         # ce que le cédant garde de ses propres ventes
NVD_RECEP_JOURS = 180    # nouveauté dormante : reçue à l'entrepôt depuis moins de
PRIX_SUB = (0.75, 1.33)  # fourchette de prix d'un substitut
RAYON_MIN_PORTEURS = 3   # rayon absent : vendu par au moins N des autres magasins
TGC = [0, 0.03, 0.06, 0.11, 0.22]
DEPTS_EXCLUS = {"50", "99"}  # divers, services

POSITIONS = ["0", "1", "2", "3", "5", "6", "7", "8"]  # site0..site7 de la base article
MAGASINS = ["1", "2", "3", "5", "6", "7"]
RESERVES = ["0", "8"]
CONF_POIDS = {"forte": 1.0, "moyenne": 0.7, "faible": 0.4}


def date_fr(s):
    try:
        return dt.datetime.strptime(s.strip(), "%d/%m/%Y").date()
    except (ValueError, AttributeError):
        return None


def num(s, defaut=0.0):
    try:
        return float(str(s).replace(",", "."))
    except ValueError:
        return defaut


def date_souple(s, ref):
    """Date jj/mm/aaaa ou mm/jj/aaaa (selon le logiciel qui a converti) : on
    garde la lecture la plus proche de la date des données."""
    s = (s or "").strip()
    m = re.match(r"(\d{1,2})/(\d{1,2})/(\d{4})", s)
    if not m:
        return None
    a_, b_, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
    cands = []
    for jj, mm in ((a_, b_), (b_, a_)):
        try:
            cands.append(dt.date(y, mm, jj))
        except ValueError:
            pass
    return min(cands, key=lambda d: abs((d - ref).days)) if cands else None


def proche_tgc(x):
    return min(TGC, key=lambda v: abs(v - x))


# Mots qui décrivent une variante, jamais un usage : couleurs, matières, formes,
# tailles, conditionnements. Deux produits ne se remplacent pas parce qu'ils
# sont tous deux noirs.
ATTRIBUTS = set("""
NOIR NOIRE BLANC BLANCHE ROUGE BLEU BLEUE VERT VERTE JAUNE ROSE GRIS GRISE BEIGE MARRON NATUREL NATURELLE
OCRE CREME TAUPE ARGENT ARGENTE DORE DOREE ORANGE VIOLET TURQUOISE ANTHRACITE IVOIRE CHOCOLAT KAKI CORAIL
MULTICO MULTICOLORE COULEUR CLR ASS ASSORTI ASSORTIE INOX BOIS BAMBOU VERRE PLASTIQUE METAL ALU ALUMINIUM
COTON POLYESTER RESINE CERAMIQUE PORCELAINE GRES FAIENCE ACIER FER SILICONE PVC LIN VELOURS UNI RAYE RECT
RECTANGULAIRE ROND RONDE CARRE CARREE OVALE LONG LONGUE GRAND GRANDE PETIT PETITE MOYEN MOYENNE MINI MAXI
LOT SET KIT PACK BOX DUO TRIO DES LES AVEC POUR SUR SANS UNE AUX PAR NEW NOUVEAU NOUVELLE LUXE DECO DECOR
MODELE STYLE COLLECTION CMS LITRE PIECE PCS PCE PERSONNE PERS
BLC NAT NR BLK WHT MULTICOL ASSORT COLORI DESIGN MOTIF IMPRIME
""".split())


def _norm(lib):
    return unicodedata.normalize("NFKD", lib.upper()).encode("ascii", "ignore").decode()


def _racine(m):
    return m[:-1] if len(m) > 4 and m[-1] in "SX" else m


def mots_libelle(lib):
    out = []
    for m in re.findall(r"[A-Z]{3,}", _norm(lib)):
        r = _racine(m)
        if m not in ATTRIBUTS and r not in ATTRIBUTS:
            out.append(r)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", required=True)
    ap.add_argument("--analyse", required=True)
    ap.add_argument("--glissant", required=True)
    ap.add_argument("--exercice")
    ap.add_argument("--mois")
    ap.add_argument("--prepa", help="écart préparation (.xls, .xlsx ou .csv) : réassorts en cours, sous 48 h")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    base = E.lire_base_article(a.base)
    analyse, rej_an = E.lire_analyse(a.analyse)
    gliss, rej_gl = E.lire_suivi(a.glissant)
    rejets = {"analyse": rej_an, "glissant": rej_gl}
    exo = mois = None
    if a.exercice:
        exo, rejets["exercice"] = E.lire_suivi(a.exercice)
    if a.mois:
        mois, rejets["mois"] = E.lire_suivi(a.mois)

    # --- dates ---
    per = analyse[0]["periode"]
    fin = date_fr(per.split(" au ")[1])
    jours_mois = calendar.monthrange(fin.year, fin.month)[1]
    poids_mois = [1.0] * 11 + [fin.day / jours_mois]  # qte12 = mois en cours, partiel
    noms_mois = []
    for k in range(12):
        m = (fin.month - 11 + k - 1) % 12 + 1
        noms_mois.append(["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août",
                          "sept.", "oct.", "nov.", "déc."][m - 1])
    mois_noel = [k for k in range(12) if noms_mois[k] in ("nov.", "déc.")]

    # --- hiérarchie ---
    depts, fams, sfams = {}, {}, {}
    for x in analyse:
        depts[E.code(x["dept"])] = E.libelle(x["dept"])
        fams[E.code(x["famille"])] = E.libelle(x["famille"])
        sfams[E.code(x["sfamille"])] = E.libelle(x["sfamille"])
    for r in base:
        fams.setdefault(r["famille"], r["libfam"].strip())
        sfams.setdefault(r["sfamille"], r["libsfam"].strip())
    for x in gliss:
        depts.setdefault(E.code(x["dept"]), E.libelle(x["dept"]))
    sfam_fam = {r["sfamille"]: r["famille"] for r in base}

    # --- articles ---
    arts, idx = [], {}
    for r in base:
        c = r["code"].strip()
        if not c.isdigit():
            continue
        pr, pv = num(r["prix_revient"]), num(r["prix_vente"])
        dep = r["famille"][:2]
        if pr <= 0 or pv <= 0 or dep in DEPTS_EXCLUS:
            continue
        st = {POSITIONS[i]: int(num(r["site%d" % i])) for i in range(8)}
        capa = {POSITIONS[i]: int(num(r["capa%d" % i])) for i in range(1, 8)}
        spcb, pcb = int(num(r["spcb"])), int(num(r["pcb"]))
        o = {
            "c": c, "lib": r["libelle"].strip(), "sf": r["sfamille"], "fa": r["famille"], "de": dep,
            "four": r["libfou"].strip(), "pr": pr, "pv": pv,
            "lot": spcb if spcb > 0 else (pcb if pcb > 0 else 1),
            "st": st, "capa": capa, "cde": int(num(r["en_cde"])), "flo": int(num(r["en_flottant"])),
            "rec": int(num(r["en_recept"])), "dims": r["dimensions"].strip(),
            "dEntr": date_fr(r["date_entr"]), "dLiv": date_fr(r["date_livr"]),
        }
        idx[c] = len(arts)
        arts.append(o)

    # --- ventes : 12 mois par magasin ---
    q = {}  # (site, i) -> [12]
    for x in analyse:
        s, c = E.code(x["site"]), E.code(x["article"])
        if s in MAGASINS and c in idx:
            q[(s, idx[c])] = [x["qte%d" % k] or 0 for k in range(1, 13)]

    # --- TGC et taux de marge par article, lus dans les ventes ---
    ca_ttc, ca_ht = Counter(), Counter()
    n1 = Counter()
    for src in (gliss, exo or []):
        for x in src:
            c = x["article"]
            if src is gliss:
                n1[c] += x["qte_n1"] or 0
            if (x["ca_n"] or 0) > 0 and (x["p_marge_n"] or 0) > 0 and (x["marge_n"] or 0) > 0:
                ca_ttc[c] += x["ca_n"]
                ca_ht[c] += x["marge_n"] / (x["p_marge_n"] / 100)
    tgc_sf = defaultdict(Counter)
    tgc_art = {}
    for c, ht in ca_ht.items():
        if ht > 0 and c in idx:
            t = proche_tgc(ca_ttc[c] / ht - 1)
            tgc_art[c] = t
            tgc_sf[arts[idx[c]]["sf"]][t] += 1
    for o in arts:
        t = tgc_art.get(o["c"])
        if t is None:
            t = tgc_sf[o["sf"]].most_common(1)[0][0] if tgc_sf[o["sf"]] else 0.22
        o["tgc"] = t
        o["mu"] = o["pv"] / (1 + t) - o["pr"]  # marge unitaire HT

    # --- poids des magasins : CA de douze mois rapporté à la moyenne ---
    ca_mag = Counter()
    for (s, i), v in q.items():
        ca_mag[s] += sum(v) * arts[i]["pv"]
    moy = sum(ca_mag[s] for s in MAGASINS) / len(MAGASINS)
    poids = {s: (ca_mag[s] / moy if moy else 1) for s in MAGASINS}

    def rythme(s, i):
        """Ventes par mois sur la période où la référence était là."""
        v = q.get((s, i))
        if not v or sum(v) <= 0:
            return 0.0
        f = next(k for k in range(12) if v[k] > 0)
        l = max(k for k in range(12) if v[k] > 0)
        fin_fen = 11 if arts[i]["st"][s] > 0 else l  # stock à 0 : rupture depuis la dernière vente
        duree = max(2.0, sum(poids_mois[f:fin_fen + 1]))
        return sum(v[f:fin_fen + 1]) / duree

    ventes12 = lambda s, i: sum(q.get((s, i), [0]))
    recent = lambda s, i: sum(q.get((s, i), [0] * 12)[12 - RECENT_MOIS:]) > 0
    stock = lambda s, i: arts[i]["st"][s]

    # --- nouveautés : aucune vente N-1, aucune vente réseau avant les six derniers mois ---
    vend_tot = defaultdict(lambda: [0] * 12)
    for (s, i), v in q.items():
        t = vend_tot[i]
        for k in range(12):
            t[k] += v[k]
    # Repère de saison : constaté sur le réseau, pas sur les quelques ventes d'un
    # magasin (six supports de tringle vendus en décembre ne font pas une saison).
    # « Noël » ne qualifie que la déco et les jouets de Noël ; ailleurs on parle
    # de pic de novembre-décembre, qui est aussi l'été austral : un set de
    # plongée n'est pas un article de Noël.
    sf_mois = defaultdict(lambda: [0] * 12)
    for i_, t_ in vend_tot.items():
        m_ = sf_mois[arts[i_]["sf"]]
        for k in range(12):
            m_[k] += t_[k]
    def saison(i):
        """(« noel » | « fin » | None, part des ventes réseau en nov.-déc. en %)."""
        o = arts[i]
        t, sf = vend_tot[i], sf_mois[o["sf"]]
        part = round(100 * sum(t[k] for k in mois_noel) / sum(t)) if sum(t) else 0
        if o["de"] == "08" or "NOEL" in E.libelle(fams.get(o["fa"], "")).upper().replace("Ë", "E"):
            return "noel", part
        if sum(t) >= 30 and part >= 60:
            return "fin", part
        if sum(sf) >= 100 and sum(sf[k] for k in mois_noel) >= 0.5 * sum(sf) and part >= 50:
            return "fin", part
        return None, part

    def nouveau(i):
        return n1[arts[i]["c"]] <= 0 and sum(vend_tot[i][:6]) <= 0

    # --- préparations en cours : réassort déjà parti pour le magasin, sous 48 h ---
    # La quantité est prise sur le stock de l'entrepôt, qui la compte encore :
    # elle n'est plus disponible pour un autre magasin.
    prep, prep_liv, prep_tot = Counter(), {}, Counter()
    nb_prep = 0
    if a.prepa:
        for x in E.lire_preparations(a.prepa):
            s_, c_ = E.code(x.get("site", "")), (x.get("article") or "").strip()
            if s_ not in MAGASINS or c_ not in idx:
                continue
            qd = num(x.get("qte_demande"))
            if qd <= 0:
                continue
            i_ = idx[c_]
            prep[(s_, i_)] += qd
            prep_tot[i_] += qd
            nb_prep += 1
            d_ = date_souple(x.get("livr_demande", ""), fin)
            if d_ and ((s_, i_) not in prep_liv or d_ < prep_liv[(s_, i_)]):
                prep_liv[(s_, i_)] = d_

    # --- l'offre de l'île : entrepôt (net des préparations), réception, stock qui dort ---
    def dispo_ent(i):
        """(stock entrepôt disponible, réception disponible), préparations déduites."""
        o = arts[i]
        phys = sum(max(0, o["st"][r]) for r in RESERVES)
        res = prep_tot[i]
        return max(0, phys - res), max(0, max(0, o["rec"]) - max(0, res - phys))

    def reserve(i):
        return sum(dispo_ent(i))

    donneurs = defaultdict(list)  # i -> [(site, qte, motif)]
    for i, o in enumerate(arts):
        jl = (fin - o["dLiv"]).days if o["dLiv"] else None
        for s in MAGASINS:
            stk = stock(s, i)
            if stk < 1:
                continue
            r = rythme(s, i)
            if ventes12(s, i) <= 0:
                if jl is None or jl > DORT_LIV_JOURS:
                    donneurs[i].append((s, stk, "dort : aucune vente en 12 mois"))
            elif r > 0:
                couv = stk / (r / 30)
                if couv >= SURSTOCK_JOURS:
                    surplus = math.floor(stk - r / 30 * GARDE_JOURS)
                    if surplus >= 1:
                        donneurs[i].append((s, surplus, "surstock : %d jours de couverture" % couv))

    def offre(i, s):
        return reserve(i) + sum(d[1] for d in donneurs[i] if d[0] != s)

    def quantite(vm, i, s, dispo):
        """Un mois de ventes estimées. Ce qui vient d'un autre magasin part à
        l'unité ; ce qui vient de l'entrepôt part au sous-colis, indivisible."""
        besoin = max(1, math.ceil(vm * COUV_JOURS / 30))
        if sum(d[1] for d in donneurs[i] if d[0] != s) >= besoin:
            return int(min(besoin, dispo))
        lot = arts[i]["lot"]
        return int(min(max(lot, math.ceil(besoin / lot) * lot), dispo))

    def valeur(i, qte, vm):
        o = arts[i]
        u = min(qte, vm * HORIZON_MOIS)
        return round(u * o["pv"]), round(u * o["mu"])

    def source(i, s, qte):
        """Ce qui dort ailleurs part d'abord ; l'entrepôt complète (E), puis la réception (R)."""
        out, reste = [], qte
        for d in sorted((d for d in donneurs[i] if d[0] != s), key=lambda d: -d[1]):
            if reste <= 0:
                break
            p = min(reste, d[1])
            out.append([d[0], p])
            reste -= p
        # l'entrepôt : d'abord le stock en rayon de réserve, puis la réception
        # (disponible sous deux à trois jours) ; jamais le flottant ni le commandé
        phys, rec_d = dispo_ent(i)
        if reste > 0 and phys > 0:
            p = min(reste, phys)
            out.append(["E", p])
            reste -= p
        if reste > 0 and rec_d > 0:
            out.append(["R", min(reste, rec_d)])
        return out

    lignes = {s: [] for s in MAGASINS}

    def pousse(s, sig, i, qte, vm, conf, **extra):
        ca3, mg3 = valeur(i, qte, vm)
        l = {"g": sig, "a": i, "q": qte, "vm": round(vm, 2), "cf": conf, "ca": ca3, "mg": mg3,
             "sc": round(mg3 * CONF_POIDS[conf])}
        if sig not in ("CED",):
            l["src"] = source(i, s, qte)
        l.update(extra)
        lignes[s].append(l)

    porteurs_de = {}
    for i, o in enumerate(arts):
        porteurs_de[i] = [s for s in MAGASINS if ventes12(s, i) > 0]

    # Rapprochement des substituts. Le type d'un produit, ce sont les mots de
    # son libellé qu'emploient au moins deux fournisseurs : une marque n'est
    # employée que par le sien, « GOURDE » ou « PARE SOLEIL » par plusieurs.
    # Un substitut doit avoir le même mot de tête que l'original (« SAC »,
    # « ETAGERE »). Quand les deux précisent leur usage par un second mot
    # (« SAC À DOS », « ETAGERE CHAUSSURES »), ce second mot doit se retrouver
    # chez l'autre. Hors de la sous-famille, il faut deux mots en commun.
    # Sinon on ne propose rien : une rupture sans équivalent sûr est signalée.
    fournisseurs_du_mot, freq = defaultdict(set), Counter()
    for r in base:
        for m in set(mots_libelle(r["libelle"])):
            fournisseurs_du_mot[m].add(r["libfou"].strip())
            freq[m] += 1
    def type_de(lib):
        return [m for m in mots_libelle(lib) if len(fournisseurs_du_mot[m]) >= 2]
    idf = lambda m: math.log(len(base) / (1 + freq[m]))
    types = [type_de(o["lib"]) for o in arts]
    par_fa = defaultdict(list)
    for i, o in enumerate(arts):
        if reserve(i) > 0:
            par_fa[o["fa"]].append(i)

    def substituts(i, s):
        o, ta = arts[i], types[i]
        if not ta:
            return []
        out = []
        for j in par_fa[o["fa"]]:
            tb = types[j]
            if j == i or stock(s, j) > 0 or not tb or ta[0] != tb[0]:
                continue
            if len(ta) > 1 and len(tb) > 1 and ta[1] not in tb and tb[1] not in ta:
                continue
            commun = set(ta) & set(tb)
            b = arts[j]
            if b["sf"] != o["sf"] and len(commun) < 2:
                continue
            if not (PRIX_SUB[0] * o["pv"] <= b["pv"] <= PRIX_SUB[1] * o["pv"]):
                continue
            sim = sum(idf(m) for m in commun) / sum(idf(m) for m in set(ta) | set(tb))
            sc = sim * 2 + (1 - abs(b["pv"] / o["pv"] - 1)) + (0.3 if b["four"] == o["four"] else 0)
            out.append((sc, sim, j, sorted(commun, key=lambda m: -idf(m))))
        out.sort(reverse=True)
        return out[:3]

    for i, o in enumerate(arts):
        P = porteurs_de[i]
        res = reserve(i)
        vivant = any(sum(q[(p, i)][6:]) > 0 for p in P)  # vendu ailleurs ces six derniers mois
        for s in MAGASINS:
            if stock(s, i) > 0:
                continue
            dispo = offre(i, s)
            v12 = ventes12(s, i)
            if v12 > 0:
                vm = rythme(s, i)
                v = q[(s, i)]
                der = max(k for k in range(12) if v[k] > 0)
                sai, part = saison(i)
                noel = sai is not None
                if dispo > 0:
                    sig = "RUP" if recent(s, i) else "DEJ"
                    conf = "forte" if sig == "RUP" else ("moyenne" if not noel else "forte")
                    pousse(s, sig, i, quantite(vm, i, s, dispo), vm, conf,
                           v12=v12, der=der, m=v, sai=sai, pnd=part)
                elif recent(s, i):
                    # rupture partout : un produit du même type en réserve, ou rien
                    cands = substituts(i, s)
                    for rang, (sc, sim, j, commun) in enumerate(cands):
                        vmj = vm * REPORT_SUB
                        pousse(s, "SUB", j, quantite(vmj, j, s, offre(j, s)), vmj,
                               "moyenne" if sim >= 0.5 else "faible",
                               orig=i, v12=v12, m=v, sim=round(sim, 2), rang=rang + 1,
                               typ=commun[:3], attendu=o["cde"] + o["flo"])
                    if not cands:
                        # vente perdue sans équivalent sûr : on la signale, sans rien forcer
                        pousse(s, "RRS", i, 0, vm, "faible", v12=v12, der=der, m=v,
                               attendu=o["cde"] + o["flo"])
                continue
            # jamais vendu ici, pas en stock
            if not P or dispo <= 0 or not vivant:
                continue
            norm = [rythme(p, i) / poids[p] for p in P if p != s]
            if not norm:
                continue
            vm = statistics.median(norm) * poids[s] * PRUDENCE_ABS
            n = len(P)
            conf = "forte" if n >= 4 else ("moyenne" if n >= 2 else "faible")
            sig = "NOU" if nouveau(i) else "ABS"
            pousse(s, sig, i, quantite(vm, i, s, dispo), vm, conf,
                   por={p: ventes12(p, i) for p in P})

    # nouveautés dormantes : en réserve, jamais vendues, nulle part en magasin
    rythme_sf = defaultdict(list)  # sous-famille -> [(pv, rythme normalisé)]
    for (s, i), v in q.items():
        r = rythme(s, i)
        if r > 0:
            rythme_sf[arts[i]["sf"]].append((arts[i]["pv"], r / poids[s]))
    for i, o in enumerate(arts):
        if porteurs_de[i] or any(stock(s, i) > 0 for s in MAGASINS) or reserve(i) <= 0:
            continue
        if n1[o["c"]] > 0:
            continue
        age = (fin - o["dEntr"]).days if o["dEntr"] else None
        if age is None or age > NVD_RECEP_JOURS:
            continue
        ref = [r for p, r in rythme_sf[o["sf"]] if 0.7 * o["pv"] <= p <= 1.3 * o["pv"]] \
            or [r for p, r in rythme_sf[o["sf"]]]
        base_vm = statistics.median(ref) if ref else 0.5
        for s in MAGASINS:
            vm = base_vm * poids[s] * PRUDENCE_ABS
            pousse(s, "NVD", i, int(min(o["lot"], reserve(i))), vm, "faible", age=age, nref=len(ref))

    # Une référence ne figure qu'une fois par magasin, sous son signal le plus
    # sûr : sinon elle se commanderait deux fois. Ce qu'elle remplace la suit.
    PRIO = {"RUP": 0, "DEJ": 1, "SUB": 2, "NOU": 3, "ABS": 4, "NVD": 5, "RRS": 6}
    for s in MAGASINS:
        garde = {}
        for l in sorted(lignes[s], key=lambda l: (PRIO[l["g"]], -l["sc"])):
            k = garde.get(l["a"])
            if k is None:
                garde[l["a"]] = l
                if l["g"] == "SUB":
                    l["pour"] = [l["orig"]]
            elif l["g"] == "SUB":
                k.setdefault("pour", [])
                if l["orig"] not in k["pour"]:
                    k["pour"].append(l["orig"])
        lignes[s] = list(garde.values())

    # Ce qui est déjà en préparation pour le magasin ne se redemande pas : la
    # ligne passe « en préparation » si la préparation couvre le besoin, sinon
    # elle ne propose que le complément.
    for s in MAGASINS:
        for l in lignes[s]:
            if l["g"] in ("CED", "RRS"):
                continue
            p = prep.get((s, l["a"]), 0)
            if not p:
                continue
            i = l["a"]
            l["prep"] = int(p)
            if (s, i) in prep_liv:
                l["prepLiv"] = prep_liv[(s, i)].isoformat()
            reste = l["q"] - p
            if reste <= 0:
                l.update(q=0, ca=0, mg=0, sc=0, src=[], couv=1)
                continue
            lot = arts[i]["lot"]
            q2 = int(min(math.ceil(reste / lot) * lot, offre(i, s)))
            u = min(q2, max(0, l["vm"] * HORIZON_MOIS - p))
            l.update(q=q2, ca=round(u * arts[i]["pv"]), mg=round(u * arts[i]["mu"]), src=source(i, s, q2))
            l["sc"] = round(l["mg"] * CONF_POIDS[l["cf"]])

    # à céder : le stock qui dort, quand quelqu'un en a besoin
    besoin = defaultdict(list)
    for s, L in lignes.items():
        for l in L:
            for site, qte in l.get("src", []):
                if site != "E":
                    besoin[(site, l["a"])].append([s, qte, l["g"]])
    for (s, i), dem in besoin.items():
        d = next((d for d in donneurs[i] if d[0] == s), None)
        if not d:
            continue
        qte = min(d[1], sum(x[1] for x in dem))
        vm_rec = sum(next((l["vm"] for l in lignes[x[0]] if l["a"] == i), 0) for x in dem)
        pousse(s, "CED", i, qte, vm_rec, "forte", motif=d[2], vers=dem)

    # --- rayons absents : département, famille, sous-famille ---
    rayons = {s: [] for s in MAGASINS}
    niveaux = [("de", depts), ("fa", fams), ("sf", sfams)]
    for s in MAGASINS:
        deja = set()
        for cle, libs in niveaux:
            vend, ici, res = defaultdict(set), Counter(), Counter()
            for i, o in enumerate(arts):
                u = o[cle]
                for p in porteurs_de[i]:
                    if p != s:
                        vend[u].add(p)
                if ventes12(s, i) > 0 or stock(s, i) > 0:
                    ici[u] += 1
                if reserve(i) > 0:
                    res[u] += 1
            for u, ps in vend.items():
                parent = u[:2] if cle != "de" else None
                if cle == "sf":
                    parent = sfam_fam.get(u)
                if parent in deja or (cle == "sf" and parent and parent[:2] in deja):
                    continue
                if not u[:2].isdigit():
                    continue  # code de rangement hors hiérarchie
                if len(ps) >= RAYON_MIN_PORTEURS and ici[u] == 0 and res[u] > 0:
                    nb = sum(1 for l in lignes[s] if l["g"] in ("ABS", "NOU") and arts[l["a"]][cle] == u)
                    if nb:
                        deja.add(u)
                        rayons[s].append({"niv": cle, "c": u, "lib": libs.get(u, u), "por": len(ps), "n": nb})

    # --- sortie compacte : seules les références proposées ---
    # Le stock d'entrepôt sert aussi à chercher un substitut avec Claude depuis
    # la page, pour les ruptures sans équivalent évident.
    vivier = [i for i, o in enumerate(arts) if reserve(i) > 0]
    utiles = sorted({l["a"] for L in lignes.values() for l in L} |
                    {x for L in lignes.values() for l in L for x in l.get("pour", [])} | set(vivier))
    ren = {i: k for k, i in enumerate(utiles)}
    out_arts = []
    for i in utiles:
        o = arts[i]
        out_arts.append([
            o["c"], o["lib"], o["sf"], o["four"], round(o["pr"]), round(o["pv"]), o["lot"],
            o["tgc"], o["dims"], [o["st"][p] for p in POSITIONS], o["cde"], o["flo"], o["rec"],
            (fin - o["dEntr"]).days if o["dEntr"] else None,
            (fin - o["dLiv"]).days if o["dLiv"] else None,
            [ventes12(s, i) for s in MAGASINS], [o["capa"].get(s, 0) for s in MAGASINS],
            int(prep_tot[i]),
        ])
    for s, L in lignes.items():
        for l in L:
            l["a"] = ren[l["a"]]
            if "orig" in l:
                l["orig"] = ren[l["orig"]]
            if "pour" in l:
                l["pour"] = [ren[x] for x in l["pour"]]
        L.sort(key=lambda l: -l["sc"])

    noms = {}
    for x in analyse:
        noms[E.code(x["site"])] = E.libelle(x["site"])
    data = {
        "meta": {
            "fin": fin.isoformat(), "periode": per, "mois": noms_mois,
            "fichiers": {"base": a.base.rsplit("/", 1)[-1], "analyse": a.analyse.rsplit("/", 1)[-1],
                         "glissant": a.glissant.rsplit("/", 1)[-1]},
            "rejets": rejets,
            "prepa": {"fichier": a.prepa.rsplit("/", 1)[-1], "lignes": nb_prep} if a.prepa else None,
            "params": {"couv": COUV_JOURS, "horizon": HORIZON_MOIS, "recent": RECENT_MOIS,
                       "prudence": PRUDENCE_ABS, "report": REPORT_SUB, "dort": DORT_LIV_JOURS,
                       "surstock": SURSTOCK_JOURS, "garde": GARDE_JOURS, "nvd": NVD_RECEP_JOURS,
                       "prix_sub": PRIX_SUB, "rayon_min": RAYON_MIN_PORTEURS},
        },
        "sites": {p: noms.get(p, p) for p in POSITIONS},
        "magasins": MAGASINS,
        "poids": {s: round(poids[s], 2) for s in MAGASINS},
        "depts": depts, "fams": fams, "sfams": sfams,
        "sf2fa": {sf: fa for sf, fa in sfam_fam.items() if sf in sfams},
        "arts": out_arts,
        "lignes": lignes,
        "rayons": rayons,
        "vivier": [ren[i] for i in vivier],
    }
    with open(a.out, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, separators=(",", ":"))

    print("Fin des données :", fin, "| poids :", data["poids"])
    print("Lignes rejetées à la lecture :", rejets)
    for s in MAGASINS:
        c = Counter(l["g"] for l in lignes[s])
        mg = sum(l["mg"] for l in lignes[s] if l["g"] != "CED")
        print(" ", noms.get(s, s), dict(c), "marge 3 mois estimée %.1f M F" % (mg / 1e6),
              "| rayons absents", len(rayons[s]))
    print("Références proposées :", len(utiles))


if __name__ == "__main__":
    sys.exit(main())
