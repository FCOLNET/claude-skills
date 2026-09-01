import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1400, height: 1200 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
p.on('dialog', d => d.accept());
await p.goto('file://' + process.argv[2]);
await p.waitForTimeout(400);
const ck = (n, ok, d) => console.log((ok ? '  OK   ' : '  ECHEC') + ' | ' + n + (ok ? '' : '  -> ' + d));

// sélection imparfaite : vivier non vide, une réf sans photo, une sans prix
await p.evaluate(async () => {
  PAGES = [{ pg: 'A', codes: [], pages: 1, niveaux: {}, pagesContenu: [['p1', 'p2', 'p3']] }];
  PRODUCTS = {
    p1: { lib: 'AVEC TOUT', prix: '990 F' },
    p2: { lib: 'SANS PHOTO', prix: '890 F' },
    p3: { lib: '', prix: '' },
    v1: { lib: 'AU VIVIER', prix: '500 F' },
    r1: { lib: 'ECARTE', prix: '300 F' }
  };
  POOL = ['v1']; RESERVE = [{ code: 'r1', pg: 'A' }]; PROJET_NOM = 'T';
  for (const k of Object.keys(matchedFiles)) delete matchedFiles[k];
  aplatir(PAGES[0]);
  const cv = document.createElement('canvas'); cv.width = cv.height = 100;
  cv.getContext('2d').fillRect(0, 0, 100, 100);
  const bl = await new Promise(x => cv.toBlob(x, 'image/jpeg', 0.8));
  for (const c of ['p1', 'p3']) { matchedFiles[c] = new File([bl], c + '.jpg', { type: 'image/jpeg' }); localBlobs[c] = matchedFiles[c]; }
  $('perPage').value = 9;
  renderBuilder();
});

await p.click('#livrerBtn');
await p.waitForTimeout(300);
const av = await p.evaluate(() => {
  const ov = document.getElementById('livOverlay');
  return { texte: ov.textContent, boutons: [...ov.querySelectorAll('button')].length };
});
ck('récapitulatif chiffré', /3 référence\(s\)/.test(av.texte) && /1 planche\(s\)/.test(av.texte), av.texte.slice(0, 120));
ck('alerte : vivier non livré', /1 produit\(s\) au vivier/.test(av.texte) && /ne partiront pas/.test(av.texte), 'absente');
ck('alerte : référence sans visuel', /1 référence\(s\) sans visuel/.test(av.texte), 'absente');
ck('alerte : référence sans prix', /1 référence\(s\) sans prix/.test(av.texte), 'absente');
ck('réserve signalée comme volontaire', /1 produit\(s\) en réserve/.test(av.texte) && /écartés volontairement/.test(av.texte), 'absente');
ck('livrables proposés', /Dossier de fusion InDesign/.test(av.texte) && /Catalogue web/.test(av.texte)
  && /Dossier prod HD/.test(av.texte) && /Fichier projet/.test(av.texte) && /Récapitulatif Excel/.test(av.texte), 'incomplets');

// sélection saine : aucune alerte
await p.evaluate(async () => {
  document.getElementById('livOverlay').remove();
  POOL = []; RESERVE = [];
  PRODUCTS.p2 = { lib: 'OK', prix: '890 F' };
  PRODUCTS.p3 = { lib: 'OK2', prix: '700 F' };
  const cv = document.createElement('canvas'); cv.width = cv.height = 100;
  cv.getContext('2d').fillRect(0, 0, 100, 100);
  const bl = await new Promise(x => cv.toBlob(x, 'image/jpeg', 0.8));
  matchedFiles.p2 = new File([bl], 'p2.jpg', { type: 'image/jpeg' }); localBlobs.p2 = matchedFiles.p2;
  renderBuilder();
});
await p.click('#livrerBtn');
await p.waitForTimeout(300);
const sain = await p.evaluate(() => document.getElementById('livOverlay').textContent);
ck('sélection saine : message rassurant, aucune alerte',
  /Rien à signaler/.test(sain) && !/ne partiront pas/.test(sain), sain.slice(0, 100));

// bouton depuis la table de travail
await p.evaluate(() => { document.getElementById('livOverlay').remove(); ouvrirWorktable(); });
await p.waitForTimeout(300);
const dansTable = await p.evaluate(() => !![...document.querySelectorAll('.wt-bar button')].find(x => /Valider et livrer/.test(x.textContent)));
ck('bouton « Valider et livrer » dans la table de travail', dansTable, 'absent');
await p.evaluate(() => [...document.querySelectorAll('.wt-bar button')].find(x => /Valider et livrer/.test(x.textContent)).click());
await p.waitForTimeout(400);
const apres = await p.evaluate(() => ({
  table: $('worktable').classList.contains('hidden'),
  planches: !$('planches').classList.contains('hidden'),
  livraison: !!document.getElementById('livOverlay')
}));
ck('validation : retour aux planches puis livraison',
  apres.table && apres.planches && apres.livraison, JSON.stringify(apres));
if (errs.length) console.log('Erreurs JS : ' + errs.join(' | '));
await b.close();
