import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1400, height: 1100 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
p.on('dialog', d => d.accept());
await p.goto('file://' + process.argv[2]);
await p.addScriptTag({ path: process.argv[3] });
await p.waitForTimeout(350);
const ck = (n, ok, d) => console.log((ok ? '  OK   ' : '  ECHEC') + ' | ' + n + (ok ? '' : '  -> ' + d));

// composition volontairement irrégulière : 2 / 4 / 1 puis 3 — impossible à deviner
// à partir d'un simple découpage automatique en tranches de 9
const r = await p.evaluate(async () => {
  PAGES = [
    { pg: 'ÉVEIL', codes: [], pages: 3, niveaux: {}, pagesContenu: [['a1', 'a2'], ['b1', 'b2', 'b3', 'b4'], ['c1']] },
    { pg: 'JOUETS', codes: [], pages: 1, niveaux: {}, pagesContenu: [['z1', 'z2', 'z3']] }
  ];
  PRODUCTS = {}; POOL = []; RESERVE = []; PROJET_NOM = 'T'; PHOTO_SRC_DIR = '';
  for (const k of Object.keys(matchedFiles)) delete matchedFiles[k];
  for (const sec of PAGES) { aplatir(sec); for (const c of sec.codes) PRODUCTS[c] = { lib: c.toUpperCase(), prix: '990 F' }; }
  const cv = document.createElement('canvas'); cv.width = cv.height = 120;
  cv.getContext('2d').fillRect(0, 0, 120, 120);
  const bl = await new Promise(x => cv.toBlob(x, 'image/jpeg', 0.8));
  for (const c of allCodes()) { matchedFiles[c] = new File([bl], c + '.jpg', { type: 'image/jpeg' }); localBlobs[c] = matchedFiles[c]; }
  $('perPage').value = 9;
  renderBuilder();

  // 1. parcours
  const parcours = parcoursCompose().map(x => x.code + ':' + x.pageGlobale + '/' + x.pageLocale + '#' + x.pos);

  // 2. fusion InDesign
  const m = buildMergeFile('', true);
  const l = m.texte.split('\r\n').filter(Boolean);
  const cols = l[0].split('\t');
  const col = (ligne, nom) => ligne.split('\t')[cols.indexOf(nom)];
  const lignes = l.slice(1);

  // 3. catalogue web
  const cat = await buildCatalogueWeb('unique');
  const html = await cat.blob.text();

  // 4. dossier HD (repli zip, showDirectoryPicker absent ici)
  delete window.showDirectoryPicker;
  return {
    parcours, cols,
    fusion: lignes.map(x => col(x, 'Code') + ':' + col(x, 'PageCatalogue') + '/' + col(x, 'PageDansPlanche') + '#' + col(x, 'PositionDansPage')),
    pagesWeb: (html.match(/class="x-page"/g) || []).length,
    sautPage: /\.x-page\{break-after:page\}/.test(html),
    marqueurs: (html.match(/class="x-page-n">Page \d/g) || []).length
  };
});

ck('parcours restitue la composition',
  r.parcours.join(' ') === 'a1:1/1#1 a2:1/1#2 b1:2/2#1 b2:2/2#2 b3:2/2#3 b4:2/2#4 c1:3/3#1 z1:4/1#1 z2:4/1#2 z3:4/1#3',
  r.parcours.join(' '));
ck('colonnes de pagination dans la fusion',
  ['PageCatalogue', 'PageDansPlanche', 'PositionDansPage'].every(c => r.cols.includes(c)), JSON.stringify(r.cols));
ck('fusion : chaque produit porte sa page et son rang',
  r.fusion.join(' ') === r.parcours.join(' '), r.fusion.join(' '));
ck('catalogue web : une grille par page', r.pagesWeb === 4, String(r.pagesWeb));
ck('catalogue web : saut de page à l impression par page', r.sautPage, 'absent');
ck('catalogue web : pages numérotées', r.marqueurs === 4, String(r.marqueurs));

// dossier HD : arborescence par page
const zipInfo = await p.evaluate(async () => {
  const zip = new JSZip(); const root = zip.folder('PLANCHES_PHOTOS_PAR_PAGE');
  for (const pageInfo of pagesComposees()) {
    if (!pageInfo.codes.length) continue;
    const dir = root.folder(safeName(pageInfo.sec.pg) || 'planche').folder('Page ' + String(pageInfo.pageGlobale).padStart(2, '0'));
    let rang = 0;
    for (const code of pageInfo.codes) { rang++; const f = matchedFiles[code]; if (!f) continue; dir.file(String(rang).padStart(2, '0') + '_' + code + photoExt(f), f); }
  }
  const bl = await zip.generateAsync({ type: 'blob' });
  const z = await JSZip.loadAsync(bl);
  return Object.keys(z.files).filter(n => !z.files[n].dir).sort();
});
ck('dossier HD : un sous-dossier par page, photos numérotées',
  zipInfo.includes('PLANCHES_PHOTOS_PAR_PAGE/EVEIL/Page 02/03_b3.jpg') &&
  zipInfo.includes('PLANCHES_PHOTOS_PAR_PAGE/JOUETS/Page 04/01_z1.jpg'), JSON.stringify(zipInfo.slice(0, 4)));

// Excel
const xl = await p.evaluate(() => {
  const rows = [];
  let secCourante = null, pos = 0;
  for (const it of parcoursCompose()) {
    if (it.sec !== secCourante) { secCourante = it.sec; pos = 0; }
    pos++;
    rows.push([it.sec.pg, it.pageGlobale, it.pageLocale, it.pos, pos, it.code].join('|'));
  }
  return rows;
});
ck('Excel : page catalogue, page dans planche et rang',
  xl[6] === 'ÉVEIL|3|3|1|7' + '|c1' && xl[7] === 'JOUETS|4|1|1|1|z1', JSON.stringify(xl.slice(6, 8)));
if (errs.length) console.log('Erreurs JS : ' + errs.join(' | '));
await b.close();
