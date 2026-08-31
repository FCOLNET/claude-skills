import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
p.on('dialog', d => d.accept());
await p.goto('file://' + process.argv[2]);
await p.addScriptTag({ path: process.argv[3] });
await p.waitForTimeout(300);
const ck = (n, ok, d) => console.log((ok ? '  OK   ' : '  ECHEC') + ' | ' + n + (ok ? '' : '  -> ' + d));

const r = await p.evaluate(async () => {
  PAGES = [{ pg: 'JOUETS', codes: ['100001', '100002'], pages: 2, niveaux: { '100001': 'hero' } }];
  PRODUCTS = {
    '100001': { lib: 'POUSSEUR BÉBÉ', prix: '2 690 F', prixInit: '3 490 F', prixPromo: '2 690 F', remise: '' },
    '100002': { lib: 'LAPIN BOIS', prix: '990 F', prixInit: '', prixPromo: '', remise: '' }
  };
  for (const k of Object.keys(matchedFiles)) delete matchedFiles[k];
  for (const k of Object.keys(localBlobs)) delete localBlobs[k];
  renderBuilder();
  const cv = document.createElement('canvas'); cv.width = cv.height = 900;
  const c = cv.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, 900, 900);
  c.fillStyle = '#8B1A2B'; c.beginPath(); c.arc(450, 450, 300, 0, 7); c.fill();
  const bl = await new Promise(x => cv.toBlob(x, 'image/jpeg', 0.9));
  for (const code of ['100001', '100002']) {
    matchedFiles[code] = new File([bl], code + '.jpg', { type: 'image/jpeg' });
    localBlobs[code] = matchedFiles[code];
  }

  const uniq = await buildCatalogueWeb('unique');
  const htmlU = await uniq.blob.text();
  const doss = await buildCatalogueWeb('dossier');
  const z = await JSZip.loadAsync(doss.blob);
  const racine = Object.keys(z.files)[0].split('/')[0];
  const htmlD = await z.file(racine + '/index.html').async('string');

  return {
    uniqueEstHtml: uniq.unique === true && uniq.blob.type.startsWith('text/html'),
    imagesIncorporees: (htmlU.match(/src="data:image\/jpeg;base64,/g) || []).length,
    aucunFichierExterne: !/src="images\//.test(htmlU),
    poidsUnique: uniq.blob.size,
    dossierLie: (htmlD.match(/src="images\/\d+\.jpg"/g) || []).length,
    imagesDansZip: Object.keys(z.files).filter(n => /images\/.*\.jpg$/.test(n)).length,
    alerteDansLesDeux: /id="alerteImg"/.test(htmlU) && /id="alerteImg"/.test(htmlD),
    scriptDetection: /tagName===.IMG./.test(htmlD),
    visuels: doss.visuels
  };
});

ck('fichier unique : un seul HTML', r.uniqueEstHtml, JSON.stringify(r.uniqueEstHtml));
ck('visuels incorporés dans le fichier unique', r.imagesIncorporees === 2, r.imagesIncorporees);
ck('aucune dépendance externe dans le fichier unique', r.aucunFichierExterne, 'référence externe trouvée');
ck('version dossier : images liées et présentes', r.dossierLie === 2 && r.imagesDansZip === 2,
  'liees=' + r.dossierLie + ' zip=' + r.imagesDansZip);
ck('bandeau de diagnostic présent dans les deux', r.alerteDansLesDeux, 'absent');
ck('détection des visuels non chargés', r.scriptDetection, 'script absent');

// le bandeau s'affiche-t-il vraiment quand les images manquent ?
const p2 = await b.newPage();
await p2.setContent((await p.evaluate(async () => {
  const d = await buildCatalogueWeb('dossier');
  const z = await JSZip.loadAsync(d.blob);
  const racine = Object.keys(z.files)[0].split('/')[0];
  return await z.file(racine + '/index.html').async('string');
})));
await p2.waitForTimeout(900);
const visible = await p2.evaluate(() => {
  const a = document.getElementById('alerteImg');
  return a ? getComputedStyle(a).display : 'absent';
});
ck('bandeau visible quand le dossier images manque', visible === 'block', visible);
console.log('  info  | fichier unique : ' + Math.round(r.poidsUnique / 1024) + ' Ko pour 2 visuels 800 px');
if (errs.length) console.log('Erreurs JS : ' + errs.join(' | '));
await b.close();
