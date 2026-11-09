// V43 — la prise du geste résiste aux navigateurs qui s'interposent, et l'outil sait
// dire ce qu'il reçoit. On simule ici deux environnements hostiles qu'on ne peut pas
// installer : un qui retient les événements en phase de bulle, un sans PointerEvent.
import { chromium } from 'playwright-core';
const FICHIER = process.argv[2];
const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const errs = [];
const res = [];
const ck = (n, ok, d) => { res.push(ok); console.log((ok ? '  OK   ' : '  ECHEC') + ' | ' + n + (ok ? '' : '  -> ' + d)); };

// `sabotage` s'exécute AVANT le chargement de la page : c'est ainsi qu'une extension
// ou un navigateur « agent » s'installe, pas après coup.
async function scene(sabotage) {
  const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  p.on('dialog', d => d.accept());
  if (sabotage) await p.addInitScript(sabotage);
  await p.goto('file://' + FICHIER);
  await p.waitForTimeout(400);
  await p.evaluate(async () => {
    PAGES = [
      { pg: 'A', codes: [], pages: 2, niveaux: {}, pagesContenu: [['a1', 'a2'], ['b1']] },
      { pg: 'B', codes: [], pages: 1, niveaux: {}, pagesContenu: [['z1']] }
    ];
    PRODUCTS = {}; POOL = []; RESERVE = []; PROJET_NOM = 'T';
    for (const k of Object.keys(matchedFiles)) delete matchedFiles[k];
    for (const sec of PAGES) { aplatir(sec); for (const c of sec.codes) PRODUCTS[c] = { lib: c, prix: '9 F' }; }
    const cv = document.createElement('canvas'); cv.width = cv.height = 60;
    const g = cv.getContext('2d'); g.fillStyle = '#c8a951'; g.fillRect(0, 0, 60, 60);
    const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg'));
    for (const sec of PAGES) for (const c of sec.codes) matchedFiles[c] = new File([blob], c + '.jpg', { type: 'image/jpeg' });
    $('perPage').value = 9;
    renderBuilder(); ouvrirWorktable();
    const r = document.querySelector('.wt-size input'); r.value = '90'; r.dispatchEvent(new Event('input'));
  });
  await p.waitForTimeout(400);
  await p.evaluate(() => {
    const g = document.querySelector('.wt-grid');
    if (g) window.scrollTo(0, Math.max(0, g.getBoundingClientRect().top + window.scrollY - 180));
  });
  await p.waitForTimeout(150);
  return p;
}

const item = (p, g, i) => p.locator('.wt-grid').nth(g).locator('.wt-item').nth(i);
const lire = p => p.evaluate(() => ({
  a: PAGES[0].pagesContenu.map(x => x.join('+')),
  b: PAGES[1].pagesContenu.map(x => x.join('+')),
  total: PAGES[0].codes.length + PAGES[1].codes.length
}));

async function geste(p, src, dst, cote = 'droite') {
  const bs = await src.boundingBox().catch(() => null);
  const bd = await dst.boundingBox().catch(() => null);
  if (!bs || !bd) return { ko: 'introuvable' };
  const x0 = bs.x + bs.width / 2, y0 = bs.y + bs.height / 2;
  const x1 = cote === 'gauche' ? bd.x + 4 : bd.x + bd.width - 4, y1 = bd.y + bd.height / 2;
  await p.mouse.move(x0, y0);
  await p.mouse.down();
  for (let i = 1; i <= 16; i++) { await p.mouse.move(x0 + (x1 - x0) * i / 16, y0 + (y1 - y0) * i / 16); await p.waitForTimeout(20); }
  await p.mouse.up();
  await p.waitForTimeout(400);
  return {};
}

// --- 1. navigateur qui retient les événements en phase de bulle ---------------
// Un écouteur posé sur document avant la page, qui appelle stopPropagation : c'est ce
// que fait une couche qui pilote la page. Les écouteurs en capture doivent passer avant.
let p = await scene(() => {
  for (const t of ['pointermove', 'pointerup', 'mousemove', 'mouseup']) {
    document.addEventListener(t, e => e.stopPropagation(), false);
    document.addEventListener(t, e => e.stopPropagation(), false);
  }
});
let g = await geste(p, item(p, 0, 0), item(p, 1, 0));
let r = await lire(p);
ck('événements retenus en phase de bulle : le geste passe quand même',
  !g.ko && r.a[1].split('+').includes('a1') && r.total === 4, g.ko || JSON.stringify(r));
await p.close();

