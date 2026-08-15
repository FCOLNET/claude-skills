import { chromium } from 'playwright-core';

const FILE = process.argv[2];
const EXE = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
page.on('dialog', d => d.accept());

await page.goto('file://' + FILE);
await page.waitForTimeout(600);

const results = [];
const check = (name, ok, detail) => results.push({ name, ok, detail });

// planches avec la colonne chemin renseignée, comme l'export caisse
await page.evaluate(() => {
  window.__setup = () => {
    PAGES = [{ pg: 'P1', codes: ['105143', '105144', '105145'] }];
    PRODUCTS = {
      '105143': { lib: 'GEL A', prix: '490 F', prixInit: '', prixPromo: '', remise: '', photo: '\\\\10.10.101.52\\SMRC_photo\\105143.jpg' },
      '105144': { lib: 'GEL B', prix: '490 F', prixInit: '', prixPromo: '', remise: '', photo: '\\\\10.10.101.52\\SMRC_photo\\105144.jpg' },
      '105145': { lib: 'GEL C', prix: '490 F', prixInit: '', prixPromo: '', remise: '', photo: '\\\\10.10.101.52\\AUTRE_photo\\ref-xyz-99.jpg' }
    };
    for (const k of Object.keys(matchedFiles)) delete matchedFiles[k];
    for (const k of Object.keys(localBlobs)) delete localBlobs[k];
    renderBuilder();
  };
  __setup();
});

// --- 1. lecture du chemin ----------------------------------------------------
const t1 = await page.evaluate(() => ({
  fichier: photoFileName('\\\\10.10.101.52\\SMRC_photo\\105143.jpg'),
  dossier: photoFolder('\\\\10.10.101.52\\SMRC_photo\\105143.jpg'),
  dossiers: photoFolders()
}));
check('nom de fichier extrait du chemin UNC', t1.fichier === '105143.jpg', t1.fichier);
check('dossier extrait du chemin UNC', t1.dossier === '\\\\10.10.101.52\\SMRC_photo', t1.dossier);
check('dossiers regroupés et comptés', t1.dossiers.length === 2 && t1.dossiers[0][1] === 2, JSON.stringify(t1.dossiers));

// --- 2. encart des dossiers affiché -----------------------------------------
const t2 = await page.evaluate(() => {
  const box = $('photoFolders');
  return { visible: !box.classList.contains('hidden'), texte: box.textContent.includes('SMRC_photo'), lignes: box.querySelectorAll('code').length };
});
check('encart « dossier à sélectionner » affiché', t2.visible && t2.texte && t2.lignes === 2, JSON.stringify(t2));

// --- 3. appariement par nom exact, y compris quand il ne ressemble pas au code
const t3 = await page.evaluate(async () => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 32;
  const b = await new Promise(r => cv.toBlob(r, 'image/jpeg'));
  // 'ref-xyz-99.jpg' n'a aucun rapport avec le code 105145 : seul le chemin permet de l'apparier
  const files = ['105143.jpg', '105144.jpg', 'ref-xyz-99.jpg', 'sans-rapport.jpg']
    .map(n => new File([b], n, { type: 'image/jpeg' }));
  await ingestFiles(files);
  return {
    servies: [...new Set(allCodes())].filter(c => matchedFiles[c]).length,
    xyz: !!matchedFiles['105145']
  };
});
check('3 références appariées', t3.servies === 3, JSON.stringify(t3));
check('nom sans rapport avec le code apparié via le chemin', t3.xyz === true);

// --- 4. compteur par dossier mis à jour --------------------------------------
const t4 = await page.evaluate(() => [...$('photoFolders').querySelectorAll('span')].map(s => s.textContent).filter(t => /\//.test(t)));
check('compteur servies/attendues par dossier', t4.includes('2 / 2 photo(s)') && t4.includes('1 / 1 photo(s)'), JSON.stringify(t4));

// --- 5. le chemin survit à la sauvegarde -------------------------------------
const t5 = await page.evaluate(async () => {
  syncProductsFromDOM();
  const apresSync = PRODUCTS['105143'].photo;
  const proj = await buildProject(true, { blobs: true });
  applyProject(proj);
  return { apresSync, apresProjet: (PRODUCTS['105143'] || {}).photo };
});
check('chemin conservé après sauvegarde et reprise',
  t5.apresSync === '\\\\10.10.101.52\\SMRC_photo\\105143.jpg' && t5.apresProjet === t5.apresSync, JSON.stringify(t5));

// --- 6. recherche ciblée : une seule demande par référence -------------------
const t6 = await page.evaluate(async () => {
  __setup();
  window.__lookups = [];
  window.showDirectoryPicker = async () => ({
    kind: 'directory',
    async getFileHandle(name) {
      window.__lookups.push(name);
      if (!['105143.jpg', '105144.jpg', 'ref-xyz-99.jpg'].includes(name)) { const e = new Error('nf'); e.name = 'NotFoundError'; throw e; }
      const cv = document.createElement('canvas'); cv.width = cv.height = 32;
      const b = await new Promise(r => cv.toBlob(r, 'image/jpeg'));
      return { kind: 'file', name, getFile: async () => new File([b], name, { type: 'image/jpeg' }) };
    },
    async *values() { }
  });
  await targetedImport();
  return { demandes: window.__lookups.length, servies: [...new Set(allCodes())].filter(c => matchedFiles[c]).length };
});
check('recherche ciblée : 1 demande par référence', t6.demandes === 4 && t6.servies === 3, JSON.stringify(t6));
console.log('  info  | recherche ciblée avec chemin : ' + t6.demandes + ' demandes pour 3 références (1 de détection + 3)');

// --- 7. liste des manquants enrichie -----------------------------------------
const t7 = await page.evaluate(async () => {
  __setup();
  refreshStats();
  let copie = null;
  const vrai = window.copyText;
  window.copyText = async t => { copie = t; return true; };
  await $('exportMissing').click();
  await new Promise(r => setTimeout(r, 50));
  window.copyText = vrai;
  return copie;
});
check('manquants exportés avec libellé et chemin',
  !!t7 && t7.includes('Chemin attendu') && t7.includes('SMRC_photo\\105143.jpg'), String(t7).slice(0, 120));

await browser.close();

let ko = 0;
for (const r of results) { if (!r.ok) ko++; console.log((r.ok ? '  OK   ' : '  ECHEC') + ' | ' + r.name + (r.detail && !r.ok ? '  -> ' + r.detail : '')); }
if (errors.length) { console.log('\nErreurs JS :'); errors.forEach(e => console.log('  ' + e)); }
console.log('\n' + (results.length - ko) + '/' + results.length + ' verifications passees');
process.exit(ko || errors.length ? 1 : 0);
