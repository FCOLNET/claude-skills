import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
let msg = '', repondre = true;
p.on('dialog', d => { msg = d.message(); repondre ? d.accept() : d.dismiss(); });
await p.goto('file://' + process.argv[2]);
await p.waitForTimeout(400);
const ck = (n, ok, d) => console.log((ok ? '  OK   ' : '  ECHEC') + ' | ' + n + (ok ? '' : '  -> ' + d));

const r = await p.evaluate(async () => {
  PAGES = [{ pg: 'A', codes: ['1'], pages: 1, niveaux: {}, pagesContenu: [['1']] }];
  PRODUCTS = { '1': { lib: 'X', prix: '9 F' } };
  POOL = ['2']; RESERVE = [{ code: '3', pg: 'A' }];
  PRODUCTS['2'] = { lib: 'Y' }; PRODUCTS['3'] = { lib: 'Z' };
  const proj = await buildProject(false, {});
  return { version: proj._version, outil: proj._outil, aPool: !!proj.pool, aReserve: !!proj.reserve,
           aPages: !!(proj.pages[0] && proj.pages[0].pagesContenu) };
});
ck('le projet porte une version de format', r.version === 3, String(r.version));
ck('la version d outil est enregistrée', /^V\d+$/.test(r.outil || ''), String(r.outil));
ck('vivier, réserve et pages composées enregistrés', r.aPool && r.aReserve && r.aPages, JSON.stringify(r));

// projet venant d'une version plus récente : avertissement, refus possible
const refus = await p.evaluate(() => {
  const faux = { _type: 'studio-planches-projet', _version: 99, _outil: 'V99',
                 pages: [{ pg: 'B', codes: [], pagesContenu: [[]] }], products: {}, pool: [], reserve: [] };
  return applyProject(faux);
});
ck('projet plus récent : avertissement affiché',
  /PLUS R[EÉ]CENTE/.test(msg) && /V99/.test(msg), msg.slice(0, 90));
ck('l avertissement nomme ce qui risque d être perdu',
  /vivier/.test(msg) && /réserve/.test(msg) && /composition des pages/.test(msg), msg.slice(0, 200));
ck('accepté après confirmation', refus === true, String(refus));

repondre = false; msg = '';
const annule = await p.evaluate(() => applyProject({ _type: 'studio-planches-projet', _version: 99, pages: [], products: {} }));
ck('refus honoré : le projet n est pas appliqué', annule === false, String(annule));

// projet ancien : aucun avertissement
msg = ''; repondre = true;
const vieux = await p.evaluate(() => applyProject({ _type: 'studio-planches-projet', _version: 2, pages: [{ pg: 'C', codes: [] }], products: {} }));
ck('projet plus ancien : ouvert sans avertissement', vieux === true && msg === '', msg.slice(0, 60));
if (errs.length) console.log('Erreurs JS : ' + errs.join(' | '));
await b.close();
