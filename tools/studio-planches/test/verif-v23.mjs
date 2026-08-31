import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
p.on('dialog', d => d.accept('\\\\10.10.101.52\\SMRC_photo'));
await p.goto('file://' + process.argv[2]);
await p.waitForTimeout(500);
const ck = (n, ok, d) => console.log((ok ? '  OK   ' : '  ECHEC') + ' | ' + n + (ok ? '' : '  -> ' + d));

const r = await p.evaluate(async () => {
  PAGES = [
    { pg: 'ÉVEIL & PREMIER ÂGE', codes: ['105143', '105144'] },
    { pg: 'JOUETS', codes: ['105145'] }
  ];
  PRODUCTS = {
    // designation avec virgule, accents et guillemet : les pieges classiques du CSV
    '105143': { lib: 'POUSSEUR BÉBÉ, 2 en 1 "évolutif"', prix: '2 690 F', prixInit: '3 490 F', prixPromo: '2 690 F', remise: '' },
    '105144': { lib: 'LAPIN BOIS', prix: '990 F', prixInit: '', prixPromo: '', remise: '' },
    '105145': { lib: 'TAPIS 1ER AGE', prix: '5 990 F', prixInit: '', prixPromo: '', remise: '', photo: '\\\\10.10.101.52\\AUTRE\\tapis-99.jpg' }
  };
  REF_FOURN_RAW = { '105143': ['AXE-GD1/25'] };
  for (const k of Object.keys(matchedFiles)) delete matchedFiles[k];
  renderBuilder();
  const cv = document.createElement('canvas'); cv.width = cv.height = 32;
  const bl = await new Promise(x => cv.toBlob(x, 'image/jpeg'));
  matchedFiles['105143'] = new File([bl], '105143.png', { type: 'image/png' });   // extension reelle differente de .jpg
  PHOTO_SRC_DIR = '';
  const m = buildMergeFile('\\\\10.10.101.52\\SMRC_photo');
  const l = m.texte.split('\r\n').filter(Boolean);
  const cols = l[0].split('\t');
  // on lit les colonnes PAR LEUR NOM : le test survit a l'ajout de colonnes
  const col = (ligne, nom) => ligne.split('\t')[cols.indexOf(nom)];
  const r1 = l[1], r2 = l[2], r3 = l[3];
  // encodage
  const blob = utf16leBlob('éÉ');
  const oct = new Uint8Array(await blob.arrayBuffer());
  return {
    cols, nLignes: l.length, total: m.total, avecPhoto: m.avecPhoto,
    champImage: cols[cols.length - 1],
    tabs: l.every(x => x.split('\t').length === cols.length),
    pasDeVirguleCassee: col(r1,'Designation') === 'POUSSEUR BÉBÉ, 2 en 1 "évolutif"',
    cheminImporte: col(r1,'@Photo'),           // doit suivre le nom REEL du fichier importe (.png)
    cheminDeduit: col(r2,'@Photo'),            // pas de photo importee -> code + .jpg
    cheminFourni: col(r3,'@Photo'),            // colonne chemin du fichier source -> prioritaire
    photoPresente: [col(r1,'PhotoPresente'), col(r2,'PhotoPresente'), col(r3,'PhotoPresente')],
    fournisseur: col(r1,'RefFournisseur'),
    bom: oct[0] === 0xFF && oct[1] === 0xFE,
    utf16: oct.length === 2 + 2 * 2 && oct[2] === 0xE9 && oct[3] === 0x00
  };
});

ck('colonne image marquee @ pour InDesign', r.champImage === '@Photo', r.champImage);
ck('3 produits, 2 planches', r.total === 3 && r.nLignes === 4, JSON.stringify({ t: r.total, n: r.nLignes }));
ck('toutes les lignes ont le meme nombre de colonnes', r.tabs, 'colonnes desalignees');
ck('designation avec virgule et guillemets intacte', r.pasDeVirguleCassee, r.cols && 'valeur alteree');
ck('chemin = nom reel du fichier importe', r.cheminImporte === '\\\\10.10.101.52\\SMRC_photo\\105143.png', r.cheminImporte);
ck('chemin deduit du code sans photo importee', r.cheminDeduit === '\\\\10.10.101.52\\SMRC_photo\\105144.jpg', r.cheminDeduit);
ck('chemin du fichier source prioritaire', r.cheminFourni === '\\\\10.10.101.52\\AUTRE\\tapis-99.jpg', r.cheminFourni);
ck('colonne PhotoPresente juste', JSON.stringify(r.photoPresente) === '["Oui","Non","Non"]', JSON.stringify(r.photoPresente));
ck('reference fournisseur en ecriture d origine', r.fournisseur === 'AXE-GD1/25', r.fournisseur);
ck('encodage UTF-16 LE avec BOM', r.bom && r.utf16, 'bom=' + r.bom + ' utf16=' + r.utf16);
console.log('  info  | colonnes : ' + r.cols.join(', '));
if (errs.length) console.log('Erreurs JS : ' + errs.join(' | '));
await b.close();
