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

// Fabrique un faux dossier réseau à partir d'une liste de noms de fichiers.
await page.evaluate(() => {
  window.__mountFolder = names => {
    window.__stats = { lookups: 0, enumerated: 0 };
    const present = new Set(names);
    const makeFile = async name => {
      const cv = document.createElement('canvas'); cv.width = cv.height = 32;
      const b = await new Promise(r => cv.toBlob(r, 'image/jpeg'));
      return new File([b], name, { type: 'image/jpeg' });
    };
    window.showDirectoryPicker = async () => ({
      kind: 'directory', name: 'dossier-test',
      async getFileHandle(name) {
        window.__stats.lookups++;
        if (!present.has(name)) { const e = new Error('nf'); e.name = 'NotFoundError'; throw e; }
        return { kind: 'file', name, getFile: () => makeFile(name) };
      },
      async *values() {
        for (const n of present) { window.__stats.enumerated++; yield { kind: 'file', name: n, getFile: () => makeFile(n) }; }
      }
    });
  };
  // base articles : 5 codes, chacun avec une réf. fournisseur écrite avec un tiret
  window.__loadBase = () => {
    REF = {}; REF_FOURN = {}; REF_FOURN_RAW = {};
    for (let i = 1; i <= 5; i++) {
      const code = String(105142 + i);
      const raw = 'AXE-GD' + i + '/25';
      REF[code] = { lib: 'GEL DOUCHE ' + i, prix: '490 F' };
      REF_FOURN[normFourn(raw)] = code;
      REF_FOURN_RAW[code] = [raw];
    }
  };
  window.__planches = () => {
    PAGES = [{ pg: 'P1', codes: ['105143', '105144', '105145', '105146', '105147'] }];
    PRODUCTS = {}; for (const c of allCodes()) PRODUCTS[c] = { lib: '', prix: '', prixInit: '', prixPromo: '', remise: '' };
    for (const k of Object.keys(matchedFiles)) delete matchedFiles[k];
    for (const k of Object.keys(localBlobs)) delete localBlobs[k];
    _prefBase = null; _prefExt = null;
    renderBuilder();
  };
});

// --- 1. dossier nommé par code article --------------------------------------
const t1 = await page.evaluate(async () => {
  __loadBase(); __planches();
  const noms = []; for (let i = 0; i < 5000; i++) noms.push(String(103000 + i) + '.jpg');
  __mountFolder(noms);
  await targetedImport();
  return { ...window.__stats, servies: allCodes().filter(c => matchedFiles[c]).length, conv: conventionLabel(_prefBase, _prefExt) };
});
check('dossier « code article » : 5/5 servies', t1.servies === 5, JSON.stringify(t1));
check('dossier « code article » : aucun parcours', t1.enumerated === 0, t1.enumerated + ' énumérés');
console.log('  info  | code article    → ' + t1.lookups + ' recherches, convention détectée : ' + t1.conv);

// --- 2. dossier nommé par référence fournisseur (avec tirets et slash) -------
const t2 = await page.evaluate(async () => {
  __loadBase(); __planches();
  const noms = []; for (let i = 1; i <= 5; i++) noms.push('AXE-GD' + i + '/25.JPG');
  for (let i = 0; i < 3000; i++) noms.push('DIV-' + i + '.JPG');
  __mountFolder(noms);
  await targetedImport();
  return { ...window.__stats, servies: allCodes().filter(c => matchedFiles[c]).length, conv: conventionLabel(_prefBase, _prefExt) };
});
check('dossier « réf. fournisseur » : 5/5 servies', t2.servies === 5, JSON.stringify(t2));
check('dossier « réf. fournisseur » : aucun parcours', t2.enumerated === 0, t2.enumerated + ' énumérés');
check('convention fournisseur annoncée', /fournisseur/.test(t2.conv), t2.conv);
console.log('  info  | réf. fournisseur → ' + t2.lookups + ' recherches, convention détectée : ' + t2.conv);

// --- 3. réf. fournisseur écrite avec un séparateur différent -----------------
const t3 = await page.evaluate(async () => {
  __loadBase(); __planches();
  const noms = []; for (let i = 1; i <= 5; i++) noms.push('AXE GD' + i + ' 25.jpg');   // espaces au lieu de -/
  __mountFolder(noms);
  await targetedImport();
  return { ...window.__stats, servies: allCodes().filter(c => matchedFiles[c]).length };
});
check('séparateurs différents : retrouvées par parcours', t3.servies === 5, JSON.stringify(t3));
console.log('  info  | séparateurs ≠     → ' + t3.lookups + ' recherches + ' + t3.enumerated + ' fichiers parcourus');

// --- 4. base sans colonne fournisseur : on ne casse rien ---------------------
const t4 = await page.evaluate(async () => {
  REF = {}; REF_FOURN = {}; REF_FOURN_RAW = {};
  for (let i = 1; i <= 5; i++) REF[String(105142 + i)] = { lib: 'GEL ' + i, prix: '490 F' };
  __planches();
  __mountFolder(['105143.jpg', '105144.jpg', '105145.jpg', '105146.jpg', '105147.jpg']);
  await targetedImport();
  return { servies: allCodes().filter(c => matchedFiles[c]).length, ...window.__stats };
});
check('sans base fournisseur : code article toujours servi', t4.servies === 5, JSON.stringify(t4));

// --- 5. réf. brute conservée et exportée -------------------------------------
const t5 = await page.evaluate(() => {
  __loadBase();
  const m = fournByCode();
  return { brut: (m['105143'] || [])[0], variantes: fournVariants('AXE-GD1/25').length };
});
check('référence fournisseur conservée telle qu\'écrite', t5.brut === 'AXE-GD1/25', JSON.stringify(t5));

await browser.close();

let ko = 0;
for (const r of results) { if (!r.ok) ko++; console.log((r.ok ? '  OK   ' : '  ECHEC') + ' | ' + r.name + (r.detail && !r.ok ? '  -> ' + r.detail : '')); }
if (errors.length) { console.log('\nErreurs JS :'); errors.forEach(e => console.log('  ' + e)); }
console.log('\n' + (results.length - ko) + '/' + results.length + ' verifications passees');
process.exit(ko || errors.length ? 1 : 0);
