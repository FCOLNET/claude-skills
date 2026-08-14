import { chromium } from 'playwright-core';

const FILE = process.argv[2];
const EXE = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
page.on('dialog', d => d.accept());   // confirm/alert : on accepte

await page.goto('file://' + FILE);
await page.waitForTimeout(600);

const results = [];
const check = (name, ok, detail) => results.push({ name, ok, detail });

// Faux dossier réseau : 5000 photos, dont celles de nos 5 références.
// getFileHandle = recherche ciblée ; values() = parcours complet (ce qu'on veut éviter).
await page.evaluate(() => {
  window.__stats = { lookups: 0, enumerated: 0 };
  const present = new Set();
  for (let i = 0; i < 5000; i++) present.add(String(103000 + i) + '.jpg');   // 103000 → 107999
  const makeFile = async name => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 32;
    const b = await new Promise(r => cv.toBlob(r, 'image/jpeg'));
    return new File([b], name, { type: 'image/jpeg' });
  };
  window.showDirectoryPicker = async () => ({
    kind: 'directory', name: 'ftp_web$',
    async getFileHandle(name) {
      window.__stats.lookups++;
      if (!present.has(name)) { const e = new Error('not found'); e.name = 'NotFoundError'; throw e; }
      return { kind: 'file', name, getFile: () => makeFile(name) };
    },
    async *values() {
      for (const n of present) { window.__stats.enumerated++; yield { kind: 'file', name: n, getFile: () => makeFile(n) }; }
    }
  });
});

// --- 1. import ciblé : ne lit que les photos utiles -------------------------
const t1 = await page.evaluate(async () => {
  PAGES = [{ pg: 'P1', codes: ['105143', '105144', '105145'] }, { pg: 'P2', codes: ['105146', '105147'] }];
  PRODUCTS = {}; for (const c of allCodes()) PRODUCTS[c] = { lib: '', prix: '', prixInit: '', prixPromo: '', remise: '' };
  renderBuilder();
  const t0 = performance.now();
  await targetedImport();
  return { ms: Math.round(performance.now() - t0), ...window.__stats, servies: allCodes().filter(c => matchedFiles[c]).length };
});
check('5 références servies', t1.servies === 5, JSON.stringify(t1));
check('aucun parcours du dossier', t1.enumerated === 0, t1.enumerated + ' fichiers énumérés');
check('recherches ciblées peu nombreuses', t1.lookups <= 12, t1.lookups + ' recherches pour 5 réf.');
console.log('  info  | ' + t1.lookups + ' recherches ciblées, ' + t1.enumerated + ' fichiers énumérés, ' + t1.ms + ' ms');

// --- 2. repli par parcours quand le nom ne colle pas ------------------------
const t2 = await page.evaluate(async () => {
  window.__stats = { lookups: 0, enumerated: 0 };
  _prefBase = null; _prefExt = null;
  PAGES = [{ pg: 'P1', codes: ['999999'] }];   // absente du dossier
  PRODUCTS = { '999999': { lib: '', prix: '', prixInit: '', prixPromo: '', remise: '' } };
  for (const k of Object.keys(matchedFiles)) delete matchedFiles[k];
  renderBuilder();
  await targetedImport();
  return { ...window.__stats, servies: allCodes().filter(c => matchedFiles[c]).length };
});
check('référence absente : parcours déclenché puis rendu bredouille', t2.enumerated > 0 && t2.servies === 0, JSON.stringify(t2));

// --- 3. sauvegarde auto en Blob : instantanée et fidèle ---------------------
const t3 = await page.evaluate(async () => {
  PAGES = [{ pg: 'P1', codes: ['105143', '105144'] }];
  PRODUCTS = { '105143': { lib: 'GEL DOUCHE', prix: '490 F', prixInit: '', prixPromo: '', remise: '' }, '105144': { lib: 'GEL 2', prix: '490 F', prixInit: '', prixPromo: '', remise: '' } };
  for (const k of Object.keys(matchedFiles)) delete matchedFiles[k];
  for (const k of Object.keys(localBlobs)) delete localBlobs[k];
  renderBuilder();
  await targetedImport();
  const t0 = performance.now();
  const proj = await buildProject(true, { blobs: true });
  const msBlob = performance.now() - t0;
  const t1 = performance.now();
  await buildProject(true, {});                     // ancien mode dataURL, pour comparaison
  const msDataUrl = performance.now() - t1;
  const photo = proj.photos['105143'];
  // aller-retour complet : on réapplique le projet
  await idbSet('probe', proj);
  const back = await idbGet('probe');
  applyProject(back);
  return {
    msBlob: Math.round(msBlob), msDataUrl: Math.round(msDataUrl),
    estBlob: !!(photo && photo.blob instanceof Blob),
    sansBase64: !(photo && photo.url),
    restaurees: allCodes().filter(c => matchedFiles[c]).length,
    affichees: [...document.querySelectorAll('.card .prod-img')].filter(i => i.style.display === 'block').length,
    lib: (document.querySelector('.card-lib') || {}).textContent
  };
});
check('photos stockées en Blob, sans base64', t3.estBlob && t3.sansBase64, JSON.stringify(t3));
check('reprise : photos et libellés restaurés', t3.restaurees === 2 && t3.affichees === 2 && t3.lib === 'GEL DOUCHE', JSON.stringify(t3));
check('sauvegarde auto plus rapide qu\'avant', t3.msBlob < t3.msDataUrl, t3.msBlob + ' ms vs ' + t3.msDataUrl + ' ms');
console.log('  info  | sauvegarde auto : ' + t3.msBlob + ' ms (Blob) contre ' + t3.msDataUrl + ' ms (base64, ancien mode)');

// --- 4. photos restaurées signalées comme non-HD ----------------------------
const t4 = await page.evaluate(() => ({ hd: isHD('105143'), restaurees: restoredPhotos.size }));
check('photos reprises marquées non-HD', t4.hd === false && t4.restaurees === 2, JSON.stringify(t4));

await browser.close();

let ko = 0;
for (const r of results) { if (!r.ok) ko++; console.log((r.ok ? '  OK   ' : '  ECHEC') + ' | ' + r.name + (r.detail && !r.ok ? '  -> ' + r.detail : '')); }
if (errors.length) { console.log('\nErreurs JS :'); errors.forEach(e => console.log('  ' + e)); }
console.log('\n' + (results.length - ko) + '/' + results.length + ' verifications passees');
process.exit(ko || errors.length ? 1 : 0);