// --- 2. navigateur sans événements de pointeur --------------------------------
// On supprime PointerEvent et on empêche tout pointerdown/pointermove d'atteindre la
// page : il ne reste que les événements de souris. Le filet doit prendre le relais.
p = await scene(() => {
  delete window.PointerEvent;
  for (const t of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
    window.addEventListener(t, e => { e.stopImmediatePropagation(); }, true);
    document.addEventListener(t, e => { e.stopImmediatePropagation(); }, true);
  }
});
g = await geste(p, item(p, 0, 0), item(p, 1, 0));
r = await lire(p);
const via = await p.evaluate(() => ({ ...WT_JOURNAL }));
ck('sans événements de pointeur : le geste passe par la souris',
  !g.ko && r.a[1].split('+').includes('a1') && r.total === 4, g.ko || JSON.stringify(r));
ck('le relais souris est bien celui qui a servi',
  via.mousedown >= 1 && via.mousemove >= 1 && via.pointerdown === 0 && via.gestesFinis >= 1, JSON.stringify(via));
await p.close();

// --- 3. un seul geste même si les deux familles arrivent ----------------------
// Cas normal : pointerdown ET mousedown sont émis pour le même appui. Le produit ne
// doit se déplacer qu'une fois, et le relais souris ne doit pas s'engager.
p = await scene(null);
g = await geste(p, item(p, 0, 0), item(p, 1, 0));
r = await lire(p);
const normal = await p.evaluate(() => ({ ...WT_JOURNAL }));
ck('cas normal : un seul déplacement, pas de double prise',
  !g.ko && r.a[0] === 'a2' && r.a[1].split('+').includes('a1')
  && r.a[1].split('+').length === 2 && r.total === 4, g.ko || JSON.stringify(r));
ck('cas normal : le relais souris ne s engage pas',
  normal.pointerdown >= 1 && normal.mousedown === 0 && normal.prises === 1 && normal.gestesFinis === 1, JSON.stringify(normal));
ck('aucun glisser natif HTML5 lancé par-dessus', normal.dragstartNatif === 0, String(normal.dragstartNatif));

// --- 4. le panneau de diagnostic ---------------------------------------------
await p.evaluate(() => $('wtDiagBtn').click());
await p.waitForTimeout(700);
const diag = await p.evaluate(() => {
  const z = document.querySelector('#diagOverlay pre');
  return {
    ouvert: !!document.getElementById('diagOverlay'),
    essais: document.querySelectorAll('#diagOverlay .wt-item').length,
    texte: z ? z.textContent : '',
    verdict: ($('diagVerdict') || {}).textContent || ''
  };
});
ck('panneau ouvert avec un bac d essai', diag.ouvert && diag.essais === 2, JSON.stringify({ o: diag.ouvert, e: diag.essais }));
ck('compte rendu : environnement et compteurs',
  /navigateur\s+:/.test(diag.texte) && /PointerEvent\s+:/.test(diag.texte)
  && /pointerdown\s+:/.test(diag.texte) && /gestes démarrés/.test(diag.texte)
  && /choix de dossier/.test(diag.texte), diag.texte.slice(0, 200));
ck('verdict rendu après un geste réussi', /^✅/.test(diag.verdict), diag.verdict);

// le bac d'essai répond au geste comme la table de travail
const avantEssai = await p.evaluate(() => [...document.querySelectorAll('#diagOverlay .wt-item')].map(x => x.dataset.code).join(','));
const essai = await geste(p, p.locator('#diagOverlay .wt-item').nth(0), p.locator('#diagOverlay .wt-item').nth(1));
const apresEssai = await p.evaluate(() => [...document.querySelectorAll('#diagOverlay .wt-item')].map(x => x.dataset.code).join(','));
ck('le bac d essai réagit au geste', !essai.ko && avantEssai === 'ESSAI,CIBLE' && apresEssai === 'CIBLE,ESSAI',
  essai.ko || avantEssai + ' → ' + apresEssai);

// --- 5. remise à zéro des compteurs ------------------------------------------
const raz = await p.evaluate(async () => {
  [...document.querySelectorAll('#diagOverlay button')].find(x => /zéro/.test(x.textContent)).click();
  await new Promise(r => setTimeout(r, 120));
  return { ...WT_JOURNAL };
});
ck('compteurs remis à zéro', raz.prises === 0 && raz.pointermove === 0 && raz.dernier === '', JSON.stringify(raz));
await p.close();

await b.close();
const ko = res.filter(x => !x).length;
if (errs.length) { console.log('\nErreurs JS :'); [...new Set(errs)].forEach(e => console.log('  ' + e)); }
console.log('\n' + (res.length - ko) + '/' + res.length + ' verifications passees');
process.exit(ko || errs.length ? 1 : 0);
