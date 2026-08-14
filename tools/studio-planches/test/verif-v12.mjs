import { chromium } from 'playwright-core';

const FILE = process.argv[2];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

await page.goto('file://' + FILE);
await page.waitForTimeout(600);

const results = [];
const check = (name, ok, detail) => results.push({ name, ok, detail });

// --- 1. structure manuelle -------------------------------------------------
await page.click('#chooseManual');
await page.fill('#manPages', '2');
await page.fill('#manPerPage', '3');
await page.click('#buildManual');
await page.waitForTimeout(200);
check('structure manuelle : 6 vignettes', await page.locator('.card').count() === 6);

// --- 2. échappement d'un libellé hostile -----------------------------------
const escTest = await page.evaluate(() => {
  PAGES = [{ pg: 'Promo <B> "été"', codes: ['C1'] }];
  PRODUCTS = { C1: { lib: 'TV 55" LED <SMART> & CO', prix: '2 490 F', prixInit: '', prixPromo: '', remise: '' } };
  renderBuilder();
  const card = document.querySelector('.card');
  return {
    lib: card.querySelector('.card-lib').textContent,
    titre: document.querySelector('.planche-header h2').textContent,
    alt: card.querySelector('.prod-img').getAttribute('alt'),
    nbCards: document.querySelectorAll('.card').length
  };
});
check('libellé avec guillemets/chevrons intact', escTest.lib === 'TV 55" LED <SMART> & CO', escTest.lib);
check('titre de planche intact', escTest.titre === 'Promo <B> "été"', escTest.titre);
check('markup non cassé (1 seule carte)', escTest.nbCards === 1, String(escTest.nbCards));

// --- 3. même article sur deux planches -------------------------------------
const dup = await page.evaluate(async () => {
  PAGES = [{ pg: 'Page 1', codes: ['000123'] }, { pg: 'Page 2', codes: ['000123'] }];
  PRODUCTS = { '000123': { lib: '', prix: '', prixInit: '', prixPromo: '', remise: '' } };
  REF['000123'] = { lib: 'PERCEUSE 18V', prix: '12 900 F' };
  renderBuilder();
  // photo factice
  const cv = document.createElement('canvas'); cv.width = cv.height = 40;
  const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg'));
  const file = new File([blob], '000123.jpg', { type: 'image/jpeg' });
  matchedFiles['000123'] = file;
  showCardPhoto('000123');
  applyRefToCard('000123');
  await new Promise(r => setTimeout(r, 150));
  const cards = [...document.querySelectorAll('.card')];
  return {
    n: cards.length,
    photos: cards.filter(c => c.querySelector('.prod-img').style.display === 'block').length,
    libs: cards.map(c => c.querySelector('.card-lib').textContent)
  };
});
check('2 vignettes pour un article repris', dup.n === 2, String(dup.n));
check('photo posée sur les 2 vignettes', dup.photos === 2, dup.photos + '/2');
check('libellé base appliqué aux 2', dup.libs.every(l => l === 'PERCEUSE 18V'), JSON.stringify(dup.libs));

// --- 4. suppression d'une vignette dupliquée ne casse pas l'autre -----------
const del = await page.evaluate(() => {
  document.querySelectorAll('.card')[0].querySelector('.del-card').click();
  return { reste: document.querySelectorAll('.card').length, photoEncore: !!matchedFiles['000123'], produitEncore: !!PRODUCTS['000123'] };
});
check('la 2e vignette garde sa photo', del.photoEncore && del.produitEncore, JSON.stringify(del));

// --- 5. HD préservé / photoExt ---------------------------------------------
const hd = await page.evaluate(() => ({
  jpg: photoExt({ type: 'image/jpeg', name: 'x.png' }),
  png: photoExt({ type: 'image/png', name: 'x' }),
  fallback: photoExt({ type: '', name: 'abc.WEBP' }),
  isHD: isHD('000123')
}));
check('extension suit le type réel', hd.jpg === '.jpg' && hd.png === '.png' && hd.fallback === '.webp', JSON.stringify(hd));
check('photo fraîche marquée HD', hd.isHD === true);

// --- 6. reset entre deux constructions --------------------------------------
const reset = await page.evaluate(() => {
  resetWorkspace();
  return { pages: PAGES.length, prod: Object.keys(PRODUCTS).length, files: Object.keys(matchedFiles).length };
});
check('resetWorkspace vide tout', reset.pages === 0 && reset.prod === 0 && reset.files === 0, JSON.stringify(reset));

// --- 7. fmtPrix homogène -----------------------------------------------------
const prix = await page.evaluate(() => [fmtPrix(2490), fmtPrix('2490'), fmtPrix('2 490 F'), fmtPrix(''), fmtPrix(0)]);
check('formatage des prix', JSON.stringify(prix) === JSON.stringify(['2 490 F', '2 490 F', '2 490 F', '', '']), JSON.stringify(prix));

await browser.close();

let ko = 0;
for (const r of results) { if (!r.ok) ko++; console.log((r.ok ? '  OK   ' : '  ECHEC') + ' | ' + r.name + (r.detail && !r.ok ? '  -> ' + r.detail : '')); }
if (errors.length) { console.log('\nErreurs JS :'); errors.forEach(e => console.log('  ' + e)); }
console.log('\n' + (results.length - ko) + '/' + results.length + ' verifications passees');
process.exit(ko || errors.filter(e => e.startsWith('PAGEERROR')).length ? 1 : 0);
