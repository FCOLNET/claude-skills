import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
p.on('dialog', d => d.accept());
await p.goto('file://' + process.argv[2]);
await p.waitForTimeout(500);
const ck = (n, ok, d) => console.log((ok ? '  OK   ' : '  ECHEC') + ' | ' + n + (ok ? '' : '  -> ' + d));

const r = await p.evaluate(async () => {
  PAGES = [{ pg: 'P1', codes: ['105143'] }];
  PRODUCTS = { '105143': { lib: 'AXE GEL DOUCHE', prix: '490 F', prixInit: '', prixPromo: '', remise: '' } };
  for (const k of Object.keys(matchedFiles)) delete matchedFiles[k];
  renderBuilder();
  // photo HD 4000px, au-dela du plafond presse-papier
  const cv = document.createElement('canvas'); cv.width = cv.height = 4000;
  const c = cv.getContext('2d'); c.fillStyle = '#8B1A2B'; c.fillRect(0, 0, 4000, 4000);
  const hd = await new Promise(x => cv.toBlob(x, 'image/jpeg', 0.9));
  matchedFiles['105143'] = new File([hd], '105143.jpg', { type: 'image/jpeg' });
  showCardPhoto('105143');
  const res = await copyImageToClipboard('105143');
  // relire ce qui est dans le presse-papier
  const items = await navigator.clipboard.read();
  const types = items[0] ? [...items[0].types] : [];
  const png = types.includes('image/png') ? await items[0].getType('image/png') : null;
  const bmp = png ? await createImageBitmap(png) : null;
  return {
    res, types, larg: bmp ? bmp.width : 0, haut: bmp ? bmp.height : 0,
    bouton: !!document.querySelector('.copy-card'),
    sourceHD: matchedFiles['105143'].size
  };
});

ck('bouton de copie present sur la vignette', r.bouton, 'absent');
ck('image ecrite dans le presse-papier', r.types.includes('image/png'), JSON.stringify(r.types));
ck('plafonnee a 3000 px', r.larg === 3000 && r.haut === 3000, r.larg + 'x' + r.haut);
ck('relue depuis le presse-papier', r.larg > 0, 'illisible');
console.log('  info  | source ' + Math.round(r.sourceHD / 1024) + ' Ko en 4000px -> presse-papier ' + r.res.w + 'x' + r.res.h + ', ' + Math.round(r.res.taille / 1024) + ' Ko PNG');
if (errs.length) console.log('Erreurs JS : ' + errs.join(' | '));
await b.close();
