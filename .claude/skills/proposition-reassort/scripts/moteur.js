/* Moteur du « Réassort proposé » : des exports de gestion aux propositions.
 *
 * Même calcul que build_data.py, en JavaScript, pour que la page recalcule
 * elle-même quand on y dépose de nouveaux exports. Tourne dans le navigateur
 * (window.Reassort) et sous Node (module.exports), ce qui permet de vérifier
 * qu'il donne les mêmes propositions que la version Python.
 *
 * Entrées : les textes des exports (déjà décodés), et les lignes de l'écart de
 * préparation (objets {site, article, qte_demande, livr_demande}).
 * Sortie : l'objet data.json que lit la page.
 */
(function (racine) {
  "use strict";

  var P = {
    COUV_JOURS: 15, SEUIL_BAS: 7, PLAF_BAS: 30, HORIZON_MOIS: 3, RECENT_MOIS: 3,
    PRUDENCE_ABS: 0.5, REPORT_SUB: 0.5, DORT_LIV_JOURS: 90, SURSTOCK_JOURS: 180,
    GARDE_JOURS: 60, NVD_RECEP_JOURS: 180, PRIX_SUB: [0.75, 1.33], RAYON_MIN_PORTEURS: 3
  };
  var TGC = [0, 0.03, 0.06, 0.11, 0.22];
  var DEPTS_EXCLUS = { "50": 1, "99": 1 };
  var POSITIONS = ["0", "1", "2", "3", "5", "6", "7", "8"];
  var MAGASINS = ["1", "2", "3", "5", "6", "7"];
  var RESERVES = ["0", "8"];
  var CONF_POIDS = { forte: 1.0, moyenne: 0.7, faible: 0.4 };
  var MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

  /* ---------- lecture des CSV ---------- */

  /* Même automate que le module csv de Python (mode non strict) : un guillemet
     qui ferme une citation sans être suivi d'une virgule n'arrête pas le
     champ, et les retours à la ligne cités restent dans le champ. */
  function lignesCSV(txt, auPassage) {
    var champ = "", ligne = [], dansCite = false, apresCite = false, n = txt.length, c, i = 0;
    var debut = true;
    function finLigne() {
      ligne.push(champ); champ = ""; apresCite = false; debut = true;
      if (!(ligne.length === 1 && ligne[0] === "")) auPassage(ligne);
      ligne = [];
    }
    for (; i < n; i++) {
      c = txt.charCodeAt(i);
      if (dansCite) {
        if (c === 34) {
          if (txt.charCodeAt(i + 1) === 34) { champ += '"'; i++; }
          else { dansCite = false; apresCite = true; }
        } else champ += txt[i];
        continue;
      }
      if (c === 44) { ligne.push(champ); champ = ""; apresCite = false; debut = true; continue; }
      if (c === 13) { if (txt.charCodeAt(i + 1) === 10) i++; finLigne(); continue; }
      if (c === 10) { finLigne(); continue; }
      if (c === 34 && debut) { dansCite = true; debut = false; continue; }
      debut = false;
      champ += txt[i];
    }
    if (champ !== "" || ligne.length) finLigne();
  }

  function enTetes(txt) {
    var fin = txt.search(/\r?\n/);
    return (fin < 0 ? txt : txt.slice(0, fin)).replace(/^﻿/, "").split(",").map(function (s) { return s.trim(); });
  }

  function lireDict(txt) {
    var tete = null, out = [];
    lignesCSV(txt.replace(/^﻿/, ""), function (ch) {
      if (!tete) { tete = ch.map(function (s) { return s.trim(); }); return; }
      var o = {};
      for (var k = 0; k < tete.length; k++) o[tete[k]] = ch[k] === undefined ? null : ch[k];
      out.push(o);
    });
    return out;
  }

  var SUIVI_NUM = [["ca_n1", 0], ["ca_n", 0], ["ca_var", 2], ["qte_n1", 2], ["qte_n", 2], ["qte_var", 2],
    ["pv_moy_n1", 0], ["pv_moy_n", 0], ["pv_moy_var", 2], ["nb_fact_n1", 0], ["nb_fact_n", 0],
    ["nb_fact_var", 2], ["caddie_n1", 0], ["caddie_n", 0], ["caddie_var", 2], ["marge_n1", 0],
    ["marge_n", 0], ["marge_var", 2], ["p_marge_n1", 2], ["p_marge_n", 2], ["stock_fin_n1", 2],
    ["stock_fin_n", 2], ["val_stock_fin_n1", 0], ["val_stock_fin_n", 0]];
  var SUIVI_TXT = ["periode", "site", "dept", "famille", "sfamille", "fournis", "article"];
  var ANALYSE_NUM = [["total", 0], ["quantite", 0], ["stock_s", 0], ["commande", 0],
    ["qte1", 0], ["qte2", 0], ["qte3", 0], ["qte4", 0], ["qte5", 0], ["qte6", 0], ["qte7", 0],
    ["qte8", 0], ["qte9", 0], ["qte12", 0], ["qte11", 0], ["qte10", 0],
    ["prixachat", 3], ["prixpond", 2], ["prixvente", 3], ["nbper", 0], ["quantite1", 0],
    ["total1", 0], ["nb_fact", 4], ["nb_fact1", 4], ["marge_pmp", 0], ["marge_pmp1", 0],
    ["stock_s1", 0], ["p_qte", 4], ["p_stock", 4], ["p_ca", 4], ["m_vente", 4], ["qtemoys", 2]];
  var ANALYSE_TXT = ["article", "dept", "famille", "sfamille", "fournis", "site", "periode"];

  /* Les décimales sont écrites avec une virgule dans un fichier séparé par des
     virgules : « 64,00 » occupe deux champs. On relit chaque colonne selon son
     schéma ; « ***** » (dépassement) occupe un seul champ et vaut null. */
  function nombres(tok, schema) {
    var out = {}, i = 0;
    for (var k = 0; k < schema.length; k++) {
      var nom = schema[k][0], dec = schema[k][1];
      if (i >= tok.length) return null;
      var t = tok[i].trim();
      if (t.charAt(0) === "*") { out[nom] = null; i++; continue; }
      if (!/^-?\d+$/.test(t)) return null;
      if (dec === 0) { out[nom] = parseInt(t, 10); i++; }
      else {
        var f = i + 1 < tok.length ? tok[i + 1].trim() : "";
        if (f.length !== dec || !/^\d+$/.test(f)) return null;
        var v = Math.abs(parseInt(t, 10)) + parseInt(f, 10) / Math.pow(10, dec);
        out[nom] = t.charAt(0) === "-" ? -v : v;
        i += 2;
      }
    }
    return i === tok.length ? out : null;
  }

  function lireVirgule(txt, TXT, NUM) {
    var out = [], rejets = 0, premiere = true;
    lignesCSV(txt.replace(/^﻿/, ""), function (ch) {
      if (premiere) { premiere = false; return; }
      /* Un libellé qui contient un guillemet casse la citation : la colonne
         suivante se retrouve collée derrière « ", ». */
      var tete = ch.slice(0, TXT.length);
      if (tete.some(function (c) { return c.indexOf('",') >= 0; })) {
        var t2 = [];
        tete.forEach(function (c) { c.split('",').forEach(function (x) { t2.push(x.replace(/^"+|"+$/g, "")); }); });
        ch = t2.concat(ch.slice(TXT.length));
      }
      var d = nombres(ch.slice(TXT.length), NUM);
      if (!d) { rejets++; return; }
      for (var k = 0; k < TXT.length; k++) d[TXT[k]] = ch[k];
      out.push(d);
    });
    return { lignes: out, rejets: rejets };
  }

  function lireSuivi(txt) { return lireVirgule(txt, SUIVI_TXT, SUIVI_NUM); }
  function lireAnalyse(txt) { return lireVirgule(txt, ANALYSE_TXT, ANALYSE_NUM); }

  function code(ch) { ch = ch || ""; var p = ch.indexOf("."); return (p < 0 ? ch : ch.slice(0, p)).trim(); }
  function libelle(ch) { ch = ch || ""; var p = ch.indexOf("."); return (p < 0 ? ch : ch.slice(p + 1)).trim(); }

  /* ---------- petits outils ---------- */

  function num(s) {
    if (s === null || s === undefined) return 0;
    var t = String(s).replace(/,/g, ".").trim();
    if (t === "") return 0;
    var v = Number(t);
    return isNaN(v) ? 0 : v;
  }
  function jour(y, m, d) { return Math.round(Date.UTC(y, m - 1, d) / 864e5); }
  function iso(j) { return new Date(j * 864e5).toISOString().slice(0, 10); }
  function dateFr(s) {
    var m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/.exec(s || "");
    if (!m) return null;
    var d = +m[1], mo = +m[2], y = +m[3];
    var t = new Date(Date.UTC(y, mo - 1, d));
    if (t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d) return null;
    return jour(y, mo, d);
  }
  /* jj/mm/aaaa ou mm/jj/aaaa selon le logiciel qui a converti : on garde la
     lecture la plus proche de la date des données. */
  function dateSouple(v, ref) {
    if (v instanceof Date && !isNaN(v)) return jour(v.getFullYear(), v.getMonth() + 1, v.getDate());
    if (typeof v === "number" && v > 20000 && v < 80000) return Math.round(v) - 25569;  // série Excel
    var m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(String(v || ""));
    if (!m) return null;
    var a = +m[1], b = +m[2], y = +m[3], cands = [];
    [[a, b], [b, a]].forEach(function (p) {
      var t = new Date(Date.UTC(y, p[1] - 1, p[0]));
      if (t.getUTCMonth() === p[1] - 1 && t.getUTCDate() === p[0]) cands.push(jour(y, p[1], p[0]));
    });
    if (!cands.length) return null;
    return cands.reduce(function (x, z) { return Math.abs(z - ref) < Math.abs(x - ref) ? z : x; });
  }
  /* round() de Python : demi au pair. */
  function rnd(x) {
    var f = Math.floor(x), d = x - f;
    if (Math.abs(d - 0.5) < 1e-9) return f % 2 === 0 ? f : f + 1;
    return Math.round(x);
  }
  function rnd2(x, n) { var k = Math.pow(10, n); return Math.round(x * k) / k; }
  function somme(a, i, j) { var t = 0; for (var k = i || 0, e = j === undefined ? a.length : j; k < e; k++) t += a[k]; return t; }
  function mediane(a) {
    var b = a.slice().sort(function (x, y) { return x - y; }), n = b.length, h = n >> 1;
    return n % 2 ? b[h] : (b[h - 1] + b[h]) / 2;
  }
  function procheTgc(x) {
    var best = TGC[0];
    TGC.forEach(function (v) { if (Math.abs(v - x) < Math.abs(best - x)) best = v; });
    return best;
  }

  var ATTRIBUTS = {};
  ("NOIR NOIRE BLANC BLANCHE ROUGE BLEU BLEUE VERT VERTE JAUNE ROSE GRIS GRISE BEIGE MARRON NATUREL NATURELLE " +
   "OCRE CREME TAUPE ARGENT ARGENTE DORE DOREE ORANGE VIOLET TURQUOISE ANTHRACITE IVOIRE CHOCOLAT KAKI CORAIL " +
   "MULTICO MULTICOLORE COULEUR CLR ASS ASSORTI ASSORTIE INOX BOIS BAMBOU VERRE PLASTIQUE METAL ALU ALUMINIUM " +
   "COTON POLYESTER RESINE CERAMIQUE PORCELAINE GRES FAIENCE ACIER FER SILICONE PVC LIN VELOURS UNI RAYE RECT " +
   "RECTANGULAIRE ROND RONDE CARRE CARREE OVALE LONG LONGUE GRAND GRANDE PETIT PETITE MOYEN MOYENNE MINI MAXI " +
   "LOT SET KIT PACK BOX DUO TRIO DES LES AVEC POUR SUR SANS UNE AUX PAR NEW NOUVEAU NOUVELLE LUXE DECO DECOR " +
   "MODELE STYLE COLLECTION CMS LITRE PIECE PCS PCE PERSONNE PERS " +
   "BLC NAT NR BLK WHT MULTICOL ASSORT COLORI DESIGN MOTIF IMPRIME").split(/\s+/).forEach(function (m) { ATTRIBUTS[m] = 1; });
  function racineMot(m) { return m.length > 4 && (m.slice(-1) === "S" || m.slice(-1) === "X") ? m.slice(0, -1) : m; }
  function motsLibelle(lib) {
    var t = (lib || "").toUpperCase().normalize("NFKD").replace(/[^\x00-\x7F]/g, "");
    var out = [], re = /[A-Z]{3,}/g, m;
    while ((m = re.exec(t))) { var r = racineMot(m[0]); if (!ATTRIBUTS[m[0]] && !ATTRIBUTS[r]) out.push(r); }
    return out;
  }

  /* ---------- le calcul ---------- */

  function construire(E) {
    var base = lireDict(E.base);
    var an = lireAnalyse(E.analyse), analyse = an.lignes;
    var gl = lireSuivi(E.glissant), gliss = gl.lignes;
    var rejets = { analyse: an.rejets, glissant: gl.rejets };
    var exo = null;
    if (E.exercice) { var ex = lireSuivi(E.exercice); exo = ex.lignes; rejets.exercice = ex.rejets; }
    if (!analyse.length) throw new Error("l’analyse stock/vente ne contient aucune ligne lisible");
    if (!base.length || !("site0" in base[0])) throw new Error("la base article n’a pas les colonnes attendues (site0…site7)");

    // dates
    var per = analyse[0].periode, finTxt = (per.split(" au ")[1] || "").trim();
    var fin = dateFr(finTxt);
    if (fin === null) throw new Error("période de l’analyse illisible : « " + per + " »");
    var fd = new Date(fin * 864e5), fM = fd.getUTCMonth() + 1, fJ = fd.getUTCDate(), fY = fd.getUTCFullYear();
    var joursMois = new Date(Date.UTC(fY, fM, 0)).getUTCDate();
    var poidsMois = []; for (var k = 0; k < 11; k++) poidsMois.push(1); poidsMois.push(fJ / joursMois);
    var nomsMois = [];
    for (k = 0; k < 12; k++) nomsMois.push(MOIS[(((fM - 11 + k - 1) % 12) + 12) % 12]);
    var moisNoel = []; for (k = 0; k < 12; k++) if (nomsMois[k] === "nov." || nomsMois[k] === "déc.") moisNoel.push(k);

    // hiérarchie
    var depts = {}, fams = {}, sfams = {}, sf2fa = {};
    analyse.forEach(function (x) { depts[code(x.dept)] = libelle(x.dept); fams[code(x.famille)] = libelle(x.famille); sfams[code(x.sfamille)] = libelle(x.sfamille); });
    base.forEach(function (r) {
      if (!(r.famille in fams)) fams[r.famille] = (r.libfam || "").trim();
      if (!(r.sfamille in sfams)) sfams[r.sfamille] = (r.libsfam || "").trim();
    });
    gliss.forEach(function (x) { var c = code(x.dept); if (!(c in depts)) depts[c] = libelle(x.dept); });
    base.forEach(function (r) { sf2fa[r.sfamille] = r.famille; });

    // articles
    var arts = [], idx = {};
    base.forEach(function (r) {
      var c = (r.code || "").trim();
      if (!/^\d+$/.test(c)) return;
      var pr = num(r.prix_revient), pv = num(r.prix_vente), dep = (r.famille || "").slice(0, 2);
      if (pr <= 0 || pv <= 0 || DEPTS_EXCLUS[dep]) return;
      var st = {}, capa = {};
      for (var i = 0; i < 8; i++) st[POSITIONS[i]] = Math.trunc(num(r["site" + i]));
      for (i = 1; i < 8; i++) capa[POSITIONS[i]] = Math.trunc(num(r["capa" + i]));
      var spcb = Math.trunc(num(r.spcb)), pcb = Math.trunc(num(r.pcb));
      idx[c] = arts.length;
      arts.push({ c: c, lib: (r.libelle || "").trim(), sf: r.sfamille, fa: r.famille, de: dep, four: (r.libfou || "").trim(),
        pr: pr, pv: pv, lot: spcb > 0 ? spcb : (pcb > 0 ? pcb : 1), st: st, capa: capa,
        cde: Math.trunc(num(r.en_cde)), flo: Math.trunc(num(r.en_flottant)), rec: Math.trunc(num(r.en_recept)),
        dims: (r.dimensions || "").trim(), dEntr: dateFr(r.date_entr), dLiv: dateFr(r.date_livr) });
    });
    var N = arts.length;

    // ventes 12 mois
    var q = {}; MAGASINS.forEach(function (s) { q[s] = new Map(); });
    var paires = [];  // ordre d'insertion, comme le dict Python
    analyse.forEach(function (x) {
      var s = code(x.site), c = code(x.article);
      if (q[s] && c in idx) {
        var i = idx[c], v = [];
        for (var m = 1; m <= 12; m++) v.push(x["qte" + m] || 0);
        if (!q[s].has(i)) paires.push([s, i]);
        q[s].set(i, v);
      }
    });

    // TGC et marge unitaire, lus dans les ventes
    var caTtc = {}, caHt = {}, n1 = {};
    [gliss, exo || []].forEach(function (src, si) {
      src.forEach(function (x) {
        var c = x.article;
        if (si === 0) n1[c] = (n1[c] || 0) + (x.qte_n1 || 0);
        if ((x.ca_n || 0) > 0 && (x.p_marge_n || 0) > 0 && (x.marge_n || 0) > 0) {
          caTtc[c] = (caTtc[c] || 0) + x.ca_n;
          caHt[c] = (caHt[c] || 0) + x.marge_n / (x.p_marge_n / 100);
        }
      });
    });
    var tgcSf = {}, tgcArt = {};
    Object.keys(caHt).forEach(function (c) {
      var ht = caHt[c];
      if (ht > 0 && c in idx) {
        var t = procheTgc(caTtc[c] / ht - 1);
        tgcArt[c] = t;
        var sf = arts[idx[c]].sf, m = tgcSf[sf] || (tgcSf[sf] = new Map());
        m.set(t, (m.get(t) || 0) + 1);
      }
    });
    arts.forEach(function (o) {
      var t = tgcArt[o.c];
      if (t === undefined) {
        var m = tgcSf[o.sf];
        if (m) { var best = null, nb = -1; m.forEach(function (v, key) { if (v > nb) { nb = v; best = key; } }); t = best; }
        else t = 0.22;
      }
      o.tgc = t; o.mu = o.pv / (1 + t) - o.pr;
    });

    // poids des magasins
    var caMag = {}; MAGASINS.forEach(function (s) { caMag[s] = 0; });
    paires.forEach(function (p) { caMag[p[0]] += somme(q[p[0]].get(p[1])) * arts[p[1]].pv; });
    var moy = somme(MAGASINS.map(function (s) { return caMag[s]; })) / MAGASINS.length;
    var poids = {}; MAGASINS.forEach(function (s) { poids[s] = moy ? caMag[s] / moy : 1; });

    function vq(s, i) { return q[s].get(i); }
    function rythme(s, i) {
      var v = vq(s, i);
      if (!v || somme(v) <= 0) return 0;
      var f = 0; while (v[f] <= 0) f++;
      var l = 11; while (v[l] <= 0) l--;
      var finF = arts[i].st[s] > 0 ? 11 : l;
      var duree = Math.max(2, somme(poidsMois, f, finF + 1));
      return somme(v, f, finF + 1) / duree;
    }
    function ventes12(s, i) { var v = vq(s, i); return v ? somme(v) : 0; }
    function recent(s, i) { var v = vq(s, i); return v ? somme(v, 12 - P.RECENT_MOIS) > 0 : false; }
    function stock(s, i) { return arts[i].st[s]; }

    var vendTot = new Map();
    paires.forEach(function (p) {
      var t = vendTot.get(p[1]); if (!t) { t = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; vendTot.set(p[1], t); }
      var v = q[p[0]].get(p[1]); for (var k = 0; k < 12; k++) t[k] += v[k];
    });
    var ZERO = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    function vt(i) { return vendTot.get(i) || ZERO; }
    var sfMois = {};
    vendTot.forEach(function (t, i) {
      var m = sfMois[arts[i].sf] || (sfMois[arts[i].sf] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      for (var k = 0; k < 12; k++) m[k] += t[k];
    });
    function sm(sf) { return sfMois[sf] || ZERO; }
    function saison(i) {
      var o = arts[i], t = vt(i), sf = sm(o.sf), st = somme(t);
      var nd = 0; moisNoel.forEach(function (k) { nd += t[k]; });
      var part = st ? rnd(100 * nd / st) : 0;
      if (o.de === "08" || libelle(fams[o.fa] || "").toUpperCase().replace(/Ë/g, "E").indexOf("NOEL") >= 0) return ["noel", part];
      if (st >= 30 && part >= 60) return ["fin", part];
      var ss = somme(sf), sn = 0; moisNoel.forEach(function (k) { sn += sf[k]; });
      if (ss >= 100 && sn >= 0.5 * ss && part >= 50) return ["fin", part];
      return [null, part];
    }
    function nouveau(i) { return (n1[arts[i].c] || 0) <= 0 && somme(vt(i), 0, 6) <= 0; }

    // préparations en cours
    var prep = {}, prepLiv = {}, prepTot = {}, nbPrep = 0;
    (E.prepa || []).forEach(function (x) {
      var s = code(String(x.site || "")), c = String(x.article === undefined || x.article === null ? "" : x.article).trim();
      if (MAGASINS.indexOf(s) < 0 || !(c in idx)) return;
      var qd = num(x.qte_demande);
      if (qd <= 0) return;
      var i = idx[c], cle = s + "|" + i;
      prep[cle] = (prep[cle] || 0) + qd;
      prepTot[i] = (prepTot[i] || 0) + qd;
      nbPrep++;
      var d = dateSouple(x.livr_demande, fin);
      if (d !== null && (!(cle in prepLiv) || d < prepLiv[cle])) prepLiv[cle] = d;
    });
    function pr_(s, i) { return prep[s + "|" + i] || 0; }

    function dispoEnt(i) {
      var o = arts[i], phys = 0;
      RESERVES.forEach(function (r) { phys += Math.max(0, o.st[r]); });
      var res = prepTot[i] || 0;
      return [Math.max(0, phys - res), Math.max(0, Math.max(0, o.rec) - Math.max(0, res - phys))];
    }
    function reserve(i) { var d = dispoEnt(i); return d[0] + d[1]; }

    var donneurs = {};
    for (var i = 0; i < N; i++) {
      var o = arts[i], jl = o.dLiv !== null ? fin - o.dLiv : null;
      MAGASINS.forEach(function (s) {
        var stk = stock(s, i);
        if (stk < 1) return;
        var r = rythme(s, i);
        if (ventes12(s, i) <= 0) {
          if (jl === null || jl > P.DORT_LIV_JOURS) (donneurs[i] || (donneurs[i] = [])).push([s, stk, "dort : aucune vente en 12 mois"]);
        } else if (r > 0) {
          var couv = stk / (r / 30);
          if (couv >= P.SURSTOCK_JOURS) {
            var surplus = Math.floor(stk - r / 30 * P.GARDE_JOURS);
            if (surplus >= 1) (donneurs[i] || (donneurs[i] = [])).push([s, surplus, "surstock : " + Math.trunc(couv) + " jours de couverture"]);
          }
        }
      });
    }
    function dons(i) { return donneurs[i] || []; }
    function donAilleurs(i, s) { var t = 0; dons(i).forEach(function (d) { if (d[0] !== s) t += d[1]; }); return t; }
    function offre(i, s) { return reserve(i) + donAilleurs(i, s); }
    function quantite(vm, i, s, dispo) {
      var besoin = Math.max(1, Math.ceil(vm * P.COUV_JOURS / 30));
      if (donAilleurs(i, s) >= besoin) return Math.trunc(Math.min(besoin, dispo));
      var lot = arts[i].lot;
      return Math.trunc(Math.min(Math.max(lot, Math.ceil(besoin / lot) * lot), dispo));
    }
    function valeur(i, qte, vm) {
      var o = arts[i], u = Math.min(qte, vm * P.HORIZON_MOIS);
      return [rnd(u * o.pv), rnd(u * o.mu)];
    }
    function source(i, s, qte) {
      var out = [], reste = qte;
      dons(i).filter(function (d) { return d[0] !== s; }).sort(function (a, b) { return b[1] - a[1]; }).forEach(function (d) {
        if (reste <= 0) return;
        var p = Math.min(reste, d[1]); out.push([d[0], p]); reste -= p;
      });
      var de = dispoEnt(i), phys = de[0], recD = de[1];
      if (reste > 0 && phys > 0) { var p = Math.min(reste, phys); out.push(["E", p]); reste -= p; }
      if (reste > 0 && recD > 0) out.push(["R", Math.min(reste, recD)]);
      return out;
    }

    var lignes = {}; MAGASINS.forEach(function (s) { lignes[s] = []; });
    function pousse(s, sig, i, qte, vm, conf, extra) {
      var v = valeur(i, qte, vm);
      var l = { g: sig, a: i, q: qte, vm: rnd2(vm, 2), cf: conf, ca: v[0], mg: v[1], sc: rnd(v[1] * CONF_POIDS[conf]) };
      if (sig !== "CED") l.src = source(i, s, qte);
      if (extra) for (var k in extra) l[k] = extra[k];
      lignes[s].push(l);
      return l;
    }

    var porteurs = [];
    for (i = 0; i < N; i++) porteurs.push(MAGASINS.filter(function (s) { return ventes12(s, i) > 0; }));

    // substituts : même type de produit, ou rien
    var fourDuMot = {}, freq = {};
    base.forEach(function (r) {
      var vus = {};
      motsLibelle(r.libelle).forEach(function (m) {
        if (vus[m]) return; vus[m] = 1;
        (fourDuMot[m] || (fourDuMot[m] = {}))[(r.libfou || "").trim()] = 1;
        freq[m] = (freq[m] || 0) + 1;
      });
    });
    function nbFour(m) { return fourDuMot[m] ? Object.keys(fourDuMot[m]).length : 0; }
    function idf(m) { return Math.log(base.length / (1 + (freq[m] || 0))); }
    var types = arts.map(function (o) { return motsLibelle(o.lib).filter(function (m) { return nbFour(m) >= 2; }); });
    var parFa = {};
    for (i = 0; i < N; i++) if (reserve(i) > 0) (parFa[arts[i].fa] || (parFa[arts[i].fa] = [])).push(i);
    function substituts(i, s) {
      var o = arts[i], ta = types[i];
      if (!ta.length) return [];
      var out = [];
      (parFa[o.fa] || []).forEach(function (j) {
        var tb = types[j];
        if (j === i || stock(s, j) > 0 || !tb.length || ta[0] !== tb[0]) return;
        if (ta.length > 1 && tb.length > 1 && tb.indexOf(ta[1]) < 0 && ta.indexOf(tb[1]) < 0) return;
        var setA = {}, setU = {}, commun = [];
        ta.forEach(function (m) { setA[m] = 1; setU[m] = 1; });
        tb.forEach(function (m) { setU[m] = 1; if (setA[m] && commun.indexOf(m) < 0) commun.push(m); });
        var b = arts[j];
        if (b.sf !== o.sf && commun.length < 2) return;
        if (!(P.PRIX_SUB[0] * o.pv <= b.pv && b.pv <= P.PRIX_SUB[1] * o.pv)) return;
        var num_ = 0, den = 0;
        commun.forEach(function (m) { num_ += idf(m); });
        Object.keys(setU).forEach(function (m) { den += idf(m); });
        var sim = num_ / den;
        var sc = sim * 2 + (1 - Math.abs(b.pv / o.pv - 1)) + (b.four === o.four ? 0.3 : 0);
        out.push({ sc: sc, sim: sim, j: j, commun: commun.slice().sort(function (x, y) { return idf(y) - idf(x); }) });
      });
      out.sort(function (x, y) { return (y.sc - x.sc) || (y.sim - x.sim) || (y.j - x.j); });
      return out.slice(0, 3);
    }

    for (i = 0; i < N; i++) {
      (function (i) {
        var o = arts[i], P_ = porteurs[i];
        var vivant = P_.some(function (p) { return somme(vq(p, i), 6) > 0; });
        MAGASINS.forEach(function (s) {
          if (stock(s, i) > 0) return;
          var dispo = offre(i, s), v12 = ventes12(s, i);
          if (v12 > 0) {
            var vm = rythme(s, i), v = vq(s, i), der = 11;
            while (v[der] <= 0) der--;
            var sp = saison(i), noel = sp[0] !== null;
            if (dispo > 0) {
              var sig = recent(s, i) ? "RUP" : "DEJ";
              var conf = sig === "RUP" ? "forte" : (noel ? "forte" : "moyenne");
              pousse(s, sig, i, quantite(vm, i, s, dispo), vm, conf, { v12: v12, der: der, m: v, sai: sp[0], pnd: sp[1] });
            } else if (recent(s, i)) {
              var cands = substituts(i, s);
              cands.forEach(function (c, rang) {
                var vmj = vm * P.REPORT_SUB;
                pousse(s, "SUB", c.j, quantite(vmj, c.j, s, offre(c.j, s)), vmj, c.sim >= 0.5 ? "moyenne" : "faible",
                  { orig: i, v12: v12, m: v, sim: rnd2(c.sim, 2), rang: rang + 1, typ: c.commun.slice(0, 3), attendu: o.cde + o.flo });
              });
              if (!cands.length) pousse(s, "RRS", i, 0, vm, "faible", { v12: v12, der: der, m: v, attendu: o.cde + o.flo });
            }
            return;
          }
          if (!P_.length || dispo <= 0 || !vivant) return;
          var norm = P_.filter(function (p) { return p !== s; }).map(function (p) { return rythme(p, i) / poids[p]; });
          if (!norm.length) return;
          var vm2 = mediane(norm) * poids[s] * P.PRUDENCE_ABS, n = P_.length;
          var conf2 = n >= 4 ? "forte" : (n >= 2 ? "moyenne" : "faible");
          var por = {}; P_.forEach(function (p) { por[p] = ventes12(p, i); });
          pousse(s, nouveau(i) ? "NOU" : "ABS", i, quantite(vm2, i, s, dispo), vm2, conf2, { por: por });
        });
      })(i);
    }

    // nouveautés dormantes
    var rythmeSf = {};
    paires.forEach(function (p) {
      var r = rythme(p[0], p[1]);
      if (r > 0) (rythmeSf[arts[p[1]].sf] || (rythmeSf[arts[p[1]].sf] = [])).push([arts[p[1]].pv, r / poids[p[0]]]);
    });
    for (i = 0; i < N; i++) {
      o = arts[i];
      if (porteurs[i].length || MAGASINS.some(function (s) { return stock(s, i) > 0; }) || reserve(i) <= 0) continue;
      if ((n1[o.c] || 0) > 0) continue;
      var age = o.dEntr !== null ? fin - o.dEntr : null;
      if (age === null || age > P.NVD_RECEP_JOURS) continue;
      var lst = rythmeSf[o.sf] || [];
      var ref = lst.filter(function (x) { return 0.7 * o.pv <= x[0] && x[0] <= 1.3 * o.pv; }).map(function (x) { return x[1]; });
      if (!ref.length) ref = lst.map(function (x) { return x[1]; });
      var baseVm = ref.length ? mediane(ref) : 0.5;
      for (var ks = 0; ks < MAGASINS.length; ks++) {
        var s = MAGASINS[ks];
        pousse(s, "NVD", i, Math.trunc(Math.min(o.lot, reserve(i))), baseVm * poids[s] * P.PRUDENCE_ABS, "faible", { age: age, nref: ref.length });
      }
    }

    // à réassortir
    var moisSuiv = (fM % 12) + 1, kSuiv = (moisSuiv - fM + 11) % 12, resteMois = joursMois - fJ;
    function indiceSaison(i) {
      var sf = sm(arts[i].sf), ss = somme(sf);
      if (ss < 50) return 1.0;
      var iS = Math.max(0.6, Math.min(2.5, sf[kSuiv] / (ss / 12)));
      var r = Math.min(P.COUV_JOURS, resteMois);
      return (r * 1.0 + (P.COUV_JOURS - r) * iS) / P.COUV_JOURS;
    }
    for (i = 0; i < N; i++) {
      (function (i) {
        var o = arts[i];
        MAGASINS.forEach(function (s) {
          var stk = stock(s, i), v = vq(s, i);
          if (stk <= 0 || !v || somme(v) <= 0) return;
          var r3 = somme(v, 12 - P.RECENT_MOIS) / somme(poidsMois, 12 - P.RECENT_MOIS);
          var iS = indiceSaison(i), vm = Math.max(rythme(s, i), r3) * iS, vj = vm / 30;
          if (vj <= 0) return;
          var p = pr_(s, i);
          if ((stk + p) / vj >= P.SEUIL_BAS) return;
          var cible = vj * P.COUV_JOURS, capa = o.capa[s] || 0;
          if (capa > 0) cible = Math.min(cible, capa);
          var besoin = cible - stk - p, dispo = offre(i, s);
          if (besoin <= 0 || dispo <= 0) return;
          var qte;
          if (donAilleurs(i, s) >= besoin) qte = Math.ceil(besoin);
          else {
            var lot = o.lot;
            qte = Math.ceil(besoin / lot) * lot;
            if (qte > lot && (stk + p + qte) / vj > P.PLAF_BAS) qte = Math.max(lot, Math.floor((P.PLAF_BAS * vj - stk - p) / lot) * lot);
          }
          qte = Math.trunc(Math.min(qte, dispo));
          if (qte < 1) return;
          var jr = stk / vj;
          var l = pousse(s, "BAS", i, qte, vm, "forte", { v12: somme(v), m: v, stk: stk, jr: rnd2(jr, 1), apres: rnd((stk + p + qte) / vj), sais: rnd2(iS, 2) });
          if (p) { l.prep = Math.trunc(p); if ((s + "|" + i) in prepLiv) l.prepLiv = iso(prepLiv[s + "|" + i]); }
          l.sc = rnd(l.sc * (1 + Math.max(0, P.SEUIL_BAS - jr) / P.SEUIL_BAS));
        });
      })(i);
    }

    // une référence une seule fois par magasin, sous son signal le plus sûr
    var PRIO = { BAS: 0, RUP: 0, DEJ: 1, SUB: 2, NOU: 3, ABS: 4, NVD: 5, RRS: 6 };
    MAGASINS.forEach(function (s) {
      var garde = new Map();
      lignes[s].slice().sort(function (x, y) { return (PRIO[x.g] - PRIO[y.g]) || (y.sc - x.sc); }).forEach(function (l) {
        var k = garde.get(l.a);
        if (!k) { garde.set(l.a, l); if (l.g === "SUB") l.pour = [l.orig]; }
        else if (l.g === "SUB") { if (!k.pour) k.pour = []; if (k.pour.indexOf(l.orig) < 0) k.pour.push(l.orig); }
      });
      lignes[s] = Array.from(garde.values());
    });

    // ce qui est déjà en préparation ne se redemande pas
    MAGASINS.forEach(function (s) {
      lignes[s].forEach(function (l) {
        if (l.g === "CED" || l.g === "RRS" || l.g === "BAS") return;
        var p = pr_(s, l.a);
        if (!p) return;
        var i = l.a;
        l.prep = Math.trunc(p);
        if ((s + "|" + i) in prepLiv) l.prepLiv = iso(prepLiv[s + "|" + i]);
        var reste = l.q - p;
        if (reste <= 0) { l.q = 0; l.ca = 0; l.mg = 0; l.sc = 0; l.src = []; l.couv = 1; return; }
        var lot = arts[i].lot, q2 = Math.trunc(Math.min(Math.ceil(reste / lot) * lot, offre(i, s)));
        var u = Math.min(q2, Math.max(0, l.vm * P.HORIZON_MOIS - p));
        l.q = q2; l.ca = rnd(u * arts[i].pv); l.mg = rnd(u * arts[i].mu); l.src = source(i, s, q2);
        l.sc = rnd(l.mg * CONF_POIDS[l.cf]);
      });
    });

    // à céder
    var besoinC = new Map();
    MAGASINS.forEach(function (s) {
      lignes[s].forEach(function (l) {
        (l.src || []).forEach(function (x) {
          if (x[0] === "E" || x[0] === "R") return;
          var k = x[0] + "|" + l.a;
          if (!besoinC.has(k)) besoinC.set(k, []);
          besoinC.get(k).push([s, x[1], l.g]);
        });
      });
    });
    besoinC.forEach(function (dem, k) {
      var s = k.split("|")[0], i = +k.split("|")[1];
      var d = dons(i).filter(function (d) { return d[0] === s; })[0];
      if (!d) return;
      var qte = Math.min(d[1], somme(dem.map(function (x) { return x[1]; })));
      var vmRec = 0;
      dem.forEach(function (x) { var l = lignes[x[0]].filter(function (l) { return l.a === i; })[0]; vmRec += l ? l.vm : 0; });
      pousse(s, "CED", i, qte, vmRec, "forte", { motif: d[2], vers: dem });
    });

    // rayons absents
    var rayons = {};
    var niveaux = [["de", depts], ["fa", fams], ["sf", sfams]];
    MAGASINS.forEach(function (s) {
      rayons[s] = [];
      var deja = {};
      niveaux.forEach(function (nv) {
        var cle = nv[0], libs = nv[1], vend = new Map(), ici = {}, res = {};
        for (var i = 0; i < N; i++) {
          var u = arts[i][cle];
          porteurs[i].forEach(function (p) { if (p !== s) { if (!vend.has(u)) vend.set(u, {}); vend.get(u)[p] = 1; } });
          if (ventes12(s, i) > 0 || stock(s, i) > 0) ici[u] = (ici[u] || 0) + 1;
          if (reserve(i) > 0) res[u] = (res[u] || 0) + 1;
        }
        vend.forEach(function (ps, u) {
          var parent = cle !== "de" ? u.slice(0, 2) : null;
          if (cle === "sf") parent = sf2fa[u];
          if ((parent !== null && parent !== undefined && deja[parent]) || (cle === "sf" && parent && deja[parent.slice(0, 2)])) return;
          if (!/^\d\d/.test(u)) return;
          var np = Object.keys(ps).length;
          if (np >= P.RAYON_MIN_PORTEURS && !ici[u] && res[u] > 0) {
            var nb = lignes[s].filter(function (l) { return (l.g === "ABS" || l.g === "NOU") && arts[l.a][cle] === u; }).length;
            if (nb) { deja[u] = 1; rayons[s].push({ niv: cle, c: u, lib: libs[u] !== undefined ? libs[u] : u, por: np, n: nb }); }
          }
        });
      });
    });

    // sortie compacte
    var vivier = []; for (i = 0; i < N; i++) if (reserve(i) > 0) vivier.push(i);
    var utilesSet = {};
    MAGASINS.forEach(function (s) { lignes[s].forEach(function (l) { utilesSet[l.a] = 1; (l.pour || []).forEach(function (x) { utilesSet[x] = 1; }); }); });
    vivier.forEach(function (i) { utilesSet[i] = 1; });
    var utiles = Object.keys(utilesSet).map(Number).sort(function (a, b) { return a - b; });
    var ren = {}; utiles.forEach(function (i, k) { ren[i] = k; });
    var outArts = utiles.map(function (i) {
      var o = arts[i];
      return [o.c, o.lib, o.sf, o.four, rnd(o.pr), rnd(o.pv), o.lot, o.tgc, o.dims, POSITIONS.map(function (p) { return o.st[p]; }),
        o.cde, o.flo, o.rec, o.dEntr !== null ? fin - o.dEntr : null, o.dLiv !== null ? fin - o.dLiv : null,
        MAGASINS.map(function (s) { return ventes12(s, i); }), MAGASINS.map(function (s) { return o.capa[s] || 0; }),
        Math.trunc(prepTot[i] || 0)];
    });
    MAGASINS.forEach(function (s) {
      lignes[s].forEach(function (l) {
        l.a = ren[l.a];
        if ("orig" in l) l.orig = ren[l.orig];
        if (l.pour) l.pour = l.pour.map(function (x) { return ren[x]; });
      });
      lignes[s].sort(function (x, y) { return y.sc - x.sc; });
    });

    var noms = {}; analyse.forEach(function (x) { noms[code(x.site)] = libelle(x.site); });
    var sites = {}; POSITIONS.forEach(function (p) { sites[p] = noms[p] !== undefined ? noms[p] : p; });
    var poidsOut = {}; MAGASINS.forEach(function (s) { poidsOut[s] = rnd2(poids[s], 2); });
    var sf2faOut = {}; Object.keys(sf2fa).forEach(function (sf) { if (sf in sfams) sf2faOut[sf] = sf2fa[sf]; });
    var F = E.noms || {};
    return {
      meta: {
        fin: iso(fin), periode: per, mois: nomsMois,
        fichiers: { base: F.base || "base article", analyse: F.analyse || "analyse stock/vente", glissant: F.glissant || "suivi 12 mois glissants" },
        rejets: rejets,
        prepa: E.prepa ? { fichier: F.prepa || "écart préparation", lignes: nbPrep } : null,
        params: { couv: P.COUV_JOURS, seuil_bas: P.SEUIL_BAS, plaf_bas: P.PLAF_BAS, horizon: P.HORIZON_MOIS, recent: P.RECENT_MOIS,
          prudence: P.PRUDENCE_ABS, report: P.REPORT_SUB, dort: P.DORT_LIV_JOURS, surstock: P.SURSTOCK_JOURS, garde: P.GARDE_JOURS,
          nvd: P.NVD_RECEP_JOURS, prix_sub: P.PRIX_SUB, rayon_min: P.RAYON_MIN_PORTEURS },
        calcule: new Date().toISOString()
      },
      sites: sites, magasins: MAGASINS, poids: poidsOut,
      depts: depts, fams: fams, sfams: sfams, sf2fa: sf2faOut,
      arts: outArts, lignes: lignes, rayons: rayons,
      vivier: vivier.map(function (i) { return ren[i]; })
    };
  }

  /* Reconnaît un export à son en-tête (et, pour les deux « suivi tout », à la
     longueur de sa période). */
  function genre(nom, txt) {
    var t = enTetes(txt).join(",").toLowerCase();
    if (/^code,libelle,codebarre/.test(t)) return "base";
    if (/^article,dept,famille,sfamille,fournis,site,periode/.test(t)) return "analyse";
    if (/qte_demande/.test(t)) return "prepa";
    if (/^periode,site,dept,famille,sfamille,fournis,article/.test(t)) {
      var n = (nom || "").toLowerCase();
      if (/glissant/.test(n)) return "glissant";
      if (/ddexf|exercice/.test(n)) return "exercice";
      if (/ddm/.test(n)) return "mois";
      var m = /Du (\d\d\/\d\d\/\d{4}) au (\d\d\/\d\d\/\d{4})/.exec(txt.slice(0, 2000));
      if (m) {
        var d = dateFr(m[2]) - dateFr(m[1]);
        if (d >= 300) return "glissant";
        if (d >= 45) return "exercice";
        return "mois";
      }
    }
    return null;
  }

  var api = { construire: construire, genre: genre, lireDict: lireDict, lignesCSV: lignesCSV, P: P };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else racine.Reassort = api;
})(typeof window !== "undefined" ? window : this);
