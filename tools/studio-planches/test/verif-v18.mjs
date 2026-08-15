import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
p.on('dialog', d => d.accept());
await p.goto('file://' + process.argv[2]);
await p.waitForTimeout(500);
const r = await p.evaluate(() => {
  // 72 references sur 2 dossiers, dont un nom avec espace
  PAGES = [{ pg: 'P1', codes: [] }]; PRODUCTS = {};
  for (let i = 0; i < 71; i++) {
    const c = String(105143 + i); PAGES[0].codes.push(c);
    PRODUCTS[c] = { lib: 'ART', prix: '490 F', prixInit: '', prixPromo: '', remise: '', photo: '\\\\10.10.101.52\\SMRC_photo\\' + c + '.jpg' };
  }
  PAGES[0].codes.push('999001');
  PRODUCTS['999001'] = { lib: 'X', prix: '', prixInit: '', prixPromo: '', remise: '', photo: '\\\\10.10.101.52\\AUTRE dossier\\ref xyz 99.jpg' };
  for (const k of Object.keys(matchedFiles)) delete matchedFiles[k];
  renderBuilder();
  const s = buildCopyScript([...new Set(allCodes())]);
  const box = $('photoFolders');
  return {
    total: s.total, dossiers: s.dossiers,
    lignesRobocopy: s.texte.split('\r\n').filter(l => l.startsWith('robocopy')).length,
    ligneMax: Math.max(...s.texte.split('\r\n').map(l => l.length)),
    crlf: s.texte.includes('\r\n') && !/[^\r]\n/.test(s.texte),
    citeEspaces: s.texte.includes('"ref xyz 99.jpg"') && s.texte.includes('"\\\\10.10.101.52\\AUTRE dossier"'),
    aucuneSuppression: !/\/MIR|\/PURGE|del |rmdir|rd /i.test(s.texte),
    bouton: !!box.textContent.includes('Script de copie des 72 photos')
  };
});
const ck = (n, ok, d) => console.log((ok ? '  OK   ' : '  ECHEC') + ' | ' + n + (ok ? '' : '  -> ' + d));
ck('script couvre les 72 photos', r.total === 72, r.total);
ck('2 dossiers sources traites', r.dossiers === 2, r.dossiers);
ck('lignes robocopy sous la limite Windows', r.ligneMax < 8000, r.ligneMax);
ck('fins de ligne Windows (CRLF)', r.crlf, 'mixte');
ck('noms avec espaces cites', r.citeEspaces, 'non cites');
ck('aucune commande destructrice', r.aucuneSuppression, 'commande dangereuse detectee');
ck('bouton propose dans l encart', r.bouton, 'absent');
console.log('  info  | ' + r.lignesRobocopy + ' commande(s) robocopy, ligne la plus longue : ' + r.ligneMax + ' caracteres');
if (errs.length) console.log('Erreurs JS : ' + errs.join(' | '));
await b.close();
