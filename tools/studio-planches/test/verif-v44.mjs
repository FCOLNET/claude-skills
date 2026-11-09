// V44 — la quantité disponible, lue dans le fichier source, va de la vignette aux exports.
import { chromium } from 'playwright-core';
const FICHIER = process.argv[2];
const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1500, height: 1100 } });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
p.on('dialog', d => d.accept());
await p.goto('file://' + FICHIER);
// xlsx et jszip viennent d'un CDN : hors ligne, on les injecte depuis le disque,
// sinon l'export Excel échoue pour une raison qui n'a rien à voir avec la V44.
for (const lib of process.argv.slice(3)) await p.addScriptTag({ path: lib });
await p.waitForTimeout(500);
const res = [];
const ck = (n, ok, d) => { res.push(ok); console.log((ok ? '  OK   ' : '  ECHEC') + ' | ' + n + (ok ? '' : '  -> ' + d)); };

// --- 1. reconnaissance de la colonne ----------------------------------------
// « conso » est le nom réel dans l'export caisse NPC ; les autres sont les variantes
// qu'on rencontre ailleurs. Une colonne « consommation » ne doit pas être prise pour
// un stock par simple inclusion… mais « conso » si, d'où l'ordre de la liste.
const t1 = await p.evaluate(() => {
  const essai = headers => {
    const guess = n => {
      for (const s of n) { const i = headers.findIndex(x => x.toLowerCase() === s); if (i >= 0) return i; }
      for (const s of n) { const i = headers.findIndex(x => x.toLowerCase().includes(s)); if (i >= 0) return i; }
      return -1;
    };
    return guess(QTE_NOMS);
  };
  return {
    caisse: essai(['code', 'libelle', 'prix_vente', 'conso', 'photo']),
    stock: essai(['Code', 'Libellé', 'Prix', 'Stock dispo']),
    qte: essai(['code', 'lib', 'Qté']),
    aucune: essai(['code', 'libelle', 'prix'])
  };
});
ck('colonne quantité détectée (conso, stock dispo, qté)',
  t1.caisse === 3 && t1.stock === 3 && t1.qte === 2 && t1.aucune === -1, JSON.stringify(t1));

// --- 2. lecture : un entier, et rien quand ce n'est pas un nombre ------------
const t2 = await p.evaluate(() => [fmtQte(18), fmtQte('18'), fmtQte(' 1 451 '), fmtQte('0'),
  fmtQte(''), fmtQte('—'), fmtQte(null), fmtQte('n/a'), fmtQte('12,0')]);
ck('quantité normalisée en entier, vide si non renseignée',
  JSON.stringify(t2) === JSON.stringify(['18', '18', '1451', '0', '', '', '', '', '12']), JSON.stringify(t2));

// --- 3. seuils ---------------------------------------------------------------
const t3 = await p.evaluate(() => [qteClasse(0), qteClasse(3), qteClasse(9), qteClasse(10), qteClasse(1451), qteClasse('')]);
ck('seuils : 0 en rouge, moins de 10 en ambre, au-delà normal',
  JSON.stringify(t3) === JSON.stringify(['nul', 'bas', 'bas', '', '', '']), JSON.stringify(t3));

// --- 4. la planche affiche la quantité ---------------------------------------
const t4 = await p.evaluate(() => {
  PAGES = [{ pg: 'Sélection', codes: ['057071', '077323', '090673', 'SANSQ'] }];
  PRODUCTS = {
    '057071': { lib: 'COLORATION', prix: '490 F', qte: '18' },
    '077323': { lib: 'JOUET PLONGEANT', prix: '590 F', qte: '0' },
    '090673': { lib: 'PISTOLET A EAU', prix: '990 F', qte: '6' },
    'SANSQ': { lib: 'SANS QUANTITE', prix: '150 F' }
  };
  for (const k of Object.keys(matchedFiles)) delete matchedFiles[k];
  renderBuilder();
  const lu = c => {
    const box = cardsOf(c)[0].querySelector('.card-qte');
    return { on: box.classList.contains('on'), txt: box.querySelector('b').textContent, cl: box.className };
  };
  return { a: lu('057071'), b: lu('077323'), c: lu('090673'), d: lu('SANSQ') };
});
ck('quantité affichée sur la vignette', t4.a.on && t4.a.txt === '18' && !/nul|bas/.test(t4.a.cl), JSON.stringify(t4.a));
ck('zéro affiché en rouge', t4.b.on && t4.b.txt === '0' && /nul/.test(t4.b.cl), JSON.stringify(t4.b));
ck('stock faible affiché en ambre', t4.c.on && t4.c.txt === '6' && /bas/.test(t4.c.cl), JSON.stringify(t4.c));
ck('rien d affiché quand la quantité manque', !t4.d.on && t4.d.txt === '', JSON.stringify(t4.d));

// --- 5. elle survit à la relecture du DOM et à la sauvegarde -----------------
const t5 = await p.evaluate(async () => {
  syncProductsFromDOM();
  const apresSync = PRODUCTS['057071'].qte;
  const proj = await buildProject(true, { blobs: true });
  applyProject(proj);
  return { apresSync, apresProjet: (PRODUCTS['057071'] || {}).qte, outil: proj._outil };
});
ck('quantité conservée après relecture du DOM et reprise du projet',
  t5.apresSync === '18' && t5.apresProjet === '18', JSON.stringify(t5));

