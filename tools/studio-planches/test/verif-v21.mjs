import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
p.on('dialog', d => d.accept());
await p.goto('file://' + process.argv[2]);
await p.waitForTimeout(500);
const ck = (n, ok, d) => console.log((ok ? '  OK   ' : '  ECHEC') + ' | ' + n + (ok ? '' : '  -> ' + d));

// catalogue SANS colonne chemin : 483 references, comme le cas reel
const r = await p.evaluate(async () => {
  PAGES = [{ pg: 'EVEIL & PREMIER AGE', codes: [] }]; PRODUCTS = {};
  for (let i = 0; i < 483; i++) {
    const c = String(86894 + i * 3).padStart(6, '0');
    PAGES[0].codes.push(c);
    PRODUCTS[c] = { lib: 'ART ' + i, prix: '990 F', prixInit: '', prixPromo: '', remise: '' };  // pas de photo
  }
  for (const k of Object.keys(matchedFiles)) delete matchedFiles[k];
  PHOTO_SRC_DIR = '';
  renderBuilder();
  const encartSansDossier = { visible: !$('photoFolders').classList.contains('hidden'), champ: !!$('photoSrcDir') };
  const sansDossier = buildCopyCommand([...new Set(allCodes())]);
  // l'utilisateur saisit le dossier
  PHOTO_SRC_DIR = '\\\\10.10.101.52\\SMRC_photo';
  const c = buildCopyCommand([...new Set(allCodes())]);
  const lignes = c.texte.split('\r\n').filter(Boolean);
  return {
    encartSansDossier, sansDossier,
    total: c.total, nbCommandes: lignes.length,
    ligneMax: Math.max(...lignes.map(l => l.length)),
    joker: c.texte.includes('"086894.*"'),
    dossier: c.texte.includes('"\\\\10.10.101.52\\SMRC_photo"'),
    explorerFinal: c.texte.includes('explorer'),
    sansSuppression: !/\/MIR|\/PURGE|del |rmdir/i.test(c.texte)
  };
});
ck('encart affiche sans colonne chemin', r.encartSansDossier.visible, 'masque');
ck('champ dossier source propose', r.encartSansDossier.champ, 'absent');
ck('aucune commande tant que le dossier est vide', r.sansDossier === null, 'commande generee a tort');
ck('483 references couvertes', r.total === 483, r.total);
ck('joker d extension utilise', r.joker, 'non');
ck('dossier saisi utilise', r.dossier, 'non');
ck('chaque commande sous la limite Windows', r.ligneMax < 8000, r.ligneMax);
ck('ouvre le dossier a la fin', r.explorerFinal, 'non');
ck('aucune commande destructrice', r.sansSuppression, 'detectee');

// affichage en commandes numerotees
const o = await p.evaluate(() => {
  PHOTO_SRC_DIR = '\\\\10.10.101.52\\SMRC_photo';
  const c = buildCopyCommand([...new Set(allCodes())]);
  showCommandOverlay(c.texte, c.total);
  const ov = document.getElementById('cmdOverlay');
  return { blocs: ov.querySelectorAll('textarea').length, boutons: [...ov.querySelectorAll('button')].filter(x => /Copier/.test(x.textContent)).length, avert: ov.textContent.includes('une par une') };
});
ck('une zone copiable par commande', o.blocs === r.nbCommandes && o.boutons === r.nbCommandes, JSON.stringify(o));
if (r.nbCommandes > 1) ck('avertissement de collage successif', o.avert, 'absent');
console.log('  info  | 483 references -> ' + r.nbCommandes + ' commande(s), la plus longue ' + r.ligneMax + ' caracteres');
if (errs.length) console.log('Erreurs JS : ' + errs.join(' | '));
await b.close();
