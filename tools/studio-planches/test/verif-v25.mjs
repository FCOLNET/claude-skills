import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
p.on('dialog', d => d.accept());
await p.goto('file://' + process.argv[2]);
// JSZip vient d'un CDN, inaccessible ici : on charge la copie locale
await p.addScriptTag({ path: process.argv[3] });
await p.waitForTimeout(300);
const ck = (n, ok, d) => console.log((ok ? '  OK   ' : '  ECHEC') + ' | ' + n + (ok ? '' : '  -> ' + d));

const r = await p.evaluate(async () => {
  PAGES = [{ pg: 'ÉVEIL & PREMIER ÂGE', codes: ['105143', '105144', '105145'] }];
  PRODUCTS = {
    '105143': { lib: 'POUSSEUR BÉBÉ, 2 en 1', prix: '2 690 F', prixInit: '', prixPromo: '', remise: '' },
    '105144': { lib: 'LAPIN BOIS', prix: '990 F', prixInit: '', prixPromo: '', remise: '' },
    '105145': { lib: 'SANS PHOTO', prix: '5 990 F', prixInit: '', prixPromo: '', remise: '' }
  };
  for (const k of Object.keys(matchedFiles)) delete matchedFiles[k];
  for (const k of Object.keys(localBlobs)) delete localBlobs[k];
  renderBuilder();
  const grand = document.createElement('canvas'); grand.width = grand.height = 3000;
  const g = grand.getContext('2d'); g.fillStyle = '#8B1A2B'; g.fillRect(0, 0, 3000, 3000);
  const hd = await new Promise(x => grand.toBlob(x, 'image/jpeg', 0.92));
  matchedFiles['105143'] = new File([hd], 'photo-source-105143.JPG', { type: 'image/jpeg' });
  matchedFiles['105144'] = new File([hd], 'autre-nom.png', { type: 'image/png' });

  const paquet = await buildMergePackage('hd');
  const leger = await buildMergePackage('light');

  // relire le zip
  const z = await JSZip.loadAsync(paquet.blob);
  const noms = Object.keys(z.files).filter(n => !z.files[n].dir).map(n => n.split('/').slice(1).join('/'));
  const racine = Object.keys(z.files)[0].split('/')[0];
  const fusionBin = await z.file(Object.keys(z.files).find(n => n.endsWith('fusion-indesign.txt'))).async('uint8array');
  // UTF-16 LE -> chaine
  let txt = ''; for (let i = 2; i < fusionBin.length; i += 2) txt += String.fromCharCode(fusionBin[i] | (fusionBin[i + 1] << 8));
  const lignes = txt.split('\r\n').filter(Boolean);
  const colImg = lignes[0].split('\t').indexOf('@Photo');
  const chemins = lignes.slice(1).map(l => l.split('\t')[colImg]);
  const lisez = await z.file(Object.keys(z.files).find(n => n.endsWith('LISEZ-MOI.txt'))).async('string');
  const tailleImg = await z.file(racine + '/Images/105143.jpg').async('uint8array');
  const zl = await JSZip.loadAsync(leger.blob);
  const tailleLeg = await zl.file(racine + '/Images/105143.jpg').async('uint8array');

  return {
    racine, noms, chemins, bomFusion: fusionBin[0] === 0xFF && fusionBin[1] === 0xFE,
    lisezAccents: /Genere le/.test(lisez) && lisez.includes('fusion-indesign.txt'),
    lisezBom: lisez.charCodeAt(0) === 0xFEFF,
    hdOctets: tailleImg.length, legerOctets: tailleLeg.length, sourceOctets: hd.size,
    poidsZipHD: paquet.blob.size, poidsZipLeger: leger.blob.size
  };
});

ck('dossier racine daté', /^FUSION-INDESIGN-\d{4}-\d{2}-\d{2}$/.test(r.racine), r.racine);
ck('contient fichier de fusion, mode d emploi et images',
  r.noms.includes('fusion-indesign.txt') && r.noms.includes('LISEZ-MOI.txt') &&
  r.noms.includes('Images/105143.jpg') && r.noms.includes('Images/105144.png'), JSON.stringify(r.noms));
ck('images renommees d apres le code, extension reelle conservee',
  r.noms.includes('Images/105144.png'), 'png renomme a tort');
ck('chemins RELATIFS dans le fichier de fusion',
  r.chemins[0] === 'Images\\105143.jpg' && r.chemins[1] === 'Images\\105144.png', JSON.stringify(r.chemins));
ck('produit sans photo : chemin vide, ligne conservee', r.chemins[2] === '' && r.chemins.length === 3, JSON.stringify(r.chemins));
ck('aucun chemin serveur ne subsiste', !r.chemins.some(c => c.includes('\\\\') || /^[A-Z]:/.test(c)), JSON.stringify(r.chemins));
ck('fichier de fusion en Unicode (BOM)', r.bomFusion, 'BOM absent');
ck('mode d emploi lisible avec accents (BOM UTF-8)', r.lisezAccents && r.lisezBom, 'lisez=' + r.lisezAccents + ' bom=' + r.lisezBom);
ck('pleine resolution : image intacte', r.hdOctets === r.sourceOctets, r.hdOctets + ' vs ' + r.sourceOctets);
ck('version allegee nettement plus legere', r.legerOctets < r.hdOctets / 2, r.legerOctets + ' vs ' + r.hdOctets);
console.log('  info  | zip pleine resolution ' + Math.round(r.poidsZipHD / 1024) + ' Ko, allege ' + Math.round(r.poidsZipLeger / 1024) + ' Ko (2 photos 3000px)');
if (errs.length) console.log('Erreurs JS : ' + errs.join(' | '));
await b.close();
