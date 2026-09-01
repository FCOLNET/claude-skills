import { chromium } from 'playwright-core';
const FICHIER = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const errs = [];
const ck = (n, ok, d) => console.log((ok ? '  OK   ' : '  ECHEC') + ' | ' + n + (ok ? '' : '  -> ' + d));

// Un scénario = une page fraîche. Toute réutilisation d'onglet risque de resynchroniser
// le modèle depuis un affichage périmé, ce qui fausse le test plus que l'outil.
async function scene(pagesA, pagesB) {
  const p = await b.newPage({ viewport: { width: 1600, height: 1300 } });
  p.on('pageerror', e => errs.push(e.message));
  p.on('dialog', d => d.accept());
  await p.goto('file://' + FICHIER);
  await p.waitForTimeout(350);
  await p.evaluate(async ([pa, pb]) => {
    PAGES = [
      { pg: 'A', codes: [], pages: pa.length, niveaux: {}, pagesContenu: pa },
      { pg: 'B', codes: [], pages: pb.length, niveaux: {}, pagesContenu: pb }
    ];
    PRODUCTS = {}; POOL = []; RESERVE = []; PROJET_NOM = 'T';
    for (const k of Object.keys(matchedFiles)) delete matchedFiles[k];
    for (const sec of PAGES) { aplatir(sec); for (const c of sec.codes) PRODUCTS[c] = { lib: c, prix: '9 F' }; }
    $('perPage').value = 9;
    renderBuilder();
    ouvrirWorktable();
    // vignettes au plus petit : tout doit tenir dans la fenêtre pour un vrai glisser
    const r = document.querySelector('.wt-size input'); r.value = '90'; r.dispatchEvent(new Event('input'));
  }, [pagesA, pagesB]);
  await p.waitForTimeout(350);
  return p;
}
// glisse l'en-tête de page `srcIdx` (planche srcP) vers la moitié gauche ou droite de la
// page `dstIdx` (planche dstP), en vérifiant d'abord que les deux sont bien visibles
async function glisserPage(p, srcP, srcIdx, dstP, dstIdx, cote) {
  const src = p.locator('.wt-planche[data-idx="' + srcP + '"] .wt-page-t').nth(srcIdx);
  const dst = p.locator('.wt-planche[data-idx="' + dstP + '"] .wt-page').nth(dstIdx);
  const bs = await src.boundingBox(), bd = await dst.boundingBox();
  const vp = p.viewportSize();
  if (!bs || !bd || bd.y + 20 > vp.height || bs.y + 10 > vp.height) return { hors: true, bs, bd };
  const x = cote === 'gauche' ? bd.x + 8 : bd.x + bd.width - 8;
  const y = bd.y + 12;
  await p.mouse.move(bs.x + 20, bs.y + bs.height / 2);
  await p.mouse.down();
  for (let i = 1; i <= 14; i++) {
    await p.mouse.move(bs.x + 20 + (x - bs.x - 20) * i / 14, bs.y + bs.height / 2 + (y - bs.y - bs.height / 2) * i / 14);
    await p.waitForTimeout(22);
  }
  await p.mouse.up();
  await p.waitForTimeout(400);
  return { hors: false };
}
const lire = p => p.evaluate(() => ({
  a: PAGES[0].pagesContenu.map(x => x.join('+')),
  b: PAGES[1].pagesContenu.map(x => x.join('+')),
  total: PAGES[0].codes.length + PAGES[1].codes.length
}));

// --- 1. l'interface est là -----------------------------------------------------
let p = await scene([['a1'], ['b1'], ['c1']], [['z1']]);
const init = await p.evaluate(() => ({
  poignees: document.querySelectorAll('.wt-poignee').length,
  glissable: document.querySelector('.wt-page-t').getAttribute('draggable'),
  suppr: document.querySelectorAll('.wt-page-del').length
}));
ck('poignée et bouton de suppression sur chaque page',
  init.poignees === 4 && init.glissable === 'true' && init.suppr === 4, JSON.stringify(init));

// --- 2. réordonner une page dans sa planche ------------------------------------
let g = await glisserPage(p, 0, 2, 0, 0, 'gauche');
let r = await lire(p);
ck('page ramenée en tête de sa planche',
  !g.hors && JSON.stringify(r.a) === '["c1","a1","b1"]', g.hors ? 'cible hors fenêtre' : JSON.stringify(r.a));
await p.close();

// --- 3. déplacer une page vers une autre planche -------------------------------
p = await scene([['a1'], ['b1']], [['z1']]);
g = await glisserPage(p, 0, 0, 1, 0, 'droite');
r = await lire(p);
ck('page déplacée vers une autre planche',
  !g.hors && r.b.join(',') === 'z1,a1' && r.a.join(',') === 'b1',
  g.hors ? 'cible hors fenêtre' : JSON.stringify(r));
ck('aucun produit perdu au passage', r.total === 3, String(r.total));
await p.close();

// --- 4. supprimer une page : contenu au vivier ---------------------------------
p = await scene([['a1', 'a2'], ['b1']], [['z1']]);
await p.evaluate(() => document.querySelector('.wt-planche[data-idx="0"] .wt-page-del').click());
await p.waitForTimeout(300);
const s = await p.evaluate(() => ({ pages: PAGES[0].pagesContenu.map(x => x.join('+')), pool: POOL.slice(), total: PAGES[0].codes.length }));
ck('page supprimée, son contenu au vivier',
  s.pages.join(',') === 'b1' && s.pool.join('+') === 'a1+a2' && s.total === 1, JSON.stringify(s));
await p.close();

// --- 5. glisser un produit reste distinct --------------------------------------
p = await scene([['a1', 'a2'], ['b1']], [['z1']]);
const src = p.locator('.wt-planche[data-idx="0"] .wt-item').first();
const dst = p.locator('.wt-planche[data-idx="0"] .wt-page').nth(1).locator('.wt-grid');
const bs = await src.boundingBox(), bd = await dst.boundingBox();
await p.mouse.move(bs.x + bs.width / 2, bs.y + bs.height / 2);
await p.mouse.down();
for (let i = 1; i <= 12; i++) { await p.mouse.move(bs.x + (bd.x + 25 - bs.x) * i / 12, bs.y + (bd.y + 25 - bs.y) * i / 12); await p.waitForTimeout(25); }
await p.mouse.up(); await p.waitForTimeout(400);
r = await lire(p);
ck('glisser un produit déplace le produit, pas la page',
  r.a.length === 2 && r.a[0] === 'a2' && /a1/.test(r.a[1]), JSON.stringify(r.a));
await p.close();

if (errs.length) console.log('Erreurs JS : ' + errs.join(' | '));
await b.close();
