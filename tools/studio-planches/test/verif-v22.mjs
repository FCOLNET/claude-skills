import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
p.on('dialog', d => d.accept());
await p.goto('file://' + process.argv[2]);
await p.waitForTimeout(500);
const ck = (n, ok, d) => console.log((ok ? '  OK   ' : '  ECHEC') + ' | ' + n + (ok ? '' : '  -> ' + d));

const r = await p.evaluate(async () => {
  PAGES = [{ pg: 'P1', codes: ['105143', '105144'] }];
  PRODUCTS = {
    '105143': { lib: 'AXE GEL DOUCHE 250ML AFRICA 3E', prix: '490 F', prixInit: '', prixPromo: '', remise: '' },
    '105144': { lib: 'SANS PHOTO', prix: '990 F', prixInit: '', prixPromo: '', remise: '' }
  };
  for (const k of Object.keys(matchedFiles)) delete matchedFiles[k];
  for (const k of Object.keys(localBlobs)) delete localBlobs[k];
  renderBuilder();
  // photo HD sur la 1re seulement
  const cv = document.createElement('canvas'); cv.width = cv.height = 2400;
  const ctx = cv.getContext('2d'); ctx.fillStyle = '#8B1A2B'; ctx.fillRect(0, 0, 2400, 2400);
  const hd = await new Promise(x => cv.toBlob(x, 'image/jpeg', 0.95));
  matchedFiles['105143'] = new File([hd], '105143.jpg', { type: 'image/jpeg' });
  // copie de travail plus petite, pour verifier que le glisser envoie bien la HD
  const cv2 = document.createElement('canvas'); cv2.width = cv2.height = 300;
  cv2.getContext('2d').fillRect(0, 0, 300, 300);
  const petite = await new Promise(x => cv2.toBlob(x, 'image/jpeg', 0.7));
  localBlobs['105143'] = petite;
  showCardPhoto('105143');

  // simule un dragstart sur chaque vignette
  const lire = code => {
    const slot = document.querySelector('.card[data-code="' + code + '"] .photo-slot');
    const dt = new DataTransfer();
    const ev = new DragEvent('dragstart', { dataTransfer: dt, bubbles: true, cancelable: true });
    slot.dispatchEvent(ev);
    return { types: [...dt.types], dl: dt.getData('DownloadURL'), txt: dt.getData('text/plain'), html: dt.getData('text/html') };
  };
  const avec = lire('105143');
  const sans = lire('105144');

  // le fichier reellement pointe par DownloadURL doit etre la HD
  let tailleEnvoyee = null, mime = null, nom = null;
  if (avec.dl) {
    const i1 = avec.dl.indexOf(':'), i2 = avec.dl.indexOf(':', i1 + 1);
    mime = avec.dl.slice(0, i1); nom = avec.dl.slice(i1 + 1, i2);
    const url = avec.dl.slice(i2 + 1);
    tailleEnvoyee = (await (await fetch(url)).blob()).size;
  }
  return {
    avec, sans, mime, nom, tailleEnvoyee,
    tailleHD: matchedFiles['105143'].size, tailleCopie: petite.size,
    draggable: document.querySelector('.photo-slot').getAttribute('draggable')
  };
});

ck('vignette rendue glissable', r.draggable === 'true', r.draggable);
ck('DownloadURL fourni', !!r.avec.dl, JSON.stringify(r.avec.types));
ck('type mime correct', r.mime === 'image/jpeg', r.mime);
ck('nom de fichier lisible en maquette', /^105143.*\.jpg$/.test(r.nom), r.nom);
ck('fichier envoye = pleine resolution', r.tailleEnvoyee === r.tailleHD && r.tailleHD > r.tailleCopie * 3,
  'envoye ' + r.tailleEnvoyee + ' / HD ' + r.tailleHD + ' / copie ' + r.tailleCopie);
// V24 : avec une photo, le fichier doit etre LE SEUL format propose.
// Word privilegie le texte des qu'on lui en offre et ignore alors la photo.
ck('aucun texte concurrent quand il y a une photo', r.avec.txt === '' && r.avec.html === '', 'txt=' + JSON.stringify(r.avec.txt) + ' html=' + JSON.stringify(r.avec.html));
ck('un seul format propose', r.avec.types.length === 1 && r.avec.types[0] === 'downloadurl', JSON.stringify(r.avec.types));
ck('vignette sans photo : texte seul, pas de fichier', !r.sans.dl && r.sans.txt.includes('105144'), JSON.stringify(r.sans));
console.log('  info  | nom depose : ' + r.nom + ' — ' + Math.round(r.tailleEnvoyee / 1024) + ' Ko (copie de travail : ' + Math.round(r.tailleCopie / 1024) + ' Ko)');
if (errs.length) console.log('Erreurs JS : ' + errs.join(' | '));
await b.close();
