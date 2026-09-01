import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1500, height: 1500 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
p.on('dialog', d => d.accept());
await p.goto('file://' + process.argv[2]);
await p.waitForTimeout(400);
const ck = (n, ok, d) => console.log((ok ? '  OK   ' : '  ECHEC') + ' | ' + n + (ok ? '' : '  -> ' + d));

// cas réel : UNE planche, 1 page attribuée, beaucoup de références
await p.evaluate(async () => {
  PAGES = [{ pg: 'Sélection', codes: [], pages: 1, niveaux: {}, pagesContenu: null }];
  PRODUCTS = {}; POOL = []; RESERVE = []; PROJET_NOM = 'T';
  for (const k of Object.keys(matchedFiles)) delete matchedFiles[k];
  const cv = document.createElement('canvas'); cv.width = cv.height = 120;
  cv.getContext('2d').fillRect(0, 0, 120, 120);
  const bl = await new Promise(x => cv.toBlob(x, 'image/jpeg', 0.7));
  for (let i = 0; i < 27; i++) {
    const c = String(500000 + i);
    PAGES[0].codes.push(c);
    PRODUCTS[c] = { lib: 'ART ' + i, prix: '990 F' };
    matchedFiles[c] = new File([bl], c + '.jpg', { type: 'image/jpeg' });
    localBlobs[c] = matchedFiles[c];
  }
  $('perPage').value = 9;
  renderBuilder();
});
await p.click('#wtBtn');
await p.waitForTimeout(400);

const av = await p.evaluate(() => ({
  pagesRouges: document.querySelectorAll('.wt-page.hors').length,
  mentionHors: document.body.textContent.includes('hors pagination'),
  entete: document.querySelector('.wt-planche .pg-cap').textContent.trim(),
  pages: document.querySelectorAll('.wt-page').length
}));
ck('plus aucune page barrée « hors pagination »', av.pagesRouges === 0 && !av.mentionHors, JSON.stringify(av));
ck('le décalage est dit une fois, sur la planche',
  /3 page\(s\) composée\(s\)/.test(av.entete) && /1 attribuée/.test(av.entete), av.entete);
ck('3 pages composées pour 27 références', av.pages === 3, String(av.pages));

// glisser un produit de la page 2 vers la page 1, déjà pleine à 9
const src = p.locator('.wt-page').nth(1).locator('.wt-item').first();
const dst = p.locator('.wt-page').nth(0).locator('.wt-grid');
await src.scrollIntoViewIfNeeded(); await p.waitForTimeout(120);
const bs = await src.boundingBox(), bd = await dst.boundingBox();
const codeDeplace = await src.evaluate(e => e.dataset.code);
await p.mouse.move(bs.x + bs.width / 2, bs.y + bs.height / 2);
await p.mouse.down();
for (let i = 1; i <= 12; i++) { await p.mouse.move(bs.x + (bd.x + 40 - bs.x) * i / 12, bs.y + (bd.y + 40 - bs.y) * i / 12); await p.waitForTimeout(25); }
await p.mouse.up();
await p.waitForTimeout(400);

const ap = await p.evaluate(c => ({
  tailles: PAGES[0].pagesContenu.map(x => x.length),
  total: PAGES[0].codes.length,
  present: PAGES[0].pagesContenu[0].includes(c),
  compteur: document.querySelector('.wt-page .wt-page-t span:nth-child(2)').textContent,
  couleur: document.querySelector('.wt-page .wt-page-t span:nth-child(2)').style.color,
  info: document.querySelector('.wt-page .wt-page-t span:nth-child(2)').title
}), codeDeplace);
ck('la page passe à 10 sans chasser personne',
  ap.tailles[0] === 10 && ap.tailles[1] === 8 && ap.total === 27 && ap.present, JSON.stringify(ap.tailles) + ' total=' + ap.total);
ck('aucune référence perdue au total', ap.total === 27, String(ap.total));
// ambre = rgb(138, 97, 0) ; le rouge d'alerte de l'outil est rgb(176, 0, 32)
const rouge = /rgb\(176,\s*0,\s*32\)|#B00020/i.test(ap.couleur);
const ambre = /rgb\(138,\s*97,\s*0\)|#8A6100/i.test(ap.couleur);
ck('compteur 10/9 en ambre, pas en rouge', ap.compteur === '10/9' && ambre && !rouge,
  ap.compteur + ' couleur=' + ap.couleur);
ck('le dépassement est présenté comme permis', /permis/.test(ap.info), ap.info);

// caler la pagination
await p.evaluate(() => [...document.querySelectorAll('.wt-head button')].find(x => /Caler/.test(x.textContent)).click());
await p.waitForTimeout(300);
const cal = await p.evaluate(() => ({ pages: PAGES[0].pages, entete: document.querySelector('.wt-planche .pg-cap').textContent.trim(), classe: document.querySelector('.wt-planche .pg-cap').className }));
ck('« Caler la pagination » aligne l attribution sur le composé',
  cal.pages === 3 && /3 attribuée/.test(cal.entete) && /ok/.test(cal.classe), JSON.stringify(cal));
if (errs.length) console.log('Erreurs JS : ' + errs.join(' | '));
await b.close();
