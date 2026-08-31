import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1500, height: 1500 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
p.on('dialog', d => d.accept('Nouvelle planche'));
await p.goto('file://' + process.argv[2]);
await p.waitForTimeout(400);
const ck = (n, ok, d) => console.log((ok ? '  OK   ' : '  ECHEC') + ' | ' + n + (ok ? '' : '  -> ' + d));

// cas d'usage decrit : UNE seule planche, sélection large, pagination inconnue
await p.evaluate(async () => {
  PAGES = [{ pg: 'SÉLECTION LARGE', codes: [], pages: 0, niveaux: {} }];
  PRODUCTS = {}; POOL = []; RESERVE = [];
  for (const k of Object.keys(matchedFiles)) delete matchedFiles[k];
  const cv = document.createElement('canvas'); cv.width = cv.height = 160;
  cv.getContext('2d').fillRect(0, 0, 160, 160);
  const bl = await new Promise(x => cv.toBlob(x, 'image/jpeg', 0.8));
  for (let i = 0; i < 12; i++) {
    const c = String(300000 + i);
    PAGES[0].codes.push(c);
    PRODUCTS[c] = { lib: 'ARTICLE ' + i, prix: '990 F' };
    matchedFiles[c] = new File([bl], c + '.jpg', { type: 'image/jpeg' });
    localBlobs[c] = matchedFiles[c];
  }
  $('perPage').value = 9;
  renderBuilder();
});
await p.click('#wtBtn');
await p.waitForTimeout(300);

// tout envoyer au vivier
await p.evaluate(() => [...document.querySelectorAll('.wt-head button')].find(b => /vivier/i.test(b.textContent)).click());
await p.waitForTimeout(250);
const vid = await p.evaluate(() => ({
  pool: POOL.length, place: allCodes().length,
  pagesAffichees: document.querySelectorAll('.wt-page').length,
  itemsVivier: document.querySelectorAll('#wtPoolGrid .wt-item').length
}));
ck('planche vidée dans le vivier', vid.pool === 12 && vid.place === 0, JSON.stringify(vid));
ck('une page vide reste pour composer', vid.pagesAffichees === 1, String(vid.pagesAffichees));
ck('vivier affiché', vid.itemsVivier === 12, String(vid.itemsVivier));

// creation de pages vides
await p.evaluate(() => {
  const b = [...document.querySelectorAll('.wt-head button')].find(x => /Page/.test(x.textContent));
  b.click();
});
await p.waitForTimeout(200);
await p.evaluate(() => [...document.querySelectorAll('.wt-head button')].find(x => /Page/.test(x.textContent)).click());
await p.waitForTimeout(200);
const pg = await p.evaluate(() => ({
  pages: document.querySelectorAll('.wt-page').length,
  contenu: PAGES[0].pagesContenu.map(x => x.length)
}));
ck('pages vides créées à la demande', pg.pages === 3 && JSON.stringify(pg.contenu) === '[0,0,0]', JSON.stringify(pg));

// glisser un produit du vivier vers la page 2
const src = p.locator('#wtPoolGrid .wt-item').first();
const dst = p.locator('.wt-page').nth(1).locator('.wt-grid');
await src.scrollIntoViewIfNeeded(); await p.waitForTimeout(120);
let bs = await src.boundingBox(), bd = await dst.boundingBox();
if (bd.y > 1400) { await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(200); bs = await src.boundingBox(); bd = await dst.boundingBox(); }
await p.mouse.move(bs.x + bs.width / 2, bs.y + bs.height / 2);
await p.mouse.down();
for (let i = 1; i <= 12; i++) { await p.mouse.move(bs.x + (bd.x + 40 - bs.x) * i / 12, bs.y + (bd.y + 40 - bs.y) * i / 12); await p.waitForTimeout(25); }
await p.mouse.up();
await p.waitForTimeout(350);
const dep = await p.evaluate(() => ({ pool: POOL.length, contenu: PAGES[0].pagesContenu.map(x => x.length), plat: PAGES[0].codes.length }));
ck('produit posé du vivier vers une page précise',
  dep.pool === 11 && JSON.stringify(dep.contenu) === '[0,1,0]' && dep.plat === 1, JSON.stringify(dep));
ck('liste à plat reconstruite pour les exports', dep.plat === 1, String(dep.plat));

// nouvelle planche
await p.evaluate(() => [...document.querySelectorAll('.wt-bar button')].find(x => /Planche/.test(x.textContent)).click());
await p.waitForTimeout(250);
ck('nouvelle planche créée', await p.evaluate(() => PAGES.length) === 2, 'non créée');

// la vue d ensemble ne detruit pas la pagination composee
await p.evaluate(() => { document.querySelectorAll('.wt-seg button')[1].click(); });
await p.waitForTimeout(200);
await p.evaluate(() => { document.querySelectorAll('.wt-seg button')[0].click(); });
await p.waitForTimeout(200);
ck('pagination composée préservée par la bascule de vue',
  JSON.stringify(await p.evaluate(() => PAGES[0].pagesContenu.map(x => x.length))) === '[0,1,0]',
  JSON.stringify(await p.evaluate(() => PAGES[0].pagesContenu)));

// rappel dans la vue planches
await p.evaluate(() => { wtSync(); fermerWorktable(); });
await p.waitForTimeout(250);
ck('vivier rappelé dans la vue planches',
  /au vivier/.test(await p.evaluate(() => $('capTotal').textContent)) &&
  !(await p.evaluate(() => $('capTotal').classList.contains('hidden'))), 'rappel absent');

// aller-retour projet
const rt = await p.evaluate(async () => {
  const proj = await buildProject(false, {});
  const av = { pool: POOL.length, pc: JSON.stringify(PAGES[0].pagesContenu) };
  POOL = []; PAGES = [];
  applyProject(proj);
  return { av, ap: { pool: POOL.length, pc: JSON.stringify(PAGES[0].pagesContenu) } };
});
ck('vivier et pages composées conservés à la reprise',
  rt.av.pool === rt.ap.pool && rt.av.pc === rt.ap.pc, JSON.stringify(rt));
// réconciliation : une suppression faite dans la vue planches doit se répercuter
const rec = await p.evaluate(() => {
  PAGES = [{ pg: 'A', codes: ['1', '2', '3', '4'], pages: 1, niveaux: {}, pagesContenu: [['1', '2'], ['3', '4']] }];
  PRODUCTS = { '1': {}, '2': {}, '3': {}, '4': {} };
  PAGES[0].codes = ['1', '3', '9'];          // 2 et 4 supprimés ailleurs, 9 ajouté
  const vu = pagesDe(PAGES[0]);
  return { pages: vu.map(x => x.join(',')) };
});
ck('pages recalées après modification hors table de travail',
  JSON.stringify(rec.pages) === '["1","3,9"]', JSON.stringify(rec.pages));

if (errs.length) console.log('Erreurs JS : ' + errs.join(' | '));
await b.close();
