import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
p.on('dialog', d => d.accept());
await p.goto('file://' + process.argv[2]);
await p.waitForTimeout(400);
const ck = (n, ok, d) => console.log((ok ? '  OK   ' : '  ECHEC') + ' | ' + n + (ok ? '' : '  -> ' + d));

const r = await p.evaluate(async () => {
  // reproduit l'allocation reelle : groupes 0(6p), 2-7(4p), 10/12/13/14(2p)
  const alloc = [['Groupe 0', 6], ['Groupe 2', 4], ['Groupe 3', 4], ['Groupe 4', 4], ['Groupe 5', 4],
                 ['Groupe 6', 4], ['Groupe 7', 4], ['Groupe 8', 0], ['Groupe 9', 0],
                 ['Groupe 10', 2], ['Groupe 12', 2], ['Groupe 13', 2], ['Groupe 14', 2]];
  PAGES = []; PRODUCTS = {};
  let k = 0;
  for (const [nom, pages] of alloc) {
    const codes = [];
    for (let i = 0; i < 37; i++) { const c = String(100000 + k++); codes.push(c); PRODUCTS[c] = { lib: 'ART', prix: '990 F' }; }
    PAGES.push({ pg: nom, codes, pages });
  }
  for (const kk of Object.keys(matchedFiles)) delete matchedFiles[kk];
  $('perPage').value = 9;
  renderBuilder();
  const total = $('capTotal').textContent;
  const jauges = [...document.querySelectorAll('.pg-cap')].map(x => x.textContent.trim() + '|' + x.className.replace('pg-cap ', ''));

  // niveaux : premier produit du groupe 0 en heros, deuxieme en petit
  const sec = PAGES[0];
  const cartes = document.querySelectorAll('#planches .planche')[0].querySelectorAll('.card');
  cartes[0].querySelector('.niv-btn').click();               // std -> hero
  cartes[1].querySelector('.niv-btn').click();               // std -> hero
  cartes[1].querySelector('.niv-btn').click();               // hero -> petit
  const niveaux = { a: nivOf(sec, cartes[0].dataset.code), b: nivOf(sec, cartes[1].dataset.code) };
  const classes = { a: cartes[0].className, b: cartes[1].className };

  // export fusion : colonnes Niveau et PagesPlanche
  const m = buildMergeFile('', true);
  const l = m.texte.split('\r\n').filter(Boolean);
  const cols = l[0].split('\t');
  const r1 = l[1].split('\t');

  // aller-retour projet
  const proj = await buildProject(false, {});
  PAGES = []; renderBuilder();
  applyProject(proj);
  const apres = { pages: PAGES[0].pages, niv: nivOf(PAGES[0], cartes[0].dataset.code), perPage: $('perPage').value };

  return { total, jauges, niveaux, classes, cols, r1, apres, nRefs: allCodes().length };
});

ck('total : 481 références pour 342 emplacements',
  /481/.test(r.total) && /342/.test(r.total), r.total.replace(/\s+/g, ' ').slice(0, 160));
ck('alerte de dépassement chiffrée', /de trop/.test(r.total), 'absente');
ck('cahiers de 4 signalés (38 → 40 pages)', /40 pages/.test(r.total), 'absent');
ck('planches sans pages signalées', /2 planche\(s\) sans nombre de pages/.test(r.total), 'absent');
ck('jauge groupe 0 : 37 / 54, en sous-capacité', r.jauges[0].startsWith('37 / 54') && r.jauges[0].includes('under'), r.jauges[0]);
ck('jauge groupe 2 : 37 / 36, en dépassement', r.jauges[1].startsWith('37 / 36') && r.jauges[1].includes('over'), r.jauges[1]);
ck('jauge groupe 10 : 37 / 18, en dépassement', r.jauges[9].startsWith('37 / 18') && r.jauges[9].includes('over'), r.jauges[9]);
ck('planche sans pages : capacité inconnue', r.jauges[7].includes('none'), r.jauges[7]);
ck('niveau cyclique standard → héros → petit', r.niveaux.a === 'hero' && r.niveaux.b === 'petit', JSON.stringify(r.niveaux));
ck('héros mis en avant visuellement', /niv-hero/.test(r.classes.a) && /niv-petit/.test(r.classes.b), JSON.stringify(r.classes));
ck('colonnes Niveau et PagesPlanche exportées',
  r.cols.includes('Niveau') && r.cols.includes('PagesPlanche'), JSON.stringify(r.cols));
ck('valeurs exportées justes', r.r1[1] === '6' && r.r1[3] === 'héros', JSON.stringify(r.r1.slice(0, 5)));
ck('pages, niveaux et densité conservés à la reprise',
  r.apres.pages === 6 && r.apres.niv === 'hero' && r.apres.perPage === '9', JSON.stringify(r.apres));
console.log('  info  | ' + r.total.replace(/\s+/g, ' ').trim().slice(0, 200));
if (errs.length) console.log('Erreurs JS : ' + errs.join(' | '));
await b.close();