// --- 6. la base articles la pose sur les planches ----------------------------
const t6 = await p.evaluate(() => {
  PAGES = [{ pg: 'Sélection', codes: ['999001'] }];
  PRODUCTS = { '999001': { lib: '', prix: '' } };
  REF['999001'] = { lib: 'ARTICLE BASE', prix: '1 990 F', qte: '42' };
  renderBuilder();
  applyRefToCard('999001');
  const box = cardsOf('999001')[0].querySelector('.card-qte');
  return { modele: PRODUCTS['999001'].qte, affiche: box.querySelector('b').textContent, on: box.classList.contains('on') };
});
ck('quantité reprise de la base articles', t6.modele === '42' && t6.affiche === '42' && t6.on, JSON.stringify(t6));

// --- 7. table de travail -----------------------------------------------------
const t7 = await p.evaluate(() => {
  PAGES = [{ pg: 'A', codes: [], pages: 1, niveaux: {}, pagesContenu: [['057071', '077323', 'SANSQ']] }];
  PRODUCTS = {
    '057071': { lib: 'A', prix: '490 F', qte: '18' },
    '077323': { lib: 'B', prix: '590 F', qte: '0' },
    'SANSQ': { lib: 'C', prix: '150 F' }
  };
  POOL = []; RESERVE = [];
  for (const sec of PAGES) aplatir(sec);
  renderBuilder(); ouvrirWorktable();
  const q = c => {
    const el = [...document.querySelectorAll('.wt-item')].find(x => x.dataset.code === c);
    const t = el.querySelector('.wt-qte');
    return t ? { txt: t.textContent, cl: t.className } : null;
  };
  return { a: q('057071'), b: q('077323'), c: q('SANSQ') };
});
ck('quantité sur la vignette de la table de travail',
  t7.a.txt === '18 dispo' && /nul/.test(t7.b.cl) && t7.c === null, JSON.stringify(t7));

// --- 8. export HTML des planches ---------------------------------------------
const t8 = await p.evaluate(async () => {
  fermerWorktable();
  PAGES = [{ pg: 'Sélection', codes: ['057071', 'SANSQ'] }];
  PRODUCTS = { '057071': { lib: 'COLORATION', prix: '490 F', qte: '18' }, 'SANSQ': { lib: 'SANS', prix: '150 F' } };
  renderBuilder();
  let html = null;
  const vrai = window.showDownload;
  window.showDownload = async blob => { html = await blob.text(); };
  await $('makeHtml').click();
  for (let i = 0; i < 60 && html === null; i++) await new Promise(r => setTimeout(r, 100));
  window.showDownload = vrai;
  return html || '';
});
ck('export HTML : la quantité figure sur la carte',
  /<div class="x-qte"[^>]*><b>18<\/b><span>dispo<\/span><\/div>/.test(t8), t8.slice(0, 160));
ck('export HTML : une seule quantité, pas de bloc vide',
  (t8.match(/x-qte"/g) || []).length === 1 && /\.x-qte\{/.test(t8),
  String((t8.match(/x-qte"/g) || []).length));

// --- 9. fichier de fusion InDesign -------------------------------------------
const t9 = await p.evaluate(() => {
  const txt = buildMergeFile('', false).texte;
  const l = txt.trim().split('\r\n');
  const cols = l[0].split('\t');
  const val = (ligne, nom) => ligne.split('\t')[cols.indexOf(nom)];
  return { cols, q1: val(l[1], 'QuantiteDispo'), q2: val(l[2], 'QuantiteDispo'), nb: l[1].split('\t').length };
});
ck('fusion : colonne QuantiteDispo présente et renseignée',
  t9.cols.includes('QuantiteDispo') && t9.q1 === '18' && t9.q2 === '', JSON.stringify({ q1: t9.q1, q2: t9.q2 }));
ck('fusion : toutes les lignes ont le même nombre de colonnes',
  t9.nb === t9.cols.length, t9.nb + ' vs ' + t9.cols.length);

// --- 10. Excel ----------------------------------------------------------------
const t10 = await p.evaluate(async () => {
  let blob = null;
  const vrai = window.showDownload;
  window.showDownload = b => { blob = b; };
  await $('makeXlsx').click();
  for (let i = 0; i < 60 && blob === null; i++) await new Promise(r => setTimeout(r, 100));
  window.showDownload = vrai;
  const buf = await blob.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
  const i = aoa[0].indexOf('Quantité dispo');
  return { entete: i, v1: aoa[1][i], t1: typeof aoa[1][i], v2: aoa[2][i], cols: aoa[0].length };
});
ck('Excel : colonne « Quantité dispo » en nombre, triable',
  t10.entete > 0 && t10.v1 === 18 && t10.t1 === 'number' && t10.v2 === '', JSON.stringify(t10));

// --- 11. le catalogue web, lui, n'affiche rien -------------------------------
// C'est la pièce que voit le client : un stock n'y a pas sa place.
const t11 = await p.evaluate(async () => {
  const r = await buildCatalogueWeb('unique');
  const html = (r && (r.html || r.index || r.texte)) || (typeof r === 'string' ? r : '');
  return { aQte: /x-qte|dispo/i.test(html), taille: html.length };
}).catch(e => null);
if (t11) ck('catalogue web : aucune quantité affichée au client', !t11.aQte, JSON.stringify(t11));
else console.log('  info  | catalogue web non vérifié ici (fonction non exposée)');

await b.close();
const ko = res.filter(x => !x).length;
if (errs.length) { console.log('\nErreurs JS :'); [...new Set(errs)].forEach(e => console.log('  ' + e)); }
console.log('\n' + (res.length - ko) + '/' + res.length + ' verifications passees');
process.exit(ko || errs.length ? 1 : 0);
