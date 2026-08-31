import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage();
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
  const cv = document.createElement('canvas'); cv.width = cv.height = 1800;
  const c = cv.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, 1800, 1800);
  c.fillStyle = '#8B1A2B'; c.beginPath(); c.arc(900, 900, 600, 0, 7); c.fill();
  const hd = await new Promise(x => cv.toBlob(x, 'image/jpeg', 0.92));
  matchedFiles['105143'] = new File([hd], '105143.jpg', { type: 'image/jpeg' });
  showCardPhoto('105143');
  await new Promise(x => setTimeout(x, 100));

  const carte = c2 => document.querySelector('.card[data-code="' + c2 + '"]');
  const tirer = (el, code) => {
    const dt = new DataTransfer();
    const ev = new DragEvent('dragstart', { dataTransfer: dt, bubbles: true, cancelable: true });
    el.dispatchEvent(ev);
    return { types: [...dt.types], dl: dt.getData('DownloadURL'), txt: dt.getData('text/plain') };
  };
  const img = carte('105143').querySelector('.prod-img');
  const depuisImage = tirer(img, '105143');
  const slotSansPhoto = carte('105144').querySelector('.photo-slot');
  const sansPhoto = tirer(slotSansPhoto, '105144');

  // taille du fichier promis
  let octets = 0;
  if (depuisImage.dl) {
    const u = depuisImage.dl.slice(depuisImage.dl.indexOf(':', depuisImage.dl.indexOf(':') + 1) + 1);
    octets = (await (await fetch(u)).blob()).size;
  }
  return {
    imgGlissable: img.getAttribute('draggable'),
    depuisImage, sansPhoto, octets, hdOctets: hd.size,
    // le gestionnaire du conteneur ne doit pas doubler celui de l'image
    doublon: (() => {
      const dt = new DataTransfer();
      const ev = new DragEvent('dragstart', { dataTransfer: dt, bubbles: true, cancelable: true });
      img.dispatchEvent(ev);   // remonte jusqu'au conteneur
      return dt.getData('DownloadURL').split('DownloadURL').length;
    })()
  };
});

ck('l image est la source du glisser', r.imgGlissable === 'true', String(r.imgGlissable));
ck('promesse de fichier jointe', !!r.depuisImage.dl, JSON.stringify(r.depuisImage.types));
ck('fichier promis en pleine résolution', r.octets === r.hdOctets, r.octets + ' / ' + r.hdOctets);
ck('aucun texte concurrent', r.depuisImage.txt === '', JSON.stringify(r.depuisImage.txt));
ck('un seul format ajouté par nous', r.depuisImage.types.length === 1, JSON.stringify(r.depuisImage.types));
ck('vignette sans photo : texte seul', r.sansPhoto.txt.includes('105144') && !r.sansPhoto.dl, JSON.stringify(r.sansPhoto));
ck('pas de double traitement par le conteneur', r.doublon === 1, 'traité ' + r.doublon + ' fois');
if (errs.length) console.log('Erreurs JS : ' + errs.join(' | '));
await b.close();
