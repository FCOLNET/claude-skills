import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
p.on('dialog', d => d.accept());
await p.goto('file://' + process.argv[2]);
await p.waitForTimeout(500);
const r = await p.evaluate(() => {
  PAGES = [{ pg: 'P1', codes: [] }]; PRODUCTS = {};
  for (let i = 0; i < 72; i++) {
    const c = String(105143 + i); PAGES[0].codes.push(c);
    PRODUCTS[c] = { lib: 'ART', prix: '490 F', photo: '\\\\10.10.101.52\\SMRC_photo\\' + c + '.jpg' };
  }
  for (const k of Object.keys(matchedFiles)) delete matchedFiles[k];
  renderBuilder();
  const cmd = buildCopyCommand([...new Set(allCodes())]);
  const bat = buildCopyScript([...new Set(allCodes())]);
  // ouverture de la fenetre de commande
  const btn = [...$('photoFolders').querySelectorAll('button')].find(x => /Copier les 72 photos/.test(x.textContent));
  btn.click();
  const ov = document.getElementById('cmdOverlay');
  const ta = ov && ov.querySelector('textarea');
  return {
    cmdTotal: cmd.total, batTotal: bat.total,
    memeContenu: cmd.texte.split('\r\n').filter(l => l.startsWith('robocopy')).length === bat.texte.split('\r\n').filter(l => l.startsWith('robocopy')).length,
    ligneMax: Math.max(...cmd.texte.split('\r\n').map(l => l.length)),
    explorer: cmd.texte.trim().endsWith('explorer "%USERPROFILE%\\PHOTOS_PLANCHES"'),
    destLocale: !/Desktop/.test(cmd.texte) && cmd.texte.includes('%USERPROFILE%\\PHOTOS_PLANCHES'),
    sansSuppression: !/\/MIR|\/PURGE|del |rmdir/i.test(cmd.texte),
    overlay: !!ov, uneSeuleLigne: cmd.uneSeuleLigne, textarea: !!ta && ta.value.replace(/\r/g,'') === cmd.texte.replace(/\r/g,''), selectionnable: !!ta && ta.readOnly
  };
});
const ck = (n, ok, d) => console.log((ok ? '  OK   ' : '  ECHEC') + ' | ' + n + (ok ? '' : '  -> ' + d));
ck('commande couvre les 72 photos', r.cmdTotal === 72, r.cmdTotal);
ck('commande et .bat cohérents', r.memeContenu && r.batTotal === 72, JSON.stringify(r));
ck('ligne sous la limite Windows', r.ligneMax < 8000, r.ligneMax);
ck('ouvre le dossier a la fin', r.explorer, 'non');
ck('destination locale hors Bureau OneDrive', r.destLocale, 'non');
ck('aucune commande destructrice', r.sansSuppression, 'detectee');
ck('fenetre de copie affichee', r.overlay, 'absente');
ck('commande selectionnable (Ctrl+C possible)', r.textarea && r.selectionnable, JSON.stringify(r));
ck('commande sur une seule ligne', r.uneSeuleLigne, 'plusieurs lignes');
console.log('  info  | ligne la plus longue : ' + r.ligneMax + ' caracteres');
if (errs.length) console.log('Erreurs JS : ' + errs.join(' | '));
await b.close();
