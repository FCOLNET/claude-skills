import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
p.on('dialog', d => d.accept());
await p.goto('file://' + process.argv[2]);
await p.waitForTimeout(400);
const ck = (n, ok, d) => console.log((ok ? '  OK   ' : '  ECHEC') + ' | ' + n + (ok ? '' : '  -> ' + d));

const r = await p.evaluate(async () => {
  PAGES = [{ pg: 'P1', codes: ['105143', '105144'] }];
  PRODUCTS = {
    '105143': { lib: 'AXE GEL DOUCHE', prix: '490 F', prixInit: '', prixPromo: '', remise: '' },
    '105144': { lib: 'SANS PHOTO', prix: '990 F', prixInit: '', prixPromo: '', remise: '' }
  };
  for (const k of Object.keys(matchedFiles)) delete matchedFiles[k];
  for (const k of Object.keys(localBlobs)) delete localBlobs[k];
  renderBuilder();
  const cv = document.createElement('canvas'); cv.width = cv.height = 1200;
  const c = cv.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, 1200, 1200);
  c.fillStyle = '#8B1A2B'; c.beginPath(); c.arc(600, 600, 400, 0, 7); c.fill();
  const bl = await new Promise(x => cv.toBlob(x, 'image/jpeg', 0.9));
  matchedFiles['105143'] = new File([bl], '105143.jpg', { type: 'image/jpeg' });
  showCardPhoto('105143');
  await new Promise(x => setTimeout(x, 100));

  const tirer = el => {
    const dt = new DataTransfer();
    el.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt, bubbles: true, cancelable: true }));
    return { types: [...dt.types], dl: dt.getData('DownloadURL'), txt: dt.getData('text/plain') };
  };
  const carte = cc => document.querySelector('.card[data-code="' + cc + '"]');
  const surPhoto = tirer(carte('105143').querySelector('.prod-img'));
  const sansPhoto = tirer(carte('105144').querySelector('.photo-slot'));

  // la voie fiable doit rester intacte
  const cp = await copyImageToClipboard('105143');
  const items = await navigator.clipboard.read();
  const types = items[0] ? [...items[0].types] : [];

  return {
    surPhoto, sansPhoto, cp, types,
    boutonCopie: (document.querySelector('.copy-card') || {}).textContent,
    imgSansAttribut: !carte('105143').querySelector('.prod-img').hasAttribute('data-nodrag')
  };
});

ck('glisser une photo : rien n est imposé au navigateur',
  r.surPhoto.types.length === 0 && !r.surPhoto.dl, JSON.stringify(r.surPhoto.types));
ck('aucune promesse de fichier résiduelle', r.surPhoto.dl === '', r.surPhoto.dl.slice(0, 40));
ck('vignette sans photo : texte toujours déposé',
  r.sansPhoto.txt.includes('105144') && !r.sansPhoto.dl, JSON.stringify(r.sansPhoto));
ck('copie presse-papier intacte', r.types.includes('image/png') && r.cp.w === 1200, JSON.stringify(r.cp));
ck('bouton de copie explicite', /Copier/.test(r.boutonCopie || ''), r.boutonCopie);
if (errs.length) console.log('Erreurs JS : ' + errs.join(' | '));
await b.close();
