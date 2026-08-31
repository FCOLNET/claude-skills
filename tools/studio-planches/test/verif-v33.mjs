import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1500, height: 1500 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
p.on('dialog', d => d.accept());
await p.goto('file://' + process.argv[2]);
await p.waitForTimeout(400);
const ck = (n, ok, d) => console.log((ok ? '  OK   ' : '  ECHEC') + ' | ' + n + (ok ? '' : '  -> ' + d));

await p.evaluate(async () => {
  PAGES = [
    { pg: 'ÉVEIL', codes: [], pages: 2, niveaux: {} },
    { pg: 'JOUETS', codes: [], pages: 1, niveaux: {} }
  ];
  PRODUCTS = {};
  for (const kk of Object.keys(matchedFiles)) delete matchedFiles[kk];
  const cv = document.createElement('canvas'); cv.width = cv.height = 200;
  const c = cv.getContext('2d'); c.fillStyle = '#8B1A2B'; c.fillRect(0, 0, 200, 200);
  const bl = await new Promise(x => cv.toBlob(x, 'image/jpeg', 0.8));
  let n = 0;
  for (const sec of PAGES) {
    const combien = sec.pg === 'ÉVEIL' ? 22 : 4;    // 22 pour 18 places : déborde
    for (let i = 0; i < combien; i++) {
      const code = String(100000 + n++);
      sec.codes.push(code);
      PRODUCTS[code] = { lib: 'ARTICLE ' + i, prix: '990 F', prixInit: '', prixPromo: '', remise: '' };
      matchedFiles[code] = new File([bl], code + '.jpg', { type: 'image/jpeg' });
      localBlobs[code] = matchedFiles[code];
    }
  }
  PAGES[0].niveaux[PAGES[0].codes[0]] = 'hero';
  $('perPage').value = 9;
  renderBuilder();
});

await p.click('#wtBtn');
await p.waitForTimeout(400);

const vue = await p.evaluate(() => ({
  visible: !$('worktable').classList.contains('hidden'),
  planchesMasquees: $('planches').classList.contains('hidden'),
  planches: document.querySelectorAll('.wt-planche').length,
  pagesEveil: document.querySelectorAll('.wt-planche[data-idx="0"] .wt-page').length,
  horsPagination: document.querySelectorAll('.wt-planche[data-idx="0"] .wt-page.hors').length,
  colonnes: getComputedStyle(document.querySelector('.wt-grid')).gridTemplateColumns.split(' ').length,
  heros: document.querySelectorAll('.wt-item.niv-hero').length,
  reserve: document.querySelectorAll('#wtReserveGrid .wt-item').length
}));
ck('table de travail ouverte, planches masquées', vue.visible && vue.planchesMasquees, JSON.stringify(vue));
ck('2 planches, découpage en pages réelles', vue.planches === 2 && vue.pagesEveil === 3, JSON.stringify(vue));
ck('page hors pagination signalée (22 réf. pour 18 places)', vue.horsPagination === 1, String(vue.horsPagination));
ck('grille de 3 colonnes pour 9 produits/page', vue.colonnes === 3, String(vue.colonnes));
ck('niveau héros visible dans la table', vue.heros === 1, String(vue.heros));

// mise en réserve par le bouton de la vignette
const misEnReserve = await p.evaluate(() => {
  const premier = document.querySelector('.wt-planche[data-idx="0"] .wt-item');
  const code = premier.dataset.code;
  premier.querySelector('.wt-out').click();
  return { code, reserve: RESERVE.length, dansPlanche: PAGES[0].codes.includes(code), origine: RESERVE[0] && RESERVE[0].pg };
});
ck('produit écarté : en réserve, retiré de la planche',
  misEnReserve.reserve === 1 && !misEnReserve.dansPlanche, JSON.stringify(misEnReserve));
ck('planche d origine mémorisée', misEnReserve.origine === 'ÉVEIL', String(misEnReserve.origine));
await p.waitForTimeout(200);
ck('réserve affichée', (await p.locator('#wtReserveGrid .wt-item').count()) === 1, 'absente');

// déplacement par glisser d'une planche à l'autre.
// On réduit d'abord la 1re planche pour que les deux tiennent dans la fenêtre : sinon la
// cible est hors écran et le lâcher se fait dans le vide — ce n'est pas un défaut de
// l'outil mais du banc de test.
await p.evaluate(() => { PAGES[0].codes = PAGES[0].codes.slice(0, 3); renderWorktable(); });
await p.evaluate(() => { const r = document.querySelector('.wt-size input'); r.value = '90'; r.dispatchEvent(new Event('input')); });
await p.waitForTimeout(250);
const avant = await p.evaluate(() => ({ a: PAGES[0].codes.length, b: PAGES[1].codes.length, code: PAGES[0].codes[0] }));
const src = p.locator('.wt-planche[data-idx="0"] .wt-item').first();
const dst = p.locator('.wt-planche[data-idx="1"] .wt-grid').first();
await src.scrollIntoViewIfNeeded();
const bs = await src.boundingBox(); const bd = await dst.boundingBox();
await p.mouse.move(bs.x + bs.width / 2, bs.y + bs.height / 2);
await p.mouse.down();
for (let i = 1; i <= 12; i++) {
  await p.mouse.move(bs.x + (bd.x + 40 - bs.x) * i / 12, bs.y + (bd.y + 40 - bs.y) * i / 12);
  await p.waitForTimeout(25);
}
await p.mouse.up();
await p.waitForTimeout(400);
const apres = await p.evaluate(() => ({ a: PAGES[0].codes.length, b: PAGES[1].codes.length }));
ck('glisser d une planche à l autre', apres.a === avant.a - 1 && apres.b === avant.b + 1,
  JSON.stringify({ avant, apres }));

// bascule de vue et taille
await p.evaluate(() => { document.querySelectorAll('.wt-seg button')[1].click(); });
await p.waitForTimeout(250);
ck('bascule vers le plan d ensemble',
  (await p.locator('.wt-planche[data-idx="0"] .wt-flow').count()) === 1 &&
  (await p.locator('.wt-page').count()) === 0, 'bascule sans effet');
await p.evaluate(() => { const r = document.querySelector('.wt-size input'); r.value = '220'; r.dispatchEvent(new Event('input')); });
ck('taille réglable', (await p.evaluate(() => $('worktable').style.getPropertyValue('--wt'))) === '220px', 'inchangée');

// aller-retour projet
const rt = await p.evaluate(async () => {
  wtSync();
  const proj = await buildProject(false, {});
  const avantR = RESERVE.length, avantP = PAGES.map(s => s.codes.length);
  RESERVE = []; PAGES = [];
  applyProject(proj);
  return { avantR, avantP, apresR: RESERVE.length, apresP: PAGES.map(s => s.codes.length) };
});
ck('réserve et sélection conservées à la reprise',
  rt.apresR === rt.avantR && JSON.stringify(rt.apresP) === JSON.stringify(rt.avantP), JSON.stringify(rt));
if (errs.length) console.log('Erreurs JS : ' + errs.join(' | '));
await b.close();
