import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
p.on('dialog', d => d.accept());
await p.goto('file://' + process.argv[2]);
await p.waitForTimeout(400);
const ck = (n, ok, d) => console.log((ok ? '  OK   ' : '  ECHEC') + ' | ' + n + (ok ? '' : '  -> ' + d));

await p.evaluate(async () => {
  PAGES = [{ pg: 'P1', codes: ['105143'] }];
  PRODUCTS = { '105143': { lib: 'AXE GEL DOUCHE "3E"', prix: '490 F', prixInit: '', prixPromo: '', remise: '' } };
  for (const k of Object.keys(matchedFiles)) delete matchedFiles[k];
  for (const k of Object.keys(localBlobs)) delete localBlobs[k];
  renderBuilder();
  const cv = document.createElement('canvas'); cv.width = cv.height = 900;
  const c = cv.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, 900, 900);
  c.fillStyle = '#8B1A2B'; c.beginPath(); c.arc(450, 450, 300, 0, 7); c.fill();
  const bl = await new Promise(x => cv.toBlob(x, 'image/jpeg', 0.9));
  matchedFiles['105143'] = new File([bl], '105143.jpg', { type: 'image/jpeg' });
  showCardPhoto('105143');
  await new Promise(x => setTimeout(x, 200));
  window.__m = null;
  document.addEventListener('dragstart', e => {
    const dt = e.dataTransfer;
    let f = null;
    for (const it of dt.items) if (it.kind === 'file') { const x = it.getAsFile(); if (x) f = { taille: x.size }; }
    window.__m = { types: [...dt.types], html: dt.getData('text/html'), fichier: f };
  }, false);
});

const tirer = async () => {
  const loc = p.locator('.prod-img').first();
  await loc.scrollIntoViewIfNeeded(); await p.waitForTimeout(120);
  const box = await loc.boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);   // survol -> préparation
  await p.waitForTimeout(500);
  await p.mouse.down();
  for (let i = 1; i <= 8; i++) { await p.mouse.move(box.x + box.width / 2 + i * 20, box.y + box.height / 2 + i * 8); await p.waitForTimeout(30); }
  const m = await p.evaluate(() => window.__m);
  await p.mouse.up(); await p.waitForTimeout(100);
  return m;
};
const r = await tirer();

ck('image incorporée dans le format HTML', /src="data:image\/jpeg;base64,/.test(r.html || ''), (r.html || '').slice(0, 70));
ck('plus aucune adresse interne au navigateur', !/blob:/.test(r.html || ''), 'blob: encore présent');
ck('le fichier joint est conservé', r.types.includes('Files') && r.fichier && r.fichier.taille > 5000,
  JSON.stringify({ types: r.types, f: r.fichier }));
ck('libellé échappé dans le HTML', /alt="AXE GEL DOUCHE &quot;3E&quot;"/.test(r.html || ''), (r.html || '').slice(-60));
const prep = await p.evaluate(() => ({ taille: dragDataUrls.size, borne: DRAG_CACHE_MAX }));
ck('cache de préparation borné', prep.taille >= 1 && prep.taille <= prep.borne, JSON.stringify(prep));
// V32 : plus aucun format "adresse", que Word insérait sous forme de lien
ck('aucun format adresse résiduel',
  !r.types.includes('text/uri-list') && !r.types.includes('text/plain'), JSON.stringify(r.types));
ck('seuls le HTML porteur de l image et le fichier subsistent',
  r.types.includes('text/html') && r.types.includes('Files') && r.types.length === 2, JSON.stringify(r.types));
console.log('  info  | HTML transmis : ' + Math.round((r.html || '').length / 1024) + ' Ko, image incorporée');
if (errs.length) console.log('Erreurs JS : ' + errs.join(' | '));
await b.close();
