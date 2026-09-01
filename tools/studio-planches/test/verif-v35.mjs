import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1500, height: 1400 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
let reponse = '';
p.on('dialog', d => d.accept(reponse));
await p.goto('file://' + process.argv[2]);
await p.waitForTimeout(400);
const ck = (n, ok, d) => console.log((ok ? '  OK   ' : '  ECHEC') + ' | ' + n + (ok ? '' : '  -> ' + d));

await p.evaluate(async () => {
  REF = { '400001': { lib: 'PELUCHE OURS 40CM', prix: '3 490 F' } };
  REF_FOURN = {}; REF_FOURN_RAW = {};
  PAGES = [{ pg: 'JOUETS', codes: ['300000', '300001'], pages: 1, niveaux: {}, pagesContenu: [['300000', '300001']] }];
  PRODUCTS = { '300000': { lib: 'A', prix: '990 F' }, '300001': { lib: 'B', prix: '890 F' } };
  POOL = []; RESERVE = [];
  for (const k of Object.keys(matchedFiles)) delete matchedFiles[k];
  $('perPage').value = 9;
  renderBuilder();
});
await p.click('#wtBtn');
await p.waitForTimeout(300);

// 1. ajout d'un article présent dans la base
reponse = '400001';
await p.click('.wt-page-add');
await p.waitForTimeout(300);
const a1 = await p.evaluate(() => ({
  page: PAGES[0].pagesContenu[0].slice(),
  fiche: PRODUCTS['400001'],
  vignettes: document.querySelectorAll('.wt-page .wt-item').length,
  compteur: document.querySelector('.wt-page-n').textContent
}));
ck('article ajouté à la page', a1.page.length === 3 && a1.page[2] === '400001', JSON.stringify(a1.page));
ck('fiche reprise de la base articles',
  a1.fiche && a1.fiche.lib === 'PELUCHE OURS 40CM' && a1.fiche.prix === '3 490 F', JSON.stringify(a1.fiche));
ck('compteur de page à jour', a1.compteur === '3/9', a1.compteur);

// 2. ajout d'un article inconnu de la base : vignette vide à remplir
reponse = '999999';
await p.click('.wt-page-add');
await p.waitForTimeout(400);
const a2 = await p.evaluate(() => ({ n: PAGES[0].pagesContenu[0].length, fiche: PRODUCTS['999999'] }));
ck('article hors base ajouté, fiche vide', a2.n === 4 && a2.fiche && a2.fiche.lib === '', JSON.stringify(a2));

// 3. saisie sur place du libellé et du prix
await p.evaluate(() => {
  const el = [...document.querySelectorAll('.wt-item')].find(x => x.dataset.code === '999999');
  const lib = el.querySelector('.wt-lib'), prix = el.querySelector('.wt-prix');
  lib.textContent = 'ARTICLE SAISI À LA MAIN'; lib.dispatchEvent(new Event('blur'));
  prix.textContent = '1 990 F'; prix.dispatchEvent(new Event('blur'));
});
const a3 = await p.evaluate(() => PRODUCTS['999999']);
ck('libellé et prix saisis sur la vignette',
  a3.lib === 'ARTICLE SAISI À LA MAIN' && a3.prix === '1 990 F', JSON.stringify(a3));

// 4. le glisser est suspendu pendant la saisie puis rétabli
const a4 = await p.evaluate(() => {
  const el = [...document.querySelectorAll('.wt-item')].find(x => x.dataset.code === '999999');
  const lib = el.querySelector('.wt-lib');
  lib.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  const pendant = el.draggable;
  lib.dispatchEvent(new Event('blur'));
  return { pendant, apres: el.draggable };
});
ck('glisser suspendu pendant la saisie, rétabli après', a4.pendant === false && a4.apres === true, JSON.stringify(a4));

// 5. suppression définitive
reponse = '';
const a5 = await p.evaluate(() => {
  const el = [...document.querySelectorAll('.wt-item')].find(x => x.dataset.code === '400001');
  el.querySelector('.wt-del').click();
  return null;
});
await p.waitForTimeout(300);
const a5b = await p.evaluate(() => ({
  dansPage: PAGES[0].pagesContenu[0].includes('400001'),
  dansPlat: PAGES[0].codes.includes('400001'),
  pool: POOL.includes('400001'),
  reserve: RESERVE.some(r => r.code === '400001'),
  produit: !!PRODUCTS['400001']
}));
ck('suppression définitive : plus nulle part',
  !a5b.dansPage && !a5b.dansPlat && !a5b.pool && !a5b.reserve && !a5b.produit, JSON.stringify(a5b));

// 6. la mise en réserve reste distincte de la suppression
const a6 = await p.evaluate(() => {
  const el = [...document.querySelectorAll('.wt-item')].find(x => x.dataset.code === '300000');
  el.querySelector('.wt-out').click();
  return { reserve: RESERVE.map(r => r.code), produit: !!PRODUCTS['300000'] };
});
ck('✕ met en réserve sans détruire la fiche',
  a6.reserve.includes('300000') && a6.produit === true, JSON.stringify(a6));
if (errs.length) console.log('Erreurs JS : ' + errs.join(' | '));
await b.close();
